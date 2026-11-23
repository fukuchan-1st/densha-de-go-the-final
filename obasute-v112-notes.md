# 姨捨・善光寺平 v112

## Geography
- Terrain: GSI DEM PNG tiles. Existing 375 m Nagano backdrop plus a 25 m local resampling of z12 DEM around the station. Rail height retains the supplied BVE datum; the basin may lie below it.
- Agriculture: 4,313 mapped OSM farmland outlines, plus mapped orchards. OSM landuse does not identify every crop or cadastral boundary; rice-field appearance is an approximation within those mapped footprints. Forests, settlement areas, Chikuma River/water polygons, and 3,408 distant building silhouettes use the same OSM extract.
- Platform/throat centreline topology uses OSM ways 24412230, 222341439/440/441, 1174542795–2798 and 1178483802/3812/3813. Near the edge of the station scene, the main line blends back into the supplied BVE geometry. Platform widths/length, building details and vertical separation remain approximations.
- Google Maps / Street View: visually checked September 2026 station frontage and January 2018 platform 360° image (Tokuhisa Kadonaga), including the valley-facing platform and lower bypass. Images are not copied into the project and Google geometry is not bundled.
- City reference: https://www.city.chikuma.lg.jp/soshiki/rekishibunkazaicenter/rekishi_bunkazai/2/2375.html
- JR East platform reference: https://www.jreast.co.jp/nagano/pdf/160510.pdf

## Operation
- Ordinary services restore the Obasute stop. Express/limited-stop patterns keep their own stopping patterns.
- Down: platform → B reverse to headshunt → F forward to the bypass toward Inariyama.
- Up: bypass → headshunt stop → B reverse into the platform → doors close → F forward toward Kamuriki.
- B/F are accepted only at standstill during this operation, once the entire formation is clear of the turnout; an exact centimetre stop at the headshunt marker is not required. Other locations retain normal controls. Power remains interlocked with doors; doors do not open at the headshunt. Target distances and the 15 km/h shunting guidance are displayed.
- Reverse view uses the carriage's valley-side window, hides the cab and keeps the formation physically facing its original direction. Replay records physical shunting position independently of timetable progress.
- Terrain near all five physical shunting/running paths is subdivided to at most 9 m edges, checked against continuous rail segments and lowered below rail level; retaining foundations fill the station bench without changing the accepted track shape.
- For an approach overrun the shunting endpoint has a protective buffer stop 12 m beyond the target; normal handling requires braking to standstill at the target.
- Existing route running-line traffic is not spawned on the switchback's non-running sidings.

## Packaging
Four byte-identical audio files share existing assets through manifest aliases. Sound event keys and timings are unchanged.

## v112c (Claude Code)
- Down platform road is a stub (OSM ways end 130 m beyond the stop mark). Overrunning it now stops at a buffer (128 m) and returns the train to the stop position with the normal overrun penalty, instead of running off the map and later locking at 0 km/h before Inariyama.
- Headshunt is level beyond the throat turnout; the climb from the platform bench is spread over -450..-245 (about 33‰ average, previously up to 50‰ plus 25‰ in the headshunt). Shunting assist steps up to P4 when it cannot accelerate.
- Leaving toward the main line (down main-out / up platform-out) hands over to normal running as soon as the whole formation has cleared the turnout, without stopping.
- Arriving up trains may run at up to 45 km/h on the main line before the turnout; 15 km/h applies beyond it.
- Level crossings within the station model sit on the mapped main line; OSM road polylines near Obasute (BVE-height profiles floated through the platform) are not drawn there, and crossing approaches are draped on the DEM instead.
- Station detail (approximate, from public photos): platform body and edge, benches facing the valley, valley-side railing, platform lamps lit at night, station name boards, a small timber station building with gabled roof and lit windows, buffer stops at both platform roads and the headshunt.
- Night view: additional lights scattered inside mapped residential/commercial/industrial areas of the basin.
- Cache version 112b → 112c.
