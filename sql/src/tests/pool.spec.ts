import test from "ava";
import * as spec from "../pool";

test("The useConnectionPoolAsync calls all callbacks", async (t) => {
  const pool = "Pool";
  const connection = "Connection";
  const eventEmitter = undefined;
  const expectedResult = 1;
  let getConnectionCalled = false;
  let useCalled = false;
  let closeCalled = false;
  const result = await spec.useConnectionPoolAsync(
    {
      pool,
      getConnection: (seenPool, seenEventEmitter) => {
        t.false(getConnectionCalled);
        t.false(closeCalled);
        t.false(useCalled);

        getConnectionCalled = true;
        t.true(seenPool === pool);
        t.true(seenEventEmitter === eventEmitter);

        return Promise.resolve([
          connection,
          () => {
            t.true(getConnectionCalled);
            t.true(useCalled);
            t.false(closeCalled);

            closeCalled = true;

            return Promise.resolve();
          },
        ] as const);
      },
    },
    eventEmitter,
    (seenConnection) => {
      t.true(getConnectionCalled);
      t.false(useCalled);
      t.false(closeCalled);

      useCalled = true;
      t.true(seenConnection === connection);

      return Promise.resolve(expectedResult);
    },
  );

  t.true(getConnectionCalled);
  t.true(useCalled);
  t.true(closeCalled);
  t.deepEqual(result, expectedResult);
});
