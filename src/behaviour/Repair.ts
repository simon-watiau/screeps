import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import drawingOpts from "../utils/PathDrawing";

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
    return getCreepsByRole(Repair.ROLE, this.roomName);
  }

  public repair(count: number) {
    if (count === 0) {
      return;
    }

    const repairers = this.getRepaires();

    let toRepair = Repair.findInfraToRepair(this.getRoom());
    if (!toRepair) {
      toRepair = Repair.findStructureToRepair(this.getRoom());
    }

    if (toRepair === undefined) {
      this.logger.info("Nothing to repair, stand by");
      return;
    }

    if (repairers.length < count) {
      const index = CreepsIndex.getInstance();
      index.requestRepair(toRepair.pos, creep => {
        creep.memory.role = getCreepRole(Repair.ROLE, this.roomName);
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

      if (repairer.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && repairer.memory.objective === Repair.OBJECTIVE_FILL) {
        repairer.memory.objective = Repair.OBJECTIVE_REPAIR;
      }

      if (repairer.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && (repairer.memory.objective === Repair.OBJECTIVE_REPAIR || !repairer.memory.objective)) {
        repairer.memory.objective = Repair.OBJECTIVE_FILL;
      }

      if (repairer.memory.objective === Repair.OBJECTIVE_REPAIR) {
        const r = repairer.repair(toRepair as Structure);
        if (r === ERR_NOT_IN_RANGE) {
          repairer.say("+Repair");
          repairer.moveTo(toRepair as Structure, {visualizePathStyle: drawingOpts('#3cb8ff')});
        }
      }

      if (repairer.memory.objective === Repair.OBJECTIVE_FILL) {
        const r = repairer.withdraw(source, RESOURCE_ENERGY);
        if (r === ERR_NOT_IN_RANGE) {
          repairer.say("-Repair");
          repairer.moveTo(source, {visualizePathStyle: drawingOpts('#3cb8ff')});
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

  public static findInfraToRepair(room: Room): Structure|undefined {
    const targets = room.find(FIND_STRUCTURES, {
      filter: object => {
        return object.structureType !== STRUCTURE_ROAD && object.hits < object.hitsMax
      }
    }).sort((a, b) => a.hits - b.hits);

    if (targets.length === 0) {
      return undefined;
    }

    return targets[0];
  }

  public static findStructureToRepair(room: Room): Structure|undefined {
    const targets = room.find(FIND_STRUCTURES, {
      filter: object => {
        return object.hits < object.hitsMax
      }
    }).sort((a, b) => a.hits - b.hits);

    if (targets.length === 0) {
      return undefined;
    }

    return targets[0];
  }

  private getClosestContainer(creep: Creep): StructureContainer|null {
    return creep.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });
  }
}
