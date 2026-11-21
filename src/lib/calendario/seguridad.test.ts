import { describe, expect, it } from 'vitest';
import { bearerValido, cifrar, descifrar, firmarState, verificarState } from './seguridad';

const CLAVE = 'una-clave-larga-de-prueba-para-el-calendario';

describe('cifrar / descifrar', () => {
  it('hace roundtrip y usa IV aleatorio', () => {
    const a = cifrar('1//refresh-token', CLAVE);
    const b = cifrar('1//refresh-token', CLAVE);
    expect(a).not.toBe(b);
    expect(a).not.toContain('refresh-token');
    expect(descifrar(a, CLAVE)).toBe('1//refresh-token');
  });
  it('falla con otra clave o si el texto fue alterado', () => {
    const c = cifrar('secreto', CLAVE);
    expect(() => descifrar(c, 'otra-clave-distinta-de-la-original')).toThrow();
    const partes = c.split('.');
    const alterado = [partes[0], partes[1], partes[2].slice(0, -2) + (partes[2].endsWith('A') ? 'BB' : 'AA')].join('.');
    expect(() => descifrar(alterado, CLAVE)).toThrow();
  });
});

describe('firmarState / verificarState', () => {
  it('verifica un state válido y devuelve su payload', () => {
    const s = firmarState({ volver: '/calendario' }, CLAVE, 600);
    expect(verificarState(s, CLAVE)).toEqual({ volver: '/calendario' });
  });
  it('rechaza states vencidos, alterados o firmados con otra clave', () => {
    expect(verificarState(firmarState({}, CLAVE, -1), CLAVE)).toBeNull();
    const s = firmarState({ volver: '/x' }, CLAVE, 600);
    expect(verificarState(s.replace(/^./, (c) => (c === 'a' ? 'b' : 'a')), CLAVE)).toBeNull();
    expect(verificarState(s, 'otra-clave-distinta-de-la-original')).toBeNull();
    expect(verificarState(undefined, CLAVE)).toBeNull();
  });
});

describe('bearerValido', () => {
  it('acepta solo el token exacto con prefijo Bearer', () => {
    expect(bearerValido('Bearer abc123', 'abc123')).toBe(true);
    expect(bearerValido('Bearer abc124', 'abc123')).toBe(false);
    expect(bearerValido('abc123', 'abc123')).toBe(false);
    expect(bearerValido(null, 'abc123')).toBe(false);
  });
  it('falla cerrado si no hay token configurado', () => {
    expect(bearerValido('Bearer ', '')).toBe(false);
    expect(bearerValido('Bearer x', null)).toBe(false);
  });
});
