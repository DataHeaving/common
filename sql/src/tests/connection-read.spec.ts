import * as common from "@data-heaving/common";
import test, { ExecutionContext } from "ava";
import * as spec from "../connection-read";

test("The executeStatementNoResults works as expected", async (t) => {
  const connection = createTestConnectionAbstraction(t, DATA)(sqlCommand);
  let prepareCalled = false;
  let doneCalled = false;
  const onDone = () => (doneCalled = true);
  const prepareRequest = (req: string) => {
    prepareCalled = true;
    t.deepEqual(req, sqlCommand);
    return req;
  };

  await spec.executeStatementNoResults({
    connection,
    sqlCommand,
    onDone,
    prepareRequest,
  });
  t.true(prepareCalled);
  t.true(doneCalled);
  prepareCalled = doneCalled = false;

  await spec.executeStatementNoResults({
    connection: createTestConnectionAbstraction(t, [])(sqlCommand),
    sqlCommand,
    onDone,
    prepareRequest,
  });
  t.true(prepareCalled);
  t.true(doneCalled);
  prepareCalled = doneCalled = false;
});

test("The getQuerySingleValue works as expected", async (t) => {
  const connection = createTestConnectionAbstraction(t, DATA)(sqlCommand);
  let prepareCalled = false;
  let doneCalled = false;
  let seenDatum: unknown;
  const onDone = () => (doneCalled = true);
  const prepareRequest = (req: string) => {
    prepareCalled = true;
    t.deepEqual(req, sqlCommand);
    return req;
  };
  const onRow = (datum: unknown) => (seenDatum = datum);
  await spec.getQuerySingleValue({
    connection,
    sqlCommand,
    prepareRequest,
    onDone,
    onRow,
  });
  t.true(prepareCalled);
  t.true(doneCalled);
  t.deepEqual(seenDatum, DATA[0][0]);
  prepareCalled = doneCalled = false;
  seenDatum = undefined;

  await spec.getQuerySingleValue({
    connection,
    sqlCommand,
    prepareRequest,
    onDone,
    onRow,
    columnIndex: 1,
  });
  t.true(prepareCalled);
  t.true(doneCalled);
  t.deepEqual(seenDatum, DATA[0][1]);
  prepareCalled = doneCalled = false;
  seenDatum = undefined;

  await t.throwsAsync(() =>
    spec.getQuerySingleValue({
      connection,
      sqlCommand,
      prepareRequest,
      onDone,
      onRow,
      strict: true, // This will cause an exception to be thrown if more than one row
    }),
  );
  t.true(prepareCalled);
  t.false(doneCalled); // TODO maybe doneCalled should be true here, for consistency sake when query produces no rows?
  t.deepEqual(seenDatum, DATA[0][0]);
  prepareCalled = doneCalled = false;
  seenDatum = undefined;

  await t.throwsAsync(() =>
    spec.getQuerySingleValue({
      connection: createTestConnectionAbstraction(t, [])(sqlCommand),
      sqlCommand,
      prepareRequest,
      onDone,
      onRow,
    }),
  );
  t.true(prepareCalled);
  t.true(doneCalled);
  t.deepEqual(seenDatum, undefined);
  prepareCalled = doneCalled = false;
  seenDatum = undefined;
});

test("The getQuerySingleRow works as expected", async (t) => {
  const connection = createTestConnectionAbstraction(t, DATA)(sqlCommand);
  let prepareCalled = false;
  let doneCalled = false;
  const seenData: Array<ReadonlyArray<unknown>> = [];
  const onDone = () => (doneCalled = true);
  const prepareRequest = (req: string) => {
    prepareCalled = true;
    t.deepEqual(req, sqlCommand);
    return req;
  };
  const onRow = (row: ReadonlyArray<unknown>) => seenData.push(row);

  await spec.getQuerySingleRow({
    connection,
    sqlCommand,
    onRow,
    onDone,
    prepareRequest,
  });
  t.true(prepareCalled);
  t.true(doneCalled);
  t.deepEqual(seenData, DATA.slice(0, 1) as typeof seenData);
  prepareCalled = doneCalled = false;
  seenData.length = 0;

  await t.throwsAsync(() =>
    spec.getQuerySingleRow({
      connection,
      sqlCommand,
      prepareRequest,
      onDone,
      onRow,
      strict: true, // This will cause an exception to be thrown if more than one row
    }),
  );
  t.true(prepareCalled);
  t.false(doneCalled);
  t.deepEqual(seenData, DATA.slice(0, 1) as typeof seenData);
  prepareCalled = doneCalled = false;
  seenData.length = 0;

  await t.throwsAsync(() =>
    spec.getQuerySingleRow({
      connection: createTestConnectionAbstraction(t, [])(sqlCommand),
      sqlCommand,
      prepareRequest,
      onDone,
      onRow,
    }),
  );
  t.true(prepareCalled);
  t.true(doneCalled);
  t.deepEqual(seenData, []);
  prepareCalled = doneCalled = false;
  seenData.length = 0;
});

