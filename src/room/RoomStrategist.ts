import ChargeController from "../behaviour/ChargeController";
import HarvestSource from "../behaviour/HarvestSource";
import RoomController from "./RoomController";

export default class RoomStrategist {
  public static STRAT_HARVEST_FIRST_SOURCE ="first_source";
  public static STRAT_BUILD_REPAIR ="build_repair";
  public static STRAT_HARVEST_ALL_SOURCES ="all_sources";
  public static STRAT_UPGRADE_CHARGER = 'charger_local';
  public static STRAT_NONE ="none";

  public static nextStrategy(roomController: RoomController) {

    roomController.state.expectedHarvesters = 1;

    // Wait until the first source is fully harvested
    if (!roomController.firstSourceFullyHarvested()) {
      return;
    }

    // Once the first source is fully harvested, we start charging the controller
    roomController.state.expectedChargerCount = 1;

    // We also setup repair
    roomController.state.expectedRepairers = 1;

    // We fully harvest all source
   roomController.state.expectedHarvesters = roomController.getAllSourcesCount();

   // Wait for all the sources to be harvested
   if (roomController.getFreeSourcesCount() !== 0) {
     return;
   }

    if (roomController.isAttacked()) {
      roomController.state.expectedDefendersCount = 2;
    }

    roomController.state.expectedChargerCount = 3;
    roomController.state.expectedLogisticCount = 2;
    roomController.state.expectedBuilders = 1;
    roomController.state.expectedRepairers = 1;

    if (roomController.getStoredEnergy() < 200 ) {
      roomController.state.expectedLogisticCount = 1;
    }

    if (roomController.getStoredEnergy() > 2000) {
      roomController.state.expectedChargerCount = 4;
      roomController.state.expectedLogisticCount = 5;
    }

    // create the controller container
    roomController.state.ensureControllerContainer = true;

    if (!roomController.isControllerContainerCreated()) {
     return;
    }

    roomController.state.ensureRoadNetwork = true;

    if (Object.keys(Game.rooms).length < Game.gcl.level) {
      roomController.state.scoot = true;
    }
  }
}
