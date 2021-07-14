export type ItemOrFactory<T, TParams extends Array<unknown> = []> =
  | T
  | ((...params: TParams) => T);

export type MakeOptional<T, Props extends keyof T> = Omit<T, Props> &
  { [P in Props]?: T[P] };
export type MakeRequired<T, Props extends keyof T> = Omit<T, Props> &
  { [P in Props]-?: T[P] };

export const dateToISOUTCString = (d?: Date) => {
  // From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString
  // String always ends with 'Z' so we don't need to check for that
  return (d || new Date()).toISOString();
};

export type DePromisify<T> = T extends Promise<infer U> ? U : never;
export type DeepReadOnly<T> = T extends Array<infer U>
  ? ReadonlyArray<DeepReadOnly<U>>
  : T extends Record<string, unknown>
  ? {
      readonly [P in keyof T]: DeepReadOnly<T[P]>;
    }
  : T;
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export interface ObjectStorageFunctionality<TObject> {
  storageID: string;
  readExistingData: () => Promise<TObject | string | Buffer | undefined>;
  writeNewData: (md: TObject) => Promise<unknown>;
}

export type MaybePromise<T> = T | Promise<T>;

export type OneOrMore<T> = T | ReadonlyArray<T>;

export type OneOrMoreMutable<T> = T | Array<T>;
