import findCloseBuildSite from "../utils/findCloseBuildSite";
import findStorage from "../utils/findStorage";
import findTerminal from "../utils/findTerminal";

export default class CreateTerminal {
  public static placeTerminal(room: Room) {
    if (!room.controller || room.controller.level < 6) {
      return;
    }

    if (!!findTerminal(room) || room.find(FIND_CONSTRUCTION_SITES, {filter: object => object.structureType === STRUCTURE_TERMINAL}).length !== 0) {
      return;
    }
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
