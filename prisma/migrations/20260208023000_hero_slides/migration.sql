-- CreateTable
CREATE TABLE "HeroSlide" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "ctaText" TEXT,
    "ctaHref" TEXT,
    "imageUrl" TEXT NOT NULL,
    "imagePathname" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroSlide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroSlide_active_idx" ON "HeroSlide"("active");

-- CreateIndex
CREATE INDEX "HeroSlide_orden_idx" ON "HeroSlide"("orden");
