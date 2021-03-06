import * as common from "@data-heaving/common";

export type TSQLRow = ReadonlyArray<unknown> | undefined;

export interface SQLConnectionReaderAbstraction<
  TIntermediateRequest,
  TFinalRequest
> {
  createRequest: (sqlCommand: string) => TIntermediateRequest;
  defaultPrepareRequest: (req: TIntermediateRequest) => TFinalRequest;
  streamQuery: (
    options: QueryExecutionParametersWithRequest<TFinalRequest>,
    controlFlow: common.ControlFlow | undefined,
  ) => Promise<unknown>;
}
export type RowTransformer<T, TRow = ReadonlyArray<unknown>> = (
  row: TRow,
  controlFlow: common.ControlFlow | undefined,
) => T;

export interface QueryExecutionParametersBase<
  TResult = unknown,
  TRow = ReadonlyArray<unknown>
> {
  sqlCommand: string;
  onRow: RowTransformer<TResult, TRow>;
  onDone?: (rowsAffected: Array<number>) => unknown;
  // onRowMD?: (md: ReadonlyArray<sql.IColumnMetadata[string]>) => void;
  // sqlTracer: SQLTracer;
}

export type QueryExecutionParametersWithRequest<
  TFinalRequest
> = QueryExecutionParametersBase & {
  request: TFinalRequest;
};
export type QueryExecutionParameters<
  TIntermediateRequest,
  TFinalRequest,
  TResult = unknown,
  TRow = ReadonlyArray<unknown>
> = QueryExecutionParametersBase<TResult, TRow> & {
  connection: SQLConnectionReaderAbstraction<
    TIntermediateRequest,
    TFinalRequest
  >;
  prepareRequest?: (request: TIntermediateRequest) => TFinalRequest;
};

export type QueryExecutionParametersSingle<
  TIntermediateRequest,
  TFinalRequest,
  TResult,
  TRow = ReadonlyArray<unknown>
> = QueryExecutionParameters<
  TIntermediateRequest,
  TFinalRequest,
  TResult,
  TRow
> & {
  strict?: boolean;
};
export const executeStatementNoResults = <TIntermediateRequest, TFinalRequest>(
  opts: Omit<
    QueryExecutionParameters<TIntermediateRequest, TFinalRequest>,
    "onRow"
  >,
) =>
  streamQuery({
    ...opts,
    onRow: () => {},
  });

export const getQuerySingleValue = async <
  TIntermediateRequest,
  TFinalRequest,
  TResult
>(
  opts: QueryExecutionParametersSingle<
    TIntermediateRequest,
    TFinalRequest,
    TResult,
    unknown
  > & { columnIndex?: number },
) =>
  getQuerySingleRow({
    ...opts,
    onRow: (...args) => opts.onRow(args[0][opts?.columnIndex ?? 0], args[1]),
  });

export const getQuerySingleRow = async <
  TIntermediateRequest,
  TFinalRequest,
  TResult
>(
  opts: QueryExecutionParametersSingle<
    TIntermediateRequest,
    TFinalRequest,
    TResult
  >,
) => {
  let retVal: TResult | undefined = undefined;
  let resultSet = false;
  await streamQuery({
    ...opts,
    onRow: (...args) => {
      if (resultSet) {
        if (opts.strict === true) {
          throw new UnexpectedAmountOfRowsError(true);
        }
      } else {
        retVal = opts.onRow(args[0], args[1]);
        resultSet = true;
      }
    },
  });

  if (!resultSet) {
    throw new UnexpectedAmountOfRowsError(false);
  }

  return retVal;
};

export const streamQueryResults = async <
  TIntermediateRequest,
  TFinalRequest,
  TResult
>(
  opts: QueryExecutionParameters<TIntermediateRequest, TFinalRequest, TResult>,
) => {
  const values: TResult[] = [];
  await streamQuery({
    ...opts,
    onRow: (row, controlFlow) => values.push(opts.onRow(row, controlFlow)),
  });
  return values;
};

export const streamQuery = <TIntermediateRequest, TFinalRequest>(
  opts: QueryExecutionParameters<TIntermediateRequest, TFinalRequest>,
) => {
  const request = (
    opts.prepareRequest ?? opts.connection.defaultPrepareRequest
  )(opts.connection.createRequest(opts.sqlCommand));
  return streamQueryOnRequest(
    { ...opts, request },
    opts.connection.streamQuery,
  );
};

export const streamQueryOnRequest = async <TFinalRequest>(
  {
    sqlCommand,
    onRow,
    onDone,
    request,
  }: QueryExecutionParametersWithRequest<TFinalRequest>,
  connectionStreamQuery: SQLConnectionReaderAbstraction<
    unknown,
    TFinalRequest
  >["streamQuery"],
) => {
  let pauseCount = 0;
  const pause: unknown = (request as any).pause; // eslint-disable-line
  const resume: unknown = (request as any).resume; // eslint-disable-line
  const controlFlow =
    typeof pause === "function" && typeof resume === "function"
      ? {
          pause: () => {
            if (pauseCount === 0) {
              pause.apply(request);
            }
            ++pauseCount;
          },
          resume: () => {
            if (pauseCount > 0) {
              --pauseCount;
              if (pauseCount === 0) {
                resume.apply(request);
              }
            }
          },
        }
      : undefined;

  const error = await connectionStreamQuery(
    { sqlCommand, onRow, onDone, request },
    controlFlow,
  );

  if (error) {
    throw error; // instanceof Error ? error : new Error(`${error}`);
  }
};

// export class MultipleErrors extends Error {
//   public readonly errors: ReadonlyArray<unknown>;

//   public constructor(errorArray: ReadonlyArray<unknown>, message?: string) {
//     super(message);
//     this.errors = errorArray;
//   }
// }

export class UnexpectedAmountOfRowsError extends Error {
  public constructor(public readonly tooMany: boolean) {
    super(`Expected exactly one row, but got too ${tooMany ? "many" : "few"}`);
  }
}
