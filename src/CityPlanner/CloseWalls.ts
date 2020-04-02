
export default class CloseWalls {
  public static ROOM_SIZE = 40;
  public static BORDER = 3;

  public static getRoomSize(): number {
    return 50;
  }
  public static placeWalls(room: Room) {

      room.find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_WALL}).forEach((s) => {
        s.destroy();
      });

    return;
  //   const spawns = room.find(FIND_MY_SPAWNS);
  //
  //   if (spawns.length === 0) {
  //     return;
  //
  //   }
  //
  //   for (const x of [this.BORDER, CloseWalls.getRoomSize() - this.BORDER]) {
  //     for (let y = this.BORDER; y < CloseWalls.getRoomSize() - this.BORDER; y++) {
  //       const position = new RoomPosition(x, y, room.name);
  //       if (CloseWalls.isPositionEmpty(room, position)) {
  //         position.createConstructionSite(y % 4 === 0 ? STRUCTURE_RAMPART : STRUCTURE_WALL);
  //       }
  //     }
  //   }
  //
  //   for (const y of [this.BORDER, CloseWalls.getRoomSize() - this.BORDER]) {
  //     for (let x = this.BORDER; x < CloseWalls.getRoomSize() - this.BORDER; x++) {
  //       const position = new RoomPosition(x, y, room.name);
  //       if (CloseWalls.isPositionEmpty(room, position)) {
  //         position.createConstructionSite(x % 4 === 0 ? STRUCTURE_RAMPART : STRUCTURE_WALL);
  //       }
  //     }
  //   }
  // }
  //
  // private static isPositionEmpty(room: Room, pos: RoomPosition): boolean {
  //   return room.lookAt(new RoomPosition(pos.x, pos.y, room.name)).filter((el) => {
  //     const isValid = el.terrain === "plain" || el.terrain === "swamp" || !!el.creep;
  //     return !isValid;
  //   }).length === 0;
  }
}
