export type ItemOrFactory<T, TParams extends Array<unknown> = []> =
  | T
  | ((...params: TParams) => T);

export type MakeOptional<T, Props extends keyof T> = Omit<T, Props> &
  { [P in Props]?: T[P] };
export type MakeRequired<T, Props extends keyof T> = Omit<T, Props> &
  { [P in Props]-?: T[P] };

export const dateToISOUTCString = (d?: Date) => {
  const isoString = (d || new Date()).toISOString();
  return isoString.endsWith("Z") ? isoString : `${isoString}Z`;
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
