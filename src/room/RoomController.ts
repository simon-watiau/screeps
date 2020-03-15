import {Logger} from "typescript-logging";
import Builder from "../behaviour/Builder";
import ChargeController from "../behaviour/ChargeController";
import EnergyLogistic from "../behaviour/EnergyLogistic";
import HarvestSource from "../behaviour/HarvestSource";
import Repair from "../behaviour/Repair";
import Scoot from "../behaviour/Scoot";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import RoomStrategist from "./RoomStrategist";


class RoomController {
  private roomName: string;
  private harvesters: HarvestSource[] = [];
  private charger: ChargeController|undefined;
  public chargerCount = 0;

  private logger: Logger;
  private repair?: Repair;
  private builder?: Builder;
  private logistic?: EnergyLogistic;
  private scoot?: Scoot;

  public logisticCount: number = 0;

  constructor(roomName: string) {
    this.roomName = roomName;

    this.logger = factory.getLogger("room." + this.roomName);

    if (!Memory.terraformedRoom[this.roomName]) {

      Memory.terraformedRoom[this.roomName] = {
        controller: undefined,
        harvesters: []
      };
    }

    // @ts-ignore
    Memory.terraformedRoom[this.roomName].harvesters.forEach((sourceId: Id<Source>) => {
      const source = Game.getObjectById<Source>(sourceId);
      if (!source) {
        throw new Error('source not found');
      }

      this.harvesters.push(new HarvestSource(source.id));
    });

    const controllerId = Memory.terraformedRoom[this.roomName].controller;
    if (controllerId) {
      this.charger = new ChargeController(this.roomName);
    }
  }

  public tick() {
    const strat = RoomStrategist.nextStrategy(this);

    if (strat !== RoomStrategist.STRAT_NONE) {
      this.logger.info('Room ' + this.roomName + ' switch to strategy ' + strat);
      Game.notify('Room ' + this.roomName + ' switch to strategy ' + strat);
    }

    if (strat === RoomStrategist.STRAT_HARVEST_FIRST_SOURCE) {
      const source = this.getFreeSources()[0];
      this.harvesters.push(new HarvestSource(source.id));
      this.getRoomMemory().harvesters.push(source.id);
    }

    if (strat === RoomStrategist.STRAT_BUILD_REPAIR) {
      this.repair = new Repair(this.roomName);
    }

    if (strat === RoomStrategist.STRAT_HARVEST_ALL_SOURCES) {
      const source = this.getFreeSources()[0];
      this.harvesters.push(new HarvestSource(source.id));
      this.getRoomMemory().harvesters.push(source.id);
    }

    if (this.repair) {
      this.repair.tick();
    }

    if (this.builder) {
      const shouldContinue = this.builder.build();
      if (!shouldContinue) {
        this.builder = undefined;
      }
    } else if (Game.time % 5 === 0) {
      this.builder = new Builder(this.roomName);
    }

    if (this.chargerCount !== 0) {
      if (!this.charger) {
        const controllerId = this.getControllerId();
        this.charger = new ChargeController(this.roomName);
        this.getRoomMemory().controller = controllerId;
      }

      this.charger.tick(this.chargerCount);
    }

    if (this.logisticCount !== 0) {
      if (this.logistic) {
        const shouldContinue = this.logistic.move(this.logisticCount);
        if (!shouldContinue) {
          this.logistic = undefined;
        }
      } else if (Game.time % 5 === 0) {
        this.logistic = new EnergyLogistic(this.roomName);
      }
    } else {
      if (this.logistic) {
        this.logistic.shutdown();
        this.logistic = undefined;
      }
    }

    this.harvesters.forEach((harvester: HarvestSource) => {
      harvester.tick();
    });

    // if (!this.scoot) {
    //   const existingScoots = Scoot.getAllScoots();
    //   if (existingScoots.length !== 0) {
    //     this.scoot = new Scoot(existingScoots[0]);
    //   }else {
    //     const index = new CreepsIndex();
    //     const claim = index.requestClaim(new RoomPosition(15,15, this.roomName));
    //     if (claim) {
    //       this.scoot = new Scoot(claim);
    //     }
    //   }
    // }
    //
    // if (this.scoot) {
    //   this.scoot.visit();
    // }
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

  public getFirstHarvesterState(): string|null {
    if (this.harvesters.length > 1) {
      this.logger.error('More than one harvester are already working');
    }

    if (this.harvesters.length === 0) {
      return null;
    }

    return this.harvesters[0].latestState;
  }

  public isControllerUpgraded(): boolean {
    return !!this.charger;
  }

  public getFreeSources(): Source[] {
    return this.getRoom().find(FIND_SOURCES).filter((s: Source) => {
      return !this.getRoomMemory().harvesters.includes(s.id);
    });
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

  public hasRepair(): boolean {
    return !!this.repair;
  }

}
export default RoomController;
