const { env } = require('../backend/dist/config/env');
console.log('env.DATABASE_URL:', env.DATABASE_URL.slice(0, 30) + '...');
console.log('process.env.DATABASE_URL:', (process.env.DATABASE_URL || '').slice(0, 30) + '...');

const { prisma } = require('../backend/dist/lib/prisma');
prisma.$connect()
  .then(() => {
    console.log('Successfully connected!');
    return prisma.$queryRaw`SELECT 1`;
  })
  .then((r) => console.log('Query result:', r))
  .catch((e) => console.error('Connect failed:', e))
  .finally(() => prisma.$disconnect());
