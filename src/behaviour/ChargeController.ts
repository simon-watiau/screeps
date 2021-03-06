import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";
import drawingOpts from "../utils/PathDrawing";

export default class ChargeController
{
  public static ROLE = 'charger';

  private static OBJECTIVE_CHARGE = "charge";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("builder." + roomName);
  }

  public getChargers(): Creep[] {
    return getCreepsByRole(ChargeController.ROLE, this.roomName);
  }

  public charge(count: number) {
    const scoots = this.getChargers();
    const container = this.getClosestContainer();


    if (scoots.length < count && container) {
      const index = CreepsIndex.getInstance();
      index.requestCharger(container.pos, creep => {
        creep.memory.role = getCreepRole(ChargeController.ROLE, this.roomName);
      });
    }

    scoots.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      if (![ChargeController.OBJECTIVE_REFILL, ChargeController.OBJECTIVE_CHARGE].includes(scoot.memory.objective)) {
        scoot.memory.objective = ChargeController.OBJECTIVE_REFILL;
      }

      if ((scoot.store.getFreeCapacity(RESOURCE_ENERGY) === 0 || scoot.store.getUsedCapacity(RESOURCE_ENERGY) !== 0 && !container) && scoot.memory.objective === ChargeController.OBJECTIVE_REFILL) {
        scoot.memory.objective = ChargeController.OBJECTIVE_CHARGE;
      }

      if (scoot.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && (!scoot.memory.objective || scoot.memory.objective === ChargeController.OBJECTIVE_CHARGE)) {
        scoot.memory.objective = ChargeController.OBJECTIVE_REFILL;
      }

      if (scoot.memory.objective === ChargeController.OBJECTIVE_REFILL) {
        if (!container) {
          scoot.say('empty!');
        } else if (scoot.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(container);
        }
      }

      if (scoot.memory.objective === ChargeController.OBJECTIVE_CHARGE) {
        const upgradeRes = scoot.upgradeController(this.getController());

        if (upgradeRes === ERR_NOT_IN_RANGE) {
          scoot.moveTo(this.getController());
        }

        if (upgradeRes !== OK && upgradeRes !== ERR_NOT_IN_RANGE) {
          this.logger.error("Failed to charge: " + upgradeRes);
        }
      }
    });
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist "+ this.roomName);
    }

    return room;
  }

  private getController(): StructureController {
    const controller = this.getRoom().controller;

    if (!controller) {
      throw new Error("Controller not found");
    }

    return controller;
  }

  private getClosestContainer(): StructureContainer|null {
    const containers = this.getController().pos.findInRange<StructureContainer>(
      FIND_STRUCTURES,
      2,
      { filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity(RESOURCE_ENERGY) > 0}
    );

    if (containers.length !== 0) {
      return containers[0];
    }

    return null;
  }
}
