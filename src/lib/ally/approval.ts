import { prisma } from "@/lib/prisma";

export async function isAllyFullyApproved(allyProfileId: string): Promise<boolean> {
  const ally = await prisma.allyProfile.findUnique({
    where: { id: allyProfileId },
    select: { status: true, contract: { select: { status: true } } },
  });
  if (!ally) return false;
  return ally.status === "KYC_APPROVED" && ally.contract?.status === "APPROVED";
}

