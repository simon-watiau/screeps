import _ from "lodash";
import CreepsIndex from "../population/CreepsIndex";
import StateMachine from "../StateMachine";
import {factory} from "../utils/ConfigLog4J";

export default class Repair extends StateMachine {
  public static STATE_INIT = 'init';
  public static STATE_CREATING = 'creating';
  public static STATE_REPAIR = 'repair';
  public static STATE_REFILL = 'refill';

  public static ROLE = 'repair';

  private static OBJECTIVE_FILL = "filling";
  private static OBJECTIVE_REPAIR = "repair";

  public roomName: string;

  constructor(roomName: string) {
    super(factory.getLogger("repair." + roomName), Repair.STATE_INIT);
    this.roomName = roomName;
  }

  public getRepair(): Creep|undefined {
    const repaires =  _.filter(Game.creeps, (c: Creep) => c.memory.role === Repair.ROLE && c.room.name === this.roomName);

    if (repaires.length === 0) {
      return undefined;
    }

    return repaires[0];
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

  protected computeState(): string {
    const creep: Creep|undefined = this.getRepair();

    if (creep === undefined) {
      return Repair.STATE_INIT;
    }

    if (creep.spawning) {
      return Repair.STATE_CREATING;
    }

    if (creep.store.getFreeCapacity() === 0 && creep.memory.objective === Repair.OBJECTIVE_FILL) {
      return Repair.STATE_REPAIR;
    }

    if (creep.store.getUsedCapacity() === 0 && (creep.memory.objective === Repair.OBJECTIVE_REPAIR || !creep.memory.objective)) {
      return Repair.STATE_REFILL;
    }

    if (creep.memory.objective === Repair.OBJECTIVE_REPAIR) {
      return Repair.OBJECTIVE_REPAIR;
    }

    if (creep.memory.objective === Repair.OBJECTIVE_FILL) {
      return Repair.STATE_REFILL;
    }

    return Repair.STATE_REFILL;
  }

  private getClosestContainer(): StructureContainer|null {
    const repair: Creep|undefined =  this.getRepair();
    if (!repair) {
      throw new Error("Repair not found");
    }

    return repair.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES, {
      filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity() > 0
    });
  }

  protected applyState(state: string): void {
    switch (state) {
      case Repair.STATE_INIT:
        if (!this.findStructureToRepair()) {
          this.logger.info('Nothing to repair');
          return;
        }

        const creepIndex = new CreepsIndex();

        const newCreep = creepIndex.requestRepair(
          new RoomPosition(10, 10, this.roomName)
        );

        if (!newCreep) {
          return;
        }

        newCreep.memory.role = Repair.ROLE;
        newCreep.memory.meta = newCreep.memory.meta || {};
        break;
      case Repair.STATE_REFILL:
        const container = this.getClosestContainer();
        const repair = this.getRepair();

        if (!repair) {
          throw new Error('Repair not found');
        }

        repair.memory.objective = Repair.OBJECTIVE_FILL;

        if (container) {
          const r = repair.withdraw(container, RESOURCE_ENERGY);
          if (r === ERR_NOT_IN_RANGE) {
            repair.moveTo(container);
          }
        } else {
          this.logger.info("no container");
        }
        break;
      case Repair.STATE_REPAIR:
        const repair1 = this.getRepair();
        const toRepair1 = this.findStructureToRepair();

        if (!repair1) {
          throw new Error('repair not found');
        }

        if (!toRepair1) {
          this.logger.info('Nothing to repair');
          repair1.suicide();
          return;
        }

        repair1.memory.objective = Repair.OBJECTIVE_REPAIR;

        if (repair1.repair(toRepair1) === ERR_NOT_IN_RANGE) {
          repair1.moveTo(toRepair1);
        }
        break;
    }
  }
}
