# Squat Analyzer Calibration

All calibrated values are defined once in `lib/exercises/squatConfig.ts`. Angles are degrees, normalized distances use image height, velocities are units per second, and durations are milliseconds. These rules describe exercise form; they are not medical or injury-risk assessments.

## Current decision rules

| Metric | Threshold | State / scope | Purpose |
| --- | --- | --- | --- |
| Landmark visibility | ≥ 0.50 per analyzed side | Metric extraction | Reject a side whose shoulder, hip, knee, or ankle is not reliably visible. |
| Pose confidence | ≥ 0.58 | All analysis | Suspend analysis when measurement quality is low; never convert low confidence into bad form. |
| Tracking loss | 500 ms | Any active cycle | Reject the interrupted cycle and clear smoothing/baseline so return-to-frame starts cleanly. |
| Knee angle | ≥ 160 | STANDING baseline | Require clearly extended knees before establishing the hip-height baseline. |
| Hip angle | ≥ 150 | STANDING | Prevent a bent-over pose from being accepted as standing. |
| Knee angle | < 154 | STANDING → DESCENDING | Adds 6° hysteresis below standing, avoiding threshold jitter. |
| Hip angle | < 150 | STANDING → DESCENDING | Confirms hip flexion accompanies knee bending. |
| Hip drop | > 0.02 | STANDING → DESCENDING | Rejects small knee motion or camera jitter without body lowering. |
| Knee velocity | < -6°/s | STANDING → DESCENDING | Requires actual downward motion. |
| Descending sustain | 120 ms | STANDING → DESCENDING | Rejects one-frame spikes. |
| Knee angle | ≤ 120 | DESCENDING → BOTTOM | Establishes the deepest accepted counting boundary; quality scoring can still mark it shallow. |
| Hip angle | ≤ 130 | DESCENDING → BOTTOM | Requires coordinated hip flexion, not knee-only bending. |
| Hip drop | ≥ 0.08 | DESCENDING → BOTTOM | Requires meaningful vertical displacement from the standing baseline. |
| Bottom sustain | 160 ms | DESCENDING → BOTTOM | Confirms the boundary was genuinely crossed; an independent clock preserves bottom evidence observed during descent confirmation and clears it on tracking loss. |
| Knee angle | ≥ 128 | BOTTOM → ASCENDING | 8° hysteresis above the bottom threshold prevents bottom jitter. |
| Knee velocity | > 8°/s | BOTTOM → ASCENDING | Requires upward extension. |
| Hip velocity | < -0.01/s | BOTTOM → ASCENDING | Requires the hip to rise in image coordinates. |
| Ascending sustain | 120 ms | BOTTOM → ASCENDING | Rejects a short bounce at the bottom. |
| Hip drop | ≤ 0.055 | ASCENDING → STANDING | Requires return near the standing baseline. |
| Knee angle | ≥ 154 | ASCENDING → STANDING | Separate return boundary tolerates small standing-angle estimation bias; hip extension, height recovery, complete phase history and 200 ms dwell are still required. |
| Knee velocity | no finish threshold | ASCENDING → STANDING | Upward direction is established before ASCENDING. Small negative angle jitter must not cancel an otherwise stable finish. |
| Completion sustain | 200 ms | ASCENDING → STANDING | Confirms a stable finish before counting. |
| Incomplete return | standing + hip drop ≤ 0.05 for 180 ms | DESCENDING | Rejects a half movement that returns without reaching BOTTOM. |
| Minimum rep duration | 700 ms | Completed sequence | Rejects implausibly fast landmark jumps. |
| Rep debounce | 700 ms | Between completions | Prevents duplicate counts from a single cycle. |
| Maximum active phase | 6000 ms | DESCENDING / ASCENDING | Abandons stale partial cycles while still allowing a deliberately slow full squat. |
| EMA time constant | 120 ms | All continuous metrics | Smooths landmark noise without updating React on every frame. |
| Standing baseline alpha | 0.04 | STANDING | Slowly follows camera/body drift while preserving hip-drop reference. |
| Knee position | no count threshold | Observation/debug | Retained for calibration telemetry; it is not currently trusted for rep or form decisions. |
| Alignment geometry | body height > 0.35; visibility ≥ 0.65; shoulder/body ≥ 0.22; hip/body ≥ 0.10 | Alignment only | Omits knee alignment when the view is too side-on, small, or occluded. |
| Form feedback sustain | depth 300 ms; trunk/alignment 350 ms | Live feedback | Requires persistent evidence before showing or speaking a cue. |
| Feedback cooldown | 7000 ms per issue | Live feedback | Prevents repeated voice/screen spam. |

## State sequence

A repetition is counted only after `STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING`. A bottom hold cannot count, a return from DESCENDING is incomplete, and a confidence/visibility interruption suspends analysis and eventually clears the cycle.

## Explainable score

Each category produces a 0–100 score from measured rep extrema:

- Depth (40%): starts losing points above a 100° minimum knee angle and below 0.12 normalized hip drop.
- Trunk (35%): starts losing points above 38° maximum trunk lean.
- Alignment (25%): starts losing points above 0.08 deviation, but only when frontal-view geometry is reliable.

The final score is `round(sum(category score × category weight) / sum(available category weights))`. An unavailable category is `null` and is removed from both numerator and denominator. It is never replaced by 0 or 100. `GOOD` requires score ≥ 80 and no issue threshold crossing; otherwise a measured rep is `NEEDS IMPROVEMENT`. With low pose confidence there is no rep evaluation at all: the analyzer returns `UNABLE_TO_EVALUATE`.

## Landmark replay

In `debug=true`, landmark replay recording starts only after the tester taps **Record**. It samples at up to 10 FPS for at most 1200 frames, holds data in memory, and creates a JSON file only after **Export replay**. The fixture contains relative timestamps, pose landmarks, world landmarks, confidence, pose count, and visibility-gate state. It contains no video, image, audio, account identifier, or automatic upload path.

Landmark coordinates can still describe a person's movement. Treat exported fixtures as test data: obtain consent, keep them private, and delete them when calibration is complete.

## Scenario coverage

`lib/squatCalibration.test.ts` independently covers normal, shallow, very slow, reliable fast, incomplete half movement, bottom hold, small bend, walk-around, leave-frame, and return-to-frame behavior. `lib/squatReplay.test.ts` covers opt-in landmark-only capture, defensive copying, deterministic replay, and visibility suspension. Synthetic replay verifies state-machine semantics; it is not a substitute for physical-device calibration across body proportions, clothing, camera heights, and lighting.
