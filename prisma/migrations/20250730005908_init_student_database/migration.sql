-- CreateEnum
CREATE TYPE "public"."ExamType" AS ENUM ('BAC', 'BREVET');

-- CreateTable
CREATE TABLE "public"."students" (
    "id" TEXT NOT NULL,
    "matricule" TEXT NOT NULL,
    "nom_complet" TEXT NOT NULL,
    "ecole" TEXT NOT NULL,
    "etablissement" TEXT NOT NULL,
    "moyenne" DOUBLE PRECISION NOT NULL,
    "rang" INTEGER NOT NULL,
    "admis" BOOLEAN NOT NULL,
    "decision_text" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "wilaya" TEXT,
    "rang_etablissement" INTEGER,
    "year" INTEGER NOT NULL,
    "examType" "public"."ExamType" NOT NULL,
    "lieu_nais" TEXT,
    "date_naiss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_uploads" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "examType" "public"."ExamType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "studentCount" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_matricule_key" ON "public"."students"("matricule");

-- CreateIndex
CREATE INDEX "students_year_examType_idx" ON "public"."students"("year", "examType");

-- CreateIndex
CREATE INDEX "students_wilaya_idx" ON "public"."students"("wilaya");

-- CreateIndex
CREATE INDEX "students_ecole_idx" ON "public"."students"("ecole");

-- CreateIndex
CREATE INDEX "students_etablissement_idx" ON "public"."students"("etablissement");

-- CreateIndex
CREATE INDEX "students_rang_idx" ON "public"."students"("rang");

-- CreateIndex
CREATE UNIQUE INDEX "students_matricule_year_examType_key" ON "public"."students"("matricule", "year", "examType");

-- CreateIndex
CREATE UNIQUE INDEX "data_uploads_year_examType_key" ON "public"."data_uploads"("year", "examType");
