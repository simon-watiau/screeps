import {Logger} from "typescript-logging";

export default abstract class StateMachine {
  public latestState: string;
  protected logger: Logger;
  protected roomName: string;
  protected initState: string;
  private stateMachineName: string;

  constructor(stateMachineName:string, logger: Logger, roomName: string, initState: string) {
    this.logger = logger;
    this.roomName = roomName;
    this.initState = initState;
    this.stateMachineName = stateMachineName;
    this.latestState = this.getInitialState(initState);
  }

  private getInitialState(requestedState: string) {
    const roomMemory = Memory.terraformedRoom[this.roomName];
    if (!roomMemory) {
      throw new Error("Invalid room name");
    }

    return roomMemory.stateMachines[this.stateMachineName] || requestedState;
  }

  public getRoomMemory(): RoomMemory {
    const memory = Memory.terraformedRoom[this.roomName];
    if (!memory) {
     throw new Error('no memory');
    }

    return memory;
  }

  public reboot() {
    this.getRoomMemory().stateMachines[this.stateMachineName] = this.initState;
    this.latestState = this.initState;
  }

  public state(): string {
    const newState = this.computeState();
    if (newState !== this.latestState) {
      this.latestState = newState;

      this.logger.info('Switched to state ' + newState);
    }

    this.getRoomMemory().stateMachines[this.stateMachineName] = newState;

    return newState;
  }

  public tick() {
    this.applyState(this.state());
  }

  protected abstract computeState(): string;

  protected abstract applyState(state: string): void;
}
