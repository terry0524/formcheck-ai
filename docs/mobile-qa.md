# FormCheck Mobile Device QA

This checklist is for physical iPhone Safari and Android Chrome testing. A desktop responsive viewport is not a substitute for this procedure.

## Test identity

Complete this block for every run.

| Field | Value |
| --- | --- |
| DEVICE |  |
| OS |  |
| BROWSER |  |
| CAMERA | Front / Rear |
| ORIENTATION | Portrait / Landscape / Both |
| MUSIC APP | None / Apple Music / Spotify / YouTube Music / Other |
| SESSION LENGTH |  |
| TESTER |  |
| DATE / BUILD |  |
| START BATTERY / END BATTERY |  |
| START TEMPERATURE / END TEMPERATURE | Subjective: normal / warm / hot |

## Open Mobile QA Mode

Camera APIs require HTTPS or the same device's `localhost`. A phone opening a computer's plain `http://192.168.x.x` address is not a secure context. Use an HTTPS preview deployment or an approved HTTPS tunnel to the local dev server.

Start from setup so permission and body framing are included:

```text
/workout/setup?routine=squat-two-set-test&debug=true
```

The setup page preserves `debug=true` when the workout starts. For a direct workout check:

```text
/workout/squat?routine=squat-two-set-test&mode=hybrid&frequency=minimal&debug=true
```

`debug=true` reveals two QA-only controls:

- `Landmarks` toggles the indexed pose overlay.
- `Mobile QA` can be collapsed and exports a JSON measurement file.
- `Record` begins an explicit landmark-only Squat replay capture; `Export replay` downloads it. Capture never starts automatically.

The performance export records five-second performance/state samples and visibility, orientation, and camera events. It does not contain video frames, images, audio, or landmark coordinates. The separate replay export contains motion coordinates and visibility state but no camera pixels; treat it as sensitive test data and obtain consent. Do not screen-record participants unless they separately consent.

## Core checklist

- [ ] camera permission
- [ ] body ready
- [ ] squat rep count
- [ ] shallow squat detection
- [ ] correction feedback
- [ ] voice
- [ ] screen-only
- [ ] immediate mute
- [ ] music continues
- [ ] rest timer
- [ ] next set
- [ ] orientation change
- [ ] 20-minute stability
- [ ] no console errors
- [ ] acceptable temperature/battery behavior

## Camera and orientation

1. Test a clean first permission grant. Confirm only camera permission is requested; microphone permission must not appear.
2. Deny permission once. Confirm `CAMERA UNAVAILABLE`, the Korean permission explanation, and `Camera Retry` appear.
3. Re-enable permission in browser settings and retry without reloading the whole app.
4. Confirm the front-camera preview behaves like a mirror and landmarks remain attached to the same visible joints.
5. Switch to the rear camera and back. Record the requested and actual facing modes shown in the panel. Some devices may ignore an ideal `facingMode`; record that as a device result.
6. Test portrait → landscape → portrait in READY, EXERCISE, and REST. Confirm count, form cue, exercise, set, and Mute remain visible and tappable.
7. With indexed landmarks enabled, confirm the overlay remains on the body after each rotation and after both camera switches. Check left/right motion visually; mirrored video and overlay must move together.
8. Open another camera app, then return to FormCheck. Confirm an interruption produces a clear error or a live stream—not a frozen preview marked active.

## Voice with background music

Repeat the short routine with Apple Music, Spotify, or YouTube Music already playing.

1. Use Hybrid + Minimal. Confirm music continues when FormCheck speaks.
2. Trigger one correction and confirm it is short and does not repeat within the cooldown window.
3. Tap Mute during a spoken cue. Confirm the cue stops immediately and no queued FormCheck cue plays afterward.
4. Unmute and confirm the next eligible cue plays once.
5. Repeat in Screen Only and confirm FormCheck produces no speech unless `Speaker on` is deliberately tapped.
6. Repeat in Voice Only and confirm essential on-screen state remains available if speech is inaudible.

