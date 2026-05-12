/**
 * Читає DATABASE_URL з .env та виводить JSON для pg_dump/pg_restore.
 * Usage: node lib/parse-database-url.mjs <path-to-.env>
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvDatabaseUrl(envPath) {
  if (!fs.existsSync(envPath)) {
    console.error(JSON.stringify({ error: `Файл не знайдено: ${envPath}` }));
    process.exit(2);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    if (key !== 'DATABASE_URL') continue;
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    return val;
  }
  console.error(JSON.stringify({ error: 'DATABASE_URL відсутній у .env' }));
  process.exit(2);
}

function parse(raw) {
  const s = String(raw || '').trim();
  const normalized = s.replace(/^postgresql:/i, 'postgres:');
  let u;
  try {
    u = new URL(normalized);
  } catch (e) {
    console.error(
      JSON.stringify({ error: 'Невалідний DATABASE_URL', detail: String(e.message) }),
    );
    process.exit(2);
  }
  const pathname = decodeURIComponent(u.pathname.replace(/^\//, ''));
  const database = pathname.split('?')[0];
  const port = u.port || '5432';
  const user = decodeURIComponent(u.username);
  const password = decodeURIComponent(u.password);
  const host = u.hostname || 'localhost';
  if (!database) {
    console.error(JSON.stringify({ error: 'У DATABASE_URL не вказано ім\'я бази' }));
    process.exit(2);
  }
  return { user, password, host, port, database };
}

const envArg = process.argv[2];
const defaultEnv = path.resolve(__dirname, '../../backend/.env');
const envPath = path.resolve(envArg || defaultEnv);
const rawUrl = loadEnvDatabaseUrl(envPath);
const parsed = parse(rawUrl);

console.log(
  JSON.stringify({
    envPath,
    ...parsed,
  }),
);
