import findStorage from "../utils/findStorage";

export default class CreateExtension {
  public static placeStorage(room: Room) {
    if (!!findStorage(room) || room.find(FIND_CONSTRUCTION_SITES, {filter: object => object.structureType === STRUCTURE_STORAGE}).length !== 0) {
      return;
    }

    const spawns = room.find(FIND_MY_SPAWNS);

    if (spawns.length === 0) {
      return;
    }

    const roomSpawn = spawns[0];

    for (let i = 1; i < 40; i++) {
      for (let x = roomSpawn.pos.x - i; x <= roomSpawn.pos.x + i; x+=2) {
        for (let y = roomSpawn.pos.y - i; y <= roomSpawn.pos.y + i; y+=2) {
          if (x > 5 && x < 43 && y > 5 && y < 43) {
            const candidatePosition = new RoomPosition(x, y, room.name);
            const res = candidatePosition.createConstructionSite(STRUCTURE_STORAGE);
            if (res === ERR_FULL || res === OK || res === ERR_RCL_NOT_ENOUGH) {
              return;
            }
          }
        }
      }
    }
  }

  private static isPositionEmpty(room: Room, pos: RoomPosition): boolean {
    return room.lookAt(new RoomPosition(pos.x, pos.y, room.name)).filter((el) => {
      const isValid = el.terrain === "plain" || el.terrain === "swamp" || !!el.creep;
      return !isValid;
    }).length === 0;
  }
}
