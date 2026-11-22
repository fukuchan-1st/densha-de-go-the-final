# Revision 106

Tohoku uses the common driving, weather, scoring, options and replay workflow. Its 701 cab images and supplied motor/BVE sound recordings are retained through a lifecycle adapter. Old /tohoku and /tohoku.html links redirect with direction, station and end range intact; a start button preserves browser audio gesture requirements. Older recorded Tohoku replays are adapted to the common route.

The startup fault was an unguarded world.route.vehicle access in the stopping marker, while the legacy world had no route object. The marker now accepts both shapes.

Temporary typhoon sections use a yellow triangular 徐行40 lookahead marker, matching HUD text and the matching kanko0–3 driver recording 121 (徐行), joined to only the 40 syllables from each matching bank’s 101. Cuts were aligned to local word timestamps. No synthetic voice is bundled. The separate 徐行・注意 advisory is kept as a quiet single 2.35-second cycle, played after the driver cue outside its queue so it cannot delay subsequent calls.

Motor pitch and wheelspin RPM have no artificial upper cap. Pitch tables extend above their recorded speed range. Audible excess RPM rises gradually, about 2.8–3.4 km/h per second at P1/P2 and 5.8–7 at higher notches; low-notch slip has a gentle 2.4-second wave. These sound adjustments do not alter the requested 80% wet acceleration or braking behavior. High-speed slip no longer mutes the last motor sample bank.
