# v89

- Animate the reviewed passenger door regions with their original textures in outer and railfan views, using the boarding-platform side. Keep cab access doors fixed.
- Synchronize boarding, closing and replay states. Preserve clipped body surfaces and UVs; regression test catches the previous missing-body strips.
- Add semi-automatic door opening for 211/E131/E127 west of Takao, with independently randomized initial waiting times and repeat cycles; record the seed and clock for replay.
- E127 Oito stops except Hakuba, Shinano-Omachi and Minami-Otari open only the leading passenger doorway of the leading car.
- Add the supplied 383 panorama green model only to the six-car formation, always on the Nagano/Hakuba side; preserve two/four-car ends. Oito Shinano services use four cars.
- Tint Tobu 6050 bogies brown.

Validation: 331 tests pass, including door-surface preservation, semi-automatic territory and timing, single-door operation, replay and 383 formation direction. User reviewed all preview vehicle door positions; additionally checked actual E131 boarding in outer view with no console errors.
