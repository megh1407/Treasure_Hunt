const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- Cleaning up temporary test data ---');
  const result = await prisma.player.deleteMany({
    where: {
      enrollmentNumber: 'TEST_ENROLL_9999',
    },
  });
  console.log(`Deleted ${result.count} test player record(s).`);
  await prisma.$disconnect();
}

cleanup().catch(console.error);
