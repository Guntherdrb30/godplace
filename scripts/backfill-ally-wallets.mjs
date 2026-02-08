import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const allyProfiles = await prisma.allyProfile.findMany({ select: { id: true } });
  let created = 0;

  for (const ap of allyProfiles) {
    const w = await prisma.allyWallet.findUnique({ where: { allyProfileId: ap.id } });
    if (w) continue;
    await prisma.allyWallet.create({ data: { allyProfileId: ap.id } });
    created++;
  }

  console.log(`[backfill] wallets created: ${created}/${allyProfiles.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

