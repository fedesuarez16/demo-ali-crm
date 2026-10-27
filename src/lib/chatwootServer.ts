// Helpers de Chatwoot para rutas de API (server-only: usan CHATWOOT_API_TOKEN).

export type ChatwootClient = { base: string; headers: Record<string, string> };

export function getChatwoot(): ChatwootClient | null {
  const url = process.env.CHATWOOT_URL;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const apiToken = process.env.CHATWOOT_API_TOKEN;
  if (!url || !accountId || !apiToken) return null;
  return {
    base: `${url.replace(/\/$/, '')}/api/v1/accounts/${accountId}`,
    headers: { 'Content-Type': 'application/json', api_access_token: apiToken },
  };
}

export const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
export const last10 = (value: string) => value.slice(-10);

// Conversación más reciente del contacto cuyo teléfono coincide por últimos 10 dígitos.
export async function findConversationId(cw: ChatwootClient, phone: string) {
  const target = last10(phone);
  for (const query of [phone, target]) {
    const res = await fetch(`${cw.base}/contacts/search?q=${encodeURIComponent(query)}`, { headers: cw.headers });
    if (!res.ok) continue;
    const data = await res.json();
    const contacts = (data.payload || []).filter((c: any) =>
      [c.phone_number, c.identifier].some((v) => v && last10(digits(v)) === target)
    );
    if (contacts.length === 0) continue;

    const conversations: any[] = [];
    for (const contact of contacts) {
      const convRes = await fetch(`${cw.base}/contacts/${contact.id}/conversations`, { headers: cw.headers });
      if (!convRes.ok) continue;
      const convData = await convRes.json();
      conversations.push(...(convData.payload || []));
    }
    conversations.sort((a, b) => (b.last_activity_at || 0) - (a.last_activity_at || 0));
    if (conversations[0]) return conversations[0].id as number;
  }
  return null;
}
