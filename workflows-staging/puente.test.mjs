// Banco de pruebas de los nodos Code del puente YCloud <-> Chatwoot.
// Ejecuta el jsCode tal cual está en n8n con $input y $('Nodo') simulados.
import assert from 'node:assert/strict';

const NORMALIZAR = String.raw`const CONFIG = { chatwootBase: 'https://mia-chatwoot.w9weud.easypanel.host', accountId: 2, inboxId: 4 };

const body = $input.first().json.body || {};
const type = body.type;
let m, direction, phone;
if (type === 'whatsapp.inbound_message.received') {
  m = body.whatsappInboundMessage; direction = 'incoming'; phone = m?.from;
} else if (type === 'whatsapp.smb.message.echoes') {
  m = body.whatsappMessage; direction = 'echo'; phone = m?.to;
} else {
  return [];
}
if (!m || !phone) return [];

const digits = String(phone).replace(/\D/g, '');
if (digits.length < 10) return [];

const t = m.type;
const mediaTypes = ['image', 'audio', 'video', 'document', 'sticker'];
const media = mediaTypes.includes(t) ? m[t] : null;
let text = '';
if (t === 'text') text = m.text?.body || '';
else if (media) text = media.caption || '';
else if (t === 'interactive') text = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || '';
else if (t === 'button') text = m.button?.text || '';
else if (t === 'reaction') text = m.reaction?.emoji ? ${'`'}Reaccionó ${'$'}{m.reaction.emoji}${'`'} : '';
else if (t === 'location') text = ${'`'}📍 Ubicación: ${'$'}{m.location?.latitude}, ${'$'}{m.location?.longitude}${'`'};
else if (t === 'contacts') text = '👤 Contacto compartido';
else text = ${'`'}[Mensaje de tipo ${'$'}{t} no soportado]${'`'};
if (!text && !media) return [];

const wamid = m.wamid || m.id;
return [{ json: {
  ...CONFIG,
  eventId: body.id,
  eventType: type,
  direction,
  isEcho: direction === 'echo',
  messageType: direction === 'echo' ? 'outgoing' : 'incoming',
  wamid,
  phoneDigits: digits,
  last10: digits.slice(-10),
  phoneE164: '+' + digits,
  name: m.customerProfile?.name || ('+' + digits),
  msgType: t,
  text,
  mediaLink: media?.link || null,
  mediaFilename: media ? (media.filename || ${'`'}${'$'}{t}-${'$'}{wamid}${'`'}.replace(/[^\w.-]/g, '_')) : null,
  dedupeKey: ${'`'}ycloud_evt:${'$'}{body.id || wamid}${'`'},
} }];`;

const FILTRAR = String.raw`const CONFIG = {
  chatwootBase: 'https://mia-chatwoot.w9weud.easypanel.host',
  accountId: 2,
  inboxId: 4,
  businessPhone: '+5492216273335',
};

const b = $input.first().json.body || {};
if (b.event !== 'message_created') return [];
if (!(b.message_type === 'outgoing' || b.message_type === 1)) return [];
if (b.private === true) return [];
if (b.source_id) return [];
const ca = b.content_attributes || {};
if (ca.external_echo === true || ca.external_echo === 'true' || ca.ycloud_wamid) return [];

const convId = b.conversation?.id;
const msgId = b.id;
if (!convId || !msgId) return [];
return [{ json: { ...CONFIG, convId, msgId } }];`;

const ARMAR = String.raw`const f = $('Filtrar salientes').first().json;
const conv = $('Chatwoot - Leer conversación').first().json;
const msgs = $input.first().json.payload || [];

if (conv.inbox_id !== f.inboxId) return [];
const msg = msgs.find(x => x.id === f.msgId);
if (!msg) return [];
const outgoing = msg.message_type === 1 || msg.message_type === 'outgoing';
if (!outgoing || msg.private) return [];
if (msg.source_id) return [];
const ca = msg.content_attributes || {};
if (ca.external_echo === true || ca.external_echo === 'true' || ca.ycloud_wamid) return [];

const digits = String(conv.meta?.sender?.phone_number || '').replace(/\D/g, '');
if (digits.length < 10) throw new Error(${'`'}Conversación ${'$'}{f.convId} sin teléfono válido del contacto${'`'});

const base = { from: f.businessPhone, to: '+' + digits };
const text = (msg.content || '').trim();
const atts = msg.attachments || [];
const typeMap = { image: 'image', audio: 'audio', video: 'video', file: 'document' };
const withCaption = ['image', 'video', 'document'];
const out = [];
let captionUsed = false;

atts.forEach((a, i) => {
  const t = typeMap[a.file_type] || 'document';
  const media = { link: a.data_url };
  if (i === 0 && text && withCaption.includes(t)) { media.caption = text; captionUsed = true; }
  if (t === 'document') media.filename = String(a.data_url || '').split('/').pop().split('?')[0] || 'archivo';
  out.push({ ...base, externalId: ${'`'}chatwoot-${'$'}{f.msgId}-${'$'}{i}${'`'}, type: t, [t]: media });
});
if (text && !captionUsed) out.push({ ...base, externalId: ${'`'}chatwoot-${'$'}{f.msgId}${'`'}, type: 'text', text: { body: text } });

return out.map(p => ({ json: { payload: p, convId: f.convId, chatwootBase: f.chatwootBase, accountId: f.accountId } }));`;

