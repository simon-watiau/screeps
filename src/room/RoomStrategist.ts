import Banker from "../Banker";
import RoomController from "./RoomController";

export default class RoomStrategist {
  public static STRAT_HARVEST_FIRST_SOURCE ="first_source";
  public static STRAT_BUILD_REPAIR ="build_repair";
  public static STRAT_HARVEST_ALL_SOURCES ="all_sources";
  public static STRAT_UPGRADE_CHARGER = 'charger_local';
  public static STRAT_NONE ="none";

  public static nextStrategy(roomController: RoomController) {

    // setup defense
    if (roomController.isAttacked()) {
      if (!roomController.hasTower() || roomController.attackDuration() > 10 ) {
      //   roomController.state.expectedDefendersCount = 2;
      //   roomController.triggerSafeModeIfAvailable();
      // }
      // if (roomController.attackDuration() > 30) {
        roomController.state.expectedDefendersCount = 5;
      // }
    }

    roomController.state.expectedHarvesters = 1;

    // When all are killed, we can reboot with the storages
    if (roomController.hasStorage() && (roomController.getStorage() as StructureStorage).store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      roomController.state.expectedLogisticCount = 3;
    }

    // Wait until the first source is fully harvested
    if (!roomController.firstSourceFullyHarvested()) {
      return;
    }

    // Logistic to bring back to the spawn
    roomController.state.expectedLogisticCount = 1;

    // Stop until we have at least one logistic and one harvester
    if (roomController.getLogisticsCount() < 1 || roomController.getHarvestersCount() < 1) {
      return;
    }

    // Then start building the controller container and wait for it
    roomController.state.expectedBuilders = 3;
    roomController.state.expectedChargerCount = 1;
    roomController.state.ensureControllerContainer = true;

    if (!roomController.isControllerContainerCreated()) {
      return;
    }
    roomController.state.expectedBuilders = 2;
    // Then add support creeps and fully harvest all sources
    roomController.state.expectedHarvesters = roomController.getAllSourcesCount();
    roomController.state.expectedLogisticCount = 2;

   // Wait for all the sources to be harvested
   if (roomController.getFreeSourcesCount() !== 0) {
     return;
   }

   // And then bump population
    roomController.state.expectedChargerCount = 3;
    roomController.state.expectedRepairers = roomController.hasTower() ? 0 : 1;
    roomController.state.ensureRoadNetwork = true;
    roomController.state.ensureTower = true;

    const controlledRooms = Object.keys(Game.rooms).filter((name: string) => {
      const room = Game.rooms[name];

      return room && room.controller && room.controller.my;
    }).length;


    roomController.state.scoot = controlledRooms < Game.gcl.level;

    // Until we have towers, spawn repairs
    if (!roomController.hasTower()) {
      roomController.state.expectedRepairers = 3;
    }

    if (roomController.getController().level >= 6) {
      roomController.state.ensureExtractor = true;
      roomController.state.expectedMineralLogisticCount = 1;
    }

    if (roomController.getController().level >= 4) {
      roomController.state.ensureStorage = true;
    }

    if (roomController.getController().level >= 4) {
      roomController.state.ensureTerminal = true;
    }

    // if (roomController.getController().level >= 2) {
    //   roomController.state.ensureWalls = true;
    // }

    // Adapt on demand
    if (roomController.needAdvancedBuilder()) {
      roomController.state.expectedBuilders = 4;
    }

    // Every 20 ticks eval the need for logistics
    if (Game.time % 20 === 0) {
      if (roomController.getEnergyInTransit() > 300 * roomController.getHarvestedSourcesCount()) {
        roomController.state.expectedLogisticCount = Math.max(8, roomController.getLogisticsCount() + 1);
      } else {
        roomController.state.expectedLogisticCount = Math.min(1, roomController.getLogisticsCount() -1);
      }
    }
  }
}
