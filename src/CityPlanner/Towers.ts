import findCloseBuildSite from "../utils/findCloseBuildSite";

export default class Towers {
  public static CENTER = 20;

  // build in circle
  public static buildSite(room: Room) {
    if (!room.controller) {
      throw new Error("no controller");
    }

    let maxTowers = 0;

    if (room.controller.level >= 3) {
      maxTowers += 1;
    }
    if (room.controller.level >= 5) {
      maxTowers += 1;
    }
    if (room.controller.level >= 7) {
      maxTowers += 1;
    }
    if (room.controller.level >= 8) {
      maxTowers += 3;
    }

    const exitingTowers = room.find(FIND_MY_STRUCTURES, {filter: object => object.structureType === STRUCTURE_TOWER}).length;
    const towersBeingBuilt = room.find(FIND_CONSTRUCTION_SITES, {filter: object => object.structureType === STRUCTURE_TOWER}).length;

    if (exitingTowers + towersBeingBuilt >= maxTowers) {
      return;
    }

    findCloseBuildSite(
      new RoomPosition(20, 20, room.name),
      (r: RoomPosition) => {
        return r.createConstructionSite(STRUCTURE_TOWER) === OK;
      },
      3
    );
  }
}
