import * as types from "io-ts";
import test, { ExecutionContext } from "ava";
import * as spec from "../helpers";

test("The decodeOrThrow works as intended", (t) => {
  const validation = types.string;
  const value = "";
  const invalidValue = 1;
  let seenValidation: types.Validation<string> | undefined = undefined;
  t.deepEqual(spec.decodeOrThrow(validation.decode, value), value);
  t.deepEqual(
    spec.decodeOrThrow(validation.decode, value, (validation) => {
      seenValidation = validation;
      throw new Error("This should not happen");
    }),
    value,
  );
  t.deepEqual(seenValidation, undefined);

  t.throws(() => spec.decodeOrThrow(validation.decode, invalidValue), {
    instanceOf: Error,
    message: `Invalid value ${invalidValue} supplied to : string`,
  });

  seenValidation = undefined;
  t.throws(
    () =>
      spec.decodeOrThrow(validation.decode, invalidValue, (validation) => {
        seenValidation = validation;
        return new CustomError(); // Notice that simply returning an error will *not* throw it.
      }),
    {
      instanceOf: Error,
      message: `Invalid value ${invalidValue} supplied to : string`,
    },
  );
  t.notDeepEqual(seenValidation, undefined);

  seenValidation = undefined;
  t.throws(
    () =>
      spec.decodeOrThrow(validation.decode, invalidValue, (validation) => {
        seenValidation = validation;
        throw new CustomError(); // The error must be thrown by callback
      }),
    {
      instanceOf: CustomError,
    },
  );
  t.notDeepEqual(seenValidation, undefined);
});

test("The decodeOrDefault works as intended", (t) => {
  const validation = types.string;
  const value = "";
  const invalidValue = 1;
  const fallbackValue = 2;
  let seenValidation: types.Validation<string> | undefined = undefined;
  t.deepEqual(spec.decodeOrDefault(validation.decode, value), value);
  t.deepEqual(spec.decodeOrDefault(validation.decode, invalidValue), undefined);
  t.deepEqual(
    spec.decodeOrDefault(validation.decode, invalidValue, (validation) => {
      seenValidation = validation;
      return fallbackValue;
    }),
    fallbackValue,
  );
  t.notDeepEqual(seenValidation, undefined);
});

class CustomError extends Error {}
