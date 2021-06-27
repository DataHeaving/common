import * as t from "io-ts";
import { PathReporter } from "io-ts/PathReporter";
import * as common from "@data-heaving/common";
import { Left } from "fp-ts/lib/Either";

export const decodeOrThrow = <TType, TInput>(
  decode: (i: TInput) => t.Validation<TType>,
  input: TInput,
  customError?: (result: t.Validation<TType>) => unknown,
) => {
  const resultOrError = decode(input);
  if (resultOrError._tag === "Right") {
    return resultOrError.right;
  } else {
    if (customError) {
      customError(resultOrError);
    }
    throw new DecodeError(resultOrError);
  }
};

export const decodeOrDefault = <TType, TInput, TError = undefined>(
  decode: (i: TInput) => t.Validation<TType>,
  input: TInput,
  customError?: (error: t.Validation<TType>) => TError,
) => {
  const resultOrError = decode(input);
  return resultOrError._tag === "Right"
    ? resultOrError.right
    : customError?.(resultOrError);
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

export class DecodeError extends Error {
  public readonly errors: t.Errors;

  public constructor(errors: Left<t.Errors>) {
    super(PathReporter.report(errors).join("\n"));
    this.errors = errors.left;
  }
}
