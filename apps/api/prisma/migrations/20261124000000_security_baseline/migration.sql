-- Security baseline for the Supabase database.
--
-- Rumo never uses Supabase's Data API (PostgREST): every query goes through our own API.
-- Even so, we make sure the `anon` and `authenticated` roles (used by that API with the
-- public anon key) cannot reach application data, as defense in depth.

-- 1. Application schema -------------------------------------------------------------------
-- All application tables live in `rumo` (Prisma's `_prisma_migrations` too). The schema is created by
-- `postgres`, which has no default grants for anon/authenticated outside `public`.
CREATE SCHEMA IF NOT EXISTS rumo;

REVOKE ALL ON SCHEMA rumo FROM PUBLIC;
REVOKE ALL ON SCHEMA rumo FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA rumo FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA rumo FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA rumo FROM PUBLIC, anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rumo REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rumo REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA rumo REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated;

-- 2. Stop auto-exposing new objects in `public` -------------------------------------------
-- Supabase grants anon/authenticated full access to anything `postgres` creates in `public`.
-- We don't use `public`, but if something lands there by mistake it must not be exposed.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 3. Row Level Security -------------------------------------------------------------------
-- RLS on with no policies = deny all for non-owner roles. Our API connects as the table owner,
-- so it is unaffected; isolation between users is enforced in the API by filtering on user_id.
-- Every future table must do the same in its migration (checked by an automated test).
ALTER TABLE rumo._prisma_migrations ENABLE ROW LEVEL SECURITY;
