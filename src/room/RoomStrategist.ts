import HarvestSource from "../behaviour/HarvestSource";
import RoomController from "./RoomController";

export default class RoomStrategist {
  public static STRAT_HARVEST_FIRST_SOURCE ="first_source";
  public static STRAT_BUILD_CONTROLLER_KEEPER = 'build_controller_keeper';
  public static STRAT_HARVEST_ALL_SOURCES ="all_sources";
  public static STRAT_NONE ="none";

  public static nextStrategy(roomController: RoomController):string {
    if (roomController.getHarvestedSourcesCount() === 0 && roomController.getFreeSources().length > 0 && roomController.getFirstHarvesterState() === null) {
      return this.STRAT_HARVEST_FIRST_SOURCE;
    }
    if (roomController.getHarvestedSourcesCount() === 1 && roomController.getFirstHarvesterState() === HarvestSource.STATE_WORKING && !roomController.isControllerUpgraded()) {
      return this.STRAT_BUILD_CONTROLLER_KEEPER;
    }

    if (roomController.getFreeSources().length !== 0 && roomController.getFirstHarvesterState() === HarvestSource.STATE_WORKING) {
      return this.STRAT_HARVEST_ALL_SOURCES;
    }
    return this.STRAT_NONE;
  }
}
