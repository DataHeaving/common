import test from "ava";
import * as spec from "../events";

interface VirtualEvents {
  dummy: void;
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

  builder2.combine(builder1);

  const emitterCombined = builder2.createEventEmitter();
  emitterCombined.emit("dummy", undefined);
  t.true(invoked1);
  t.true(invoked2);
  invoked1 = invoked2 = false;

  const emitter = builder1.createEventEmitter();
  emitter.emit("dummy", undefined);
  t.true(invoked1);
  t.false(invoked2);
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

  const combined = emitter1.combine(emitter2);
  combined.emit("dummy", undefined);
  t.true(invoked1);
  t.true(invoked2);
});
