-- Sign and Sky — remove the Telangana and Haryana (India) places.
-- The research covers Wolaita, South Ethiopia only (owner's decision, 4 Nov 2026).
-- No test score or record uses these places; anything that did would keep its data with the place left empty.
-- Safe to run more than once.
delete from locations where slug in ('tel', 'har') or (country = 'India' and name in ('Telangana', 'Haryana'));
