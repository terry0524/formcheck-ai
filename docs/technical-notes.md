# FormCheck technical notes

_Code-grounded answers for Wanted AI Championship 2026 reviewer questions._

---

## 🔍 Judge Q&A

### 1. Why MediaPipe?

The browser package provides a Pose Landmarker that can run in `VIDEO` mode and returns 33 normalized plus world landmarks from each accepted frame.[^1] FormCheck can therefore keep inference in the browser and use a compact Lite model without designing or hosting a custom vision API. `npm run setup:pose` prepares the exact model and compatible WASM runtime under `public` locally (binaries are excluded from Git), and `lib/productionAssets.test.ts` checks their hashes and WASM headers.

This choice does not mean MediaPipe understands exercise quality. It supplies body landmarks; FormCheck owns the movement and form decisions after that point.

### 2. Why client-side inference?

The product promise is immediate feedback without uploading the camera feed. `lib/poseEngine.ts` reads an `HTMLVideoElement`, runs `detectForVideo`, copies the result needed by the application, and closes the MediaPipe result. There is no workout API, account service, remote inference call, or frame upload path.

Client-side inference also removes network round trips from the per-frame decision loop. The tradeoff is that first load, speed, heat, and battery use depend on the phone and browser, so physical-device validation remains mandatory.

### 3. Why deterministic exercise rules after AI pose estimation?

> “We use AI where perception is needed and deterministic rules where consistent exercise decisions are needed.”

Pose estimation is appropriate for locating joints in camera input. Rep counting and form feedback require repeatable transitions, inspectable thresholds, cooldowns, and fail-closed behavior. Each analyzer therefore implements the same `ExerciseAnalyzer` contract while keeping exercise-specific rules in a separate module. This makes a count explainable from observed angles and state history rather than an opaque generated judgment.

### 4. How are reps counted?

Squat requires `STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING`. Push-Up requires `UP → DESCENDING → DOWN → ASCENDING → UP`. Lunge uses standing, descent, bottom, ascent, and return while retaining a left/right side only when knee-angle separation is unambiguous. A rep event is sent to `WorkoutEngine.recordRep()` only after the complete analyzer sequence succeeds.

Plank is different: its prescription uses duration. `WorkoutEngine` completes the set when an absolute exercise deadline is reached; the Plank analyzer evaluates form during the hold and never emits reps.

### 5. How is jitter handled?

Squat metrics use time-aware exponential smoothing, state hysteresis, sustained transition windows, minimum rep duration, a completion debounce, hip-drop baseline tracking, and active-cycle timeout. Push-Up and Lunge also smooth continuous metrics and require sustained transitions plus debounce. Form feedback uses sustained evidence before emission and a seven-second per-issue cooldown. React state is not updated for every inference frame; analysis UI commits are throttled to meaningful changes or at most every 100 ms.

### 6. How is low confidence handled?

Low confidence is not bad form. The body gate requires visible head, shoulders, hips, knees, and ankles plus aggregate confidence before it reports READY. During exercise, any non-ready gate state passes `null` to the analyzer. An analyzer suspends evaluation and clears an interrupted cycle after its tracking-loss window. It does not emit a score, issue, or rep from unreliable input.

### 7. What happens when multiple people appear?

MediaPipe is configured with `numPoses: 2`. If a second pose is present with confidence of at least `0.65`, `evaluateBodyVisibility()` returns `multiple-people`, the UI asks for one person only, and workout analysis receives no frame. FormCheck does not identify or track which person is the intended user; it fails closed until one confident full body remains.

### 8. How is Form Score calculated?

Squat uses three explicit category weights: Depth 40%, Trunk 35%, and Knee Alignment 25%. Each measured deviation maps deterministically to a 0–100 category score. The final rep score is:

```text
round(sum(category score × available weight) / sum(available weights))
```

If camera geometry cannot support knee-alignment measurement, alignment is `null` and its weight is removed from both numerator and denominator. It is never replaced with 0 or 100. Set scores average measured rep or timed-sample scores; exercise scores average measured sets; overall Form Score gives each measured exercise equal weight. No measurement produces `—`, not an invented score.

### 9. What data is stored?

Browser `localStorage` contains:

- `formcheck.saved-routines`: versioned saved and user-created routines
- `formcheck.workout-reports.v1`: up to the latest 20 validated workout reports
- `formcheck.latest-squat-session`: the latest detailed Squat rep evaluations

Camera frames, images, audio, and video are not stored. QA performance JSON downloads only after Export and excludes landmarks/video. Landmark replay begins only after Record, stays in memory, and downloads only after a separate Export action.

### 10. What are the current limitations?

- Physical iPhone Safari and Android Chrome accuracy/stability evidence is not yet recorded in the repository
- Squat has the broadest synthetic scenario coverage; Push-Up, Lunge, and Plank need broader real-person calibration
- One RGB view cannot reliably infer force, pain, joint loading, injury risk, or occluded geometry
- Knee/body alignment is omitted when camera geometry is unsuitable
- Camera switching, Web Speech behavior, audio mixing, screen lock, heat, and battery use remain device-controlled
- Explore is a local demo library, not a live community or social platform
- Storage is local to one browser origin with no account, cloud sync, or cross-device history
- Catalog movements without registered analyzers require manual Skip and receive no fabricated count or score

## 🔗 References

[^1]: Google AI for Developers. “Pose landmark detection guide for Web.” https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker/web_js
