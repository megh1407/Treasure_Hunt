const fs = require('fs');
const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));

const envFile = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
const match = envFile.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
if (!match) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const rawUrl = match[1];
const ipUrl = rawUrl.replace('aws-0-ap-southeast-2.pooler.supabase.com', '13.238.183.126');

console.log('Testing connection with IPv4 URL...');
const prisma = new PrismaClient({
  datasources: {
    db: { url: ipUrl },
  },
});

prisma.$connect()
  .then(() => {
    console.log('Prisma connected with IPv4 successfully!');
    return prisma.$queryRaw`SELECT 1 as connected`;
  })
  .then((r) => {
    console.log('Query output:', r);
  })
  .catch((err) => {
    console.error('Prisma connection with IPv4 failed:', err.message);
  })
  .finally(() => prisma.$disconnect());
