export type DatumProcessor<TDatum> = (
  datum: TDatum,
  controlFlow?: ControlFlow,
) => void;

export interface DatumStoring<TDatum> {
  processor: DatumProcessor<TDatum>;
  end: () => void; //ReadonlyArray<Promise<unknown>>;
}

export type DatumStoringFactory<TArg, TDatum> = (
  arg: TArg,
  recreateSignal: () => void,
) => {
  storing: DatumStoring<TDatum>;
  promises?: ReadonlyArray<Promise<unknown>>; // IMPORTANT! Do not immediately iterate this array. More items might be inserted after this array is returned!
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
  end: () => void;
}
