import test from "ava";
import * as spec from "../events";

interface VirtualEvents {
  dummy: void;
}

interface VirtualEventsWithID {
  event: {
    id: string;
  };
}

test("Adding and removing event handlers work as intended", (t) => {
  let invoked = false;
  const handler = () => (invoked = true);

  const builder = new spec.EventEmitterBuilder<VirtualEvents>();
  builder.addEventListener("dummy", handler);
  builder.createEventEmitter().emit("dummy", undefined);
  t.true(invoked);
  invoked = false;

  builder.removeEventListener("dummy", handler);
  builder.createEventEmitter().emit("dummy", undefined);
  t.false(invoked);
});

test("Event handler throwing an exception will not leak", (t) => {
  let invoked = false;
  const handler = () => {
    invoked = true;
    throw new Error("Dummy");
  };

  const builder = new spec.EventEmitterBuilder<VirtualEvents>();
  builder.addEventListener("dummy", handler);
  builder.createEventEmitter().emit("dummy", undefined);
  t.true(invoked);
  invoked = false;
});

test("Passing error handler to emitter will get triggered correctly", (t) => {
  const eventName = "dummy";
  const error: unknown = new Error("Dummy");
  let count = 0;
  const throwAfterFirst = () => {
    ++count;
    if (count > 1) {
      throw error;
    }
  };

  let seenError:
    | spec.ErrorWithinEventHandler<VirtualEvents>
    | undefined = undefined;
  const onError = (err: spec.ErrorWithinEventHandler<VirtualEvents>) => {
    seenError = err;
    return count !== 3; // Remove element on 3rd call
  };

  const builder = new spec.EventEmitterBuilder<VirtualEvents>();
  builder.addEventListener(eventName, throwAfterFirst);
  const emitter = spec.createEventEmitterWithErrorHandler(builder, onError);
  emitter.emit(eventName, undefined);
  t.deepEqual(count, 1);
  t.is(seenError, undefined);

  emitter.emit(eventName, undefined);
  t.deepEqual(count, 2);
  t.deepEqual(
    (seenError as unknown) as spec.ErrorWithinEventHandler<VirtualEvents>,
    {
      error,
      eventName,
      eventArg: undefined,
    },
  );
  seenError = undefined;

  // This invocation will make error handler return false, and the actual event handler that threw the error should get removed
  emitter.emit(eventName, undefined);
  t.deepEqual(count, 3);
  t.deepEqual(
    (seenError as unknown) as spec.ErrorWithinEventHandler<VirtualEvents>,
    {
      error,
      eventName,
      eventArg: undefined,
    },
  );
  seenError = undefined;

  emitter.emit(eventName, undefined);
  t.deepEqual(count, 3); // Handler no longer should get invoked
  t.is(seenError, undefined);
});

test("Modifying event builder will not modify event emitter", (t) => {
  let invoked1 = false;
  const handler1 = () => (invoked1 = true);

  let invoked2 = false;
  const handler2 = () => (invoked2 = true);

  const builder = new spec.EventEmitterBuilder<VirtualEvents>();
  builder.addEventListener("dummy", handler1);

  const emitter = builder.createEventEmitter();

  builder.addEventListener("dummy", handler2);

  emitter.emit("dummy", undefined);

  t.true(invoked1, "Firstly registered handler should have been invoked.");
  t.false(
    invoked2,
    "Secondly registered handler should not have been invoked.",
  );
});

test("Combining event builders works as intended", (t) => {
  let invoked1 = false;
  const handler1 = () => (invoked1 = true);

  let invoked2 = false;
  const handler2 = () => (invoked2 = true);

  const builder1 = new spec.EventEmitterBuilder<VirtualEvents>();
  builder1.addEventListener("dummy", handler1);

  const builder2 = new spec.EventEmitterBuilder<VirtualEvents>();
  builder2.addEventListener("dummy", handler2);

  const builderCombined = spec.combineEvents(builder1, builder2);

  const emitterCombined = builderCombined.createEventEmitter();
  emitterCombined.emit("dummy", undefined);
  t.true(invoked1);
  t.true(invoked2);
  invoked1 = invoked2 = false;

  const emitter1 = builder1.createEventEmitter();
  emitter1.emit("dummy", undefined);
  t.true(invoked1);
  t.false(invoked2);
  invoked1 = invoked2 = false;

  const emitter2 = builder2.createEventEmitter();
  emitter2.emit("dummy", undefined);
  t.false(invoked1);
  t.true(invoked2);
  invoked1 = invoked2 = false;
});

