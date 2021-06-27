import * as types from "io-ts";
import * as common from "@data-heaving/common";
import test, { ExecutionContext } from "ava";
import * as spec from "../helpers";

test("The decodeOrThrow works as intended", (t) => {
  performDecodeOrThrowTest(t, spec.decodeOrThrow, types.string, "", 1);
});

test("The decodeOrThrowPartial works as intended", (t) => {
  // decodeOrThrowPartial is just a specific type signature of decodeOrThrow
  const validationName = "TestType";
  performDecodeOrThrowTest(
    t,
    spec.decodePartialOrThrow as typeof spec.decodeOrThrow,
    types.type(
      {
        propString: types.string,
        propNumber: types.number,
      },
      validationName,
    ),
    {
      propString: "",
      propNumber: 1,
    },
    {
      propString: "",
    },
    {
      validationName: `${validationName}/propNumber: number`,
      valueString: `undefined`,
    },
  );
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

test("The retrieveValidatedDataFromStorage works as intended", async (t) => {
  const validation = types.type({
    someProperty: types.string,
  });
  const createObjectStorageReaderWithValidation = (
    returnedValue:
      | types.TypeOf<typeof validation>
      | string
      | Buffer
      | undefined,
  ) => createObjectStorageReader(returnedValue);

  t.deepEqual(
    await spec.retrieveValidatedDataFromStorage(
      createObjectStorageReaderWithValidation(undefined),
      validation.decode,
    ),
    undefined,
    "If underlying callback returns undefined, final result must be undefined.",
  );

  t.deepEqual(
    await spec.retrieveValidatedDataFromStorage(
      createObjectStorageReaderWithValidation(`{"someProperty": ""}`),
      validation.decode,
    ),
    {
      someProperty: "",
    },
    "If underlying callback returns string, it must be interpreted as JSON string.",
  );
  t.deepEqual(
    await spec.retrieveValidatedDataFromStorage(
      createObjectStorageReaderWithValidation(
        Buffer.from(`{"someProperty": ""}`),
      ),
      validation.decode,
    ),
    {
      someProperty: "",
    },
    "If underlying callback returns Buffer, it must be interpreted as serialized JSON string.",
  );
  t.deepEqual(
    await spec.retrieveValidatedDataFromStorage(
      createObjectStorageReaderWithValidation({ someProperty: "" }),
      validation.decode,
    ),
    {
      someProperty: "",
    },
    "If underlying callback returns anything other than undefined/string/Buffer, it must be attempted to be validated as-is.",
  );

  t.deepEqual(
    await spec.retrieveValidatedDataFromStorage(
      createObjectStorageReaderWithValidation(({
        someOtherProperty: "",
      } as unknown) as types.TypeOf<typeof validation>),
      validation.decode,
    ),
    undefined,
    "If underlying callback returns anything other than undefined/string/Buffer, it must be attempted to be validated as-is, and undefined returned if validation does not pass.",
  );

  t.deepEqual(
    await spec.retrieveValidatedDataFromStorage<
      types.TypeOf<typeof validation>
    >(() => {
      throw new Error("This should be ignored");
    }, validation.decode),
    undefined,
    "If underlying callback throws an exception, it must not be leaked out, and return value must be undefined.",
  );
});

class CustomError extends Error {}

const performDecodeOrThrowTest = <TType, TValidation extends types.Type<TType>>(
  t: ExecutionContext,
  decodeOrThrow: typeof spec.decodeOrThrow,
  validation: TValidation,
  value: TType,
  invalidValue: unknown,
  invalidMessage?: {
    validationName: string;
    valueString: string;
  },
) => {
  t.deepEqual(decodeOrThrow(validation.decode, value), value);
  let seenValidation: types.Validation<TType> | undefined = undefined;
  t.deepEqual(
    decodeOrThrow(validation.decode, value, (validation) => {
      seenValidation = validation;
      throw new Error("This should not happen");
    }),
    value,
  );
  t.deepEqual(seenValidation, undefined);

  const message = `Invalid value ${
    invalidMessage?.valueString ?? invalidValue
  } supplied to : ${invalidMessage?.validationName ?? validation.name}`;

  t.throws(() => decodeOrThrow(validation.decode, invalidValue), {
    instanceOf: Error,
    message,
  });

  seenValidation = undefined;
  t.throws(
    () =>
      decodeOrThrow(validation.decode, invalidValue, (validation) => {
        seenValidation = validation;
        return new CustomError(); // Notice that simply returning an error will *not* throw it.
      }),
    {
      instanceOf: spec.DecodeError,
      message,
    },
  );
  t.notDeepEqual(seenValidation, undefined);

  seenValidation = undefined;
  t.throws(
    () =>
      decodeOrThrow(validation.decode, invalidValue, (validation) => {
        seenValidation = validation;
        throw new CustomError(); // The error must be thrown by callback
      }),
    {
      instanceOf: CustomError,
    },
  );
  t.notDeepEqual(seenValidation, undefined);
};

function createObjectStorageReader<TObject>(
  returnedValue: TObject | string | Buffer | undefined,
): common.ObjectStorageFunctionality<TObject>["readExistingData"] {
  return () => Promise.resolve(returnedValue);
}
