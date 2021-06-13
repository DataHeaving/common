import test, { ExecutionContext } from "ava";
import * as spec from "../events";

test("Events logging type filtering works as expected", (t) => {
  performLoggingTypeFilteringTest(t, undefined);
  performLoggingTypeFilteringTest(t, "onlyStart");
  performLoggingTypeFilteringTest(t, "onlyEnd");
  performLoggingTypeFilteringTest(t, "startAndEnd");
});

test("Events logger is not created if not needed", (t) => {
  const builder = spec.createEventEmitterBuilder();
  const anotherBuilder = spec.consoleLoggingEventEmitterBuilder(
    undefined,
    builder,
  );
  t.is(builder, anotherBuilder);
});

const performLoggingTypeFilteringTest = (
  t: ExecutionContext,
  kind: Parameters<typeof spec.consoleLoggingEventEmitterBuilder>[2],
) => {
  const logs: Array<string> = [];
  const errors: Array<string> = [];

  const emitter = spec
    .consoleLoggingEventEmitterBuilder(undefined, undefined, kind, {
      // Just doing logs: logs.push
      // Does not work - maybe because of some 'this' weirdness of JS
      log: (str) => logs.push(str),
      error: (str) => errors.push(str),
    })
    .createEventEmitter();
  const SQL = "SELECT 1";

  emitter.emit("sqlExecutionStarted", SQL);
  const expectedLogs: Array<string> = [];
  switch (kind) {
    case "onlyStart":
    case "startAndEnd":
      expectedLogs.push(`SQL started: ${SQL}`);
      break;
  }
  t.deepEqual(logs, expectedLogs);
  t.deepEqual(errors, []);

  emitter.emit("sqlExecutionEnded", SQL);
  switch (kind) {
    case "onlyEnd":
    case "startAndEnd":
      expectedLogs.push(`SQL ended: ${SQL}`);
      break;
  }
  t.deepEqual(logs, expectedLogs);
  t.deepEqual(errors, []);
};
