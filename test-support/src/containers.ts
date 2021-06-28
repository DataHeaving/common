import { execFile } from "child_process";
import { promisify } from "util";
import { Socket, SocketConnectOpts } from "net";

const execFileAsync = promisify(execFile);

export interface ContainerStartOptions {
  image: string;
  containerPorts: ReadonlyArray<{
    containerPort: number;
    checkReadyness?: (host: string, port: number) => Promise<unknown>; // if throws -> not ready, otherwise -> ready
    exposedPort?: number;
  }>;
  containerEnvironment: Record<string, string>; // Safe to have secret variables here, they are not passed via command-line
  networkName?: string; // This is useful when current process itself is running within a Docker container
  waitForContainerLogsInCaseOfContainerShutDown?: number;
}

export const startContainerAsync = async ({
  image,
  containerPorts,
  containerEnvironment,
  networkName,
  waitForContainerLogsInCaseOfContainerShutDown,
}: ContainerStartOptions) => {
  const isNetworkSpecified = networkName?.length ?? 0 > 0;
  const containerID = (
    await execFileAsync(
      "docker",
      [
        "run",
        // "--rm", // Don't use --rm, as we might want to get logs out of the container
        "--detach",
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ...(isNetworkSpecified ? ["--network", networkName!] : []),
        isNetworkSpecified ? "--expose" : "--publish",
        ...containerPorts.map(
          ({ containerPort, exposedPort }) =>
            `${
              isNetworkSpecified ? containerPort : exposedPort ?? containerPort
            }${isNetworkSpecified ? "" : `:${containerPort}`}`,
        ),
        ...Object.keys(containerEnvironment).flatMap((envName) => [
          "--env",
          envName,
        ]),
        image,
      ],
      {
        env: containerEnvironment,
      },
    )
  ).stdout.trim(); // Remember to trim output so that trailing newline would not be included as part of container ID

  const readynessState = containerPorts.map(
    ({ checkReadyness, exposedPort, containerPort }) => {
      if (!checkReadyness) {
        let socket: Socket | undefined = new Socket();
        checkReadyness = async (host, port) => {
          if (socket) {
            let success = false;
            try {
              await connectAsync(socket, { host, port });
              success = true;
            } finally {
              if (success) {
                socket.destroy();
                socket = undefined;
              }
            }
          }
        };
      }
      return {
        port: isNetworkSpecified ? containerPort : exposedPort ?? containerPort,
        checkReadyness,
        isReady: false,
      };
    },
  );

  const containerHostName: string = isNetworkSpecified
    ? await getContainerHostName(containerID)
    : "127.0.0.1";

  return {
    containerID,
    containerHostName,
    checkIsReady: async () => {
      const nonReadyPorts = readynessState.filter(({ isReady }) => !isReady);
      let isReady = nonReadyPorts.length <= 0;
      if (!isReady) {
        try {
          await Promise.all(
            nonReadyPorts.map(async (readynessState) => {
              try {
                await readynessState.checkReadyness(
                  containerHostName,
                  readynessState.port,
                );
                readynessState.isReady = true;
              } catch {
                if (!(await isContainerRunning(containerID))) {
                  throw new ContainerShutDownError(containerID);
                }
              }
            }),
          );
          isReady = nonReadyPorts.every(({ isReady }) => isReady);
        } catch (e) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          let error = e;
          if (
            !(error instanceof ContainerShutDownError) &&
            !(await isContainerRunning(containerID))
          ) {
            error = new ContainerShutDownError(containerID);
          }
          if (error instanceof ContainerShutDownError) {
            try {
              // Print logs (but first wait a little, as the logs are not always 'synced' if immediately queried)
              await sleep(
                waitForContainerLogsInCaseOfContainerShutDown ?? 2000,
              );
              const logs = await execFileAsync("docker", ["logs", containerID]);
              error = new ContainerShutDownError(error.containerID, logs);
            } catch {
              // Ignore - most likely container does not exist
              // We will throw actual error couple lines later
            }
          }
          throw error;
        }
      }
      return isReady;
    },
  };
};

export const sleep = async (timeoutInMS: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, timeoutInMS));

export const stopContainerAsync = async (containerID: string | undefined) => {
  if (containerID) {
    await execFileAsync("docker", ["rm", "-f", containerID]);
  }
  return !!containerID;
};

const isContainerRunning = async (containerID: string) => {
  let retVal = false;
  try {
    retVal =
      (
        await execFileAsync("docker", [
          "inspect",
          containerID,
          "--format",
          "{{.State.Running}}",
        ])
      ).stdout.trim() === "true";
  } catch (e) {
    // Do not leak exception
  }
  return retVal;
};

const getContainerHostName = async (containerID: string) => {
  return (
    await execFileAsync("docker", [
      "inspect",
      "--format",
      "{{range .NetworkSettings.Networks}}{{range .Aliases}}{{.}}{{end}}{{end}}",
      containerID,
    ])
  ).stdout.trim();
};

export class ContainerShutDownError extends Error {
  public constructor(
    public readonly containerID: string,
    public readonly containerLogs?: {
      stdout: string;
      stderr: string;
    },
  ) {
    super(`Container shut down (id ${containerID}).`);
  }
}

export const connectAsync = (socket: Socket, opts: SocketConnectOpts) =>
  new Promise<void>((resolve, reject) => {
    socket.once("connect", resolve);
    socket.once("error", (e) => {
      socket.removeListener("connect", resolve);
      reject(e);
    });
    socket.connect(opts);
  });
