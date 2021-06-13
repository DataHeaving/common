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
  const getErrorWhenNoneThrown = (success: number) => {
    seenSuccess = success;
    return undefined; // Always return success
  };
  t.deepEqual(
    await spec.doWithRetry(
      keepFailingAfter(1),
      0,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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
    await spec.doWithRetry(
      keepFailingAfter(1),
      1,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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
    await spec.doWithRetry(
      failOnlyAt(0),
      1,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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
    await spec.doWithRetry(
      failOnlyAt(0),
      2,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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
    await spec.doWithRetry(
      keepSucceedingAfter(2),
      2,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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
  const getErrorWhenNoneThrown = (success: number) => {
    seenSuccess = success;
    return undefined; // Never return surrogate error
  };
  t.deepEqual(
    await spec.doWithRetry(
      failOnlyAt(0),
      0,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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
    await spec.doWithRetry(
      keepSucceedingAfter(2),
      1,
      shouldGiveUpOnError,
      getErrorWhenNoneThrown,
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

test("Retry method with skippability works as expected", async (t) => {
  let actionCalled = false;
  const action = () => {
    t.false(actionCalled);
    actionCalled = true;
    return Promise.resolve();
  };
  await spec.doWithRetryOrNot(action, -1);
  t.false(actionCalled);

  await spec.doWithRetryOrNot(action, 0);
  t.true(actionCalled);
});

test("Retry method without skippability returns error on negative retries", async (t) => {
  let actionCalled = false;
  const action = () => {
    t.false(actionCalled);
    actionCalled = true;
    return Promise.resolve();
  };
  const result = await spec.doWithRetry(action, -1);
  t.deepEqual(result.result, "error");
  if (result.result !== "error") {
    throw new Error("This is here just for compiler's sake");
  }
  t.true(result.errors[0] instanceof spec.InvalidRetryCountError);
});

test("Retry method will retry even without error if callback instructs so", async (t) => {
  let actionCount = 0;
  const action = () => {
    ++actionCount;
    return Promise.resolve();
  };
  const error = new Error("Dummy");
  const result = await spec.doWithRetry(action, 1, undefined, () => error);
  t.deepEqual(actionCount, 2);
  t.deepEqual(result, {
    result: "error",
    errors: [error, error],
  });
});

test("Retry method will give up if callback instructs so", async (t) => {
  let actionCount = 0;
  const error = new Error("Dummy");
  const action = () => {
    ++actionCount;
    throw error;
  };
  let seenError: typeof error | undefined = undefined;
  const result = await spec.doWithRetry(
    action,
    1,
    (err) => {
      seenError = err as Error;
      return true; // Give up immediately
    },
    undefined,
  );
  t.deepEqual(actionCount, 1);
  t.is((seenError as unknown) as typeof error, error);
  t.deepEqual(result, {
    result: "error",
    errors: [error],
  });
});

const ERROR = "error";

const keepFailingAfter = (iterations: number) => () =>
  --iterations < 0 ? Promise.reject(ERROR) : Promise.resolve(iterations);

const failOnlyAt = (iterations: number) => () =>
  iterations-- === 0 ? Promise.reject(ERROR) : Promise.resolve(iterations);

const keepSucceedingAfter = (iterations: number) => () =>
  --iterations >= 0 ? Promise.reject(ERROR) : Promise.resolve(iterations);
