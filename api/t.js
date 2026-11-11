import { put, head } from '@vercel/blob';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const okUrl = (u) => { try { return new URL(u).hostname.endsWith('.blob.vercel-storage.com'); } catch { return false; } };
const key = (id) => `meta/${id}.json`;
async function load(id) {
  if (!/^[\w-]{8}$/.test(id || '')) return null;
  try {
    const { url } = await head(key(id));
    const m = await (await fetch(url + '?t=' + Date.now(), { cache: 'no-store' })).json();
    return m.exp && Date.now() > m.exp ? null : m;
  } catch { return null; }
}
const save = (m) => put(key(m.id), JSON.stringify(m), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
const good = (m, t) => !m.auth || (!!t && timingSafeEqual(scryptSync(String(t), m.auth.s, 32), Buffer.from(m.auth.h, 'hex')));

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'GET') {
    const m = await load(req.query.id);
    if (!m) return res.status(404).json({ error: 'gone' });
    return res.json({
      title: m.title, message: m.message, protected: !!m.auth, encrypted: m.enc, salt: m.salt, exp: m.exp,
      left: m.limit ? Math.max(0, m.limit - m.n) : null,
      files: m.files.map((f) => ({ name: f.name, size: f.size }))
    });
  }
  const b = req.body || {};
  if (b.a === 'create') {
    if (!Array.isArray(b.files) || !b.files.length || !b.files.every((f) => okUrl(f.url))) return res.status(400).json({ error: 'Requête invalide' });
    const id = randomBytes(6).toString('base64url');
    const m = {
      id, n: 0, limit: +b.limit || 0, exp: b.ttl ? Date.now() + b.ttl * 1000 : null,
      title: String(b.title || '').slice(0, 80), message: String(b.message || '').slice(0, 500),
      enc: !!b.enc, salt: b.salt || null,
      files: b.files.map((f) => ({ name: String(f.name).slice(0, 200), size: +f.size || 0, url: f.url, iv: f.iv || null }))
    };
    if (b.token) { const s = randomBytes(16).toString('hex'); m.auth = { s, h: scryptSync(String(b.token), s, 32).toString('hex') }; }
    await save(m);
    return res.json({ id });
  }
  const m = await load(b.id);
  if (!m) return res.status(404).json({ error: 'gone' });
  if (!good(m, b.token)) return res.status(401).json({ error: 'Mot de passe incorrect' });
  if (b.a === 'check') return res.json({ ok: true });
  if (b.a === 'grab') {
    if (m.limit && m.n >= m.limit) return res.status(410).json({ error: 'Limite de téléchargements atteinte' });
    m.n++;
    await save(m);
    return res.json({ files: m.files.map(({ name, size, url, iv }) => ({ name, size, url, iv })) });
  }
  res.status(400).json({ error: 'bad' });
}
