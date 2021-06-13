import test from "ava";
import * as spec from "../iteration";
import * as asyncHelper from "../async";

test("Deduplication works as expected", (t) => {
  const obj = {
    prop: "value",
  };
  const obj2 = {
    prop: "value2",
  };
  t.deepEqual(
    spec.deduplicate([obj, obj2, obj], (v) => v.prop),
    [obj, obj2],
  );
  const empty: Array<typeof obj> = [];
  const emptyDeduplicated = spec.deduplicate(empty, (v) => v.prop);
  t.deepEqual(emptyDeduplicated, empty);
  t.false(Object.is(empty, emptyDeduplicated));

  t.deepEqual(
    spec.deduplicate([obj2, obj], (v) => v.prop),
    [obj2, obj],
  );
});

test("Iteration in parallel without context works as expected", async (t) => {
  const items = [0, 1, 2];
  const seenItems: typeof items = [];
  const processItem = (item: typeof items[number]) => {
    seenItems[item] = item;
    return asyncHelper.sleep(Math.floor(Math.random() * 100));
  };
  await spec.iterateInParallel(items, 1, processItem);
  t.deepEqual(seenItems, items);
  seenItems.length = 0;

  await spec.iterateInParallel(items, 2, processItem);
  t.deepEqual(seenItems, items);
  seenItems.length = 0;

  await spec.iterateInParallel(items, 10, processItem);
  t.deepEqual(seenItems, items);
  seenItems.length = 0;

  await spec.iterateInParallel(items, 0, processItem);
  t.deepEqual(seenItems, items);
  seenItems.length = 0;

  await spec.iterateInParallel([], 100, processItem);
  t.deepEqual(seenItems, []);
});

test("Iteration in parallel with context works as expected", async (t) => {
  const items = [0, 1, 2];
  const seenItems: typeof items = [];
  // eslint-disable-next-line
  const givenContext: string = "Context";
  let seenContext: typeof givenContext | undefined = undefined;
  let seenContextAtEnd: typeof givenContext | undefined = undefined;
  const processItem = (
    item: typeof items[number],
    idx: number,
    ctx: typeof givenContext,
  ) => {
    seenItems[item] = item;
    if (idx === 0) {
      seenContext = ctx;
    }
    return asyncHelper.sleep(Math.floor(Math.random() * 100));
  };
  const createContext = () => givenContext;
  const onEnd = (ctx: typeof givenContext) => (seenContextAtEnd = ctx);

  await spec.iterateInParallel(items, 1, processItem, createContext, onEnd);
  t.deepEqual(seenItems, items);
  t.is((seenContext as unknown) as typeof givenContext, givenContext);
  t.is((seenContextAtEnd as unknown) as typeof givenContext, givenContext);
  seenItems.length = 0;
  seenContext = seenContextAtEnd = undefined;

  await spec.iterateInParallel(items, 2, processItem, createContext, onEnd);
  t.deepEqual(seenItems, items);
  t.is((seenContext as unknown) as typeof givenContext, givenContext);
  t.is((seenContextAtEnd as unknown) as typeof givenContext, givenContext);
  seenItems.length = 0;
  seenContext = seenContextAtEnd = undefined;

  await spec.iterateInParallel(items, 10, processItem, createContext, onEnd);
  t.deepEqual(seenItems, items);
  t.is((seenContext as unknown) as typeof givenContext, givenContext);
  t.is((seenContextAtEnd as unknown) as typeof givenContext, givenContext);
  seenItems.length = 0;
  seenContext = seenContextAtEnd = undefined;

  await spec.iterateInParallel(items, 0, processItem, createContext, onEnd);
  t.deepEqual(seenItems, items);
  t.is((seenContext as unknown) as typeof givenContext, givenContext);
  t.is((seenContextAtEnd as unknown) as typeof givenContext, givenContext);
  seenItems.length = 0;
  seenContext = seenContextAtEnd = undefined;

  await spec.iterateInParallel([], 100, processItem, createContext, onEnd);
  t.is(seenContext, undefined);
  t.is(seenContextAtEnd, undefined);
  t.deepEqual(seenItems, []);
  seenItems.length = 0;
  seenContext = seenContextAtEnd = undefined;
});
