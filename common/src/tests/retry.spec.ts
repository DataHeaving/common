import test from "ava";
import * as spec from "../retry";

test("Basic retry method recognize success", async (t) => {
  t.deepEqual(
    await spec.doWithRetry(keepFailingAfter(1), 0),
    {
      result: "success",
      value: 0,
    },
    "Success on first attempt must propagate.",
  );

  t.deepEqual(
    await spec.doWithRetry(keepFailingAfter(1), 1),
    {
      result: "success",
      value: 0,
    },
    "Success on first attempt must propagate, and no further invocations should be done.",
  );

  t.deepEqual(
    await spec.doWithRetry(failOnlyAt(0), 1),
    {
      result: "success",
      value: -2,
    },
    "Success on second attempt must propagate.",
  );

  t.deepEqual(
    await spec.doWithRetry(failOnlyAt(0), 2),
    {
      result: "success",
      value: -2,
    },
    "Callback must not be invoked after success is seen.",
  );

  t.deepEqual(
    await spec.doWithRetry(keepSucceedingAfter(2), 2),
    {
      result: "success",
      value: -1,
    },
    "Success on second attempt must propagate.",
  );
});

test("Retry method with callbacks recognize success", async (t) => {
  let seenError: unknown = undefined;
  let seenSuccess: number | undefined = undefined;
  const shouldGiveUpOnError = (error: unknown) => {
    seenError = error;
    return false; // Always try to continue on any error
  };
  const isSuccess = (success: number) => {
    seenSuccess = success;
    return true;
  };
  t.deepEqual(
    await spec.doWithRetryAndChecks(
      keepFailingAfter(1),
      0,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "success",
      value: 0,
    },
    "Success on first attempt must propagate.",
  );
  t.deepEqual(seenError, undefined);
  t.deepEqual(seenSuccess as number | undefined, 0);
  seenError = seenSuccess = undefined;

  t.deepEqual(
    await spec.doWithRetryAndChecks(
      keepFailingAfter(1),
      1,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "success",
      value: 0,
    },
    "Success on first attempt must propagate, and no further invocations should be done.",
  );
  t.deepEqual(seenError, undefined);
  t.deepEqual(seenSuccess as number | undefined, 0);
  seenError = seenSuccess = undefined;

  t.deepEqual(
    await spec.doWithRetryAndChecks(
      failOnlyAt(0),
      1,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "success",
      value: -2,
    },
    "Success on second attempt must propagate.",
  );
  t.deepEqual(seenError, ERROR, "error callback must be called");
  t.deepEqual(seenSuccess as number | undefined, -2);
  seenError = seenSuccess = undefined;

  t.deepEqual(
    await spec.doWithRetryAndChecks(
      failOnlyAt(0),
      2,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "success",
      value: -2,
    },
    "Callback must not be invoked after success is seen.",
  );
  t.deepEqual(seenError, ERROR, "error callback must be called");
  t.deepEqual(seenSuccess as number | undefined, -2);
  seenError = seenSuccess = undefined;

  t.deepEqual(
    await spec.doWithRetryAndChecks(
      keepSucceedingAfter(2),
      2,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "success",
      value: -1,
    },
    "Success on third attempt must propagate.",
  );
  t.deepEqual(seenError, ERROR, "error callback must be called");
  t.deepEqual(seenSuccess as number | undefined, -1);
  seenError = seenSuccess = undefined;
});

test("Basic retry method recognize errors", async (t) => {
  t.deepEqual(
    await spec.doWithRetry(failOnlyAt(0), 0),
    {
      result: "error",
      errors: [ERROR],
    },
    "Errors must propagate.",
  );

  t.deepEqual(
    await spec.doWithRetry(keepSucceedingAfter(2), 1),
    {
      result: "error",
      errors: [ERROR, ERROR],
    },
    "Errors must propagate.",
  );
});

test("Retry method with callbacks recognize errors", async (t) => {
  let seenError: unknown = undefined;
  let seenSuccess: number | undefined = undefined;
  const shouldGiveUpOnError = (error: unknown) => {
    seenError = error;
    return false; // Always try to continue on any error
  };
  const isSuccess = (success: number) => {
    seenSuccess = success;
    return true;
  };
  t.deepEqual(
    await spec.doWithRetryAndChecks(
      failOnlyAt(0),
      0,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "error",
      errors: [ERROR],
    },
    "Success on first attempt must propagate.",
  );
  t.deepEqual(seenError, ERROR);
  t.deepEqual(seenSuccess as number | undefined, undefined);
  seenError = seenSuccess = undefined;

  t.deepEqual(
    await spec.doWithRetryAndChecks(
      keepSucceedingAfter(2),
      1,
      shouldGiveUpOnError,
      isSuccess,
    ),
    {
      result: "error",
      errors: [ERROR, ERROR],
    },
    "Success on first attempt must propagate.",
  );
  t.deepEqual(seenError, ERROR);
  t.deepEqual(seenSuccess as number | undefined, undefined);
  seenError = seenSuccess = undefined;
});

const ERROR = "error";

const keepFailingAfter = (iterations: number) => () =>
  --iterations < 0 ? Promise.reject(ERROR) : Promise.resolve(iterations);

const failOnlyAt = (iterations: number) => () =>
  iterations-- === 0 ? Promise.reject(ERROR) : Promise.resolve(iterations);

const keepSucceedingAfter = (iterations: number) => () =>
  --iterations >= 0 ? Promise.reject(ERROR) : Promise.resolve(iterations);
