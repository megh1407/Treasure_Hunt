const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing prisma connect...');
    await prisma.$connect();
    console.log('Connected! Querying 1...');
    const res = await prisma.$queryRaw`SELECT 1 as val`;
    console.log('Result:', res);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
