import Intel from "../../Intel";
import CreepsIndex from "../../population/CreepsIndex";
import getCreepByRole from "../../utils/creeps/getCreepByRole";
import getCreepRole from "../../utils/creeps/getCreepRole";
import FlagsConstants from "../../utils/flagsConstants";

export default class MapRoom {
  private static ROLE = 'map_room';
  private targetPos: RoomPosition;

  constructor(targetPos: RoomPosition) {
    this.targetPos = targetPos;
  }

  public getCreep() : Creep|undefined {
    return getCreepByRole(MapRoom.ROLE, this.targetPos.x + '-' + this.targetPos.y + "-" + this.targetPos.roomName);
  }

  public static getAllPosToBeMapped(): RoomPosition[] {
    const positions:RoomPosition[] = [];

    FlagsConstants.getPosToMap().forEach((p: RoomPosition) => {
      positions.push(p);
    });

    return positions;
  }

  public costMatrix() {
    const opts: PathFinderOpts = {

    };
  }

  public tick() {
    const creep = this.getCreep();

    if (!creep) {
      CreepsIndex.getInstance().requestMapper(
        this.targetPos,
        (c: Creep) => {
          c.memory.role = getCreepRole(MapRoom.ROLE, this.targetPos.x + '-' + this.targetPos.y + "-" + this.targetPos.roomName)
        }
      );
      return;
    }

    if (creep.spawning) {
      return;
    }

    if (creep.room.name === this.targetPos.roomName) {
      Intel.mapRoom(creep.room);
    }

    creep.say("coucou");

    creep.moveTo(this.targetPos, {
      costCallback: (roomName: string, costMatrix: CostMatrix): boolean|CostMatrix => {
        const shouldVisit = roomName === this.targetPos.roomName || !MapRoom.getAllPosToBeMapped().map((p: RoomPosition) => p.roomName).includes(roomName);
        if (!shouldVisit) {
          for (let x =0; x< 49; x++) {
            for (let y =0; y< 49; y++) {
              costMatrix.set(x,y,0xff);
            }
          }
        }
        return costMatrix;
      }
    } as MoveToOpts);
  }
}
