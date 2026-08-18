-- Delete all app data (keeps schema and migrations intact).
-- Order respects foreign key dependencies.

DELETE FROM location_shares;
DELETE FROM plan_expenses;
DELETE FROM plan_media;
DELETE FROM plans;
DELETE FROM notes;
DELETE FROM calendar_events;
DELETE FROM update_responses;
DELETE FROM updates;
DELETE FROM sessions;
DELETE FROM partners;
DELETE FROM couples;
