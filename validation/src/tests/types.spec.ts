import test from "ava";
import * as spec from "../types";

test("URL with path validation works as expected", (t) => {
  t.true(
    spec.urlWithPath.is("https://host/path"),
    "Validation must recognize valid URL with path",
  );

  t.false(
    spec.urlWithPath.is("https://host/"),
    "Validation must not recognize invalid URL without any path characters",
  );

  t.false(
    spec.urlWithPath.is("https://host///"),
    "Validation must not recognize invalid URL without actual path characters",
  );

  t.true(
    spec.urlWithPath.is("https://host/path/"),
    "Validation must recognize valid URL with path even if it ends with slash",
  );
});
