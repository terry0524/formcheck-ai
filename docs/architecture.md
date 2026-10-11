# FormCheck AI architecture

_Canonical Mermaid source for the on-device pose and workout decision pipeline._

---

## 🏗️ Processing pipeline

All camera perception, exercise decisions, feedback, and report construction execute inside the browser. The current application has no workout backend.

```mermaid
flowchart TB
    accTitle: FormCheck On-Device AI Pipeline
    accDescr: Camera frames are processed on device into pose landmarks, gated for visibility, analyzed with exercise state machines, and converted into screen or voice feedback plus a measured workout report.

    subgraph on_device ["🔐 On-device browser boundary"]
        camera([Camera frame]) --> pose_landmarker[MediaPipe Pose Landmarker]
        pose_landmarker --> pose_landmarks[33 pose landmarks]
        pose_landmarks --> visibility_gate{Body visibility gate}
        visibility_gate -->|One full body| exercise_analyzer[Exercise analyzer]
        visibility_gate -->|Unreliable| suspend_analysis[Pause analysis]
        exercise_analyzer --> workout_state[Workout state machine]
        exercise_analyzer --> form_evaluation[Form evaluation]
        workout_state --> feedback_engine[Feedback engine]
        form_evaluation --> feedback_engine
        feedback_engine --> screen_feedback[Screen feedback]
        feedback_engine --> voice_feedback[Voice feedback]
        workout_state --> workout_report[(Workout report)]
        form_evaluation --> workout_report
    end

    classDef perception fill:#dbeafe,stroke:#2563eb,stroke-width:2px,color:#1e3a5f
    classDef decision fill:#fef9c3,stroke:#ca8a04,stroke-width:2px,color:#713f12
    classDef output fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
    classDef blocked fill:#f3f4f6,stroke:#6b7280,stroke-width:2px,color:#1f2937

    class camera,pose_landmarker,pose_landmarks perception
    class visibility_gate,exercise_analyzer,workout_state,form_evaluation,feedback_engine decision
    class screen_feedback,voice_feedback,workout_report output
    class suspend_analysis blocked
```

## ⚙️ Engineering principle

> “We use AI where perception is needed and deterministic rules where consistent exercise decisions are needed.”

MediaPipe supplies perception: 33 image/world landmarks from the camera frame. FormCheck then uses explicit confidence gates, temporal smoothing, hysteresis, minimum state durations, exercise state machines, scoring rules, and feedback cooldowns. A low-confidence observation suspends evaluation; it is not converted into bad form.

## 🔐 Data boundary

- Camera pixels are read by the local `HTMLVideoElement` and discarded after inference
- Model and WASM assets are served from the same deployment origin
- Routine and workout summaries remain in browser `localStorage`
- Landmark replay exists only in QA mode, begins only after Record, and downloads only after Export
- No login, remote inference, analytics SDK, video upload, or cloud synchronization exists in this version
