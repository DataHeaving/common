export interface TableMetaData {
  columnNames: ReadonlyArray<string>;
  primaryKeyColumnCount: number; // PK columns always come first
  isCTEnabled: boolean;
  columnTypes: ReadonlyArray<ColumnTypeInfo>;
}

export interface ColumnTypeInfo {
  typeName: string;
  maxLength: number;
  precision: number;
  scale: number;
  isNullable: boolean;
}