function run(code, input, nodes = {}) {
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const $ = name => ({ first: () => ({ json: nodes[name] }), item: { json: nodes[name] } });
  return new Function('$input', '$', `return (() => { ${code} })();`)($input, $);
}

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✔ ${name}`); }
  catch (e) { console.log(`  ✘ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

const inbound = (msg, id = 'evt_1') => ({ body: { id, type: 'whatsapp.inbound_message.received', whatsappInboundMessage: { id: 'm1', wamid: 'wamid.IN', from: '+5492214957804', to: '+5492216273335', customerProfile: { name: 'Juan' }, ...msg } } });
const echo = msg => ({ body: { id: 'evt_echo', type: 'whatsapp.smb.message.echoes', whatsappMessage: { id: 'm2', wamid: 'wamid.ECHO', from: '+5492216273335', to: '+5492214957804', ...msg } } });

console.log('Puente de entrada (Normalizar evento)');
test('texto entrante → mensaje incoming con teléfono normalizado', () => {
  const [o] = run(NORMALIZAR, inbound({ type: 'text', text: { body: 'Hola, consulto por la casa' } }));
  assert.equal(o.json.messageType, 'incoming');
  assert.equal(o.json.isEcho, false);
  assert.equal(o.json.text, 'Hola, consulto por la casa');
  assert.equal(o.json.phoneDigits, '5492214957804');
  assert.equal(o.json.last10, '2214957804');
  assert.equal(o.json.phoneE164, '+5492214957804');
  assert.equal(o.json.name, 'Juan');
  assert.equal(o.json.dedupeKey, 'ycloud_evt:evt_1');
  assert.equal(o.json.inboxId, 4);
});
test('echo del celular → outgoing marcado como echo, teléfono = destinatario', () => {
  const [o] = run(NORMALIZAR, echo({ type: 'text', text: { body: 'Te llamo en 5' } }));
  assert.equal(o.json.isEcho, true);
  assert.equal(o.json.messageType, 'outgoing');
  assert.equal(o.json.phoneDigits, '5492214957804');
});
test('audio entrante → link de descarga y nombre de archivo seguro', () => {
  const [o] = run(NORMALIZAR, inbound({ type: 'audio', audio: { link: 'https://api.ycloud.com/v2/whatsapp/media/download/1?sig=x', mime_type: 'audio/ogg' } }));
  assert.equal(o.json.mediaLink, 'https://api.ycloud.com/v2/whatsapp/media/download/1?sig=x');
  assert.equal(o.json.text, '');
  assert.match(o.json.mediaFilename, /^audio-wamid\.IN$/);
});
test('imagen con caption → caption como texto', () => {
  const [o] = run(NORMALIZAR, inbound({ type: 'image', image: { link: 'https://x/img', caption: 'Así está el living' } }));
  assert.equal(o.json.text, 'Así está el living');
});
test('respuesta de botón de plantilla → texto del botón', () => {
  const [o] = run(NORMALIZAR, inbound({ type: 'button', button: { text: 'Sí, contame', payload: 'si' } }));
  assert.equal(o.json.text, 'Sí, contame');
});
test('tipo no soportado → aviso legible, no se pierde', () => {
  const [o] = run(NORMALIZAR, inbound({ type: 'unsupported', unsupported: { type: 'poll_update' } }));
  assert.equal(o.json.text, '[Mensaje de tipo unsupported no soportado]');
});
test('eventos que no son mensajes (estados, plantillas) → ignorados', () => {
  assert.deepEqual(run(NORMALIZAR, { body: { id: 'e', type: 'whatsapp.message.updated', whatsappMessage: {} } }), []);
  assert.deepEqual(run(NORMALIZAR, { body: {} }), []);
});
test('teléfono inválido → ignorado', () => {
  assert.deepEqual(run(NORMALIZAR, inbound({ from: '123', type: 'text', text: { body: 'x' } })), []);
});

