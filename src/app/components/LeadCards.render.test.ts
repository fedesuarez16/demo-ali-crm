import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import LeadCards from './LeadCards';
import type { Lead } from '../types';

const ESTADOS = ['frío', 'tibio', 'caliente', 'llamada', 'visita'];

const makeLeads = (n: number): Lead[] =>
  Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    nombreCompleto: `Lead ${i + 1}`,
    nombre: `Lead ${i + 1}`,
    email: '',
    telefono: `54922100${String(i).padStart(5, '0')}`,
    estado: ESTADOS[i % ESTADOS.length],
    presupuesto: 0,
    zonaInteres: '',
    tipoPropiedad: 'departamento',
    superficieMinima: 0,
    cantidadAmbientes: 0,
    motivoInteres: 'otro',
    fechaContacto: new Date(2026, 0, 1, 0, 0, i).toISOString(),
    seguimientos_count: 0,
    estado_chat: 1,
  }) as unknown as Lead);

const countCards = (html: string) => (html.match(/draggable="true"/g) || []).length;

describe('LeadCards render incremental', () => {
  it('con 3405 leads renderiza solo la primera tanda de cada columna', () => {
    const html = renderToString(React.createElement(LeadCards, { leads: makeLeads(3405), visibleColumns: ESTADOS }));
    // 5 columnas x 30 cards
    expect(countCards(html)).toBe(150);
    // React SSR separa texto y expresiones con <!-- -->
    expect(html.replace(/<!-- -->/g, '')).toContain('Cargar más (651)'); // 681 por columna - 30
  });

  it('con pocos leads los renderiza todos y no muestra "Cargar más"', () => {
    const html = renderToString(React.createElement(LeadCards, { leads: makeLeads(20), visibleColumns: ESTADOS }));
    expect(countCards(html)).toBe(20);
    expect(html).not.toContain('Cargar más');
  });
});
