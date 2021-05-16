import * as utils from "@data-heaving/common";

// This is virtual interface - no instances implementing this are ever created
export interface VirtualSQLEvents {
  sqlExecutionStarted: string;
  sqlExecutionEnded: string;
}

export type SQLEventEmitter = utils.EventEmitter<VirtualSQLEvents>;

export const createEventEmitterBuilder = () =>
  new utils.EventEmitterBuilder<VirtualSQLEvents>();

export const consoleLoggingEventEmitterBuilder = (
  logMessagePrefix?: Parameters<typeof utils.createConsoleLogger>[0],
  builder?: utils.EventEmitterBuilder<VirtualSQLEvents>,
  printSQL?:
    | "onlyStart"
    | "onlyEnd"
    | "startAndEnd" /*logCompressionCycles?: boolean*/,
) => {
  if (!builder) {
    builder = createEventEmitterBuilder();
  }
  if (printSQL) {
    const logger = utils.createConsoleLogger(logMessagePrefix);
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
