import test from "ava";
import * as spec from "../async";

test("The sleep method works as expected with valid input", async (t) => {
  const promise = spec.sleep(100);
  let timeoutTriggered = false;
  setTimeout(() => (timeoutTriggered = true), 200);
  await promise;
  t.false(timeoutTriggered);
});

test("The sleep method works as expected with invalid input", async (t) => {
  let timeoutTriggered = false;
  setTimeout(() => (timeoutTriggered = true), 200);
  const performTest = async (arg: unknown) => {
    await spec.sleep(arg as number);
    t.false(timeoutTriggered);
  };
  await performTest(0);
  await performTest(NaN);
  await performTest("Something");
});
