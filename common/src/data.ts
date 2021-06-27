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

export type DatumStoringFactory<TContext, TDatum, TResult = unknown> = (
  context: TContext,
  recreateSignal: () => void,
) => {
  storing: DatumStoring<TDatum>;
  promise?: Promise<TResult>;
};

export type TPipelineFactory<TInput, TContext, TDatum> = (
  datumStoringFactory: () => DatumStoringFactory<TContext, TDatum>,
) => TPipeline<TInput>;

export type TPipeline<TInput> = (input: TInput) => Promise<void>;

export interface ControlFlow {
  pause: () => void;
  resume: () => void;
}

export type DatumTransformerFactory<TContext, TDatum, TTransformed> =
  | SimpleDatumTransformerFactory<TContext, TDatum, TTransformed>
  | ComplexDatumTransformerFactory<TContext, TDatum, TTransformed>;

export type SimpleDatumTransformerFactory<TContext, TDatum, TTransformed> = {
  transformer: "simple";
  factory: (context: TContext) => SimpleDatumTransformer<TDatum, TTransformed>;
};

export type SimpleDatumTransformer<TDatum, TTransformed> = (
  datum: TDatum,
) => TTransformed;

export type ComplexDatumTransformerFactory<TContext, TDatum, TTransformed> = {
  transformer: "complex";
  factory: () => (
    next: DatumStoring<TTransformed>,
    context: TContext,
    recreateSignal: () => void,
  ) => ComplexDatumTransformer<TDatum>;
};

export interface ComplexDatumTransformer<TDatum> {
  transformer: DatumProcessor<TDatum>;
  end: () => types.MaybePromise<unknown>;
}

export const runPipelineWithBufferedData = async <TContext, TDatum>(
  context: TContext,
  datumStoring: DatumStoringFactory<TContext, TDatum>,
  data: ReadonlyArray<TDatum>,
  concurrencyLevel: number,
) => {
  const promises: Array<Promise<unknown>> = [];
  await iteration.iterateInParallel(
    data,
    concurrencyLevel,
    async (datum, _, concurrencyContext) => {
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
};
