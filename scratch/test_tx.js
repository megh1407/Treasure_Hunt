const { prisma } = require('./backend/dist/lib/prisma');
async function main() {
  const result = await prisma.$transaction(async (tx) => {
    return await tx.player.count();
  });
  console.log('Interactive transaction succeeded, count =', result);
}
main().catch(console.error).finally(() => prisma.$disconnect());
