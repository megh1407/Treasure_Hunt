const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
const match = envFile.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
let url = match[1];
if (!url.includes('connect_timeout=')) {
  url += '&connect_timeout=30';
}

console.log('Testing with connect_timeout=30...');
const prisma = new PrismaClient({
  datasources: { db: { url } },
});

async function main() {
  const t0 = Date.now();
  console.log('Connecting...');
  await prisma.$connect();
  console.log(`Connected in ${Date.now() - t0}ms! Running query...`);
  const r = await prisma.$queryRaw`SELECT 1 as connected`;
  console.log(`Query succeeded in ${Date.now() - t0}ms:`, r);
}

main()
  .then(() => console.log('TIMEOUT TEST SUCCESS!'))
  .catch((e) => console.error('TIMEOUT TEST FAILED:', e.message))
  .finally(() => prisma.$disconnect());
