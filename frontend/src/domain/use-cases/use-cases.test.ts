import { describe, expect, it } from 'vitest';
import {
  buildBrowseQuery,
  clampPage,
  clampPageSize,
  defaultSchema,
} from '@/domain/use-cases/index.js';

describe('browse use-cases', () => {
  it('defaults schema to public', () => {
    expect(defaultSchema('')).toBe('public');
    expect(defaultSchema(null)).toBe('public');
    expect(defaultSchema('analytics')).toBe('analytics');
  });

  it('clamps page and pageSize', () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(3)).toBe(3);
    expect(clampPageSize(0, 30)).toBe(30);
    expect(clampPageSize(5000, 30)).toBe(30);
    expect(clampPageSize(25, 30)).toBe(25);
  });

  it('builds a normalized browse query', () => {
    expect(
      buildBrowseQuery({ database: 'mydb', schema: '', table: 'users', page: 0 }, 30),
    ).toMatchObject({ database: 'mydb', schema: 'public', table: 'users', page: 1 });
  });
});
