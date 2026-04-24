#!/usr/bin/env node
// Sincroniza los workflows de `workflows/*.json` con la instancia n8n remota
// vía la REST API pública. Usa PUT si el archivo trae `id`, POST si no existe.
//
// Requiere Node 18+ (fetch nativo).
//
// Variables de entorno:
//   N8N_BASE_URL   ej: https://mia-n8n.w9weud.easypanel.host
//   N8N_API_KEY    generada en Settings -> n8n API
//
// En local las lee desde `.env.local` automáticamente.
// En CI se inyectan como secrets de GitHub Actions.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WORKFLOWS_DIR = join(ROOT, 'workflows');

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
  // no .env.local — ok en CI
}

const BASE_URL = process.env.N8N_BASE_URL?.replace(/\/$/, '');
const API_KEY = process.env.N8N_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error('✘ Faltan N8N_BASE_URL o N8N_API_KEY');
  process.exit(1);
}

const headers = {
  'X-N8N-API-KEY': API_KEY,
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

// Campos aceptados por PUT/POST /workflows según la API de n8n (community).
// Cualquier otro campo (id, active, createdAt, tags, pinData, versionId, meta,
// triggerCount, shared) es de sólo-lectura y rompe la validación.
const ALLOWED_FIELDS = ['name', 'nodes', 'connections', 'settings', 'staticData'];

function sanitize(workflow) {
  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (workflow[key] !== undefined) out[key] = workflow[key];
  }
  if (!out.settings) out.settings = {};
  return out;
}

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    const err = new Error(`${method} ${path} → ${res.status} ${detail}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function syncWorkflow(file) {
  const raw = await readFile(file, 'utf8');
  const wf = JSON.parse(raw);
  const payload = sanitize(wf);
  const label = `${wf.name || '(sin nombre)'} [${basename(file)}]`;

  if (wf.id) {
    try {
      await api('PUT', `/workflows/${wf.id}`, payload);
      console.log(`✔ actualizado: ${label}`);
      return { status: 'updated', file };
    } catch (e) {
      if (e.status !== 404) throw e;
      console.warn(`⚠ id ${wf.id} no existe en n8n, creando workflow nuevo...`);
    }
  }

  const created = await api('POST', '/workflows', payload);
  console.log(`✔ creado:      ${label} → nuevo id ${created.id}`);
  console.log(`  ⚠ actualizá "id":"${created.id}" en ${basename(file)} y commiteá`);
  return { status: 'created', file, newId: created.id };
}

// --- main ------------------------------------------------------------------
let files;
try {
  files = (await readdir(WORKFLOWS_DIR))
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(WORKFLOWS_DIR, f))
    .sort();
} catch {
  console.log('No existe la carpeta workflows/. Nada para sincronizar.');
  process.exit(0);
}

if (files.length === 0) {
  console.log('No hay archivos .json en workflows/.');
  process.exit(0);
}

console.log(`Sincronizando ${files.length} workflow(s) con ${BASE_URL}\n`);

let failures = 0;
for (const file of files) {
  try {
    await syncWorkflow(file);
  } catch (e) {
    failures++;
    console.error(`✘ ${basename(file)}: ${e.message}`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`${failures} workflow(s) fallaron.`);
  process.exit(1);
}
console.log('Sync completo.');
