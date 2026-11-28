-- SeedData: GitHub Issues of Brazilian community job boards (backend-br/vagas and similar).
-- Official GitHub REST API; each open issue is a posting (link back to the issue).
INSERT INTO "job_sources" ("key", "name", "kind", "trust_level")
VALUES ('github-issues', 'GitHub (vagas da comunidade)', 'community', 65);
