import _ from "lodash";
import {Logger} from "typescript-logging";
import CreepsIndex from "../population/CreepsIndex";
import {factory} from "../utils/ConfigLog4J";

export default class Defend {
  private static STRIKE_BACK_BENARD = 'W7N7';

  public static ROLE = 'defend';

  private roomName: string;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("builder." + roomName);
  }

  public getDefenders(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === Defend.ROLE && c.room.name === this.roomName);
  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];
    if (!room) {
      throw new Error("Room does not exist");
    }
    return room;
  }

  protected findEnemies(position: RoomPosition): AnyCreep|Structure|null {
    return position.findClosestByRange(FIND_HOSTILE_SPAWNS) ||
      position.findClosestByRange(FIND_HOSTILE_CREEPS) ||
      position.findClosestByRange(FIND_HOSTILE_POWER_CREEPS);
  }

  public defend(count: number) {
    if (count === 0) {
      return;
    }
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
            creep.memory.role = Defend.ROLE;
          }
        );
    }

    defenders.forEach((scoot: Creep) => {
      if (scoot.spawning) {
        return;
      }

      const enemy = this.findEnemies(scoot.pos);
      if (enemy) {
        if (scoot.attack(enemy) === ERR_NOT_IN_RANGE) {
          scoot.moveTo(enemy.pos);
        }
      }else {
        if (scoot.room.name === Defend.STRIKE_BACK_BENARD) {
          const strokeBackEnemy = this.findEnemies(scoot.pos);
          if (strokeBackEnemy) {
            if (scoot.attack(strokeBackEnemy) === ERR_NOT_IN_RANGE) {
              scoot.moveTo(strokeBackEnemy.pos);
            }
          }
        } else {
          scoot.moveTo(new RoomPosition(15,15, Defend.STRIKE_BACK_BENARD));
        }
      }
    });
  }
}
