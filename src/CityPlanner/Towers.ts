export default class Towers {
  public static CENTER = 20;

  // build in circle
  public static buildSite(room: Room) {
    let keepLooking = true;
    for (let i = 0; keepLooking && i < 20; i++) {
      for (let x = this.CENTER - i; x <= this.CENTER + i && keepLooking; x++) {
        if (x === this.CENTER - i || x === this.CENTER + i) {
          keepLooking = keepLooking && !this.buildAtPosition(
            room,
            new RoomPosition(x, this.CENTER, room.name)
          );

        } else {
          keepLooking = keepLooking && !this.buildAtPosition(
            room,
            new RoomPosition(x, this.CENTER - i - Math.abs(x-this.CENTER), room.name)
          );
          keepLooking = keepLooking && !this.buildAtPosition(
            room,
            new RoomPosition(x, this.CENTER - i - Math.abs(x-this.CENTER), room.name)
          );
        }
      }
    }
  }

  private static buildAtPosition(room: Room, r: RoomPosition): boolean {

    const res = r.createConstructionSite(STRUCTURE_TOWER);

    return res === ERR_FULL || res === OK || res === ERR_RCL_NOT_ENOUGH;
  }

  private static isPositionEmpty(room: Room, pos: RoomPosition): boolean {
    return room.lookAt(new RoomPosition(pos.x, pos.y, room.name)).filter((el) => {
      const isValid = el.terrain === "plain" || el.terrain === "swamp" || !!el.creep;
      return !isValid;
    }).length === 0;
  }
}