console.log('Puente de salida (Filtrar salientes)');
const cw = extra => ({ body: { event: 'message_created', id: 77, message_type: 'outgoing', private: false, content: 'Hola!', conversation: { id: 900 }, ...extra } });
test('respuesta del bot o del agente → pasa', () => {
  const [o] = run(FILTRAR, cw({}));
  assert.equal(o.json.convId, 900);
  assert.equal(o.json.msgId, 77);
});
test('mensaje entrante → NO sale (evita rebote)', () => {
  assert.deepEqual(run(FILTRAR, cw({ message_type: 'incoming' })), []);
  assert.deepEqual(run(FILTRAR, cw({ message_type: 0 })), []);
});
test('nota privada (registro de plantilla del seguimiento) → NO sale', () => {
  assert.deepEqual(run(FILTRAR, cw({ private: true })), []);
});
test('echo del celular creado por el puente → NO sale (evita duplicado)', () => {
  assert.deepEqual(run(FILTRAR, cw({ content_attributes: { external_echo: true, ycloud_wamid: 'wamid.ECHO' } })), []);
  assert.deepEqual(run(FILTRAR, cw({ content_attributes: { external_echo: 'true' } })), []);
});
test('mensaje que ya tiene wamid → NO sale', () => {
  assert.deepEqual(run(FILTRAR, cw({ content_attributes: { ycloud_wamid: 'wamid.X' } })), []);
});
test('otros eventos (conversation_updated, message_updated) → NO salen', () => {
  assert.deepEqual(run(FILTRAR, cw({ event: 'message_updated' })), []);
});

console.log('Puente de salida (Verificar y armar envíos)');
const F = { chatwootBase: 'https://mia-chatwoot.w9weud.easypanel.host', accountId: 2, inboxId: 4, businessPhone: '+5492216273335', convId: 900, msgId: 77 };
const CONV = { id: 900, inbox_id: 4, meta: { sender: { phone_number: '+5492214957804' } } };
const nodes = (conv = CONV) => ({ 'Filtrar salientes': F, 'Chatwoot - Leer conversación': conv });
const msgsWith = msg => ({ payload: [{ id: 1, message_type: 0, content: 'viejo' }, { id: 77, message_type: 1, private: false, content: 'Hola Juan', ...msg }] });
test('texto → un envío de texto al teléfono del contacto', () => {
  const out = run(ARMAR, msgsWith({}), nodes());
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].json.payload, { from: '+5492216273335', to: '+5492214957804', externalId: 'chatwoot-77', type: 'text', text: { body: 'Hola Juan' } });
});
test('imagen con texto → un solo envío, el texto va como caption', () => {
  const out = run(ARMAR, msgsWith({ content: 'Mirá esta', attachments: [{ file_type: 'image', data_url: 'https://cw/img.jpg' }] }), nodes());
  assert.equal(out.length, 1);
  assert.equal(out[0].json.payload.type, 'image');
  assert.deepEqual(out[0].json.payload.image, { link: 'https://cw/img.jpg', caption: 'Mirá esta' });
});
test('audio con texto → audio y texto por separado (audio no admite caption)', () => {
  const out = run(ARMAR, msgsWith({ content: 'Te mando audio', attachments: [{ file_type: 'audio', data_url: 'https://cw/a.ogg' }] }), nodes());
  assert.deepEqual(out.map(o => o.json.payload.type), ['audio', 'text']);
});
test('PDF → documento con nombre de archivo', () => {
  const out = run(ARMAR, msgsWith({ content: '', attachments: [{ file_type: 'file', data_url: 'https://cw/rails/ficha-propiedad.pdf?x=1' }] }), nodes());
  assert.equal(out[0].json.payload.document.filename, 'ficha-propiedad.pdf');
});
test('webhook falsificado: el mensaje no existe en Chatwoot → no envía nada', () => {
  assert.deepEqual(run(ARMAR, { payload: [{ id: 1, message_type: 1, content: 'otro' }] }, nodes()), []);
});
test('webhook falsificado: conversación de otro inbox (ej. 3) → no envía nada', () => {
  assert.deepEqual(run(ARMAR, msgsWith({}), nodes({ ...CONV, inbox_id: 3 })), []);
});
test('en Chatwoot el mensaje es privado aunque el webhook diga público → no envía', () => {
  assert.deepEqual(run(ARMAR, msgsWith({ private: true }), nodes()), []);
});
test('contacto sin teléfono → error explícito (no falla en silencio)', () => {
  assert.throws(() => run(ARMAR, msgsWith({}), nodes({ ...CONV, meta: { sender: {} } })), /sin teléfono válido/);
});

test("echo REAL tal como lo guarda Chatwoot (content_attributes vacío, source_id = wamid) → NO sale", () => {
  assert.deepEqual(run(FILTRAR, cw({ content_attributes: {}, source_id: "wamid.TEST_ECHO" })), []);
});
test("re-lectura: el mensaje en Chatwoot tiene source_id → NO sale aunque el webhook no lo traiga", () => {
  assert.deepEqual(run(ARMAR, msgsWith({ source_id: "wamid.X", content_attributes: {} }), nodes()), []);
});
test("respuesta del bot sin source_id (null) → sale", () => {
  assert.equal(run(FILTRAR, cw({ source_id: null })).length, 1);
  assert.equal(run(ARMAR, msgsWith({ source_id: null }), nodes()).length, 1);
});
console.log(`\n${passed} pruebas OK${process.exitCode ? ' — HAY FALLAS' : ''}`);
