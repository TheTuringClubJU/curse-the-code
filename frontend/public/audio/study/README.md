# Study supplied audio

Recordings were supplied by the user in `audio files/`. These eight MP3 runtime copies are byte-for-byte copies:

- `dragon-studio-scary-scream-401725.mp3`
- `freesound_community-jump-scare-sound-2-82831.mp3`
- `soumages-jumpscare-v3-335600.mp3`
- `sound_effects75-eyesaur-jumpscare-sound-482110.mp3`
- `universfield-female-crying-291098.mp3`
- `alesiadavina-horror-sound-lurking-horror-monster-189948.mp3`
- `universfield-okiku-well-horror-578058.mp3`
- `universfield-cinematic-paranormal-horror-498207.mp3`

`simplesound-horror-piano-443326-first-7s.wav` contains exactly the first seven seconds of the supplied `simplesound-horror-piano-443326.mp3`, decoded to stereo 44,100 Hz, 16-bit PCM: 308,700 frames. The original 31-second file is untouched and is not shipped in the public directory. Playback also enforces a seven-second limit.

All nine files are decoded before the room's Enter button becomes available. Random foreground cues and wall-crossing audio wait for each other; crying stops during foreground effects and the ambient bed ducks. The exit event cancels any ongoing random cue, then deliberately starts scream and piano together on one audio clock. The woman disappears on the scream's end callback (approximately 3.312 seconds); the piano and dimmed room continue to seven seconds. The eyesaur clip is fitted to the two-second traversal. Master mute controls all channels; modal/background pauses suspend effects and resume their offsets.

Publication URLs/license receipts were not supplied; no license is inferred from a filename. Preserve original author/source receipts with the event credits.

Latest lighting/movement adjustment: after the scream ends the HUD and normal movement resume immediately, while the piano finishes. Actual room lights, torch and emissive sources remain at 50% until seven seconds; exposure is preserved. The door still waits for the seven-second event to finish.

Latest cadence adjustment: the first three random clips are lurking, well and paranormal in shuffled order, then the older pair, before cycling all five. Events use timers plus newly crossed evidence checkpoints; they stop once the exit finale is cleared. Crossing caps reset each visit. Quiet gaps and exclusive foreground channels remain.


The one-time procession also ships these supplied recordings: `universfield-door-knock-291150.mp3`, `audiopapkin-old-creaking-wooden-door-003-raw-recording-508598.mp3`, `oxidvideos-creaking-wooden-floor-footsteps-410804.mp3`, and `freesound_community-fuzzy-jumpscare-80560.mp3`. They are loaded before entering alongside the original room recordings. The cinematic uses intentional footsteps/music layers, reserves the ordinary scare channel, fades the aftermath audio, and restores ambient sound on recovery or disposal. The same source-receipt limitation above applies.
