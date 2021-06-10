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
