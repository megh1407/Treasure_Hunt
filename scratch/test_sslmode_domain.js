const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
const match = envFile.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
let url = match[1];
if (!url.includes('sslmode=')) {
  url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
}

console.log('Testing with sslmode=require and domain...');
const prisma = new PrismaClient({
  datasources: { db: { url } },
});

async function main() {
  const t0 = Date.now();
  const r = await prisma.$queryRaw`SELECT 1 as connected`;
  console.log(`Query in ${Date.now() - t0}ms:`, r);
}

main()
  .then(() => console.log('DOMAIN SUCCESS!'))
  .catch((e) => console.error('DOMAIN FAILED:', e.message))
  .finally(() => prisma.$disconnect());
