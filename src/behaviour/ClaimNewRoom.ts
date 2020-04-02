import _ from "lodash";
import CreepsIndex from "../population/CreepsIndex";
import getCreepRole from "../utils/creeps/getCreepRole";
import getCreepsByRole from "../utils/creeps/getCreepsByRole";

export default class ClaimNewRoom {

  public static ROLE = 'scoot';
  public static META_VISITED_ROOMS = 'visited';
  public static META_DESTINATION = 'destination';


  private roomName: string;

  constructor(roomName: string) {
    this.roomName = roomName;
  }

  public getScoot(): Creep|undefined {
      const scoots =  getCreepsByRole(ClaimNewRoom.ROLE, this.roomName);
      if (scoots.length > 0) {
        return scoots[0];
      }

      return undefined;
  }

  private getDestination(): RoomPosition|undefined {

    if (Game.flags.terraform) {
      return Game.flags.terraform.pos;
    }

    return undefined;
  }

  private static shuffleArray(array: string[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  public visit() {
    const scoot = this.getScoot();

    if (scoot) {
      scoot.memory.meta = {};
    }

    const destination = this.getDestination();

    if (!destination) {
      return;
    }

    if (!scoot) {
      if (destination) {
        const index = CreepsIndex.getInstance();
        index.requestClaim(destination, creep => {
          creep.memory.role = getCreepRole(ClaimNewRoom.ROLE, this.roomName);
        });
      }

      return;
    }
    console.log(scoot.pos);
    if (scoot.room.name !== destination.roomName) {
      scoot.moveTo(destination);
      return;
    }

    const controller = scoot.room.controller;
    if (!controller) {
      throw new Error("failed to get controller");
    }

    if (scoot.claimController(controller) === ERR_NOT_IN_RANGE) {
      scoot.moveTo(controller);
    }
  }
}
