const { PrismaClient } = require("d:/MEGH/core-quest-finder/backend/node_modules/@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const deleted = await prisma.player.deleteMany({
      where: {
        enrollmentNumber: {
          startsWith: "TEST_GAME_",
        },
      },
    });
    console.log(`Successfully cleaned up ${deleted.count} test player record(s) and cascaded level progress / sessions.`);
  } catch (error) {
    console.error("Cleanup error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
