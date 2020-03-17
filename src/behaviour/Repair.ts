import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";

export default class Repair {
  public static ROLE = 'repair';

  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REPAIR = "repair";

  public roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.logger = factory.getLogger("repair." + roomName);
    this.roomName = roomName;
  }

  public getRepaires(): Creep[] {
    return _.filter(Game.creeps, (c: Creep) => c.memory.role === Repair.ROLE && c.room.name === this.roomName);
  }

  public repair(count: number) {
    if (count === 0) {
      return;
    }

    const repairers = this.getRepaires();

    const toRepair = this.findStructureToRepair();

    if (!toRepair) {
      this.logger.info("Nothing to repair, stand by");
      return;
    }

    if (repairers.length < count) {
      const index = CreepsIndex.getInstance();
      index.requestRepair(toRepair.pos, creep => {
        creep.memory.role = Repair.ROLE;
      });
    }

    repairers.forEach((repairer: Creep) => {
      if (repairer.spawning) {
        return;
      }

      const source = this.getClosestContainer(repairer);

      if (!source) {
        this.logger.info("No source to repair from, skipping");

        return;
      }

      if (repairer.store.getFreeCapacity() === 0 && repairer.memory.objective === Repair.OBJECTIVE_FILL) {
        repairer.memory.objective = Repair.OBJECTIVE_REPAIR;
      }

      if (repairer.store.getUsedCapacity() === 0 && (repairer.memory.objective === Repair.OBJECTIVE_REPAIR || !repairer.memory.objective)) {
        repairer.memory.objective = Repair.OBJECTIVE_FILL;
      }

      if (repairer.memory.objective === Repair.OBJECTIVE_REPAIR) {
        const r = repairer.repair(toRepair);
        if (r === ERR_NOT_IN_RANGE) {
          repairer.moveTo(toRepair);
        }
      }

      if (repairer.memory.objective === Repair.OBJECTIVE_FILL) {
        const r = repairer.withdraw(source, RESOURCE_ENERGY);
        if (r === ERR_NOT_IN_RANGE) {
          repairer.moveTo(source);
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

  protected findStructureToRepair(): Structure|undefined {
    const targets = this.getRoom().find(FIND_STRUCTURES, {
      filter: object => object.hits < object.hitsMax
    });

    if (targets.length === 0) {
      return undefined;
    }

    return targets[0];
  }

  private getClosestContainer(creep: Creep): StructureContainer|null {
    return creep.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity() > 0
    });
  }
}
