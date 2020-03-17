import _ from "lodash";

export default class Scoot {

  public static ROLE = 'scoot';
  public static META_VISITED_ROOMS = 'visited';
  public static META_DESTINATION = 'destination';

  private scootId: Id<Creep>;

  constructor(scoot: Creep) {
    this.scootId = scoot.id;

    scoot.memory.role =  Scoot.ROLE;
    this.getScoot().memory.meta = this.getScoot().memory.meta || {};
    this.getScoot().memory.meta[Scoot.META_VISITED_ROOMS] = this.getScoot().memory.meta[Scoot.META_VISITED_ROOMS] || [];

    this.getScoot().memory.meta[Scoot.META_VISITED_ROOMS].push(scoot.room.name);
  }

  public getScoot() :Creep {
    const scoot = Game.getObjectById(this.scootId);
    if (!scoot) {
      throw new Error();
    }
    return scoot;
  }

  private getDestination() {
    if (
      this.getScoot().room.name !== this.getScoot().memory.meta[Scoot.META_DESTINATION] &&
      this.getScoot().memory.meta[Scoot.META_DESTINATION] !== undefined) {
      return this.getScoot().memory.meta[Scoot.META_DESTINATION];
    }

    this.getScoot().memory.meta[Scoot.META_VISITED_ROOMS].push(this.getScoot().room.name);

    const roomRegex = /^W([0-9]+)N([0-9]+)$/g;
    const match = roomRegex.exec(this.getScoot().room.name);
    if (match === null) {
      return;
    }
    if (match.length === 3) {
      const w:number = Number(match[1]);
      const n:number = Number(match[2]);

      let map = [];
      map.push("W" + (w - 1) + "N" + (n));
      map.push("W" + w + "N" + (n - 1));
      map.push("W" + w + "N" + (n + 1));
      map.push("W" + (w + 1) + "N" + (n));

      map = map.filter((elem, index, self) => {
        return index === self.indexOf(elem) && !this.getScoot().memory.meta[Scoot.META_VISITED_ROOMS].includes(elem);
      });

      map = Scoot.shuffleArray(map);

      if (map.length === 0) {
        return undefined;
      }

      this.getScoot().memory.meta[Scoot.META_DESTINATION] = map[0];

      return map[0];
    }
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
  public static getAllScoots(): Creep[] {
    return  _.filter(Game.creeps, (c: Creep) => c.memory.role === Scoot.ROLE);
  }

  public visit() {
    const controller = this.getScoot().room.controller;

    if (controller && controller.owner === undefined) {
      if (!this.getScoot().claimController(controller)) {
        this.getScoot().moveTo(controller.pos);
      }
      return;
    }

    const destination = this.getDestination();
    if (destination) {
      if(this.getScoot().moveTo(new RoomPosition(10,10, destination)) === ERR_NO_PATH){
        this.getScoot().memory.meta[Scoot.META_VISITED_ROOMS].push(this.getScoot().room.name);
      }
    }
  }

}
