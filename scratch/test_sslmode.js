const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
const match = envFile.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
let url = match[1];
if (!url.includes('sslmode=')) {
  url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
}
const ipUrl = url.replace('aws-0-ap-southeast-2.pooler.supabase.com', '13.238.183.126');

console.log('Testing with sslmode=require and IP...');
const prisma = new PrismaClient({
  datasources: { db: { url: ipUrl } },
});

async function main() {
  for (let i = 1; i <= 3; i++) {
    const t0 = Date.now();
    const r = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log(`Query ${i} in ${Date.now() - t0}ms:`, r);
  }
}

main()
  .then(() => console.log('SUCCESS!'))
  .catch((e) => console.error('FAILED:', e.message))
  .finally(() => prisma.$disconnect());
