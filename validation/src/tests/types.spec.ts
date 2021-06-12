import * as types from "io-ts";
import test, { ExecutionContext } from "ava";
import * as spec from "../types";

test("URL with path validation works as expected", (t) => {
  const performTest = (
    value: string,
    matches: boolean,
    additionalInfo: string,
  ) => validationExpected(t, spec.urlWithPath, value, additionalInfo, matches);
  performTest("https:", false, "invalid URL");
  performTest("https://host", false, "URL without any path");
  performTest("https://host/path", true, "URL with path");
  performTest("https://host/", false, "URL with single forward slash as path");
  performTest(
    "https://host///",
    false,
    "URL with multiple forward slashes as path",
  );
  performTest(
    "https://host/path/",
    true,
    "URL with valid path ending with forward slash",
  );
});

test("Empty and non-empty string validation works as expected", (t) => {
  validationMatches(t, spec.nonEmptyString, "-");
  validationDoesNotMatch(t, spec.nonEmptyString, "");
  validationMatches(t, spec.emptyString, "");
  validationDoesNotMatch(t, spec.emptyString, "-");
});

test("Date string validation work as expected", (t) => {
  const performTest = (
    value: string,
    matches: boolean,
    additionalInfo: string,
  ) => {
    validationExpected(t, spec.isoDateString, value, additionalInfo, matches);
    validationExpected(
      t,
      spec.isoDateString,
      `${value}Z`,
      additionalInfo,
      matches,
    );
  };

  performTest(
    "2020-01-01T00:00:00",
    true,
    "date string without second fractions",
  );

  performTest(
    "2020-01-01T00:00:00.123",
    true,
    "date string with three second fractions",
  );

  performTest(
    "2020-01-01T00:00:00.123456789",
    true,
    "date string with many second fractions",
  );

  performTest(
    "2020-01-01t00:00:00.123456789",
    false,
    "date string with lowercase 'T'",
  );

  performTest(
    "2020-01-01T00:00:00,123456789",
    false,
    "date string with comma as decimal separator",
  );

  performTest("2020-01-01T00:00", false, "date string without seconds");
});

test("Integer validations work as expected", (t) => {
  const performTest = (
    validation: types.Mixed,
    additionalInfo: string,
    lessThanZero: boolean,
    zero: boolean,
    greaterThanZero: boolean,
  ) => {
    validationExpected(t, validation, -1, additionalInfo, lessThanZero);
    validationExpected(t, validation, 0, additionalInfo, zero);
    validationExpected(t, validation, 1, additionalInfo, greaterThanZero);
    validationExpected(t, validation, -0.5, additionalInfo, false);
    validationExpected(t, validation, 0.5, additionalInfo, false);
  };

  performTest(spec.intLtZero, "less than zero", true, false, false);
  performTest(spec.intLeqZero, "less than or equal to zero", true, true, false);
  performTest(
    spec.intGeqZero,
    "greater than or equal to zero",
    false,
    true,
    true,
  );
  performTest(spec.intGtZero, "greater than zero", false, false, true);
});

test("UUID validation works as expected", (t) => {
  validationMatches(
    t,
    spec.uuid,
    "00000000-0000-0000-0000-000000000000",
    "valid uuid string",
  ); // Notice that v4 is not required - this accepts anything that looks like random 8 bytes in specific format
  validationDoesNotMatch(
    t,
    spec.uuid,
    "00000000-0000-0000+0000-000000000000",
    "invalid uuid string",
  );
});

test("One or many validation works as expected", (t) => {
  const oneOrManyStrings = spec.oneOrMany(types.string);
  validationMatches(t, oneOrManyStrings, "");
  validationMatches(t, oneOrManyStrings, [""]);
  validationMatches(t, oneOrManyStrings, ["", "another"]);
});

const validationMatches = (
  t: ExecutionContext,
  validation: types.Mixed,
  value: unknown,
  additionalInfo?: string,
) => validationExpected(t, validation, value, additionalInfo, true);

const validationDoesNotMatch = (
  t: ExecutionContext,
  validation: types.Mixed,
  value: unknown,
  additionalInfo?: string,
) => validationExpected(t, validation, value, additionalInfo, false);

const validationExpected = (
  t: ExecutionContext,
  validation: types.Mixed,
  value: unknown,
  additionalInfo: string | undefined,
  result: boolean,
) =>
  t.true(
    validation.is(value) === result,
    `Validation${additionalInfo ? ` for ${additionalInfo}` : ""} must${
      result ? "" : " not"
    } succeed.`,
  );
