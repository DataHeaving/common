import test from "ava";
import * as spec from "../types";

test("The dateToISOUTCString works as expected", (t) => {
  const dateStr = "2020-01-01T00:00:00.000";
  t.deepEqual(
    spec.dateToISOUTCString(new Date(Date.parse(dateStr))),
    `${dateStr}Z`,
  );

  t.true(spec.dateToISOUTCString().endsWith("Z"));
});
