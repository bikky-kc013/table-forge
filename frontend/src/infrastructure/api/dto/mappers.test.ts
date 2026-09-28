import { describe, expect, it } from 'vitest';
import {
  databaseListSchema,
  toDatabase,
  triggerListSchema,
} from '@/infrastructure/api/dto/index.js';

describe('database DTO mapper', () => {
  it('validates and maps snake_case → camelCase', () => {
    const dtos = databaseListSchema.parse([
      {
        name: 'mydb',
        owner: 'postgres',
        encoding: 'UTF8',
        allow_conn: true,
        is_template: false,
        conn_limit: -1,
      },
    ]);
    expect(toDatabase(dtos[0] as (typeof dtos)[number])).toMatchObject({
      name: 'mydb',
      allowConn: true,
      isTemplate: false,
    });
  });

  it('rejects malformed payloads at the boundary', () => {
    expect(() => databaseListSchema.parse([{ name: 'x' }])).toThrow();
  });

  it('normalizes Go null lists (nil slices) to empty arrays', () => {
    // Verified live: GET /api/triggers on a trigger-less table returns null.
    expect(triggerListSchema.parse(null)).toEqual([]);
    expect(databaseListSchema.parse(null)).toEqual([]);
  });
});
