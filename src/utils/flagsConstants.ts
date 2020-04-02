export default class FlagsConstants {
  public static FLAG_MAP = COLOR_BLUE;
  public static FLAG_AVOID = COLOR_PURPLE;
  public static FLAG_REMOTE_HARVEST = COLOR_YELLOW;

  public static getPosToMap(): RoomPosition[] {
    const positions: RoomPosition[] = [];
    Object.values(Game.flags).filter((f: Flag) => f.color === this.FLAG_MAP).forEach((f: Flag) => {
      positions.push(f.pos);
    });

    return positions;
  }

  public static getPosToAvoid(): string[] {
    const roomNames: string[] = [];
    Object.values(Game.flags).filter((f: Flag) => f.color === this.FLAG_AVOID).forEach((f: Flag) => {
      roomNames.push(f.pos.roomName);
    });

    return roomNames;
  }

  public static getRemoteSourcesPos(): RoomPosition[] {
    const sources: RoomPosition[] = [];
    Object.values(Game.flags).filter((f: Flag) => f.color === this.FLAG_REMOTE_HARVEST).forEach((f: Flag) => {
      sources.push(f.pos);
    });

    return sources;
  }
}
