import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";

export default class Builder {
  public static ROLE = 'builder';

  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;
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

  protected getWorkPlace() : ConstructionSite|null {
    const sites = this.getRoom().find(FIND_CONSTRUCTION_SITES);
    if (sites.length === 0) {
      return null;
    }

    return sites[0];
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

  public build(): boolean {
    const workPlace = this.getWorkPlace();

    const builders = this.getBuilders();

    if (!workPlace) {
      this.logger.info('No work to do');
      builders.forEach((creep: Creep) => {
        creep.suicide()
      });
      return false;
    }

    if (!this.hasSource()) {
      this.logger.info('No source to build from');

      return false;
    }



    if (builders.length < 3 ) {
      const index = new CreepsIndex();
      const creep = index.requestBuilder(workPlace.pos);
      if (creep) {
        creep.memory.role = Builder.ROLE;
      }
    }

    builders.forEach((scoot: Creep) => {
      this.logger.info('Builder in progress');
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

    return true;
  }
}
