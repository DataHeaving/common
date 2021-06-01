import test from "ava";
import * as spec from "../storage";

test("Escaping and unescaping works for strings containing only valid characters", (t) => {
  const testString = "MyTestString";
  const escaped = spec.escapeForBlobPath(testString);
  t.deepEqual(escaped, testString);
  t.deepEqual(spec.unescapeFromBlobPath(escaped), testString);
});

test("Escaping and unescaping works for strings contaiing also invalid characters", (t) => {
  const testString = "My/TestString";
  const escaped = spec.escapeForBlobPath(testString);
  t.deepEqual(escaped, "My¤47TestString");
  t.deepEqual(spec.unescapeFromBlobPath(escaped), testString);
});
