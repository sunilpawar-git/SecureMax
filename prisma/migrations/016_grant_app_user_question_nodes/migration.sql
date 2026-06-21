-- Grant app_user INSERT/UPDATE on question_nodes.
-- ai-service/scripts/seed_question_graph.py connects as app_user and
-- upserts this table from the question-graph/*.yaml SSOT, but the original
-- grant was never added — same oversight as migration 14 (users.city/country).
-- Without this, reseeding via the documented workflow (question-graph/CLAUDE.md)
-- fails with permission denied.
GRANT INSERT, UPDATE ON "question_nodes" TO app_user;
