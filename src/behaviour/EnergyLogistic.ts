import _ from "lodash";
import CreepsIndex from "../population/CreepsIndex";

export default class EnergyLogistic {
  public static ROLE = 'logistic';

  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  public getScoots(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === EnergyLogistic.ROLE && c.room.name === this.roomName);
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  private getSpawn(): StructureSpawn {
    const spawns = this.getRoom().find(FIND_MY_SPAWNS);
    if (spawns.length === 0) {
      throw new Error("no spawn");
    }

    return spawns[0];
  }

  protected getDestination() : StructureContainer|StructureSpawn|StructureExtension|null {
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("no Controller");
    }
    if (this.getSpawn().store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
      return this.getSpawn();
    }

    const extension = controller.pos.findClosestByPath<StructureExtension>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_EXTENSION && a.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    });

    if (extension) {
      return extension;
    }

    return controller.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getFreeCapacity() > 0
    });
  }

  protected getSource(source: StructureContainer|StructureSpawn|StructureExtension, creep: Creep) : StructureContainer|null {
    const controller = this.getRoom().controller;
    if (!controller) {
      throw new Error("no Controller");
    }

     return creep.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER &&
        a.store.getUsedCapacity() > 200 &&
        (
          controller.pos.getRangeTo(a.pos) > controller.pos.getRangeTo(source.pos) ||
          source instanceof StructureSpawn || source instanceof StructureExtension
        )
    });
  }

  public shutdown(): void {
    const scoots = this.getScoots();

    scoots.forEach((creep: Creep) => {
      creep.suicide();
    });
  }

  public move(count: number): boolean {
    const scoots = this.getScoots();

    const destination = this.getDestination();

    if (!destination) {
      return false;
    }



    if (scoots.length < count) {
      const index = new CreepsIndex();
      const creep = index.requestLogistic(destination.pos);
      if (creep) {
        creep.memory.role = EnergyLogistic.ROLE;
      }
    }

    let didAction = false;

    scoots.forEach((scoot: Creep) => {
      const source = this.getSource(destination, scoot);
      if (!source) {
        didAction = didAction || false;
        return;
      }

      didAction = true;

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

    return didAction;
  }
}
