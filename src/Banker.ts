import {Logger} from "typescript-logging";
import CreepsIndex from "./population/CreepsIndex";
import RoomController from "./room/RoomController";
import {factory} from "./utils/ConfigLog4J";

class FinancesState {
  public currentEnergyAvailable: number;
  public maxCapacity: number;
  public percentageUsed: number;

  constructor(roomController: RoomController) {
    this.currentEnergyAvailable = roomController.getRoom().energyAvailable;
    this.maxCapacity = roomController.getRoom().energyCapacityAvailable;
    this.percentageUsed = this.currentEnergyAvailable / this.maxCapacity;
  }
}

interface Financing {
  type: string;
  amount: number;
}

// tslint:disable-next-line:max-classes-per-file
export default class Banker {

  public static TYPE_HARVESTER = 'harvester';
  public static TYPE_REMOTE_HARVESTER = 'remote_harvester';
  public static TYPE_REPAIR = 'repair';
  public static TYPE_LOGISTIC = 'logistic';
  public static TYPE_CHARGER = 'charger';
  public static TYPE_BUILDER = 'builder';
  public static TYPE_CLAIM = 'claim';
  public static TYPE_DEFEND = 'defend';
  public static TYPE_ATTACK = 'attack';
  public static TYPE_TANK = 'tank';
  public static TYPE_BOOTSTRAP = 'bootstrap';
  public static TYPE_MAPPER = 'mapper';


  public static PRIORITIES = {
    [Banker.TYPE_DEFEND]: 7,
    [Banker.TYPE_HARVESTER]: 6,
    [Banker.TYPE_CHARGER] : 5,
    [Banker.TYPE_LOGISTIC] : 4,
    [Banker.TYPE_REPAIR] : 3,
    [Banker.TYPE_BUILDER] : 2,
    [Banker.TYPE_BOOTSTRAP]  : 1,
    [Banker.TYPE_CLAIM]  : 0,
    [Banker.TYPE_REMOTE_HARVESTER] : -1,
    [Banker.TYPE_TANK]  : -2,
    [Banker.TYPE_ATTACK]  : -3,
    [Banker.TYPE_MAPPER]  : -4,
  };

  private static MAX_HISTORY_SIZE = 50;
  private static MAX_ENERGY_FOR_HARVESTER = 800;
  private static MAX_ENERGY_FOR_CHARGER = 1200;

  private static bankers: Map<string, Banker> = new Map<string, Banker>();
  private roomName: string;
  private history:FinancesState[] = [];
  private logger: Logger;

  public static getInstance(roomName: string): Banker {
    let banker = Banker.bankers.get(roomName);

    if (!banker) {
      banker = new Banker(roomName);

      Banker.bankers.set(roomName, banker);
    }

    return banker;
  }

  public needCash(): boolean {
    return this.getLastHistoryItem().percentageUsed < 1;
  }

  public extremeNeedCash(): boolean {
    return this.getLastHistoryItem().percentageUsed < 0.1;
  }

  constructor(roomName: string) {
    this.roomName = roomName;
    this.logger = factory.getLogger("banker." + roomName);
  }

