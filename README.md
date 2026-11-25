# TrackSeed

AR cone placement and a live track digital twin for Formula Student Driverless.

Setting out an FS track today takes several people, a tape measure, and trigonometry, and nobody checks the result afterwards. TrackSeed lets one person do it with one phone:

1. **Load the plan.** Upload the track as JSON in the web dashboard.
2. **Align.** Scan two markers on the start line, then realign at markers along the track to limit drift.
3. **Place and verify.** AR shows where each cone goes, and the phone checks the position and colour.
4. **Live twin.** The dashboard follows placement as it happens, and edits made there go back to the phone.
5. **Identify the car.** An on-device classifier links each test session to the car that ran it.


## Status

Early prototype. The Android app and the dashboard are UI mockups that run on hard-coded sample data. There is no backend, AR, or vision model yet.

## Repository layout

| Path | Contents |
|------|----------|
| `android/` | Android app (Kotlin, Jetpack Compose, CameraX). Mock data lives in `data/MockData.kt`. |
| `dashboard/` | Web dashboard (Vue 3, Vite, Vuetify, Pinia) with the track list, live twin map, track upload, and session reports. Mock API in `src/api/index.ts`. |
| `shared/messages.ts` | Types shared by the dashboard and the future backend, and mirrored in the Android app: cones, tracks, sessions, and WebSocket messages. |
| `docs/LaTeX_paper/` | State-of-the-art paper and project proposal (IEEE format). |
| `docs/presentation/` | Slide decks (EN and PT). |

Track coordinates are in metres in the track's local frame, with the origin at marker A, x pointing east and y pointing north.

## Running

### Dashboard

Requires Node 22.18+ or 24.12+.

```bash
cd dashboard
npm install
npm run dev
```

Other scripts:

| Command | What it does |
|---------|--------------|
| `npm run test:unit` | Run the unit tests (Vitest) |
| `npm run build` | Type-check and build |
| `npm run lint` | Lint the code |

### Android app

Open `android/` in Android Studio and run the `app` configuration, or build from the command line:

```bash
cd android
./gradlew assembleDebug
```

The app needs Android 8.0 (API 26) or later and asks for camera permission.

### Paper

Compile `docs/LaTeX_paper/main.tex` with pdfLaTeX and BibTeX. See `docs/LaTeX_paper/README.txt` for the steps.

## Planned architecture

- **Android app:** AR alignment and guidance, cone verification, car recognition, and offline storage.
- **Cloud platform:** REST API, WebSocket sync, the digital twin database, the car dataset, and a model repository.
- **Web dashboard:** a live 2D digital twin, a track editor, and session reports.

The server is the only writer of the twin. The phone sends `cone_confirmed` messages over WebSocket and queues them while it is offline. The server broadcasts `snapshot`, `cone_upserted`, and `cone_removed` messages to every client. Both vision models will run on the phone with LiteRT.
