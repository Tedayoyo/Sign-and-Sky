-- Moves the weather-test point to the study area: the centre of Offa Woreda, Wolaita (6.75° N, 37.50° E),
-- where the 2025 survey of 283 households took place. Earlier point: Wolaita Sodo (6.855° N, 37.761° E).
-- Safe to run more than once. Existing test results keep the coordinates they were run with.
update locations
set latitude = 6.75,
    longitude = 37.5,
    coordinates_note = 'Study point: centre of Offa Woreda, where the 2025 survey took place (kebeles W/Dekeya, Wareza, Yakima). Earlier point: Wolaita Sodo 6.855, 37.761.'
where slug = 'wol';

select slug, name, latitude, longitude from locations where slug = 'wol';
