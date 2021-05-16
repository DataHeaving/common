import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import * as common from "@data-heaving/common";

export const decodeOrThrow = <TType, TInput>(
  decode: (i: TInput) => t.Validation<TType>,
  input: TInput,
  customError?: () => unknown,
) => {
  const resultOrError = decode(input);
  if (resultOrError._tag === "Right") {
    return resultOrError.right;
  } else {
    if (customError) {
      customError();
    }
    throw new Error(PathReporter.report(resultOrError).join("\n"));
  }
};

export const decodeOrDefault = <TType, TInput, TError = undefined>(
  decode: (i: TInput) => t.Validation<TType>,
  input: TInput,
  customError?: (error: t.Validation<TType>) => TError,
) => {
  const resultOrError = decode(input);
  if (resultOrError._tag === "Right") {
    return resultOrError.right;
  } else {
    return customError?.(resultOrError);
  }
};

export const decodePartialOrThrow = <TType>(
  decode: (i: common.DeepPartial<TType>) => t.Validation<TType>,
  input: common.DeepPartial<TType>,
  customError?: () => unknown,
) => decodeOrThrow(decode, input, customError);

export const retrieveValidatedDataFromStorage = async <TType>(
  objectStorage: common.ObjectStorageFunctionality<TType>["readExistingData"],
  decode: (i: unknown) => t.Validation<TType>,
) => {
  let existingData: TType | undefined = undefined;
  try {
    const existingMDUnverified = await objectStorage();
    existingData =
      typeof existingMDUnverified === "undefined"
        ? undefined
        : decodeOrDefault(
            decode,
            typeof existingMDUnverified === "string"
              ? JSON.parse(existingMDUnverified)
              : existingMDUnverified instanceof Buffer
              ? JSON.parse(existingMDUnverified.toString())
              : existingMDUnverified,
          );
  } catch {
    // Ignore
  }
  return existingData;
};