  public getFinancing(types: string[]): Financing|undefined {
    const sortedTypes = types.sort((a: string, b: string) => {
      return Banker.PRIORITIES[b] - Banker.PRIORITIES[a];
    });
    if (sortedTypes.length === 0) {
      return;
    }
    const mostImportantType = sortedTypes[0];

    const financing:Financing = {
      amount: -1,
      type: mostImportantType
    };

    this.logger.info("requested financing for: " + JSON.stringify(types));

    switch (mostImportantType) {
      case Banker.TYPE_DEFEND:
        financing.amount = this.currentEnergy();
        break;
      case Banker.TYPE_HARVESTER: {
        const energy = this.currentEnergy();
        if (energy >= Banker.MAX_ENERGY_FOR_HARVESTER) {
          financing.amount = Banker.MAX_ENERGY_FOR_HARVESTER;
        }else {
          const timeUntilFullSize = (energy - Banker.MAX_ENERGY_FOR_HARVESTER) / this.averageEnergyGainedPerTick();
          if (this.averageEnergyGainedPerTick() === 0 || timeUntilFullSize > 10 || this.maxCapacity() < Banker.MAX_ENERGY_FOR_HARVESTER) {
            financing.amount = energy;
          } else {
            financing.amount = 0;
          }
        }
      }
        break;
      case Banker.TYPE_CHARGER: {
        const energy = this.currentEnergy();
        if (energy > Banker.MAX_ENERGY_FOR_CHARGER) {
          financing.amount = Banker.MAX_ENERGY_FOR_CHARGER;
        } else {
          const timeUntilFullSize = (energy - Banker.MAX_ENERGY_FOR_CHARGER) / this.averageEnergyGainedPerTick();
          if (this.averageEnergyGainedPerTick() === 0 || timeUntilFullSize > 10 || this.maxCapacity() < Banker.MAX_ENERGY_FOR_CHARGER) {
            financing.amount = energy;
          } else {
            financing.amount = 0;
          }
        }
      }
        break;
      case Banker.TYPE_TANK:
      case Banker.TYPE_ATTACK: {
        const isFull = this.getLastHistoryItem().percentageUsed === 1;
        if (isFull) {
          financing.amount = this.getLastHistoryItem().currentEnergyAvailable - this.defenseBudget();
        } else {
          financing.amount = 0;
        }
      }
        break;
      case Banker.TYPE_MAPPER: {
        const energy = this.getLastHistoryItem().currentEnergyAvailable - this.defenseBudget();
        if (energy >= 100) {
          financing.amount = 100;
        } else {
          financing.amount = 0;
        }
      }
        break;
      case Banker.TYPE_REMOTE_HARVESTER: {
        // Spawn a lot of them but weak, since they are mostly going to travel
        const energy = this.getLastHistoryItem().currentEnergyAvailable - this.defenseBudget();
        if (energy >= 300) {
          financing.amount = 300;
        } else {
          financing.amount = 0;
        }
      }
        break;
      default: {
        let energy = this.currentEnergy();
        energy -= this.defenseBudget();
        if (energy >= 300) {
          financing.amount = Math.max(Math.min(energy, 800), 300); // never spend more than 800
        } else {
          financing.amount = 0
        }
      }
    }

    this.logger.info('FINANCING: '+ financing.type + " => " + financing.amount);

    return financing;
  }

  public dump() {
    this.logger.info("BANK:" + JSON.stringify({
      'current_energy': this.getLastHistoryItem().currentEnergyAvailable,
      'defense_budget': this.defenseBudget(),
      'income_rate': this.averageEnergyGainedPerTick(),
      'max_capacity': this.getLastHistoryItem().maxCapacity,
      'percentage_used': this.getLastHistoryItem().percentageUsed,
    }));
  }

  public pushToHistory(state: FinancesState): void {
    this.history.push(state);
    if (this.history.length > Banker.MAX_HISTORY_SIZE) {
      this.history.shift();
    }

    this.dump();
  }

  public updateBankerState(roomController: RoomController) {
      this.pushToHistory(new FinancesState(roomController));
  }

  private getLastHistoryItem(): FinancesState {
    return this.history[this.history.length - 1];
  }
  private isLoaded(): boolean {
    return this.history.length === Banker.MAX_HISTORY_SIZE;
  }

  public averageEnergyGainedPerTick() {
    return this.energyGainedLately() / Banker.MAX_HISTORY_SIZE;
  }

  public energyGainedLately() {
    if (this.history.length < 3) {
      return 0;
    }
    let latestValueToConsider = this.history[0].currentEnergyAvailable;
    let sum = 0;

    for (let i = 1; i < this.history.length; i++) {
      if (this.history[i].currentEnergyAvailable > latestValueToConsider) {
        sum += this.history[i].currentEnergyAvailable - latestValueToConsider;
      }

      latestValueToConsider = this.history[i].currentEnergyAvailable
    }

    return sum;
  }

  public currentEnergy():number {
    return this.getLastHistoryItem().currentEnergyAvailable;
  }

  public maxCapacity():number {
    return this.getLastHistoryItem().maxCapacity;
  }

  private isFull(): boolean {
    return this.currentEnergy() === this.maxCapacity();
  }

  public defenseBudget():number {
    if (this.getLastHistoryItem().maxCapacity < 600) {
      return 0;
    }

    if (this.needCash() && this.averageEnergyGainedPerTick() < 2) {
      return 0;
    }

    if (this.getLastHistoryItem().currentEnergyAvailable < 600) {
      return 0;
    }

    return 300;
  }
}
