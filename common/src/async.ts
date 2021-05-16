export const sleep = async (timeoutInMS: number) =>
  new Promise<void>((resolve) =>
    isNaN(timeoutInMS) || timeoutInMS < 0
      ? resolve()
      : setTimeout(resolve, timeoutInMS),
  );
