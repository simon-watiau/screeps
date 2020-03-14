import {Logger} from "typescript-logging";

export default abstract class StateMachine {
  public latestState: string;
  protected logger: Logger;

  constructor(logger: Logger, initState: string) {
    this.logger = logger;
    this.latestState = initState;
  }

  public state(): string {
    const newState = this.computeState();
    if (newState !== this.latestState) {
      this.latestState = newState;

      this.logger.info('Switched to state ' + newState);
    }

    return newState;
  }

  public tick() {
    this.applyState(this.state());
  }

  protected abstract computeState(): string;

  protected abstract applyState(state: string): void;
}
