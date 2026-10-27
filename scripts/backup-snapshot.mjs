#!/usr/bin/env node
// Snapshot de la configuración externa del sistema (n8n, Chatwoot, Meta) para
// poder revertir un cambio grande. No modifica nada: solo hace GETs.
//
// Uso:   node scripts/backup-snapshot.mjs [etiqueta]
// Salida: ~/demo-ali-backups/<etiqueta>_<YYYY-MM-DD>/  (FUERA del repo: incluye
//         la config de inboxes de Chatwoot, que trae tokens)
//
// Variables (se leen de `.env.local`, nunca se imprimen):
//   N8N_BASE_URL, N8N_API_KEY
//   CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_API_TOKEN
//   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_WABA_ID (opcional)

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

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

const label = process.argv[2] || 'snapshot';
const date = new Date().toISOString().slice(0, 10);
const OUT = join(homedir(), 'demo-ali-backups', `${label}_${date}`);

// WABA de producción (Team ali); se puede pisar con WHATSAPP_WABA_ID
const WABA_ID = process.env.WHATSAPP_WABA_ID || '1517528009366947';
const GRAPH = 'https://graph.facebook.com/v21.0';

const summary = [];

async function save(relPath, data) {
  const file = join(OUT, relPath);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2));
}

async function getJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    // El cuerpo de error de Meta/Chatwoot no incluye credenciales; la URL sí (access_token), por eso se corta en '?'
    const body = await res.json().catch(() => null);
    const detalle = body?.error?.message || body?.message || '';
    throw new Error(`HTTP ${res.status} en ${url.split('?')[0]}${detalle ? ` — ${detalle}` : ''}`);
  }
  return res.json();
}

function slug(s) {
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

// --- n8n: todos los workflows completos -----------------------------------
async function backupN8n() {
  const base = process.env.N8N_BASE_URL?.replace(/\/$/, '');
  const key = process.env.N8N_API_KEY;
  if (!base || !key) return summary.push('n8n: OMITIDO (faltan N8N_BASE_URL / N8N_API_KEY)');

  const headers = { 'X-N8N-API-KEY': key, Accept: 'application/json' };
  const list = [];
  let cursor;
  do {
    const qs = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
    const page = await getJson(`${base}/api/v1/workflows?${qs}`, headers);
    list.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);

  for (const wf of list) {
    const full = await getJson(`${base}/api/v1/workflows/${wf.id}`, headers);
    await save(`n8n/${wf.id}_${slug(wf.name)}.json`, full);
  }
  await save('n8n/_index.json', list.map(({ id, name, active, isArchived, updatedAt }) => ({ id, name, active, isArchived, updatedAt })));
  summary.push(`n8n: ${list.length} workflows`);
}

// --- Chatwoot: inboxes y webhooks de la cuenta -----------------------------
async function backupChatwoot() {
  const base = process.env.CHATWOOT_URL?.replace(/\/$/, '');
  const account = process.env.CHATWOOT_ACCOUNT_ID;
  const token = process.env.CHATWOOT_API_TOKEN;
  if (!base || !account || !token) return summary.push('chatwoot: OMITIDO (faltan CHATWOOT_*)');

  const headers = { api_access_token: token, Accept: 'application/json' };
  const api = `${base}/api/v1/accounts/${account}`;
  const parts = { inboxes: 'inboxes', webhooks: 'webhooks', agent_bots: 'agent_bots', agents: 'agents', labels: 'labels' };
  const done = [];
  for (const [name, path] of Object.entries(parts)) {
    try {
      await save(`chatwoot/${name}.json`, await getJson(`${api}/${path}`, headers));
      done.push(name);
    } catch (e) {
      done.push(`${name} (error: ${e.message})`);
    }
  }
  summary.push(`chatwoot: ${done.join(', ')}`);
}

// --- Meta: plantillas, número y apps suscriptas al WABA --------------------
async function backupMeta() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1128023933718383';
  if (!token) return summary.push('meta: OMITIDO (falta WHATSAPP_ACCESS_TOKEN)');

  const auth = `access_token=${encodeURIComponent(token)}`;
  const done = [];

  try {
    const templates = [];
    let url = `${GRAPH}/${WABA_ID}/message_templates?limit=100&${auth}`;
    while (url) {
      const page = await getJson(url);
      templates.push(...page.data);
      url = page.paging?.next || null;
    }
    await save('meta/message_templates.json', templates);
    done.push(`${templates.length} plantillas`);
  } catch (e) {
    done.push(`plantillas (error: ${e.message})`);
  }

  // Número de producción de Team Ali + el de WHATSAPP_PHONE_NUMBER_ID (puede ser otro número del sistema)
  const fields = 'display_phone_number,verified_name,quality_rating,messaging_limit_tier,code_verification_status,platform_type,throughput,status';
  for (const id of [...new Set(['1128023933718383', phoneId])]) {
    try {
      await save(`meta/phone_number_${id}.json`, await getJson(`${GRAPH}/${id}?fields=${fields}&${auth}`));
      done.push(`número ${id}`);
    } catch (e) {
      done.push(`número ${id} (error: ${e.message})`);
    }
  }

  try {
    await save('meta/subscribed_apps.json', await getJson(`${GRAPH}/${WABA_ID}/subscribed_apps?${auth}`));
    done.push('subscribed_apps');
  } catch (e) {
    done.push(`subscribed_apps (error: ${e.message})`);
  }

  summary.push(`meta: ${done.join(', ')}`);
}

await mkdir(OUT, { recursive: true });
for (const step of [backupN8n, backupChatwoot, backupMeta]) {
  try {
    await step();
  } catch (e) {
    summary.push(`${step.name}: ERROR ${e.message}`);
  }
}
await save('_summary.json', { label, date, createdAt: new Date().toISOString(), summary });

console.log(`✔ Backup en ${OUT}`);
for (const line of summary) console.log(`  - ${line}`);
