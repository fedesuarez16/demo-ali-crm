import { describe, expect, it } from 'vitest';
import { calcularHash, esStale } from './stale';

describe('calcularHash', () => {
  it('es determinístico y hex de 64 chars', () => {
    const h = calcularHash('v1', '["a"]');
    expect(h).toBe(calcularHash('v1', '["a"]'));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it('cambia con la versión o con el input', () => {
    expect(calcularHash('v1', 'x')).not.toBe(calcularHash('v2', 'x'));
    expect(calcularHash('v1', 'x')).not.toBe(calcularHash('v1', 'y'));
  });
});

describe('esStale', () => {
  it('sin registro previo -> stale', () => {
    expect(esStale(null, 'h')).toBe(true);
    expect(esStale(undefined, 'h')).toBe(true);
  });
  it('hash distinto -> stale', () => {
    expect(esStale({ normalizado_hash: 'a', fuente: 'llm' }, 'b')).toBe(true);
  });
  it('fuente parser -> stale aunque el hash coincida', () => {
    expect(esStale({ normalizado_hash: 'a', fuente: 'parser' }, 'a')).toBe(true);
  });
  it('hash igual y fuente llm -> fresco', () => {
    expect(esStale({ normalizado_hash: 'a', fuente: 'llm' }, 'a')).toBe(false);
  });
});
