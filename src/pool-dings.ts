
import * as winston from 'winston';

enum ActorState {
  STOPPED,
  STARTED,
  READY,
  RUNNING
}

export interface Action {
  start(cb: () => void): void;
  run(cb: () => void): void;
  stop(cb: () => void): void;
}

export interface ActionFactory {
  make(): Action;
}

export class Actor {
  private state: ActorState;
  private poolDing: PoolDings;
  private action: Action;

  constructor(poolDing: PoolDings, action: Action) {
    this.poolDing = poolDing;
    this.state = ActorState.STOPPED;
    this.action = action;
  }

  public start(): Actor {
    this.state = ActorState.STARTED;
    this.action.start(() => {
      this.state = ActorState.READY;
    });
    return this;
  }

  public isReady(): boolean {
    return this.state == ActorState.READY;
  }

  public isStopped(): boolean {
    return this.state == ActorState.STOPPED;
  }

  public run(): void {
    this.state = ActorState.RUNNING;
    this.action.run(() => {
      this.state = ActorState.STOPPED;
      this.action.start(() => {
        this.state = ActorState.READY;
      });
    });
  }

  public stop(cb: () => void): void {
    this.action.stop(() => {
      this.state = ActorState.STOPPED;
      cb();
    });
  }
}

export class PoolDings {

  private width: Number;
  private actors: Actor[];
  private retryTick: Number;

  constructor(logger: winston.LoggerInstance, width: Number, retryTick: Number) {
    this.width = width;
    this.retryTick = retryTick;
    logger.info(`PoolDings created:${width}`);
  }

  public start(actionFactory: ActionFactory): void {
    this.actors = Array(this.width).fill(0).map(() => {
      return (new Actor(this, actionFactory.make())).start();
    });
  }

  public dispatch(): void {
    const found = this.actors.find((a: Actor) => a.isReady());
    if (!found) {
      setTimeout(this.dispatch.bind(this), this.retryTick);
    } else {
      found.run();
    }
  }

  public stop(cb: () => void): void {
    this.actors.forEach((actor) => actor.stop(() => {
      if (this.actors.filter(a => a.isStopped()).length == this.actors.length) {
        cb();
      }
    }));
  }

}

export function create(logger: winston.LoggerInstance, width = 10, retryTick = 50): PoolDings {
  return new PoolDings(logger, width, retryTick);
}
