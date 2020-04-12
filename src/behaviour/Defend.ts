import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";

export default class Defend {

  public static ROLE = 'defend';

  private roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("defend." + roomName);
  }

  public getDefenders(): Creep[] {
    return  getCreepsByRole(Defend.ROLE, this.roomName);
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  protected findEnemies(position: RoomPosition): AnyCreep|Structure|null {
    const opts = {filter: (o: RoomObject) => o.pos.x > 2 && o.pos.x < 38 && o.pos.y > 2 && o.pos.y < 38};
    return position.findClosestByRange(FIND_HOSTILE_STRUCTURES, opts) ||
      position.findClosestByRange(FIND_HOSTILE_SPAWNS, opts) ||
      position.findClosestByRange(FIND_HOSTILE_CREEPS, opts) ||
      position.findClosestByRange(FIND_HOSTILE_POWER_CREEPS, opts);
  }

  public defend(count: number) {
    const defenders = this.getDefenders();

    if (defenders.length < count) {
      const index = CreepsIndex.getInstance();
      index.requestDefender(
        new RoomPosition(
          15,
          15,
          this.roomName
        ),
          creep => {
            creep.memory.role = getCreepRole(Defend.ROLE, this.roomName)
          }
        );
    }

    defenders.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      const enemy = this.findEnemies(scoot.pos);

      if (enemy) {
        if (scoot.attack(enemy) !== OK && scoot.rangedAttack(enemy) !== OK) {
          scoot.moveTo(enemy.pos);
        }
      } else {
        scoot.moveTo(new RoomPosition(10,10, 'W7N9'));
      }
    });
  }
}
