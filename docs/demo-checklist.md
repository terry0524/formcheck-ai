# FormCheck competition demo checklist

_Preflight and recovery guide for a 45–60 second Wanted AI Championship demonstration._

---

## 📋 Demo route

Use the labeled `Squat Demo`. It runs actual camera input and MediaPipe inference with two sets of five Squats and a five-second rest. It does not inject landmarks, rep events, scores, or report data.

```text
/routines/squat-two-set-test
```

Direct setup recovery route:

```text
/workout/setup?routine=squat-two-set-test
```

Use Hybrid + Minimal for the judged demo. Keep `debug=true` off unless a judge asks to see runtime metrics or landmarks.

## ✅ Preflight

- [ ] HTTPS
- [ ] camera permission
- [ ] camera orientation
- [ ] full body visible
- [ ] one person only
- [ ] READY
- [ ] squat count
- [ ] shallow feedback
- [ ] voice
- [ ] mute
- [ ] rest transition
- [ ] report
- [ ] no console error

Also confirm:

- [ ] MediaPipe model and WASM requests return `200`
- [ ] Front camera preview and overlay are mirrored together
- [ ] The presenter can complete the full 2 × 5 routine before recording
- [ ] The room has enough distance, even lighting, and no person crossing the frame
- [ ] The report list is cleared or the presenter knows which newly measured report to open

## 🎯 Rehearsal sequence

1. Open the demo routine detail and explain the problem
2. Select Start Routine, allow camera access, and wait for READY
3. Choose Hybrid + Minimal, then start without touching the phone again
4. Perform two normal Squats and show rep count plus GOOD
5. Perform one accepted but shallow Squat and wait for CHECK FORM plus the depth cue
6. Correct the next Squat and show GOOD
7. Complete the fifth rep and show Set Complete, five-second Rest, and Next Set
8. For a full report, finish Set 2 or use a separately rehearsed full take captured from the same real-inference session

> ⚠️ **Timing note:** A complete 2 × 5 camera session plus setup can exceed 60 seconds. Do not skip to the report and describe it as the same live run. If the submission video is tightly edited, preserve chronological continuity and use only the report produced by that recorded session.

## 🎬 45–60 second shot plan

| Scene | Time | Picture | On-screen or narration message |
| --- | ---: | --- | --- |
| 1. Problem | 5 sec | Routine Explore and Squat Demo | “Routine apps tell you what to do. But they can’t see how you do it.” |
| 2. Setup | 8 sec | Start Routine → camera → full body → READY | “Choose a routine. Put your phone down. Just train.” |
| 3. Normal reps | 10 sec | Two complete Squats | Real `REP 1`, `REP 2`, and `GOOD` |
| 4. Form error | 8 sec | One accepted but intentionally shallow Squat | Real `CHECK FORM`, depth message, and Voice Coach cue |
| 5. Correction | 5 sec | Next Squat reaches the calibrated depth | Real `GOOD` after the measured rep |
| 6. Workout Engine | 6 sec | Finish Set 1 → Rest → Next Set | Automated transition with no injected state |
| 7. Report | 8 sec | Report from the completed recorded session | Real duration, completion, reps, and measured score only |

Total target: approximately 50 seconds. Record the complete 2 × 5 session first, then use chronological jump cuts to compress the remaining Set 2 reps. Do not combine a report from a different run or alter the displayed values.

## 🔧 Recovery procedures

| Failure | Immediate recovery | If it persists |
| --- | --- | --- |
| Pose initialization failure | Tap `Retry Pose AI` | Reload the setup route and verify local model/WASM responses |
| Camera permission denied | Allow camera in browser site settings | Close other camera apps, reload, and reselect the camera |
| Camera unavailable or frozen | Tap `Reload Camera` | Return to setup, close the tab, and reopen the HTTPS URL |
| READY does not appear | Step back, show both ankles, improve light, keep one person in frame | Switch camera once, then return to the rehearsed camera |
| Rep does not count | Return to a clear standing pose, pause briefly, then perform a full controlled cycle | Reframe full body; do not manually claim a count |
| Repeated or queued speech | Tap Mute to cancel FormCheck speech | Continue in Screen Only and disclose the browser audio limitation |
| Rest or next set seems stuck | Confirm workout is not paused | Use Resume; if state is corrupted, restart the demo routine |
| Report unavailable | Confirm the session reached completion and `localStorage` is available | Repeat the routine; never substitute invented performance data |
| Console error | Capture the exact message and reload once | Use the rehearsed backup device/build and disclose the failed environment |

## 📍 Final recording record

| Field | Value |
| --- | --- |
| Device |  |
| OS / browser |  |
| Deployment URL |  |
| Camera | Front / Rear |
| Orientation | Portrait / Landscape |
| Voice mode | Hybrid + Minimal |
| Full run completed | Yes / No |
| Report ID |  |
| Console errors |  |
| Tester / date |  |
