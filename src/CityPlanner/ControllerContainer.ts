import findCloseBuildSite from "../utils/findCloseBuildSite";

export default class ControllerContainer {

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

    findCloseBuildSite(controller.pos, r => {
      return r.createConstructionSite(STRUCTURE_CONTAINER) === OK;
    });
  }
}
