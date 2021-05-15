import * as types from "./types";
import * as asyncUtils from "./async";
import * as iteration from "./iteration";

export type DatumProcessor<TDatum> = (
  datum: TDatum,
  controlFlow?: ControlFlow,
) => void;

export interface DatumStoring<TDatum> {
  processor: DatumProcessor<TDatum>;
  end: () => void;
}

export type DatumStoringFactory<TArg, TDatum, TResult = unknown> = (
  arg: TArg,
  recreateSignal: () => void,
) => {
  storing: DatumStoring<TDatum>;
  promise?: Promise<TResult>;
};

export type TPipelineFactory<TArg, TDatum> = (
  datumStoringFactory: () => DatumStoringFactory<TArg, TDatum>,
) => TPipeline;

export type TPipeline = () => Promise<void>;

export interface ControlFlow {
  pause: () => void;
  resume: () => void;
}

// export type DatumTransformerFactory<TArg, TDatum, TTransformed> = (
//   arg: TArg,
//   next: DatumStoring<TTransformed>,
// ) => DatumProcessor<TDatum>; // DatumTransformer<TDatum, TTransformed>;

export type SimpleDatumTransformerFactory<TArg, TDatum, TTransformed> = (
  arg: TArg,
) => SimpleDatumTransformer<TDatum, TTransformed>;

export type SimpleDatumTransformer<TDatum, TTransformed> = (
  datum: TDatum,
) => TTransformed;

export type ComplexDatumTransformerFactory<TArg, TDatum, TTransformed> = () => (
  next: DatumStoring<TTransformed>,
  arg: TArg,
  recreateSignal: () => void,
) => ComplexDatumTransformer<TDatum>;

export interface ComplexDatumTransformer<TDatum> {
  transformer: DatumProcessor<TDatum>;
  end: () => types.MaybePromise<unknown>;
}

export const runPipelineWithBufferedData = async <TContext, TDatum>(
  context: TContext,
  datumStoring: DatumStoringFactory<TContext, TDatum>,
  data: ReadonlyArray<TDatum>,
  concurrencyLevel: number,
  // getNewArg: (result: TDatum) => TNewArg,
) => {
  // let storing: ReturnType<typeof datumStoring> | undefined = undefined;
  const promises: Array<Promise<unknown>> = [];
  await iteration.iterateInParallel(
    data,
    concurrencyLevel,
    async (datum, concurrencyContext) => {
      let storing = concurrencyContext.storing;
      if (!storing) {
        storing = datumStoring(context, () => {
          storing?.storing.end();
          concurrencyContext.storing = undefined;
        });
        const promise = storing.promise;
        if (promise) {
          promises.push(promise);
        }
        concurrencyContext.storing = storing;
      }
      let pauseCount = 0;
      storing.storing.processor(datum, {
        pause: () => {
          ++pauseCount;
        },
        resume: () => {
          --pauseCount;
        },
      });
      while (pauseCount > 0) {
        await asyncUtils.sleep(100);
      }
    },
    () => ({
      storing: undefined as ReturnType<typeof datumStoring> | undefined,
    }),
    (ctx) => ctx.storing?.storing.end(),
  );

  await Promise.all(promises);
  // if (data.length > 0) {
  // let curIndex = 0;
  // concurrencyLevel = Math.min(concurrencyLevel, 1);
  // await Promise.all(
  //   new Array<Promise<unknown>>(concurrencyLevel).fill(
  //     (async () => {
  //       while (curIndex < data.length) {
  //         const nextItem = data[curIndex];
  //         ++curIndex;
  //         const { storing, promise } = datumStoring(
  //           getNewArg(nextItem),
  //           () => {},
  //         );
  //         let pauseCount = 0;
  //         storing.processor(nextItem, {
  //           pause: () => {
  //             ++pauseCount;
  //           },
  //           resume: () => {
  //             --pauseCount;
  //           },
  //         });
  //         while (pauseCount > 0) {
  //           await asyncUtils.sleep(100);
  //         }
  //         storing.end();
  //         if (promise) {
  //           await promise;
  //         }
  //       }
  //     })(),
  //     0,
  //     concurrencyLevel,
  //   ),
  // );
  // }
  // for (const dataChunk of common.getChunks(data, concurrencyLevel)) {
  //   let currentStoring:
  //     | ReturnType<common.DatumStoringFactory<TNewArg, TDatum>>
  //     | undefined = undefined;
  //   const recreateSignal = () => (currentStoring = undefined);
  //   const allSeenPromises: Array<Promise<unknown>> = [];
  //   for (const datum of dataChunk) {
  //     if (!currentStoring) {
  //       currentStoring = datumStoring(getNewArg(datum), recreateSignal);
  //       const promise = currentStoring.promise;
  //       if (promise) {
  //         allSeenPromises.push(promise);
  //       }
  //     }
  //     currentStoring.storing.processor(datum, undefined);
  //   }
  //   if (currentStoring) {
  //     currentStoring.storing.end();
  //   }
  //   await Promise.all(allSeenPromises);
  // }
};
