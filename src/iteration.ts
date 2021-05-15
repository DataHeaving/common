export const deduplicate = <T>(
  items: ReadonlyArray<T>,
  getKey: (item: T) => string,
) => {
  return Object.values(
    items.reduce<{ [key: string]: T }>((dic, item) => {
      const key = getKey(item);
      const existing = dic[key];
      if (!existing) {
        dic[key] = item;
      }
      return dic;
    }, {}),
  );
};

export async function iterateInParallel<T, TContext>(
  items: ReadonlyArray<T>,
  concurrencyLevel: number,
  onItem: (item: T, context: TContext, index: number) => Promise<unknown>,
  createContext: () => TContext,
  onAsyncLineEnd?: (context: TContext) => void,
) {
  if (items.length > 0) {
    let curIndex = 0;
    concurrencyLevel = Math.min(concurrencyLevel, 1);
    await Promise.all(
      new Array<Promise<unknown>>(concurrencyLevel).fill(
        (async () => {
          const ctx = createContext();
          while (curIndex < items.length) {
            const indexToGive = curIndex;
            ++curIndex;
            await onItem(items[indexToGive], ctx, indexToGive);
          }

          onAsyncLineEnd?.(ctx);
        })(),
        0,
        concurrencyLevel,
      ),
    );
  }
}
