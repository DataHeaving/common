import test, { TestInterface } from "ava";
import * as common from "@data-heaving/common";
import * as spec from "../containers";
import { env } from "process";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

interface TestContext {
  startedContainerID: string;
}

const thisTest = test as TestInterface<TestContext>;

thisTest.before("Start container", async (t) => {
  const { containerID, checkIsReady } = await spec.startContainerAsync({
    image: IMAGE,
    containerPorts: [
      {
        containerPort: CONTAINER_PORT,
        exposedPort: HOST_PORT,
      },
    ],
    containerEnvironment: CONTAINER_ENV,
    // This is optional parameter - running locally though, it is needed
    networkName: env.CONTAINER_NW,
  });

  console.log(`Started container with ID ${containerID}`); // eslint-disable-line no-console
  t.context.startedContainerID = containerID;
  while (!(await checkIsReady())) {
    await common.sleep(100);
  }
});

thisTest.after.always("Shut down container", async (t) => {
  const containerID = t.context.startedContainerID;
  if (await spec.stopContainerAsync(containerID)) {
    console.log("Removed container", containerID); // eslint-disable-line no-console
  }
});

thisTest("Make sure container ID is present", (t) => {
  t.regex(t.context.startedContainerID, /^.+$/);
});

test("Stopping container is detected and exception of correct type is thrown", async (t) => {
  const { containerID, checkIsReady } = await spec.startContainerAsync({
    image: IMAGE,
    containerPorts: [
      {
        containerPort: CONTAINER_PORT,
        exposedPort: HOST_PORT,
      },
    ],
    containerEnvironment: CONTAINER_ENV,
    // This is optional parameter - running locally though, it is needed
    networkName: env.CONTAINER_NW,
  });

  await spec.stopContainerAsync(containerID);

  await common.sleep(1000);

  await t.throwsAsync(checkIsReady(), {
    instanceOf: spec.ContainerShutDownError,
  });
});

test("Stopping container is detected also after first call to checkIsReady", async (t) => {
  const { containerID, checkIsReady } = await spec.startContainerAsync({
    image: IMAGE,
    containerPorts: [
      {
        containerPort: CONTAINER_PORT + 1,
        exposedPort: HOST_PORT,
      },
    ],
    containerEnvironment: CONTAINER_ENV,
    // This is optional parameter - running locally though, it is needed
    networkName: env.CONTAINER_NW,
  });

  t.false(await checkIsReady());

  await execFileAsync("docker", ["stop", containerID]);

  await common.sleep(1000);

  await t.throwsAsync(checkIsReady(), {
    instanceOf: spec.ContainerShutDownError,
  });
});

const IMAGE = "nginx:stable";

const CONTAINER_PORT = 80;
const HOST_PORT = 1234;
const CONTAINER_ENV = {
  NGINX_PORT: `${CONTAINER_PORT}`,
};
