# Reopening Room 2 locally

Open http://127.0.0.1:5173/study (alias: http://127.0.0.1:5173/room2) while the local frontend and backend are running. Sign in normally if prompted. This development-only shortcut opens the real Study component using real authenticated APIs; it does not reset fragments, case files, scores or sessions. Existing backend room-access prerequisites still apply. To test the whole investigation from the beginning, use a separate test team with Bedroom complete and Study unfinished.

The normal homepage resumes Basement once Study is complete. Changing the stored current-room preference alone does not override that automatic selection. The shortcut skips that selection locally; the Study's back and forward door callbacks still work. Production builds disable the shortcut.

The frontend delivery branch is `feat/room-2-frontend` in the main organization repository, `TheTuringClubJU/curse-the-code`. It was originally created from main at `01ad3277cbffdd69a070ef9ff29c547c228d988f`. Source, optimized runtime assets and tests are now being published on that same branch for review. See [delivery review](ROOM2_RELEASE_REVIEW.md) for scope and validation; the earlier visual review files record historical local revisions.

Use `?studyQuality=low` for weaker hardware or `?studyQuality=balanced` for the normal mode. These settings only affect Study graphics. Source models/audio in the local `glb files/` and `audio files/` folders are development inputs; the complete optimized runtime package lives under `frontend/public/assets/models/study/` and `frontend/public/audio/study/`.
