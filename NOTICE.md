# Third-party Assets

FormCheck uses Google MediaPipe PoseLandmarker, a pretrained perception model, and @mediapipe/tasks-vision. These are third-party technology, not a FormCheck-trained model.

`npm ci` installs the locked runtime dependency. `npm run setup:pose` copies its WASM runtime locally and downloads the Lite model from the official Google model host. The script verifies hashes against the existing project asset-integrity test. Downloaded model/WASM assets are ignored and not committed.

Publisher references: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js and https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker#models.

The installed `@mediapipe/tasks-vision` 1.0.1 package declares Apache-2.0. The official [BlazePose GHUM 3D model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf), linked by the Pose Landmarker guide, lists Apache License 2.0 on page 2. Preserve the publisher attribution and [Apache 2.0 license terms](https://www.apache.org/licenses/LICENSE-2.0) when distributing a hosted build. This document does not claim authorship or assign a new license to third-party assets. Next.js, React, shadcn/Radix and other dependencies remain governed by their own licenses.