Expected limitation: a browser cannot control iOS `AVAudioSession` or Android native audio focus. Music may mix, duck, or briefly pause according to the OS, browser, output route, and music app. FormCheck does not start, stop, pause, lower, or inspect another app's music.

## Twenty-minute stability run

Keep the QA panel open or collapsed; collection continues while collapsed. Do not enable the indexed landmark overlay for the full test unless measuring its extra rendering cost.

| Time | Camera FPS | Pose FPS | Render FPS | Inference ms | Confidence | JS heap | Stream | Workout state | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |
| 00:00 |  |  |  |  |  |  |  |  |  |
| 05:00 |  |  |  |  |  |  |  |  |  |
| 10:00 |  |  |  |  |  |  |  |  |  |
| 15:00 |  |  |  |  |  |  |  |  |  |
| 20:00 |  |  |  |  |  |  |  |  |  |

During the run:

- Complete, rest, pause/resume, skip, and return to normal exercise states several times.
- Rotate at approximately 5 and 15 minutes.
- Switch camera at approximately 10 minutes, then return to the preferred camera.
- Background the browser during REST. Return and verify the absolute rest deadline and next state are correct.
- Background or lock briefly during EXERCISE. Return and record whether the OS suspended the camera or speech. Confirm no phantom rep was counted.
- Export JSON at the end and attach it to the test record. Safari may report JS heap as `N/A`; this is an API limitation, not zero memory use.

Investigate the run when any of these occur:

- Camera or pose FPS stays below 70% of its first stable five-minute baseline.
- Inference time stays more than 50% above its baseline for three consecutive samples.
- The stream is `muted` or `ended` after the page is foregrounded and does not recover via retry.
- Speech repeats, overlaps, or continues after Mute.
- Rep/set state changes while tracking is unavailable or the workout is paused.
- Overlay/body alignment changes after rotation or camera switching.
- The phone becomes uncomfortably hot, the browser reloads, or battery drain is unacceptable for the device class.

## Console inspection

- iPhone/iPad: connect to a Mac and use Safari's Develop menu for the device tab.
- Android: enable USB debugging and inspect the Chrome tab with `chrome://inspect` on a computer.
- Save relevant error text with timestamp. Do not attach camera screenshots containing a participant unless consented.

## Result

### 광각 렌즈 확인 — 실제 기기 테스트 필요

- [ ] 카메라 권한 허용 후, 브라우저가 전면/후면 초광각 렌즈를 명확한 이름으로 제공하면 해당 방향에서만 `광각` 버튼이 표시된다.
- [ ] 이름이 없거나 렌즈 종류를 확인할 수 없는 기기는 기존 전면/후면 전환만 제공한다. `Wide Angle`을 초광각으로 간주하지 않는다.
- [ ] 광각 선택 → 전신 확인 → 운동 시작 후에도 선택한 렌즈가 유지된다. 전면은 미러, 후면은 비미러다.
- [ ] 일반 렌즈가 별도로 공개된 기기는 광각 버튼을 다시 눌러 복귀할 수 있다.
- [ ] 렌즈 전환 후 READY와 관절 표시가 다시 맞으며, 화면 중앙에서 정상/얕은 스쿼트를 각각 5회 검증한다. 화면 가장자리 왜곡에 따른 오판도 기록한다.
- [ ] 제공되지 않는 렌즈 요청은 기본 카메라로 복구되고 안내가 표시된다. 권한 거부·카메라 사용 중 오류는 숨기지 않는다.

선택은 현재 브라우저 문서의 메모리에만 유지하며, 새로고침 시 초기화된다. 화면을 디지털 축소하거나 0.5배를 흉내 내지 않는다. 광각 렌즈를 사용해도 전신 확인 기준은 완화하지 않는다.

| Outcome | Value |
| --- | --- |
| PASS / FAIL / BLOCKED |  |
| Blocking issue |  |
| Exported QA JSON filename |  |
| Console log reference |  |
| Follow-up owner |  |
