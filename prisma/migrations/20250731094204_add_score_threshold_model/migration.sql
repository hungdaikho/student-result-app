-- CreateTable
CREATE TABLE "public"."score_thresholds" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "examType" "public"."ExamType" NOT NULL,
    "section" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "score_thresholds_year_examType_idx" ON "public"."score_thresholds"("year", "examType");

-- CreateIndex
CREATE UNIQUE INDEX "score_thresholds_year_examType_section_key" ON "public"."score_thresholds"("year", "examType", "section");
