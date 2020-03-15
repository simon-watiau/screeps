import _ from "lodash";

export default class Scoot {

  public static ROLE = 'scoot';
  public static STATE_TRAVELLING = 'travelling';
  public static STATE_INIT = 'init';
  public static META_MAP = 'map';

  private scootId: Id<Creep>;
  private visitedRooms: string[];
  private map: string[];

  constructor(scoot: Creep) {
    this.scootId = scoot.id;
    scoot.memory.role =  Scoot.ROLE;
    this.visitedRooms = [scoot.room.name];
    this.map = [];

    this.completeMap();
  }

  public getScoot() :Creep {
    const scoot = Game.getObjectById(this.scootId);
    if (!scoot) {
      throw new Error();
    }
    return scoot;
  }

  private completeMap() {
    const roomRegex = /^W([0-9]+)N([0-9]+)$/g;
    const match = roomRegex.exec(this.getScoot().name);
    if (match === null) {
      return;
    }
    if (match.length === 3) {
      const w:number = Number(match[1]);
      const n:number = Number(match[2]);


      this.map.push("W" + (w - 1) + "N" + (n));
      this.map.push("W" + (w - 1) + "N" + (n + 1));

      this.map.push("W" + (w - 1) + "N" + (n - 1));

      this.map.push("W" + w + "N" + (n - 1));
      this.map.push("W" + w + "N" + (n + 1));

      this.map.push("W" + (w + 1) + "N" + (n - 1));
      this.map.push("W" + (w + 1) + "N" + (n));
      this.map.push("W" + (w + 1) + "N" + (n + 1));

      this.map = this.map.filter((elem, index, self) => {
        return index === self.indexOf(elem) && !this.visitedRooms.includes(elem);
      });
    }
  }

  public getDestination(): string|undefined {
    if (this.map.length === 0) {
      return undefined;
    }
    return this.map[0];
  }

  public static getAllScoots(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === Scoot.ROLE);
  }

  public visit() {
    this.completeMap();
    const destination = this.getDestination();
    if (destination) {
      this.getScoot().moveTo(new RoomPosition(15,15, destination));
    }
  }

}
