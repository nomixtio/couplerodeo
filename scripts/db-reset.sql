-- Delete all app data (keeps schema and migrations intact).
-- Order respects foreign key dependencies.

DELETE FROM location_shares;
DELETE FROM calendar_events;
DELETE FROM answers;
DELETE FROM questions;
DELETE FROM update_responses;
DELETE FROM updates;
DELETE FROM sessions;
DELETE FROM partners;
DELETE FROM couples;
