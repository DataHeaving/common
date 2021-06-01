import * as t from "io-ts";

export const nonEmptyString = t.refinement(
  t.string,
  (str) => str.length > 0,
  "NonEmptyString",
);
export const emptyString = t.refinement(
  t.string,
  (str) => str.length <= 0,
  "EmptyString",
);
const isoDateRegex = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d(\.\d+)?Z?$/; // From https://stackoverflow.com/questions/3143070/javascript-regex-iso-datetime
export const isoDateString = t.refinement(
  t.string,
  (str) => isoDateRegex.test(str),
  "ISOTimestampString",
);
export const urlWithPath = t.refinement(
  t.string,
  (str) => (str.match(/\//g) || []).length > 2,
  "URLWithPath",
); // URL with path should have at least 3 forward slashes
export const intGeqZero = t.refinement(
  t.Integer,
  (int) => int >= 0,
  "IntegerGreaterThanOrEqualToZero",
);
export const intGtZero = t.refinement(
  t.Integer,
  (int) => int > 0,
  "IntegerGreaterThanToZero",
);

export const uuid = t.refinement(
  t.string,
  (maybeUUID) => {
    // Official UUID regexp is /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    // But we relax it a little - for the last character of third group and first character of fourth group, since we are not really interested of UUIDs adhering to the spec, but just being unique strings.
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      maybeUUID,
    );
  },
  "UUID",
);

export const oneOrMany = <T extends t.Mixed>(type: T, name?: string) => t.union([type, t.array(type)], name);