const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('--- Inspecting PostgreSQL tables in Supabase ---');
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  console.log('Tables found in public schema:', tables.map(t => t.table_name));

  const playerCols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'Player'
    ORDER BY ordinal_position;
  `;
  console.log('\nPlayer columns:', playerCols.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`));

  const constraints = await prisma.$queryRaw`
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conrelid = 'public."Player"'::regclass;
  `;
  console.log('\nPlayer constraints:', constraints.map(c => `${c.conname} (type: ${c.contype})`));

  const progressConstraints = await prisma.$queryRaw`
    SELECT conname, contype 
    FROM pg_constraint 
    WHERE conrelid = 'public."LevelProgress"'::regclass;
  `;
  console.log('\nLevelProgress constraints:', progressConstraints.map(c => `${c.conname} (type: ${c.contype})`));

  await prisma.$disconnect();
}

check().catch(console.error);