test("Combining event emitters works as intended", (t) => {
  let invoked1 = false;
  const handler1 = () => (invoked1 = true);

  let invoked2 = false;
  const handler2 = () => (invoked2 = true);

  const builder1 = new spec.EventEmitterBuilder<VirtualEvents>();
  builder1.addEventListener("dummy", handler1);
  const emitter1 = builder1.createEventEmitter();

  const builder2 = new spec.EventEmitterBuilder<VirtualEvents>();
  builder2.addEventListener("dummy", handler2);
  const emitter2 = builder2.createEventEmitter();

  const combined = spec.combineEvents(emitter1, emitter2).createEventEmitter();
  combined.emit("dummy", undefined);
  t.true(invoked1);
  t.true(invoked2);
});

test("Scoped event emitter works as intended", (t) => {
  const ID1 = "id1";
  const ID2 = "id2";
  let invoked1 = false;
  const handler1 = () => (invoked1 = true);

  let invoked2 = false;
  const handler2 = () => (invoked2 = true);

  const builder1 = new spec.EventEmitterBuilder<VirtualEventsWithID>();
  builder1.addEventListener("event", handler1);

  const builder2 = new spec.EventEmitterBuilder<VirtualEventsWithID>();
  builder2.addEventListener("event", handler2);

  let scopedBuilder = new spec.EventEmitterBuilder<VirtualEventsWithID>();
  scopedBuilder = spec.combineEvents(
    scopedBuilder,
    spec.scopeEvents(builder1, {
      event: {
        id: ID1,
      },
    }),
  );
  scopedBuilder = spec.combineEvents(
    scopedBuilder,
    spec.scopeEvents(builder2, {
      event: {
        id: ID2,
      },
    }),
  );

  const emitter = scopedBuilder.createEventEmitter();
  emitter.emit("event", { id: ID1 });
  t.true(invoked1);
  t.false(invoked2);
  invoked1 = invoked2 = false;

  emitter.emit("event", { id: ID2 });
  t.false(invoked1);
  t.true(invoked2);
  invoked1 = invoked2 = false;

  t.throws(
    () =>
      spec.scopeEvents(builder1, {
        event: {},
      }),
    {
      instanceOf: Error,
      message: "All event matchers must contain at least one matchable element",
    },
  );
});

test("Console logger creation works as intended", (t) => {
  let logger = spec.createConsoleLogger("");
  logger("This simulated message is visible to final output");
  logger("This simulated error message is visible to final output", true);

  const LOG = "This is log message";
  const ERROR = "This is error message";
  const logs: Array<string> = [];
  const errors: Array<string> = [];
  const consoleAbstraction: spec.ConsoleAbstraction = {
    log: (msg) => logs.push(msg),
    error: (msg) => errors.push(msg),
  };
  const prefix = "Dynamic-ish";
  logger = spec.createConsoleLogger(prefix, consoleAbstraction);
  logger(LOG);
  t.deepEqual(logs, [`${prefix}${LOG}`]);
  t.deepEqual(errors, []);
  logger(ERROR, true);
  t.deepEqual(logs, [`${prefix}${LOG}`]);
  t.deepEqual(errors, [`${prefix}${ERROR}`]);
  logs.length = errors.length = 0;

  logger = spec.createConsoleLogger(() => prefix, consoleAbstraction);
  logger(LOG);
  t.deepEqual(logs, [`${prefix}${LOG}`]);
  t.deepEqual(errors, []);
  logger(ERROR, true);
  t.deepEqual(logs, [`${prefix}${LOG}`]);
  t.deepEqual(errors, [`${prefix}${ERROR}`]);
  logs.length = errors.length = 0;
});

test("Trying to break event emitter", (t) => {
  const emitter = new spec.EventEmitterBuilder<
    VirtualEvents & VirtualEventsWithID
  >().createEventEmitter();

  emitter.emit("dummy", undefined);
  emitter.emit("non-existant" as keyof VirtualEvents, undefined);
  t.pass();
});

test("Passing scoped event key for builder without handlers works", (t) => {
  spec
    .scopeEvents(new spec.EventEmitterBuilder<VirtualEventsWithID>(), {
      event: { id: "1" },
    })
    .emit("event", { id: "1" });
  t.pass();
});

// This code is here only to make sure that common pattern of using event handlers compiles successfully
interface VirtualEventsBase {
  dummy: void;
}
const setupBuilder = (builder: spec.EventEmitterBuilder<VirtualEventsBase>) => {
  builder.addEventListener("dummy", () => {});
};

type VirtualEventsSub = VirtualEventsBase & {
  another: void;
};
setupBuilder(new spec.EventEmitterBuilder<VirtualEventsSub>()); // This line will give compilation errors if combine/scoped event methods are present in builder/emitter.
