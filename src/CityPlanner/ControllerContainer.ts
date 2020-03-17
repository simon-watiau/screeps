export default class SourcesContainer {

  public static buildSite(controllerId: Id<StructureController>) {
    const controller = Game.getObjectById(controllerId);
    if (controller === null) {
      throw new Error("Controller not found");
    }

    const hasConstructionSite = controller.pos.findInRange(FIND_CONSTRUCTION_SITES, 3, { filter: (a: ConstructionSite) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;
    const hasContainer = controller.pos.findInRange(FIND_STRUCTURES, 3, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;

    if (hasContainer || hasConstructionSite) {
      return;
    }

    const containerPos = this.findPosition(controller.pos);
    if (containerPos) {
      containerPos.createConstructionSite(STRUCTURE_CONTAINER);
    }
  }

  private static findPosition(position: RoomPosition) {
    const room = Game.rooms[position.roomName];

    if (!room) {
      throw new Error("Room not found");
    }

    const opts: PathFinderOpts = {
      roomCallback: (roomName: string): boolean|CostMatrix => {


        const costs = new PathFinder.CostMatrix;

        room.find(FIND_STRUCTURES).forEach((struct: Structure)  => {
          if (struct.structureType === STRUCTURE_CONTAINER ||
            struct.structureType === STRUCTURE_CONTROLLER ||
            (struct.structureType === STRUCTURE_RAMPART &&
              !(struct instanceof OwnedStructure))) {
            costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        });

        return costs;
      }
    };

    const ret = PathFinder.search(
      new RoomPosition(20,20, position.roomName), { pos: position, range: 1 }, opts
    );

    if (ret.path && ret.path.length >= 1) {
      return ret.path[ret.path.length - 1];
    }

    return undefined;
  }
}
