#!/usr/bin/env node
// Recrea en YCloud las plantillas de WhatsApp exportadas de Meta por
// `scripts/backup-snapshot.mjs` (meta/message_templates.json).
// Se usa en el corte a YCloud coexistence: el número queda en un WABA nuevo y
// las plantillas aprobadas del WABA viejo no se trasladan solas.
//
// Uso:
//   node scripts/recrear-plantillas-ycloud.mjs <ruta/message_templates.json>           # simulación
//   node scripts/recrear-plantillas-ycloud.mjs <ruta/message_templates.json> --apply   # crea de verdad
//
// Variables (de `.env.local`, nunca se imprimen):
//   YCLOUD_API_KEY   API key de YCloud (Developers → API Keys)
//   YCLOUD_WABA_ID   WABA nuevo creado por el onboarding de coexistence

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// --- cargar .env.local si existe (sin deps) -------------------------------
try {
  const content = await readFile(join(ROOT, '.env.local'), 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // no .env.local
}

const [file] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const APPLY = process.argv.includes('--apply');
if (!file) {
  console.error('✘ Uso: node scripts/recrear-plantillas-ycloud.mjs <message_templates.json> [--apply]');
  process.exit(1);
}

const API_KEY = process.env.YCLOUD_API_KEY;
const WABA_ID = process.env.YCLOUD_WABA_ID;
if (APPLY && (!API_KEY || !WABA_ID)) {
  console.error('✘ Faltan YCLOUD_API_KEY o YCLOUD_WABA_ID en .env.local');
  process.exit(1);
}

// Campos de componentes que Meta devuelve pero no se pueden reenviar tal cual
function limpiarComponente(c) {
  const { ...comp } = c;
  if (comp.example?.header_handle) {
    // Los handles de media son del WABA viejo: hay que volver a subir la imagen/video
    return { comp, aviso: `header ${comp.format} con media: subir el archivo de nuevo en YCloud` };
  }
  return { comp, aviso: null };
}

const templates = JSON.parse(await readFile(file, 'utf8'));
const aprobadas = templates.filter(t => t.status === 'APPROVED');
console.log(`${templates.length} plantillas en el backup, ${aprobadas.length} aprobadas → ${APPLY ? 'CREANDO en YCloud' : 'simulación (usar --apply para crear)'}\n`);

let ok = 0;
let fallas = 0;
for (const t of aprobadas) {
  const avisos = [];
  const components = (t.components || []).map(c => {
    const { comp, aviso } = limpiarComponente(c);
    if (aviso) avisos.push(aviso);
    return comp;
  });
  const body = { wabaId: WABA_ID || '<YCLOUD_WABA_ID>', name: t.name, language: t.language, category: t.category, components };

  if (!APPLY) {
    console.log(`• ${t.name} [${t.language}] ${t.category} — ${components.map(c => c.type).join(', ')}${avisos.length ? `\n    ⚠ ${avisos.join('; ')}` : ''}`);
    continue;
  }

  const res = await fetch('https://api.ycloud.com/v2/whatsapp/templates', {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    ok++;
    console.log(`✔ ${t.name} [${t.language}] → ${data.status || 'enviada a revisión'}${avisos.length ? ` (⚠ ${avisos.join('; ')})` : ''}`);
  } else {
    fallas++;
    console.log(`✘ ${t.name} [${t.language}] → HTTP ${res.status}: ${data.error?.message || JSON.stringify(data).slice(0, 300)}`);
  }
}

if (APPLY) console.log(`\n${ok} creadas, ${fallas} con error. Las plantillas quedan en revisión de Meta hasta ser aprobadas.`);
