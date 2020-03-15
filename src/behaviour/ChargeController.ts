import _ from "lodash";
import CreepsIndex from "../population/CreepsIndex";

export default class ChargeController
{
  public static ROLE = 'charger';

  private static OBJECTIVE_CHARGE = "charge";
  private static OBJECTIVE_REFILL = "refill";

  public roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  public getScoots(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === ChargeController.ROLE && c.room.name === this.roomName);
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist "+ this.roomName);
    }
    return room;
  }

  public getChargers(): Creep[] {
    return _.filter(Game.creeps, (c: Creep) => c.memory.role === ChargeController.ROLE);
  }

  private getController(): StructureController {
    const controller = this.getRoom().controller;

    if (!controller) {
      throw new Error("Controller not found");
    }

    return controller;
  }

  private getClosestContainer(target: Creep|StructureController): StructureContainer|null {
    return target.pos.findClosestByRange<StructureContainer>(FIND_STRUCTURES,
      { filter: (a: any) => a.structureType === STRUCTURE_CONTAINER && a.store.getUsedCapacity() > 0}
    );
  }

  public tick(count: number) {
    console.log("tick charger");
    const scoots = this.getScoots();
    const container = this.getClosestContainer(this.getController());
    if (!container) {
      return;
    }

    if (scoots.length < count) {
      const index = new CreepsIndex();
      const creep = index.requestCharger(container.pos);
      if (creep) {
        creep.memory.role = ChargeController.ROLE;
      }
    }

    scoots.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      if (![ChargeController.OBJECTIVE_REFILL, ChargeController.OBJECTIVE_CHARGE].includes(scoot.memory.objective)) {
        scoot.memory.objective = ChargeController.OBJECTIVE_REFILL;
      }

      if (scoot.store.getFreeCapacity() === 0 && scoot.memory.objective === ChargeController.OBJECTIVE_REFILL) {
        scoot.memory.objective = ChargeController.OBJECTIVE_CHARGE;
      }

      if (scoot.store.getUsedCapacity() === 0 && (!scoot.memory.objective || scoot.memory.objective === ChargeController.OBJECTIVE_CHARGE)) {
        scoot.memory.objective = ChargeController.OBJECTIVE_REFILL;
      }

      if (scoot.memory.objective === ChargeController.OBJECTIVE_REFILL) {
        if (scoot.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(container);
        }
      }

      if (scoot.memory.objective === ChargeController.OBJECTIVE_CHARGE) {
        const move = scoot.upgradeController(this.getController());
          if (move === ERR_NOT_IN_RANGE) {
            scoot.moveTo(this.getController());

          }
      }
    });
  }
}
