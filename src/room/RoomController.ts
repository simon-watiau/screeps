import {Logger} from "typescript-logging";
import Banker from "../Banker";
import Builder from "../behaviour/Builder";
import ChargeController from "../behaviour/ChargeController";
import ClaimNewRoom from "../behaviour/ClaimNewRoom";
import Defend from "../behaviour/Defend";
import EnergyLogistic from "../behaviour/EnergyLogistic";
import HarvestSource from "../behaviour/HarvestSource";
import MineralLogistic from "../behaviour/MineralLogistic";
import Repair from "../behaviour/Repair";
import Tower from "../behaviour/Tower";
import CloseWalls from "../CityPlanner/CloseWalls";
import ControllerContainer from "../CityPlanner/ControllerContainer";
import CreateExtension from "../CityPlanner/CreateExtensions";
import CreateStorage from "../CityPlanner/CreateStorage";
import CreateTerminal from "../CityPlanner/CreateTerminal";
import MineralSetup from "../CityPlanner/MineralSetup";
import RoadBuilder from "../CityPlanner/RoadBuilder";
import SourcesContainer from "../CityPlanner/SourcesContainer";
import Towers from "../CityPlanner/Towers";
import {factory} from "../utils/ConfigLog4J";
import RoomStrategist from "./RoomStrategist";


class RoomController {
  private roomName: string;

  public state:any;

  private latestEnergyProduction: number;
  private latestScreepsCount: number;
  private attackStart: number| undefined;

  private harvesters: HarvestSource[] = [];
  private logger: Logger;
  private charger: ChargeController;
  private repair: Repair;
  private builder: Builder;
  private logistic: EnergyLogistic;
  private mineralLogistic: MineralLogistic;
  private defender: Defend;
  private tower: Tower;
  private scoot?: ClaimNewRoom;

  constructor(roomName: string) {
    this.roomName = roomName;

    this.logger = factory.getLogger("room." + this.roomName);

    this.getRoomMemory(); // bootstrap memory

    this.charger = new ChargeController(this.roomName);
    this.repair = new Repair(this.roomName);
    this.builder = new Builder(this.roomName);
    this.logistic = new EnergyLogistic(this.roomName);
    this.defender = new Defend(this.roomName);
    this.tower = new Tower(this.roomName);
    this.mineralLogistic = new MineralLogistic(this.roomName);

    this.latestEnergyProduction = this.getEnergyInTransit();
    this.latestScreepsCount = this.getRoom().find(FIND_MY_CREEPS).length;
  }

  public tick() {
    if (this.getRoom().find(FIND_MY_SPAWNS).length === 0) {
      return;
    }
    this.getEnergyInTransit();
    this.state = {
      ensureControllerContainer: false,
      ensureExtractor: false,
      ensureRoadNetwork: false,
      ensureStorage: false,
      ensureTerminal: false,
      ensureTower: false,
      ensureWalls: false,
      expectedBuilders: 0,
      expectedChargerCount: 0,
      expectedDefendersCount: 0,
      expectedHarvesters: 0,
      expectedLogisticCount: 0,
      expectedMineralLogisticCount: 0,
      expectedRepairers: 0,
      scoot: false
    };

    // CreepsIndex.getInstance().init();
    Banker.getInstance(this.roomName).updateBankerState(this);

    RoomStrategist.nextStrategy(this);
    while (this.harvesters.length < this.state.expectedHarvesters) {
      const sources = HarvestSource.getFreeSources(this.getRoom(), this.harvesters);
      if (sources.length === 0) {
        throw new Error("No source for harvester");
      }

      this.harvesters.push(new HarvestSource(sources[0].id));
    }

    if (this.state.ensureExtractor) {
      HarvestSource.getFreeMinerals(this.getRoom(), this.harvesters).forEach((m:Mineral) => {
        this.harvesters.push(new HarvestSource(m.id));
      });
    }

    this.logger.info('State: ' + JSON.stringify(this.state));

    this.repair.repair(this.state.expectedRepairers);

    this.builder.build(this.state.expectedBuilders);

    this.charger.charge(this.state.expectedChargerCount);

    this.logistic.move(this.state.expectedLogisticCount);

    this.mineralLogistic.move(Math.max(this.canHarvestTombstone() ? 4 : 0, this.state.expectedMineralLogisticCount));

    this.defender.defend(this.state.expectedDefendersCount);

    this.tower.activate();

    this.harvesters.forEach((harvester: HarvestSource) => {
      harvester.harvest();

      if (harvester.isSource()) {
        SourcesContainer.buildSite(harvester.getSourceId() as Id<Source>);
      }

      if (harvester.isMineral()) {
        MineralSetup.buildSite(harvester.getSourceId() as Id<Mineral>);
      }

    });

    if (this.state.ensureControllerContainer) {
      ControllerContainer.buildSite(this.getController().id);
    }

    if (this.state.ensureRoadNetwork && Game.time % 20 === 0) {
      RoadBuilder.buildRoads(this.getRoom());
    }

    // if (this.state.ensureWalls && Game.time % 8 === 0) {
    //   CloseWalls.placeWalls(this.getRoom());
    // }

    if (this.state.ensureTower && Game.time %70 === 0) {
      Towers.buildSite(this.getRoom());
    }

    if (Game.time % 100 === 0) {
      CreateExtension.placeExtension(this.getRoom());
    }

    if (this.state.ensureStorage && Game.time % 25  === 0) {
      CreateStorage.placeStorage(this.getRoom());
    }

    if (this.state.ensureTerminal && Game.time % 150 === 0) {
      CreateTerminal.placeTerminal(this.getRoom());
    }

    if (this.state.scoot) {
      if (!this.scoot) {
        this.scoot = new ClaimNewRoom(this.roomName);
      }

      this.scoot.visit();
    }

   // if (this.roomName === "W8N7") {
   //    if (this.attacker.latestState === AttackSquad.STATE_DEAD) {
   //      this.attacker.reboot();
   //    }
   //
   //    this.attacker.tick();
   // }
  }

