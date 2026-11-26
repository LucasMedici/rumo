-- CreateEnum
CREATE TYPE "work_mode" AS ENUM ('remote', 'hybrid', 'onsite');

-- CreateEnum
CREATE TYPE "seniority" AS ENUM ('intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'lead', 'manager');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('full_time', 'part_time', 'contract', 'internship', 'temporary', 'freelance');

-- CreateEnum
CREATE TYPE "salary_period" AS ENUM ('hour', 'day', 'month', 'year');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('open', 'closed');

-- CreateEnum
CREATE TYPE "job_source_kind" AS ENUM ('manual', 'ats', 'aggregator', 'community');

-- CreateEnum
CREATE TYPE "user_job_origin" AS ENUM ('imported', 'saved');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "normalized_name" TEXT NOT NULL,
    "website" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location_text" TEXT,
    "country_code" CHAR(2),
    "work_mode" "work_mode",
    "seniority" "seniority",
    "employment_type" "employment_type",
    "salary_min" INTEGER,
    "salary_max" INTEGER,
    "salary_currency" CHAR(3),
    "salary_period" "salary_period",
    "apply_url" TEXT,
    "status" "job_status" NOT NULL DEFAULT 'open',
    "posted_at" TIMESTAMPTZ(6),
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_sources" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "job_source_kind" NOT NULL,
    "trust_level" INTEGER NOT NULL DEFAULT 50,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_sources_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "job_listings" (
    "id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "source_key" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "url" TEXT,
    "imported_by_user_id" UUID,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_jobs" (
    "user_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "origin" "user_job_origin" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_jobs_pkey" PRIMARY KEY ("user_id","job_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_normalized_name_key" ON "companies"("normalized_name");

-- CreateIndex
CREATE INDEX "jobs_company_id_idx" ON "jobs"("company_id");

-- CreateIndex
CREATE INDEX "job_listings_job_id_idx" ON "job_listings"("job_id");

-- CreateIndex
CREATE INDEX "job_listings_imported_by_user_id_idx" ON "job_listings"("imported_by_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_listings_source_key_external_id_key" ON "job_listings"("source_key", "external_id");

-- CreateIndex
CREATE INDEX "user_jobs_user_id_created_at_job_id_idx" ON "user_jobs"("user_id", "created_at" DESC, "job_id" DESC);

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_source_key_fkey" FOREIGN KEY ("source_key") REFERENCES "job_sources"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_listings" ADD CONSTRAINT "job_listings_imported_by_user_id_fkey" FOREIGN KEY ("imported_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_jobs" ADD CONSTRAINT "user_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_jobs" ADD CONSTRAINT "user_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CheckConstraints (data integrity enforced by the database, not only by the API)
ALTER TABLE "jobs"
  ADD CONSTRAINT "jobs_salary_non_negative" CHECK ("salary_min" IS NULL OR "salary_min" >= 0),
  ADD CONSTRAINT "jobs_salary_range" CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max"),
  ADD CONSTRAINT "jobs_country_code_format" CHECK ("country_code" IS NULL OR "country_code" ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT "jobs_salary_currency_format" CHECK ("salary_currency" IS NULL OR "salary_currency" ~ '^[A-Z]{3}$');

ALTER TABLE "job_sources"
  ADD CONSTRAINT "job_sources_trust_level_range" CHECK ("trust_level" BETWEEN 0 AND 100);

-- EnableRLS (no policies: deny all for non-owner roles; the API connects as owner)
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "job_listings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_jobs" ENABLE ROW LEVEL SECURITY;

-- SeedData: the manual import source
INSERT INTO "job_sources" ("key", "name", "kind", "trust_level")
VALUES ('manual', 'Manual import', 'manual', 60);
