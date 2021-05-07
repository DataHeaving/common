export type ItemOrFactory<T, TParam> = T | ((param: TParam) => T);

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
  : {
      readonly [P in keyof T]: DeepReadOnly<T[P]>;
    };
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export interface ObjectStorageFunctionality<TObject> {
  storageID: string;
  readExistingData: () => Promise<TObject | string | Buffer | undefined>;
  writeNewDataWhenDifferent: (md: TObject) => Promise<unknown>;
}
