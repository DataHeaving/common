import test from "ava";
import * as spec from "../objects";

test("Deep copy works as intended", (t) => {
  const obj = createTestObject();
  const copy = spec.deepCopy(obj);
  t.deepEqual(copy, obj);
  t.true(copy !== obj);
});

test("Deep copy with properties works as intended", (t) => {
  const obj: Partial<ReturnType<typeof createTestObject>> = createTestObject();
  const copy = spec.deepCopy(obj, ["propertyString"]);
  delete obj["propertyArray"];
  t.deepEqual(copy, obj);
  t.true(copy !== obj);
});

test("Getting chunks of array works as intended", (t) => {
  const array1 = [0];
  t.deepEqual(spec.getChunks(array1, 1), [array1]);
  t.deepEqual(spec.getChunks(array1, 2), [array1]);

  const array3 = [0, 1, 2];
  t.deepEqual(
    spec.getChunks(array3, 1),
    array3.map((i) => [i]),
  );
  t.deepEqual(spec.getChunks(array3, 2), [[0, 1], [2]]);
});

test("Iterating chunks of array works as intended", (t) => {
  const performTest = (
    array: ReadonlyArray<unknown>,
    chunkCountArgument: number,
    chunks: ReadonlyArray<ReadonlyArray<unknown>>,
  ) => {
    let curIdx = 0;
    const seenChunks: Array<ReadonlyArray<unknown>> = [];
    spec.iterateChunks(array, chunkCountArgument, (chunk, startIndex) => {
      t.deepEqual(startIndex, curIdx);
      seenChunks.push(chunk);
      curIdx += chunk.length;
    });
    t.deepEqual(seenChunks, chunks as typeof seenChunks);
  };

  const array1 = [0];
  performTest(array1, 1, [array1]);
  performTest(array1, 2, [array1]);

  const array3 = [0, 1, 2];
  performTest(
    array3,
    1,
    array3.map((i) => [i]),
  );
  performTest(array3, 2, [[0, 1], [2]]);
});

test("The getOrDefault works as intended", (t) => {
  const defaultValue = "default";
  t.deepEqual(spec.getOrDefault(undefined, defaultValue), defaultValue);
  t.deepEqual(spec.getOrDefault("", defaultValue), "");
  t.deepEqual(spec.getOrDefault("", undefined), "");
});

test("The getOrDefaultOrThrow works as intended", (t) => {
  const defaultValue = "default";
  t.deepEqual(spec.getOrDefaultOrThrow(undefined, defaultValue), defaultValue);
  t.deepEqual(spec.getOrDefaultOrThrow("", defaultValue), "");
  t.deepEqual(spec.getOrDefaultOrThrow("", undefined), "");

  t.throws(() => spec.getOrDefaultOrThrow(undefined, undefined), {
    message: `Default value was undefined`,
  });
  const descriptor = "password";
  const context = "current configuration";
  t.throws(
    () =>
      spec.getOrDefaultOrThrow(
        undefined,
        undefined,
        () => descriptor,
        () => context,
      ),
    {
      message: `No ${descriptor} specified for ${context}, and no default ${descriptor} specified either.`,
    },
  );
});

const createTestObject = () => ({
  propertyString: "string",
  propertyArray: [
    {
      propertyNumber: 1,
    },
  ],
});
