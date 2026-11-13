// Módulo PURO: tabla determinística de zonas (alias + vecindad) del Gran La Plata.
// Es la fuente autoritativa para comparar zonas; las zonas_cercanas del LLM solo son fallback
// cuando alguna de las dos zonas no está en la tabla.
import type { RuedaZona } from '../types';

export type RelacionZonas = 'misma' | 'vecina' | 'distinta' | 'desconocida';

const z = (nombre: string, alias: string[], vecinas: string[]): RuedaZona => ({ nombre, alias, vecinas });

export const DEFAULT_ZONAS: RuedaZona[] = [
  z('La Plata', ['La Plata - Centro', 'Centro', 'Casco Urbano', 'Casco'],
    ['Tolosa', 'Ringuelet', 'Manuel B. Gonnet', 'City Bell', 'Los Hornos', 'San Carlos', 'Villa Elvira', 'Altos de San Lorenzo', 'Berisso', 'Ensenada', 'Melchor Romero']),
  z('Tolosa', [], ['La Plata', 'Ringuelet']),
  z('Ringuelet', [], ['La Plata', 'Tolosa', 'Manuel B. Gonnet', 'José Hernández']),
  z('Manuel B. Gonnet', ['Gonnet'], ['City Bell', 'La Plata', 'Ringuelet', 'Joaquín Gorina', 'José Hernández']),
  z('City Bell', ['CIty Bell'], ['Manuel B. Gonnet', 'Villa Elisa', 'Joaquín Gorina', 'Arturo Seguí', 'La Plata']),
  z('Villa Elisa', [], ['City Bell', 'Arturo Seguí']),
  z('Arturo Seguí', [], ['City Bell', 'Villa Elisa']),
  z('Joaquín Gorina', ['Gorina'], ['City Bell', 'Manuel B. Gonnet', 'José Hernández']),
  z('José Hernández', [], ['Manuel B. Gonnet', 'Joaquín Gorina', 'Ringuelet']),
  z('Los Hornos', [], ['La Plata', 'San Carlos', 'Altos de San Lorenzo', 'Abasto']),
  z('San Carlos', [], ['La Plata', 'Los Hornos', 'Villa Elvira', 'Altos de San Lorenzo']),
  z('Villa Elvira', [], ['La Plata', 'San Carlos', 'Altos de San Lorenzo', 'Berisso', 'Ensenada']),
  z('Altos de San Lorenzo', [], ['La Plata', 'Los Hornos', 'San Carlos', 'Villa Elvira']),
  z('Melchor Romero', [], ['La Plata', 'Abasto', 'Lisandro Olmos']),
  z('Abasto', [], ['Melchor Romero', 'Los Hornos', 'Lisandro Olmos']),
  z('Lisandro Olmos', [], ['Abasto', 'Melchor Romero']),
  z('Berisso', [], ['La Plata', 'Ensenada', 'Villa Elvira']),
  z('Ensenada', [], ['La Plata', 'Berisso', 'Villa Elvira', 'Punta Lara']),
  z('Punta Lara', [], ['Ensenada']),
  z('Hudson', [], ['Berazategui', 'Quilmes']),
  z('Berazategui', [], ['Hudson', 'Quilmes']),
  z('Quilmes', [], ['Berazategui', 'Hudson']),
  z('Brandsen', [], []),
];

/** minúsculas, sin tildes, sin puntuación, espacios colapsados. */
export const slugZona = (s: string): string =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Devuelve el nombre canónico de la zona o null si no está en la tabla. */
export function canonizarZona(nombre: string, zonas: RuedaZona[]): string | null {
  const buscar = (txt: string): string | null => {
    const s = slugZona(txt);
    if (!s) return null;
    const hit = zonas.find((x) => slugZona(x.nombre) === s || x.alias.some((a) => slugZona(a) === s));
    return hit ? hit.nombre : null;
  };
  const entero = buscar(nombre);
  if (entero) return entero;
  // Formas "X - Y": se prueba cada parte, en orden.
  const partes = nombre.split(/\s+[-–—]\s+/);
  if (partes.length < 2) return null;
  for (const p of partes) {
    const r = buscar(p);
    if (r) return r;
  }
  return null;
}

export function relacionZonas(a: string, b: string, zonas: RuedaZona[]): RelacionZonas {
  const ca = canonizarZona(a, zonas);
  const cb = canonizarZona(b, zonas);
  if (ca === null || cb === null) return 'desconocida';
  if (ca === cb) return 'misma';
  const za = zonas.find((x) => x.nombre === ca);
  const zb = zonas.find((x) => x.nombre === cb);
  const lista = (zz: RuedaZona | undefined, otro: string) =>
    !!zz && zz.vecinas.some((v) => (canonizarZona(v, zonas) ?? v) === otro);
  return lista(za, cb) || lista(zb, ca) ? 'vecina' : 'distinta';
}

// ───────────── Texto editable (una zona por línea: "nombre | alias, alias | vecina, vecina") ─────────────

const lista = (s: string | undefined): string[] =>
  (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);

export function zonasATexto(zonas: RuedaZona[]): string {
  return zonas.map((x) => `${x.nombre} | ${x.alias.join(', ')} | ${x.vecinas.join(', ')}`).join('\n');
}

export function textoAZonas(texto: string): RuedaZona[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [nombre, alias, vecinas] = l.split('|');
      return { nombre: (nombre ?? '').trim(), alias: lista(alias), vecinas: lista(vecinas) };
    });
}
