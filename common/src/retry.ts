export const doWithRetryOrNot = async <T>(
  performAction: () => Promise<T>,
  maxRetries: number,
  shouldGiveUpOnError?: (error: unknown) => boolean,
  isSuccess?: (value: T) => boolean,
) => {
  return maxRetries <= 0
    ? Promise.resolve(undefined)
    : doWithRetryAndChecks(
        performAction,
        maxRetries,
        shouldGiveUpOnError,
        isSuccess,
      );
};

// This has return type of RetryExecutionResult<T>, unlike doWithRetryAndChecks, which is RetryExecutionResult<T|undefined>
export const doWithRetry = async <T>(
  performAction: () => Promise<T>,
  maxRetries: number,
) =>
  doWithRetryAndChecks(
    performAction,
    maxRetries,
    undefined,
    undefined,
  ) as Promise<RetryExecutionResult<T>>;

export const doWithRetryAndChecks = async <T>(
  performAction: () => Promise<T>,
  maxRetries: number,
  shouldGiveUpOnError: ((error: unknown) => boolean) | undefined,
  isSuccess: ((value: T) => boolean) | undefined,
) => {
  let retVal: T | undefined = undefined;
  const errors: Array<unknown> = [];
  if (maxRetries < 0) {
    errors.push(
      new Error(`The given retry count ${maxRetries} should be at least 1.`),
    );
  } else {
    let shouldRetry: boolean;
    let count = 0;
    do {
      try {
        ++count;
        retVal = await performAction();
        shouldRetry = !(isSuccess?.(retVal) ?? true);
      } catch (e) {
        errors.push(e);
        shouldRetry = !(shouldGiveUpOnError?.(e) ?? false);
      }
    } while (count <= maxRetries && shouldRetry);
    if (!shouldRetry) {
      errors.length = 0; // This will clear the array
    }
  }
  return errors.length > 0
    ? { result: "error" as const, errors }
    : { result: "success" as const, value: retVal }; // eslint-disable-line @typescript-eslint/no-non-null-assertion
};

export type RetryExecutionResult<T> =
  | {
      result: "error";
      errors: Array<unknown>;
    }
  | {
      result: "success";
      value: T;
    };
