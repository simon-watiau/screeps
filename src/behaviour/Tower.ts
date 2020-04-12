import {Logger} from "typescript-logging";
import {factory} from "../utils/ConfigLog4J";
import Repair from "./Repair";

export default class Tower {
  public roomName: string;
  private logger: Logger;
  private static MIN_RATIO_FOR_REPAIR = 0.80;

  constructor(roomName: string) {
    this.logger = factory.getLogger("tower." + roomName);
    this.roomName = roomName;
  }

  public getTowers(): StructureTower[] {
    return this.getRoom().find<StructureTower>(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_TOWER});
  }

  protected findEnemy(position: RoomPosition): AnyCreep|null {
    return position.findClosestByRange(FIND_HOSTILE_CREEPS) ||
      position.findClosestByRange(FIND_HOSTILE_POWER_CREEPS);
  }

  public static canRepair(tower: StructureTower): boolean {
    return (tower.store.getUsedCapacity(RESOURCE_ENERGY) || 0) / (tower.store.getCapacity(RESOURCE_ENERGY) || 1) > Tower.MIN_RATIO_FOR_REPAIR;
  }

  public static atRepairThreshold(tower: StructureTower): boolean {
    return (tower.store.getUsedCapacity(RESOURCE_ENERGY) || 0) / (tower.store.getCapacity(RESOURCE_ENERGY) || 1) > Tower.MIN_RATIO_FOR_REPAIR - 0.10;
  }

  public static asEmergencyRepairs(tower: StructureTower): boolean {
    return Repair.findInfraToRepair(tower.room) !== undefined;
  }

  public activate() {
    const towers = this.getTowers();

    towers.forEach((tower: StructureTower) => {

      const enemy = this.findEnemy(tower.pos);

      if (enemy) {
        tower.attack(enemy);
        return ;
      } else if (Tower.canRepair(tower)) {

        let toRepair = Repair.findInfraToRepair(this.getRoom());
        if (!toRepair) {
          toRepair = Repair.findStructureToRepair(this.getRoom());
        }

        if (toRepair) {
          tower.repair(toRepair);
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
}