test("The streamQueryResults works as expected", async (t) => {
  const connection = createTestConnectionAbstraction(t, DATA)(sqlCommand);
  let prepareCalled = false;
  let doneCalled = false;
  const seenData: Array<ReadonlyArray<unknown>> = [];
  const onDone = () => (doneCalled = true);
  const prepareRequest = (req: string) => {
    prepareCalled = true;
    t.deepEqual(req, sqlCommand);
    return req;
  };
  const onRow = (row: ReadonlyArray<unknown>) => {
    seenData.push(row);
    return row;
  };

  const returnedData = await spec.streamQueryResults({
    connection,
    sqlCommand,
    onRow,
    onDone,
    prepareRequest,
  });
  t.true(prepareCalled);
  t.true(doneCalled);
  t.deepEqual(seenData, returnedData);
  t.deepEqual(seenData, (DATA as unknown) as typeof seenData);
  prepareCalled = doneCalled = false;
  seenData.length = 0;
});

test("Error returned by connection's streamQuery function is thrown", async (t) => {
  const errorToThrow = new Error("This simulates connection's error");
  await t.throwsAsync(
    () =>
      spec.streamQuery({
        connection: createTestConnectionAbstraction(t, [])(sqlCommand, {
          whenToReturnError: "beforeData",
          errorToReturn: errorToThrow,
        }),
        onRow: () => {},
        sqlCommand,
      }),
    {
      is: errorToThrow,
    },
  );
});

test("Control flow works as expected", async (t) => {
  let paused = false;
  const rows = [[], [], []];
  let curRow = 0;
  let seenControlFlow: common.ControlFlow | undefined = undefined;
  await Promise.all([
    spec.streamQueryOnRequest(
      {
        sqlCommand,
        onRow: (row, controlFlow) => {
          ++curRow;
          t.false(paused);
          for (let i = 0; i < curRow; ++i) {
            // Call pause 1+ times to test also for extra pause count
            controlFlow!.pause(); // eslint-disable-line @typescript-eslint/no-non-null-assertion
          }
        },
        request: {
          pause: () => {
            t.false(paused);
            paused = true;
          },
          resume: () => {
            t.true(paused);
            paused = false;
          },
        },
      },
      async (opts, controlFlow) => {
        seenControlFlow = controlFlow;
        for (const row of rows) {
          while (paused) {
            // console.log("PAUSED"); // eslint-disable-line
            await common.sleep(100);
          }
          opts.onRow(row, controlFlow);
        }

        while (paused) {
          // console.log("PAUSED2"); // eslint-disable-line
          await common.sleep(100);
        }
        ++curRow;
      },
    ),
    (async () => {
      while (curRow <= rows.length) {
        while (!paused && curRow <= rows.length) {
          // console.log("NOT PAUSED", curRow); // eslint-disable-line
          await common.sleep(50);
        }
        if (paused) {
          for (let i = 0; i < curRow; ++i) {
            ((seenControlFlow as unknown) as common.ControlFlow).resume();
          }
        }
      }
      // Call resume when unpaused -> should do nothing
      ((seenControlFlow as unknown) as common.ControlFlow).resume();
    })(),
  ]);

  t.deepEqual(curRow, 4);
  t.notDeepEqual(seenControlFlow, undefined);
  t.false(paused);
});

const DATA = [
  ["one", 1],
  ["two", 2],
] as const;
const sqlCommand = "SELECT 1";

function createTestConnectionAbstraction<
  TData extends ReadonlyArray<ReadonlyArray<unknown>>
>(
  t: ExecutionContext,
  data: TData,
): (
  expectedSQL: string,
  streamQueryErrorBehaviour?: {
    whenToReturnError: "beforeData" | "beforeDone" | "beforeReturn";
    errorToReturn: unknown;
  },
) => spec.SQLConnectionReaderAbstraction<string, string> {
  return (expectedSQL, streamQueryErrorBehaviour) => ({
    createRequest: (sql) => {
      t.deepEqual(expectedSQL, sql);
      return sql;
    },
    defaultPrepareRequest: (sql) => sql,
    streamQuery: (options) => {
      t.is(options.request, options.sqlCommand);
      if (streamQueryErrorBehaviour?.whenToReturnError === "beforeData") {
        return Promise.resolve(streamQueryErrorBehaviour?.errorToReturn);
      }
      for (const datum of data) {
        options.onRow(datum, undefined);
      }
      if (streamQueryErrorBehaviour?.whenToReturnError === "beforeDone") {
        return Promise.resolve(streamQueryErrorBehaviour?.errorToReturn);
      }
      options.onDone?.([data.length]);
      return Promise.resolve(
        streamQueryErrorBehaviour?.whenToReturnError === "beforeReturn"
          ? streamQueryErrorBehaviour?.errorToReturn
          : undefined,
      );
    },
  });
}
