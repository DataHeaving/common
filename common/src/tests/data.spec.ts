import test from "ava";
import * as spec from "../data";

test("The runPipelineWithBufferedData works as intended", async (t) => {
  // eslint-disable-next-line
  const context: string = "Context";
  let seenContext: typeof context | undefined = undefined;
  const onCreate = (ctx: typeof context) => (seenContext = ctx);
  const data = [0, 1, 2];
  const seenData: typeof data = [];
  let endCount = 0;
  const onEnd = () => {
    ++endCount;
  };
  await spec.runPipelineWithBufferedData(
    context,
    createDatumStoringFactory(seenData, onCreate, onEnd, Promise.resolve()),
    data,
    1,
  );
  t.deepEqual(endCount, 1);
  t.deepEqual(seenData, data);
  t.deepEqual((seenContext as unknown) as typeof context, context);
  seenContext = undefined;
  seenData.length = endCount = 0;

  await spec.runPipelineWithBufferedData(
    context,
    createDatumStoringFactory(seenData, onCreate, onEnd, undefined, [1]),
    data,
    1,
  );
  t.deepEqual(endCount, 2);
  t.deepEqual(seenData, data);
  t.deepEqual((seenContext as unknown) as typeof context, context);
  seenContext = undefined;
  seenData.length = endCount = 0;
});

test("The runPipelineWithBufferedData with control flow works as expected", async (t) => {
  let paused = false;
  const data = [0, 1, 2];
  let curRow = 0;
  // We can not use similar thing to sql/src/tests/connection-read-spec.ts, because the control flow object given to our storing processor callback will be different on each invocation!
  await spec.runPipelineWithBufferedData(
    undefined,
    () => {
      return {
        storing: {
          processor: (datum, controlFlow) => {
            t.false(paused);
            ++curRow;
            const pauseCount = curRow;
            for (let i = 0; i < pauseCount; ++i) {
              // Call pause 1+ times to test also for extra pause count
              controlFlow!.pause(); // eslint-disable-line @typescript-eslint/no-non-null-assertion
            }
            paused = true;
            setTimeout(() => {
              for (let i = 0; i < pauseCount; ++i) {
                // Call resume as many times as was called pause
                controlFlow!.resume(); // eslint-disable-line @typescript-eslint/no-non-null-assertion
              }
              paused = false;
            }, 100);
          },
          end: () => {},
        },
      };
    },
    data,
    1,
  );
});

function createDatumStoringFactory<TContext, TDatum>(
  seenData: Array<TDatum>,
  onCreate: (context: TContext) => void,
  onEnd: () => void,
  initialPromise?: Promise<unknown>,
  recreateOn?: Array<number>,
): spec.DatumStoringFactory<TContext, TDatum> {
  return (ctx, recreate) => {
    let curIdx = 0;
    onCreate(ctx);
    return {
      storing: {
        processor: (datum) => {
          seenData.push(datum);
          if ((recreateOn?.indexOf(curIdx) ?? -1) >= 0) {
            recreate();
          }
          ++curIdx;
        },
        end: onEnd,
      },
      promise: initialPromise,
    };
  };
}
