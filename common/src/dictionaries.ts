// Without TFactoryReturnValue, we will get some problems in things like getOrAddGeneric(dictionary, tableID.databaseName, () => ({})), when values are dictionaries

export const getOrAddGeneric = <
  TKey extends keyof any, // eslint-disable-line @typescript-eslint/no-explicit-any
  TValue,
  TFactoryReturnValue extends TValue
>(
  dictionary: Record<TKey, TValue>,
  key: TKey,
  factory: (key: TKey) => TFactoryReturnValue,
) => {
  let value = dictionary[key];
  if (!value) {
    dictionary[key] = value = factory(key);
  }
  return value;
};