  public isControllerContainerCreated(): boolean {
    return this.getContainerController() !== undefined;
  }

  private canHarvestTombstone(): boolean {
    const tombstones = this.getRoom().find(FIND_TOMBSTONES, {filter: (s) => Object.keys(s.store).filter((type: string) => type !== RESOURCE_ENERGY).length !== 0});
    return this.hasStorage() && tombstones.length !== 0;
  }

  public getContainerController(): StructureContainer|undefined {
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("Room has no controller");
    }

    const containers = controller.pos.findInRange<StructureContainer>(FIND_STRUCTURES, 2, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER});

    if (containers.length === 0) {
      return undefined;
    }

    return containers[0];
  }

  public needAdvancedBuilder(): boolean {
    const advancedBuildingType: StructureConstant[] = [STRUCTURE_STORAGE, STRUCTURE_TOWER, STRUCTURE_EXTRACTOR];
    return this.getRoom().find(FIND_CONSTRUCTION_SITES,
      {
        filter: (a: OwnedStructure) => advancedBuildingType.includes(a.structureType)
      }).length !== 0;
  }

  public hasStorage(): boolean {
    return this.getStorage() !== undefined;
  }

  public getStorage(): StructureStorage|undefined {
    const storages = this.getRoom().find<StructureStorage>(FIND_STRUCTURES, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_STORAGE});
    if (storages.length === 0) {
      return undefined;
    }

    return storages[0];
  }

  public hasTower(): boolean {
    return this.getRoom().find(FIND_MY_STRUCTURES, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_TOWER}).length !== 0;
  }

  public triggerSafeModeIfAvailable() {
    if (this.getController().safeModeAvailable > 0) {
      this.getController().activateSafeMode();
    }
  }

  public getFreeSourcesCount(): number {
    return HarvestSource.getFreeSources(this.getRoom(), this.harvesters).length;
  }

  public getChargersCount(): number {
    return this.charger.getChargers().length;
  }

  public getLogisticsCount(): number {
    return this.logistic.getLogistics().length;
  }

  public getHarvestersCount(): number {
    return HarvestSource.countHarvesterByType(this.roomName, Source);
  }

  public getAndUpdateEnergyProductionDelta() {
    const currentDelta =  this.getEnergyInTransit() - this.latestEnergyProduction;
    this.latestEnergyProduction = this.getEnergyInTransit();
    return currentDelta;
  }

  public attackDuration(): number {
      this.attackStart = this.isAttacked() ? this.attackStart || Game.time : undefined;
      if (!this.attackStart) {
        return -1;
      }
      return Game.time - this.attackStart;
  }

  public isAttacked():boolean {
    const position = new RoomPosition(20,20,this.roomName);
      const enemy = position.findClosestByRange(FIND_HOSTILE_SPAWNS) ||
        position.findClosestByRange(FIND_HOSTILE_CREEPS) ||
        position.findClosestByRange(FIND_HOSTILE_POWER_CREEPS);
      return enemy !== null && (enemy.pos.x > 2 && enemy.pos.x < 38 && enemy.pos.y > 2 && enemy.pos.y < 38)
  }

  public getAndUpdateScreepsCountDelta() {
    const currentDelta =  this.getRoom().find(FIND_MY_CREEPS).length - this.latestScreepsCount;
    this.latestScreepsCount = this.getRoom().find(FIND_MY_CREEPS).length;
    return currentDelta;
  }

  public getAllSourcesCount(): number {
    return HarvestSource.getFreeSources(this.getRoom(), []).length;
  }

  public getEnergyInTransit(): number {
    const controllerContainer = this.getContainerController();
    const containers = this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) =>  {
        return a.structureType === STRUCTURE_CONTAINER &&
          (!controllerContainer || controllerContainer.id !== a.id);
      }
    });

    let energy = 0;
    containers.forEach((container: StructureContainer) => {
      energy += container.store.getUsedCapacity(RESOURCE_ENERGY);
    });

    return energy;
  }

  public getRoom(): Room {
    const room = Game.rooms[this.roomName];

    if (!room) {
      throw new Error("room not found");
    }

    return room;
  }

  public getHarvestedSourcesCount(): number {
    return this.harvesters.length;
  }

  public firstSourceFullyHarvested(): boolean {
    if (this.harvesters.length === 0) {
      return false;
    }

    let harvested = false;

    this.harvesters.forEach((harvest: HarvestSource) => {
      harvested =  harvested || (harvest.isFullyHarvested() && harvest.isSource());
    });

    return harvested;
  }

  public isControllerUpgraded(): boolean {
    return !!this.charger;
  }

  public getController(): StructureController {
    const controller = this.getRoom().controller;
    if (!controller) {
      this.logger.error('Room does not have a controller');

      throw new Error("This room doesn't have a controller");
    }
    return controller;
  }

  public getRoomMemory(): RoomMemory {
    let memory = Memory.terraformedRoom[this.roomName];
    if (!memory) {
      memory = {
        stateMachines: {},
      };
      Memory.terraformedRoom[this.roomName] = memory;
    }

    // update schema
    if (!memory.stateMachines) {
      memory.stateMachines = new Map<string, string>();
    }

    return memory;
  }

  public hasWalls() :boolean {
    return this.getRoom().find(
      FIND_STRUCTURES,
      {
        filter: (a) => a.structureType === STRUCTURE_WALL ||
          a.structureType === STRUCTURE_RAMPART
      }
      ).length !== 0;
  }
}
export default RoomController;
