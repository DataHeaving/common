import * as dicts from "./dictionaries";
import * as objs from "./objects";
import * as types from "./types";

export type EventHandler<T, TReturn = void | boolean> = (
  arg: Readonly<T>,
) => TReturn;
export type ErrorWithinEventHandler<T> = {
  error: unknown;
  eventName: keyof T;
  eventArg: T[keyof T];
};
type EventHandlerDictionary<T> = Partial<
  { [P in keyof T]: Array<EventHandler<T[P]>> }
>;

export interface EventEmitterRegistrationAddition<T> {
  addEventListener<TEventName extends keyof T>(
    eventName: TEventName,
    eventHandler: EventHandler<T[TEventName]>,
  ): void;
}

export interface EventEmitterRegistrationRemoval<T> {
  removeEventListener<TEventName extends keyof T>(
    eventName: TEventName,
    eventHandler: EventHandler<T[TEventName]>,
  ): void;
}

export class EventEmitterBuilder<T>
  implements
    EventEmitterRegistrationAddition<T>,
    EventEmitterRegistrationRemoval<T> {
  private readonly _eventHandlers: EventHandlerDictionary<T>;

  public constructor() {
    this._eventHandlers = {} as EventHandlerDictionary<T>;
  }

  public addEventListener<TEventName extends keyof T>(
    eventName: TEventName,
    eventHandler: EventHandler<T[TEventName]>,
  ) {
    // We wanna use utils.getOrAddGeneric here, but unfortunately, TS type system not quite yet can handle that...
    let handlerArray = this._eventHandlers[eventName];
    if (!handlerArray) {
      this._eventHandlers[eventName] = handlerArray = [];
    }
    handlerArray.push(eventHandler);
  }

  public removeEventListener<TEventName extends keyof T>(
    eventName: TEventName,
    eventHandler: EventHandler<T[TEventName]>,
  ) {
    const handlerArray = this._eventHandlers[eventName];
    let idx: number;
    return (
      handlerArray &&
      (idx = handlerArray.indexOf(eventHandler)) >= 0 &&
      handlerArray.splice(idx, 1).length === 1
    );
  }

  public createEventEmitter(onError?: EventHandler<unknown, boolean>) {
    // Create a copy of each array so that possible modifications done to them by EventEmitter are not visible to here.
    return new EventEmitter<T>(
      Object.fromEntries(
        Object.entries(
          this._eventHandlers as Record<string, Array<unknown>>,
        ).map(([eventName, eventHandlers]) => [
          eventName,
          eventHandlers.slice(),
        ]),
      ) as EventHandlerDictionary<T>,
      onError,
    );
  }

  public createScopedEventBuilder<TScoped extends keyof T>(
    scopedEvents: { [P in TScoped]: Partial<{ [M in keyof T[P]]: T[P][M] }> },
  ): EventEmitterRegistrationAddition<
    { [P in keyof typeof scopedEvents]: T[P] }
  > {
    if (
      Object.values(scopedEvents).some(
        (val) => Object.getOwnPropertyNames(val).length <= 0,
      )
    ) {
      throw new Error(
        "All event matchers must contain at least one matchable element",
      );
    }
    return {
      addEventListener: (eventName, eventHandler) => {
        if (eventName in scopedEvents) {
          const thisMatches = scopedEvents[eventName];
          this.addEventListener(eventName, (arg) => {
            let isMatch = true;
            for (const key in thisMatches) {
              if (arg[key] !== thisMatches[key]) {
                isMatch = false;
                break;
              }
            }
            if (isMatch) {
              eventHandler(arg);
            }
          });
        }
      },
    };
  }

  public combine(other: EventEmitterBuilder<T> | EventEmitter<T>) {
    combine(
      (other as EventEmitterBuilder<T>)._eventHandlers, // Fugly, but what can you do, when no 'internal' modifier available... Maybe can add "createEventHandlersCopy" to EventEmitter but... is it worth it?
      this._eventHandlers,
    );
  }
}

type EventHandlersHelper<T> = Record<string, Array<EventHandler<T[keyof T]>>>;

export class EventEmitter<T> {
  public constructor(
    private readonly _eventHandlers: EventHandlerDictionary<T>,
    private readonly _onError?: EventHandler<
      ErrorWithinEventHandler<T>,
      boolean
    >,
  ) {}

  public emit<TEventName extends keyof T>(
    eventName: TEventName,
    arg: T[TEventName],
  ) {
    const handlers = this._eventHandlers[eventName];
    if (handlers) {
      let i = 0;
      while (i < handlers.length) {
        let removeElement = false;
        try {
          removeElement = handlers[i](arg) === false;
        } catch (e) {
          if (this._onError) {
            try {
              removeElement =
                this._onError({
                  error: e,
                  eventName,
                  eventArg: arg,
                }) === false;
            } catch {
              // Not much we can do here...
            }
          }
        }

        if (removeElement) {
          handlers.splice(i, 1);
        } else {
          ++i;
        }
      }
    }
  }

  public combine(
    other: EventEmitterBuilder<T> | EventEmitter<T>,
    onError?: EventHandler<ErrorWithinEventHandler<T>, boolean>,
  ) {
    const newEventHandlers = objs.deepCopy(this._eventHandlers);
    combine(
      (other as EventEmitter<T>)._eventHandlers, // Fugly, but what can you do, when no 'internal' modifier available... Maybe can add "createEventHandlersCopy" to EventEmitter but... is it worth it?
      newEventHandlers,
    );

    return new EventEmitter<T>(newEventHandlers, onError);
  }
}

const combine = <T>(
  otherEventHandlers: EventHandlerDictionary<T>,
  thisEventHanders: EventHandlerDictionary<T>,
) => {
  for (const [eventID, eventArray] of Object.entries(
    (otherEventHandlers as unknown) as EventHandlersHelper<T>,
  )) {
    dicts
      .getOrAddGeneric(
        (thisEventHanders as unknown) as EventHandlersHelper<T>,
        eventID,
        () => [],
      )
      .push(...eventArray);
  }
};

export interface ConsoleAbstraction {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

export const createConsoleLogger = (
  logMessagePrefix: types.ItemOrFactory<string> | undefined,
  consoleOverride: ConsoleAbstraction = console,
) =>
  logMessagePrefix
    ? typeof logMessagePrefix === "string"
      ? (str: string, isError?: boolean) =>
          consoleOverride[isError ? "error" : "log"](
            `${logMessagePrefix}${str}`,
          )
      : (str: string, isError?: boolean) =>
          consoleOverride[isError ? "error" : "log"](
            `${logMessagePrefix()}${str}`,
          )
    : (str: string, isError?: boolean) =>
        consoleOverride[isError ? "error" : "log"](str);
