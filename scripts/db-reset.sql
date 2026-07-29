-- Delete all app data (keeps schema and migrations intact).
-- Order respects foreign key dependencies.

DELETE FROM answers;
DELETE FROM questions;
DELETE FROM statement_responses;
DELETE FROM statements;
DELETE FROM sessions;
DELETE FROM partners;
DELETE FROM couples;
