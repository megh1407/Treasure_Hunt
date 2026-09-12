const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
const match = envFile.match(/DIRECT_URL=["']?([^"'\r\n]+)/);
const dirUrl = match[1]; // Port 5432

console.log('Testing Prisma queries via Port 5432...');
const prisma = new PrismaClient({
  datasources: { db: { url: dirUrl } },
});

async function run() {
  for (let i = 1; i <= 5; i++) {
    const t0 = Date.now();
    const res = await prisma.$queryRaw`SELECT 1 as val`;
    console.log(`Query ${i} via port 5432 took ${Date.now() - t0}ms:`, res);
  }
}

run()
  .then(() => console.log('Port 5432 test passed!'))
  .catch((e) => console.error('Port 5432 failed:', e.message))
  .finally(() => prisma.$disconnect());
