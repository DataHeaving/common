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
}

export class EventEmitter<T> {
  private readonly _eventHandlers: EventHandlerDictionary<T>;
  private readonly _onError:
    | EventHandler<ErrorWithinEventHandler<T>, boolean>
    | undefined;

  public constructor(
    eventHandlers: EventHandlerDictionary<T>,
    onError?: EventHandler<unknown, boolean>,
  ) {
    this._eventHandlers = eventHandlers;
    this._onError = onError;
  }

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
}

export type ValueOrFactory<T> = T | (() => T);

/* eslint-disable no-console */
export const createConsoleLogger = (
  logMessagePrefix: ValueOrFactory<string> | undefined,
) =>
  logMessagePrefix
    ? typeof logMessagePrefix === "string"
      ? (str: string, isError?: boolean) =>
          console[isError ? "error" : "log"](`${logMessagePrefix}${str}`)
      : (str: string, isError?: boolean) =>
          console[isError ? "error" : "log"](`${logMessagePrefix()}${str}`)
    : (str: string, isError?: boolean) =>
        console[isError ? "error" : "log"](str);
