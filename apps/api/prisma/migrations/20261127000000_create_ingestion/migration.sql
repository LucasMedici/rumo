-- CreateEnum
CREATE TYPE "ingestion_run_status" AS ENUM ('running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "source_feeds" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "source_key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_runs" (
    "id" UUID NOT NULL,
    "feed_id" UUID NOT NULL,
    "status" "ingestion_run_status" NOT NULL DEFAULT 'running',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "stats" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_job_postings" (
    "id" UUID NOT NULL,
    "source_key" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "first_fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_fetched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_job_postings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_jobs" (
    "feed_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "first_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_jobs_pkey" PRIMARY KEY ("feed_id","job_id")
);

-- CreateIndex
CREATE INDEX "source_feeds_user_id_idx" ON "source_feeds"("user_id");

-- CreateIndex
CREATE INDEX "ingestion_runs_feed_id_started_at_idx" ON "ingestion_runs"("feed_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "raw_job_postings_last_fetched_at_idx" ON "raw_job_postings"("last_fetched_at");

-- CreateIndex
CREATE UNIQUE INDEX "raw_job_postings_source_key_external_id_key" ON "raw_job_postings"("source_key", "external_id");

-- CreateIndex
CREATE INDEX "feed_jobs_job_id_idx" ON "feed_jobs"("job_id");

-- AddForeignKey
ALTER TABLE "source_feeds" ADD CONSTRAINT "source_feeds_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_feeds" ADD CONSTRAINT "source_feeds_source_key_fkey" FOREIGN KEY ("source_key") REFERENCES "job_sources"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ingestion_runs" ADD CONSTRAINT "ingestion_runs_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "source_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "raw_job_postings" ADD CONSTRAINT "raw_job_postings_source_key_fkey" FOREIGN KEY ("source_key") REFERENCES "job_sources"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_jobs" ADD CONSTRAINT "feed_jobs_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "source_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_jobs" ADD CONSTRAINT "feed_jobs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- At most one running execution per feed (concurrency guard enforced by the database)
CREATE UNIQUE INDEX "ingestion_runs_one_running_per_feed" ON "ingestion_runs"("feed_id") WHERE "status" = 'running';

-- EnableRLS (no policies: deny all for non-owner roles; the API connects as owner)
ALTER TABLE "source_feeds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingestion_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "raw_job_postings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feed_jobs" ENABLE ROW LEVEL SECURITY;

-- SeedData: Remotive (remote jobs aggregator; terms: link back + credit Remotive, max ~4 fetches/day)
INSERT INTO "job_sources" ("key", "name", "kind", "trust_level")
VALUES ('remotive', 'Remotive', 'aggregator', 70);
