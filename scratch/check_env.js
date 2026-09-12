const fs = require('fs');
const lines = fs.readFileSync('d:/MEGH/core-quest-finder/backend/.env', 'utf8').split('\n');
const vars = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq > 0) {
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    vars[key] = val.length > 0;
  }
}

console.log('DATABASE_URL exists and non-empty:', Boolean(vars.DATABASE_URL));
console.log('DIRECT_URL exists and non-empty:', Boolean(vars.DIRECT_URL));
console.log('PORT exists and non-empty:', Boolean(vars.PORT));
console.log('NODE_ENV exists and non-empty:', Boolean(vars.NODE_ENV));
console.log('CORS_ORIGIN exists and non-empty:', Boolean(vars.CORS_ORIGIN));
