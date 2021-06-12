import * as events from "./events";

export interface SQLConnectionPoolAbstraction<TPool, TConnection> {
  pool: TPool;
  getConnection: (
    pool: TPool,
    eventEmitter: events.SQLEventEmitter | undefined,
  ) => Promise<readonly [TConnection, CloseConnection]>;
}
export type CloseConnection = () => Promise<void>;

export const useConnectionPoolAsync = async <TPool, TConnection, T>(
  { pool, getConnection }: SQLConnectionPoolAbstraction<TPool, TConnection>,
  eventEmitter: events.SQLEventEmitter | undefined,
  use: (connection: TConnection) => Promise<T>,
) => {
  let connection:
    | readonly [TConnection, CloseConnection]
    | undefined = undefined;
  try {
    connection = await getConnection(pool, eventEmitter);
    return await use(connection[0]);
  } finally {
    if (connection) {
      await connection[1]();
    }
  }
};
