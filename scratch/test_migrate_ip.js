const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
const dbMatch = envFile.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
const dirMatch = envFile.match(/DIRECT_URL=["']?([^"'\r\n]+)/);

const dbUrl = dbMatch[1].replace('aws-0-ap-southeast-2.pooler.supabase.com', '13.238.183.126');
const dirUrl = dirMatch[1].replace('aws-0-ap-southeast-2.pooler.supabase.com', '13.238.183.126');

console.log('Running npx prisma migrate status with IPv4 URLs...');
try {
  const out = execSync('npx prisma migrate status', {
    cwd: path.resolve(__dirname, '../backend'),
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
      DIRECT_URL: dirUrl,
    },
    encoding: 'utf8',
  });
  console.log('SUCCESS:\n', out);
} catch (err) {
  console.error('FAILED:\n', err.stdout || '', err.stderr || '', err.message);
}
