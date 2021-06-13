import * as common from "@data-heaving/common";

// This is virtual interface - no instances implementing this are ever created
export interface VirtualSQLEvents {
  sqlExecutionStarted: string;
  sqlExecutionEnded: string;
}

export type SQLEventEmitter = common.EventEmitter<VirtualSQLEvents>;

export const createEventEmitterBuilder = () =>
  new common.EventEmitterBuilder<VirtualSQLEvents>();

export const consoleLoggingEventEmitterBuilder = (
  logMessagePrefix?: Parameters<typeof common.createConsoleLogger>[0],
  builder?: common.EventEmitterBuilder<VirtualSQLEvents>,
  printSQL?: "onlyStart" | "onlyEnd" | "startAndEnd",
  consoleAbstraction?: common.ConsoleAbstraction,
) => {
  if (!builder) {
    builder = createEventEmitterBuilder();
  }
  if (printSQL) {
    const logger = common.createConsoleLogger(
      logMessagePrefix,
      consoleAbstraction,
    );
    if (printSQL === "onlyStart" || printSQL === "startAndEnd") {
      builder.addEventListener("sqlExecutionStarted", (sql) =>
        logger(`SQL started: ${sql}`),
      );
    }
    if (printSQL === "onlyEnd" || printSQL === "startAndEnd") {
      builder.addEventListener("sqlExecutionEnded", (sql) =>
        logger(`SQL ended: ${sql}`),
      );
    }
  }

  return builder;
};
