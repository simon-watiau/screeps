import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import drawingOpts from "../utils/PathDrawing";

export default class Builder {
  public static ROLE = 'builder';

  private static OBJECTIVE_BUILD = "filling";
  private static OBJECTIVE_REFILL = "refill";

  private roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("builder." + roomName);
  }

  public getBuilders(): Creep[] {
    return getCreepsByRole(Builder.ROLE, this.roomName);
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
    return this.searchForBestConstructionSite(STRUCTURE_TOWER, pos) ||
      this.searchForBestConstructionSite(STRUCTURE_WALL, pos) ||
      this.searchForBestConstructionSite(STRUCTURE_RAMPART, pos) ||
      this.searchForBestConstructionSite(STRUCTURE_STORAGE, pos) ||
      this.searchForBestConstructionSite(STRUCTURE_CONTAINER, pos) ||
      this.searchForBestConstructionSite(STRUCTURE_EXTENSION, pos) ||
      this.searchForBestConstructionSite();

  }

  private searchForBestConstructionSite(type?: BuildableStructureConstant, pos?: RoomPosition) : ConstructionSite|null {
    if (pos) {
      return pos.findClosestByPath(FIND_CONSTRUCTION_SITES, {filter: (a: any) => !type || a.structureType === type});
    }

    const res = this.getRoom().find(
      FIND_CONSTRUCTION_SITES,
      {filter: (a: any) =>
          !type || a.structureType === type}
    );

    if (res.length !== 0) {
      return res[0];
    }

    return null;
  }

  protected hasSource():boolean {
    return this.getRoom().find<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    }).length !== 0;
  }

  protected getSource(worker: Creep) : AnyStoreStructure|null {
    return worker.pos.findClosestByPath<AnyStoreStructure>(FIND_STRUCTURES, {
      filter: (a: any) => [STRUCTURE_CONTAINER, STRUCTURE_STORAGE].includes(a.structureType) && a.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });
  }

  public build(count: number) {
    if (count === 0) {
      return;
    }

    const workPlace = this.getWorkPlace();

    const builders = this.getBuilders();

    if (!workPlace) {
      return;
    }

    if (!this.hasSource()) {
      return;
    }

    if (builders.length < count) {
      const index = CreepsIndex.getInstance();
      index.requestBuilder(workPlace.pos, creep => {
        creep.memory.role = getCreepRole(Builder.ROLE, this.roomName);
      });
    }

    builders.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      if (scoot.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && scoot.memory.objective === Builder.OBJECTIVE_REFILL) {
        scoot.memory.objective = Builder.OBJECTIVE_BUILD;
      }

      if (scoot.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && (!scoot.memory.objective || scoot.memory.objective === Builder.OBJECTIVE_BUILD)) {
        scoot.memory.objective = Builder.OBJECTIVE_REFILL;
      }

      if (scoot.memory.objective === Builder.OBJECTIVE_REFILL) {
        const source = this.getSource(scoot);
        if (source) {
          if (scoot.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            scoot.say("-build");
            scoot.moveTo(source, {visualizePathStyle: drawingOpts('#3cb8ff')});
          }
        }
      }

      if (scoot.memory.objective === Builder.OBJECTIVE_BUILD) {
        if (scoot.build(workPlace) === ERR_NOT_IN_RANGE) {
          scoot.say("+build");
          scoot.moveTo(workPlace, {visualizePathStyle: drawingOpts('#3cb8ff')});
        }
      }
    });
  }
}
