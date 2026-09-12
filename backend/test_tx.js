const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
const { prisma } = require('./dist/lib/prisma');
async function main() {
  for (let i = 1; i <= 5; i++) {
    const t0 = Date.now();
    const r = await prisma.player.count();
    console.log(`Query ${i}: count = ${r} in ${Date.now() - t0}ms`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
