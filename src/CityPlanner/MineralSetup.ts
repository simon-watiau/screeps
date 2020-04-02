export default class SourcesContainer {

  public static buildSite(mineralId: Id<Mineral>) {
    const mineral = Game.getObjectById(mineralId);
    if (mineral === null) {
      throw new Error("Mineral does not exist");
    }

    const hasExtractorConstructionSite = mineral.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: (a: ConstructionSite) => a.structureType === STRUCTURE_EXTRACTOR}).length !== 0;
    const hasExtractor = mineral.pos.findInRange(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_EXTRACTOR}).length !== 0;

    const hasContainerConstructionSite = mineral.pos.findInRange(FIND_CONSTRUCTION_SITES, 1, { filter: (a: ConstructionSite) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;
    const hasContainer = mineral.pos.findInRange(FIND_STRUCTURES, 1, { filter: (a: OwnedStructure) => a.structureType === STRUCTURE_CONTAINER}).length !== 0;

    if (!hasExtractorConstructionSite && !hasExtractor) {
      mineral.pos.createConstructionSite(STRUCTURE_EXTRACTOR);
    }

    if (!hasContainer && !hasContainerConstructionSite) {
      const containerPos = this.findPosition(mineral.pos);
      if (containerPos) {
        containerPos.createConstructionSite(STRUCTURE_CONTAINER);
      }
    }
  }

  private static findPosition(position: RoomPosition) {
      const room = Game.rooms[position.roomName];

      if (!room) {
        throw new Error("Room not found");
      }

      const controller = room.controller;

      if (!controller) {
        throw new Error("Controller not found");
      }

    const opts: PathFinderOpts = {
      roomCallback: (roomName: string): boolean|CostMatrix => {


        const costs = new PathFinder.CostMatrix;

        room.find(FIND_STRUCTURES).forEach((struct: Structure)  => {
          if (struct.structureType === STRUCTURE_CONTAINER ||
            (struct.structureType === STRUCTURE_RAMPART &&
              !(struct instanceof OwnedStructure))) {
           // costs.set(struct.pos.x, struct.pos.y, 0xff);
          }
        });

        return costs;
      }
    };

    const ret = PathFinder.search(
      controller.pos, { pos: position, range: 1 }, opts
    );

    if (ret.path && ret.path.length >= 1) {
      return ret.path[ret.path.length - 1];
    }

    return undefined;
  }
}
