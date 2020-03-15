import ChargeController from "../behaviour/ChargeController";
import HarvestSource from "../behaviour/HarvestSource";
import RoomController from "./RoomController";

export default class RoomStrategist {
  public static STRAT_HARVEST_FIRST_SOURCE ="first_source";
  public static STRAT_BUILD_REPAIR ="build_repair";
  public static STRAT_HARVEST_ALL_SOURCES ="all_sources";
  public static STRAT_UPGRADE_CHARGER = 'charger_local';
  public static STRAT_NONE ="none";

  public static nextStrategy(roomController: RoomController):string {
    // Harvest first source
    if (roomController.getHarvestedSourcesCount() === 0 && roomController.getFreeSources().length > 0 && roomController.getFirstHarvesterState() === null) {
      return this.STRAT_HARVEST_FIRST_SOURCE;
    }

    if (roomController.getFirstHarvesterState() !== HarvestSource.STATE_WORKING) {
      return this.STRAT_NONE;
    }

    // Once the first source is fully harvested, we start charging the controller
    roomController.chargerCount = 3;

    // We also setup repair
    if (!roomController.hasRepair() &&  roomController.getFirstHarvesterState() === HarvestSource.STATE_WORKING) {
      return this.STRAT_BUILD_REPAIR;
    }

    // We fully harvest all source
    if (roomController.getFreeSources().length !== 0) {
      return this.STRAT_HARVEST_ALL_SOURCES;
    }

    // Add logistic when containers start to filling up
    const energy = roomController.getStoredEnergy();

    if (energy < 200) {
      roomController.logisticCount = 0;
    }
    if (energy > 200) {
      roomController.logisticCount = 2;
    }
    if (energy > 400) {
      roomController.logisticCount = 3;
    }

    if (energy > 800) {
      roomController.logisticCount = 4;
    }

    return this.STRAT_NONE;
  }
}
