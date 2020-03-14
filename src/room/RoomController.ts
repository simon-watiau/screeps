import {Logger} from "typescript-logging";
import ChargeController from "../behaviour/ChargeController";
import HarvestSource from "../behaviour/HarvestSource";
import {factory} from "../utils/ConfigLog4J";
import RoomStrategist from "./RoomStrategist";


class RoomController {
  private roomName: string;
  private harvesters: HarvestSource[] = [];
  private charger: ChargeController|undefined;
  private logger: Logger;

  constructor(roomName: string) {
    this.roomName = roomName;

    this.logger = factory.getLogger("room." + this.roomName);

    if (!Memory.terraformedRoom[this.roomName]) {

      Memory.terraformedRoom[this.roomName] = {
        controller: undefined,
        harvesters: []
      };
    }

    // @ts-ignore
    Memory.terraformedRoom[this.roomName].harvesters.forEach((sourceId: Id<Source>) => {
      const source = Game.getObjectById<Source>(sourceId);
      if (!source) {
        throw new Error('source not found');
      }

      this.harvesters.push(new HarvestSource(source.id));
    });
  }

  public tick() {
    const strat = RoomStrategist.nextStrategy(this);

    if (strat !== RoomStrategist.STRAT_NONE) {
      this.logger.info('Room ' + this.roomName + ' switch to strategy ' + strat);
    }

    if (strat === RoomStrategist.STRAT_HARVEST_FIRST_SOURCE) {
      const source = this.getFreeSources()[0];
      this.harvesters.push(new HarvestSource(source.id));
      this.getRoomMemory().harvesters.push(source.id);
    }

    if (strat === RoomStrategist.STRAT_BUILD_CONTROLLER_KEEPER) {
      const controllerId = this.getControllerId();
      this.charger = new ChargeController(controllerId);
      this.getRoomMemory().controller = controllerId;
    }

    if (strat === RoomStrategist.STRAT_HARVEST_ALL_SOURCES) {
      const source = this.getFreeSources()[0];
      this.harvesters.push(new HarvestSource(source.id));
      this.getRoomMemory().harvesters.push(source.id);
    }

    this.harvesters.forEach((harvester: HarvestSource) => {
      harvester.tick();
    });

    if (this.charger) {
      this.charger.tick()
    }

  }

  private getRoom(): Room {
    const room = Game.rooms[this.roomName];

    if (!room) {
      throw new Error("room not found");
    }

    return room;
  }

  public getHarvestedSourcesCount(): number {
    return this.getRoomMemory().harvesters.length;
  }

  public getFirstHarvesterState(): string|null {
    if (this.harvesters.length > 1) {
      this.logger.error('More than one harvester are already working');
    }

    if (this.harvesters.length === 0) {
      return null;
    }

    return this.harvesters[0].latestState;
  }

  public isControllerUpgraded(): boolean {
    return !!this.getRoomMemory().controller;
  }

  public getFreeSources(): Source[] {
    return this.getRoom().find(FIND_SOURCES).filter((s: Source) => {
      return !this.getRoomMemory().harvesters.includes(s.id);
    });
  }

  public getControllerId(): Id<StructureController> {
    const controller = this.getRoom().controller;
    if (!controller) {
      this.logger.error('Room does not have a controller');

      throw new Error("This room doesn't have a controller");
    }
    return controller.id;
  }

  public getRoomMemory(): RoomMemory {

    let memory = Memory.terraformedRoom[this.roomName];
    if (!memory) {
      memory = {
        harvesters: []
      };
      Memory.terraformedRoom[this.roomName] = memory;
    }

    return memory;
  }
}
export default RoomController;
