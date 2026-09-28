export const queryKeys = {
  all: ['tf'] as const,
  catalog: {
    all: ['tf', 'catalog'] as const,
    databases: (database: string) => ['tf', 'catalog', 'databases', database] as const,
    schemas: (database: string) => ['tf', 'catalog', 'schemas', database] as const,
    tables: (database: string, schema: string) =>
      ['tf', 'catalog', 'tables', database, schema] as const,
    columns: (database: string, schema: string, table: string) =>
      ['tf', 'catalog', 'columns', database, schema, table] as const,
    views: (database: string, schema: string) =>
      ['tf', 'catalog', 'views', database, schema] as const,
    sequences: (database: string, schema: string) =>
      ['tf', 'catalog', 'sequences', database, schema] as const,
    functions: (database: string, schema: string) =>
      ['tf', 'catalog', 'functions', database, schema] as const,
    indexes: (database: string, schema: string, table: string) =>
      ['tf', 'catalog', 'indexes', database, schema, table] as const,
    constraints: (database: string, schema: string, table: string) =>
      ['tf', 'catalog', 'constraints', database, schema, table] as const,
    foreignKeys: (database: string, schema: string, table: string) =>
      ['tf', 'catalog', 'foreign-keys', database, schema, table] as const,
    triggers: (database: string, schema: string, table: string) =>
      ['tf', 'catalog', 'triggers', database, schema, table] as const,
    roles: (database: string) => ['tf', 'catalog', 'roles', database] as const,
    tablespaces: (database: string) => ['tf', 'catalog', 'tablespaces', database] as const,
    variables: (database: string) => ['tf', 'catalog', 'variables', database] as const,
    activity: (database: string) => ['tf', 'catalog', 'activity', database] as const,
  },
  data: {
    all: ['tf', 'data'] as const,
    browse: (database: string, schema: string, table: string, params: Record<string, unknown>) =>
      ['tf', 'data', 'browse', database, schema, table, params] as const,
    search: (
      database: string,
      schema: string,
      table: string,
      col: string,
      val: string,
      page: number,
    ) => ['tf', 'data', 'search', database, schema, table, col, val, page] as const,
    row: (database: string, schema: string, table: string, pkCol: string, pkVal: string) =>
      ['tf', 'data', 'row', database, schema, table, pkCol, pkVal] as const,
    tableScope: (database: string, schema: string, table: string) =>
      ['tf', 'data', 'browse', database, schema, table] as const,
  },
  session: {
    all: ['tf', 'session'] as const,
    info: ['tf', 'session', 'info'] as const,
    servers: ['tf', 'session', 'servers'] as const,
  },
} as const;
