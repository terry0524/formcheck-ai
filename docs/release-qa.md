# Public QA Limits

This is a disclosure summary, not a completed physical-device release record. Original device reports, actual landmark replay and private QA exports remain outside the public package.

- Automated tests mainly use synthetic landmarks/metrics and state-machine scenarios.
- iPhone Safari rep-count issues were reported. A code/replay correction exists, but the physical retest remains pending.
- Hybrid voice audibility was reported as an issue; device playback/retest is unresolved.
- No completed cross-device accuracy, 20-minute stability, heat/battery, camera-switch, or audio-mixing validation is claimed.
- MediaPipe perception and deterministic exercise decisions are separate layers. Synthetic tests cannot establish real-person exercise accuracy.
- Public code retains existing functionality. No new exercise/model/backend/production guarantee is added in this career package.
