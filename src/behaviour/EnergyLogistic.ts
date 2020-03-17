import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";

export default class EnergyLogistic {
  public static ROLE = 'logistic';

  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("builder." + roomName);
  }

  public getLogistics(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === EnergyLogistic.ROLE && c.room.name === this.roomName);
  }

  public move(count: number) {
    if (count === 0) {
      return;
    }

    const scoots = this.getLogistics();

    const destination = this.getDestination();

    if (!destination) {
      this.logger.info("No destination to transfer to");

      return;
    }

    if (scoots.length < count) {
      const index = new CreepsIndex();
      const creep = index.requestLogistic(destination.pos);
      if (creep) {
        creep.memory.role = EnergyLogistic.ROLE;
      }
      console.log("Spawn", creep);
    }

    scoots.forEach((scoot: Creep) => {
      const source = this.getSource(destination);
      if (!source) {
        this.logger.info("No source to withdraw from");

        return;
      }

      if (scoot.store.getFreeCapacity() === 0 && scoot.memory.objective === EnergyLogistic.OBJECTIVE_REFILL) {
        scoot.memory.objective = EnergyLogistic.OBJECTIVE_FILL;
      }

      if (scoot.store.getUsedCapacity() === 0 && (!scoot.memory.objective || scoot.memory.objective === EnergyLogistic.OBJECTIVE_FILL)) {
        scoot.memory.objective = EnergyLogistic.OBJECTIVE_REFILL;
      }

      if (scoot.memory.objective === EnergyLogistic.OBJECTIVE_REFILL) {
        if (scoot.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(source);
        }
      }

      if (scoot.memory.objective === EnergyLogistic.OBJECTIVE_FILL) {
        if (scoot.transfer(destination, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(destination);
        }
      }
    });
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  private getSpawn(): StructureSpawn|undefined {
    const spawns = this.getRoom().find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
      return undefined;
    }

    return spawns[0];
  }

  private getDestination() : StructureContainer|StructureSpawn|StructureExtension|null {
    const controller = this.getRoom().controller;

    const spawn = this.getSpawn();
    if (spawn && spawn.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      return spawn;
    }

    const extensions = this.getRoom().find<StructureExtension>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_EXTENSION && a.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });

    if (extensions.length > 0) {
      return extensions[0];
    }

    if (controller) {
      return controller.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
        filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getFreeCapacity() > 0
      });
    }

    return null;
  }

  private getSource(source: StructureContainer|StructureSpawn|StructureExtension) : StructureContainer|null {
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("No controller in this room");
    }

     const sources = this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER &&
        a.store.getUsedCapacity() > 200 &&
        (
          (controller && controller.pos.getRangeTo(a.pos) > controller.pos.getRangeTo(source.pos)) ||
          source instanceof StructureSpawn || source instanceof StructureExtension
        )
     });

    sources.sort((s1: StructureContainer, s2:StructureContainer): number => {
      if ( s1.id > s2.id ){
        return -1;
      }
      if ( s1.id < s2.id ){
        return 1;
      }
      return 0;
    });

    if (sources.length > 0) {
      return sources[0];
    }

    return null;
  }
}
