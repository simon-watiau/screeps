import findCloseBuildSite from "../utils/findCloseBuildSite";
import findStorage from "../utils/findStorage";

export default class CreateTerminal {
  public static placeTerminal(room: Room) {
    const storage = findStorage(room);

    if (!storage) {
      return;
    }
    findCloseBuildSite(storage.pos,
      (r: RoomPosition) => {
        return r.createConstructionSite(STRUCTURE_TERMINAL) === OK;
    });
  }
}
