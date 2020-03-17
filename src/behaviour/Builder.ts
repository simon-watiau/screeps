import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";

export default class Builder {
  public static ROLE = 'builder';

  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  private roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("builder." + roomName);
  }


  public getBuilders(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === Builder.ROLE && c.room.name === this.roomName);
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  protected countWorkPlaces(): number {
    return this.getRoom().find(FIND_CONSTRUCTION_SITES).length;
  }

  protected getWorkPlace(pos?: RoomPosition) : ConstructionSite|null {
    if (pos) {
      return pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {filter: (a: any) => a.structureType !== STRUCTURE_ROAD}) ||
        pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    }

    let res = this.getRoom().find(
      FIND_CONSTRUCTION_SITES,
      {filter: (a: any) =>
        a.structureType !== STRUCTURE_ROAD}
      );

    if (res.length !== 0) {
      return res[0];
    }

    res = this.getRoom().find(
      FIND_CONSTRUCTION_SITES,
    );

    if (res.length !== 0) {
      return res[0];
    }

    return null;
  }

  protected hasSource():boolean {
    return this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity() > 0
    }).length !== 0;
  }

  protected getSource(worker: Creep) : StructureContainer|null {
    return worker.pos.findClosestByPath<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity() > 0
    });
  }

  public build(count: number) {
    if (count === 0) {
      return;
    }

    const workPlace = this.getWorkPlace();

    const builders = this.getBuilders();

    if (!workPlace) {
      this.logger.info('Nothing to build, stand by');
      return;
    }

    if (!this.hasSource()) {
      this.logger.info('No source to build from');
      return;
    }

    if (builders.length < count) {
      const index = CreepsIndex.getInstance();
      index.requestBuilder(workPlace.pos, creep => {
        creep.memory.role = Builder.ROLE;
      });
    }

    builders.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      if (scoot.store.getFreeCapacity() === 0 && scoot.memory.objective === Builder.OBJECTIVE_REFILL) {
        scoot.memory.objective = Builder.OBJECTIVE_FILL;
      }

      if (scoot.store.getUsedCapacity() === 0 && (!scoot.memory.objective || scoot.memory.objective === Builder.OBJECTIVE_FILL)) {
        scoot.memory.objective = Builder.OBJECTIVE_REFILL;
      }

      if (scoot.memory.objective === Builder.OBJECTIVE_REFILL) {
        const source = this.getSource(scoot);
        if (source) {
          if (scoot.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            scoot.moveTo(source);
          }
        }
      }

      if (scoot.memory.objective === Builder.OBJECTIVE_FILL) {
        if (scoot.build(workPlace) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(workPlace);
        }
      }
    });
  }
}
