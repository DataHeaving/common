export const doWithRetryOrNot = async <T>(
  performAction: () => Promise<T>,
  maxRetries: number,
  shouldGiveUpOnError?: (error: unknown) => boolean,
  isSuccess?: (value: T) => boolean,
) => {
  return maxRetries < 0
    ? Promise.resolve(undefined)
    : doWithRetry(performAction, maxRetries, shouldGiveUpOnError, isSuccess);
};

export function doWithRetry<T>(
  performAction: () => Promise<T>,
  maxRetries: number,
): Promise<RetryExecutionResult<T>>;
export function doWithRetry<T>(
  performAction: () => Promise<T>,
  maxRetries: number,
  shouldGiveUpOnError:
    | ((error: unknown, attemptCount: number) => boolean)
    | undefined,
  getErrorWhenNoneThrown:
    | ((value: T, attemptCount: number) => unknown)
    | undefined,
): Promise<RetryExecutionResult<T | undefined>>;
export async function doWithRetry<T>(
  performAction: () => Promise<T>,
  maxRetries: number,
  shouldGiveUpOnError?: (error: unknown, attemptCount: number) => boolean,
  getErrorWhenNoneThrown?: (value: T, attemptCount: number) => unknown,
) {
  let retVal: T | undefined = undefined;
  const errors: Array<unknown> = [];
  if (maxRetries < 0) {
    errors.push(new InvalidRetryCountError(maxRetries));
  } else {
    let retryState: "retryBecauseError" | "giveUp" | undefined;
    let count = 0;
    do {
      try {
        ++count;
        retVal = await performAction();
        const maybeError = getErrorWhenNoneThrown?.(retVal, count);
        retryState = maybeError === undefined ? undefined : "retryBecauseError";
        if (retryState) {
          errors.push(maybeError);
        }
      } catch (e) {
        errors.push(e);
        retryState =
          shouldGiveUpOnError?.(e, count) ?? false
            ? "giveUp"
            : "retryBecauseError";
      }
    } while (count <= maxRetries && retryState === "retryBecauseError");
    if (retryState === undefined) {
      errors.length = 0; // This will clear the array
    }
  }
  return errors.length > 0
    ? { result: "error" as const, errors }
    : { result: "success" as const, value: retVal }; // eslint-disable-line @typescript-eslint/no-non-null-assertion
}

export type RetryExecutionResult<T> =
  | {
      result: "error";
      errors: Array<unknown>;
    }
  | {
      result: "success";
      value: T;
    };

export class InvalidRetryCountError extends Error {
  public constructor(public readonly givenRetryCount: number) {
    super(`The given retry count ${givenRetryCount} should be at least 1.`);
  }
}
