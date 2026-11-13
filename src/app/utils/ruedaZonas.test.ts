import { describe, it, expect } from 'vitest';
import { DEFAULT_ZONAS, canonizarZona, relacionZonas, textoAZonas, zonasATexto } from './ruedaZonas';

const z = DEFAULT_ZONAS;

describe('DEFAULT_ZONAS (integridad)', () => {
  it('nombres únicos y todas las vecinas existen en la tabla', () => {
    const nombres = z.map((x) => x.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const x of z) for (const v of x.vecinas) expect(nombres).toContain(v);
  });
});

describe('canonizarZona', () => {
  it('ignora tildes, mayúsculas y espacios', () => {
    expect(canonizarZona('  arturo   SEGUI ', z)).toBe('Arturo Seguí');
    expect(canonizarZona('joaquin gorina', z)).toBe('Joaquín Gorina');
  });
  it('resuelve alias, incluso con typos cargados como alias', () => {
    expect(canonizarZona('Gonnet', z)).toBe('Manuel B. Gonnet');
    expect(canonizarZona('CIty Bell', z)).toBe('City Bell');
    expect(canonizarZona('Casco Urbano', z)).toBe('La Plata');
    expect(canonizarZona('Centro', z)).toBe('La Plata');
  });
  it('resuelve formas "X - Y" por prefijo', () => {
    expect(canonizarZona('La Plata - Centro', z)).toBe('La Plata');
    expect(canonizarZona('City Bell - Complejo Los Álamos', z)).toBe('City Bell');
    expect(canonizarZona('Tolosa - Calle 3', z)).toBe('Tolosa');
  });
  it('desconocida -> null', () => {
    expect(canonizarZona('Marte', z)).toBeNull();
    expect(canonizarZona('', z)).toBeNull();
  });
});

describe('relacionZonas', () => {
  it('misma (incluye alias y prefijo)', () => {
    expect(relacionZonas('La Plata - Centro', 'La Plata', z)).toBe('misma');
    expect(relacionZonas('Gonnet', 'Manuel B. Gonnet', z)).toBe('misma');
  });
  it('vecina, simétrica aunque solo una lo liste', () => {
    const tabla = [
      { nombre: 'A', alias: [], vecinas: ['B'] },
      { nombre: 'B', alias: [], vecinas: [] },
      { nombre: 'C', alias: [], vecinas: [] },
    ];
    expect(relacionZonas('A', 'B', tabla)).toBe('vecina');
    expect(relacionZonas('B', 'A', tabla)).toBe('vecina');
    expect(relacionZonas('B', 'C', tabla)).toBe('distinta');
  });
  it('City Bell vecina de La Plata; Tolosa distinta de City Bell', () => {
    expect(relacionZonas('City Bell', 'La Plata', z)).toBe('vecina');
    expect(relacionZonas('La Plata', 'City Bell', z)).toBe('vecina');
    expect(relacionZonas('City Bell', 'Tolosa', z)).toBe('distinta');
  });
  it('desconocida si alguna no está en la tabla', () => {
    expect(relacionZonas('City Bell', 'Marte', z)).toBe('desconocida');
    expect(relacionZonas('Marte', 'Marte', z)).toBe('desconocida');
  });
});

describe('zonasATexto / textoAZonas', () => {
  it('round-trip', () => {
    expect(textoAZonas(zonasATexto(z))).toEqual(z);
  });
  it('parsea líneas "nombre | alias | vecinas" y descarta vacías', () => {
    expect(textoAZonas('A | a1, a2 | B, C\n\nB')).toEqual([
      { nombre: 'A', alias: ['a1', 'a2'], vecinas: ['B', 'C'] },
      { nombre: 'B', alias: [], vecinas: [] },
    ]);
  });
});
