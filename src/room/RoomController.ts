import {Logger} from "typescript-logging";
import Builder from "../behaviour/Builder";
import ChargeController from "../behaviour/ChargeController";
import EnergyLogistic from "../behaviour/EnergyLogistic";
import HarvestSource from "../behaviour/HarvestSource";
import Repair from "../behaviour/Repair";
import Scoot from "../behaviour/Scoot";
import ControllerContainer from "../CityPlanner/ControllerContainer";
import CreateExtension from "../CityPlanner/CreateExtensions";
import RoadBuilder from "../CityPlanner/RoadBuilder";
import SourcesContainer from "../CityPlanner/SourcesContainer";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import RoomStrategist from "./RoomStrategist";


class RoomController {
  private roomName: string;

  public state:any;

  private latestEnergyProduction: number;
  private latestScreepsCount: number;

  private harvesters: HarvestSource[] = [];
  private logger: Logger;
  private charger: ChargeController;
  private repair: Repair;
  private builder: Builder;
  private logistic: EnergyLogistic;
  private scoot?: Scoot;

  constructor(roomName: string) {
    this.roomName = roomName;

    this.logger = factory.getLogger("room." + this.roomName);

    if (!Memory.terraformedRoom[this.roomName]) {
      Memory.terraformedRoom[this.roomName] = {
        harvesters: []
      };
    }

    this.charger = new ChargeController(this.roomName);
    this.repair = new Repair(this.roomName);
    this.builder = new Builder(this.roomName);
    this.logistic = new EnergyLogistic(this.roomName);

    this.latestEnergyProduction = this.getStoredEnergy();
    this.latestScreepsCount = this.getRoom().find(FIND_MY_CREEPS).length;
  }

  public tick() {
    this.state = {
      ensureControllerContainer: false,
      ensureRoadNetwork: false,
      expectedBuilders: 0,
      expectedChargerCount: 0,
      expectedHarvesters: 0,
      expectedLogisticCount: 0,
      expectedRepairers: 0,
      scoot: false
    };

    CreepsIndex.getInstance().init();

    RoomStrategist.nextStrategy(this);

    while (this.harvesters.length < this.state.expectedHarvesters) {
      const sources = HarvestSource.getFreeSources(this.getRoom(), this.harvesters);
      if (sources.length === 0) {
        throw new Error("No source for harvester");
      }

      this.harvesters.push(new HarvestSource(sources[0].id));
    }

    this.logger.info('State: ' + JSON.stringify(this.state));

    this.repair.repair(this.state.expectedRepairers);

    this.builder.build(this.state.expectedBuilders);

    this.charger.charge(this.state.expectedChargerCount);

    this.logistic.move(this.state.expectedLogisticCount);

    this.harvesters.forEach((harvester: HarvestSource) => {
      harvester.harvest();
      SourcesContainer.buildSite(harvester.getSourceId());
    });

    if (this.state.ensureControllerContainer) {
      ControllerContainer.buildSite(this.getControllerId());
    }

    if (this.state.ensureRoadNetwork && Game.time % 100 === 0) {
      RoadBuilder.buildRoads(this.getRoom());
    }

    if (Game.time % 100 === 0) {
      CreateExtension.placeExtension(this.getRoom());
    }

    if (!this.scoot) {
      const existingScoots = Scoot.getAllScoots();
      if (existingScoots.length !== 0) {
        this.scoot = new Scoot(existingScoots[0]);
      }else if (this.state.scoot) {
        const index = CreepsIndex.getInstance();
        index.requestClaim(new RoomPosition(15,15, this.roomName), creep => {
          this.scoot = new Scoot(creep);
        });
      }
    }

    if (this.scoot) {
      this.scoot.visit();
    }

    CreepsIndex.getInstance().resolve();
  }

  public isControllerContainerCreated(): boolean {
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("Room has no controller");
    }
    return controller.pos.findInRange(FIND_STRUCTURES, 2, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;
  }

  public getFreeSourcesCount(): number {
    return HarvestSource.getFreeSources(this.getRoom(), this.harvesters).length;
  }

  public getAndUpdateEnergyProductionDelta() {
    const currentDelta =  this.getStoredEnergy() - this.latestEnergyProduction;
    this.latestEnergyProduction = this.getStoredEnergy();
    return currentDelta;
  }

  public getAndUpdateScreepsCountDelta() {
    const currentDelta =  this.getRoom().find(FIND_MY_CREEPS).length - this.latestScreepsCount;
    this.latestScreepsCount = this.getRoom().find(FIND_MY_CREEPS).length;
    return currentDelta;
  }

  public getAllSourcesCount(): number {
    return HarvestSource.getFreeSources(this.getRoom(), []).length;
  }

  public getStoredEnergy(): number {
    const containers = this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER
    });

    let energy = 0;
    containers.forEach((container: StructureContainer) => {
      energy += container.store.getUsedCapacity();
    });

    return energy;
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];

    if (!room) {
      throw new Error("room not found");
    }

    return room;
  }

  public getHarvestedSourcesCount(): number {
    return this.getRoomMemory().harvesters.length;
  }

  public firstSourceFullyHarvested(): boolean {
    if (this.harvesters.length === 0) {
      return false;
    }

    let harvested = false;

    this.harvesters.forEach((harvest: HarvestSource) => {
      harvested =  harvested || harvest.isFullyHarvested();
    });

    return harvested;
  }

  public isControllerUpgraded(): boolean {
    return !!this.charger;
  }

  public getControllerId(): Id<StructureController> {
    const controller = this.getRoom().controller;
    if (!controller) {
      this.logger.error('Room does not have a controller');

      throw new Error("This room doesn't have a controller");
    }
    return controller.id;
  }

  public getRoomMemory(): RoomMemory {
    let memory = Memory.terraformedRoom[this.roomName];
    if (!memory) {
      memory = {
        harvesters: []
      };
      Memory.terraformedRoom[this.roomName] = memory;
    }

    return memory;
  }
}
export default RoomController;
