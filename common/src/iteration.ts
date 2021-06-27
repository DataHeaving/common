export const deduplicate = <T>(
  items: ReadonlyArray<T>,
  getKey: (item: T) => string,
) =>
  // The state in reduce method contains dictionary in array, so that we return deduplicated objects always in the same order as they were specified
  items.reduce<{ dictionary: { [key: string]: T }; array: Array<T> }>(
    (state, item) => {
      const key = getKey(item);
      const existing = state.dictionary[key];
      if (!existing) {
        state.dictionary[key] = item;
        state.array.push(item);
      }
      return state;
    },
    { dictionary: {}, array: [] },
  ).array;

export function iterateInParallel<T>(
  items: ReadonlyArray<T>,
  concurrencyLevel: number,
  onItem: (item: T, index: number) => Promise<unknown>,
): Promise<void>;
export function iterateInParallel<T, TContext>(
  items: ReadonlyArray<T>,
  concurrencyLevel: number,
  onItem: (item: T, index: number, context: TContext) => Promise<unknown>,
  createContext: () => TContext,
  onAsyncLineEnd?: (context: TContext) => void,
): Promise<void>;
export async function iterateInParallel<T, TContext>(
  items: ReadonlyArray<T>,
  concurrencyLevel: number,
  onItem: (item: T, index: number, context?: TContext) => Promise<unknown>,
  createContext?: () => TContext,
  onAsyncLineEnd?: (context: TContext) => void,
) {
  if (items.length > 0) {
    let curIndex = 0;
    concurrencyLevel = Math.max(concurrencyLevel, 1);
    await Promise.all(
      new Array<Promise<unknown>>(
        Math.min(items.length, concurrencyLevel),
      ).fill(
        (async () => {
          const ctx = createContext?.();
          while (curIndex < items.length) {
            const indexToGive = curIndex;
            ++curIndex;
            await onItem(items[indexToGive], indexToGive, ctx);
          }

          onAsyncLineEnd?.(ctx!); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        })(),
        0,
        concurrencyLevel,
      ),
    );
  }
}
