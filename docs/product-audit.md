# FormCheck product audit

_Wanted AI Championship 2026 submission inventory, audited against the repository on 2026-09-15._

---

## 📋 Status definitions

| Status | Meaning |
| --- | --- |
| `IMPLEMENTED` | A production code path exists and is reachable from the application |
| `TESTED` | Relevant deterministic behavior is covered by automated tests in this repository |
| `PARTIALLY VALIDATED` | The code or unit behavior is verified, but end-to-end physical-device evidence is still required |
| `LIMITATION` | The current product intentionally omits or narrows the capability |

> ⚠️ **Evidence boundary:** No physical iPhone or Android result is recorded in this repository. Browser API behavior, camera quality, thermal load, and real-person analyzer accuracy must not be described as device-verified.

## ✅ Final feature inventory

| Capability | Implementation | Validation | Evidence and boundary |
| --- | --- | --- | --- |
| Routine Explore | `IMPLEMENTED` | `PARTIALLY VALIDATED` | Category filters and ten built-in routines render from `lib/routines.ts`; interaction has no browser E2E test |
| Routine Detail | `IMPLEMENTED` | `PARTIALLY VALIDATED` | Static demo routines and locally saved IDs resolve; no automated rendered-route test |
| Routine execution | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | State engine is unit-tested; camera-to-analyzer-to-report flow still needs a physical-device run |
| Camera Setup | `IMPLEMENTED` | `PARTIALLY VALIDATED` | Permission, unavailable, busy-camera, retry, and secure-context messages exist; error mapping is unit-tested, real permissions are not |
| Front/rear camera | `IMPLEMENTED` | `PARTIALLY VALIDATED` | Front is requested by default, mirrored, and switchable through `facingMode`; device compliance varies |
| MediaPipe Pose | `IMPLEMENTED` | `PARTIALLY VALIDATED` | Browser `VIDEO` inference, local model/WASM, GPU-first and CPU fallback exist; bundled assets and hashes are tested, device runtime is not |
| Body Visibility Gate | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | No body, too close, missing body parts, low confidence, and ready cases have unit coverage; real framing remains manual QA |
| Multi-person gate | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | A second confident pose blocks analysis; synthetic gate behavior is tested, crowded-scene behavior is not device-validated |
| Squat analyzer | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Full phase sequence, smoothing, hysteresis, duration, debounce, tracking loss, and ten calibration scenarios are unit-tested; broad human calibration remains open |
| Rep counting | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Complete-cycle counts and incomplete-cycle rejection are tested with synthetic metrics/replays, not a physical-phone cohort |
| Form feedback | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Squat depth, trunk lean, and conditional knee alignment use sustained evidence and cooldown; live accuracy needs manual testing |
| Voice / Screen / Hybrid | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Mode selection and speech decision logic exist; Web Speech output and background-music behavior are OS/browser-dependent |
| Immediate mute | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Mute calls `speechSynthesis.cancel()` and duplicate guards are tested with browser mocks; audible cancellation needs device QA |
| Rest timer | `IMPLEMENTED` | `TESTED` | Absolute-deadline rest and pause/resume drift handling have unit coverage |
| Automatic set progression | `IMPLEMENTED` | `TESTED` | Set complete, rest, next set, next exercise, duration completion, pause, skip, previous, and end transitions have unit coverage |
| Workout report | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Report calculations and storage validation are unit-tested; final camera-driven report UI needs a physical demo run |
| Community routine functionality | `LIMITATION` | `TESTED` for local save only | Current Explore content is a local demo library. There are no accounts, publishing, live creators, rankings, backend, or cross-user data |
| Local persistence | `IMPLEMENTED` | `TESTED` | Versioned adapters store saved/custom routines, the latest 20 reports, and detailed Squat evaluations in `localStorage` |
| Push-Up analyzer | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Complete rep, shallow depth, body line, incomplete rep, and tracking loss have synthetic unit coverage; physical calibration remains open |
| Lunge / Reverse Lunge analyzer | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Complete rep, left/right selection, ambiguous side, depth, trunk alignment, and tracking loss have synthetic unit coverage |
| Plank analyzer | `IMPLEMENTED` | `TESTED` + `PARTIALLY VALIDATED` | Timed hold plus side-view body alignment are unit-tested; real camera-angle reliability needs device validation |
| Other catalog exercises | `LIMITATION` | `TESTED` fail-closed registry | Exercises without a registered analyzer show `ANALYZER NOT AVAILABLE` and require Skip; no counts or scores are fabricated |

## 🔍 Audit corrections

- Changed visible “Community workouts” language to “Local demo library”
- Removed fictional creator and save-count social proof from routine list/detail surfaces
- Exposed the existing real-inference 2 × 5 Squat routine as an explicitly labeled competition demo
- Retained ordinary rest durations in all general routines; only the labeled demo uses a five-second rest
- Rewrote `README.md` around final product behavior and moved detailed QA/calibration material into linked documents

## 🔐 Privacy audit

The application source contains one runtime `fetch`: it loads `/models/pose_landmarker_lite.task` from the current origin. No application path sends camera frames, landmarks, workout records, or routine records to a backend. Camera input uses `getUserMedia`; saved routines and reports use browser `localStorage`. Optional QA exports occur only after an explicit tester action.

This is a code-level audit, not a network-capture result from a deployed phone. A production HTTPS smoke test should still inspect the browser network panel before submission.
