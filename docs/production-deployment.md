# Production Deployment Checklist

FormCheck is a Next.js application with browser-only camera, MediaPipe, speech, and local storage. It has no backend API and requires no runtime secrets.

## Environment

- [ ] Use Node.js 20.9 or newer.
- [ ] Set `SITE_URL` to the canonical HTTPS origin, for example `https://formcheck.example.com`.
- [ ] On Vercel, `VERCEL_PROJECT_PRODUCTION_URL` is used automatically when `SITE_URL` is absent.
- [ ] Do not prefix secrets with `NEXT_PUBLIC_`. FormCheck currently has no public or secret runtime environment variables.
- [ ] Keep `.env*` ignored; only `.env.example` belongs in source control.

`SITE_URL` affects metadata only. Camera, pose inference, routines, reports, and speech do not depend on it.

## Build and hosting

- [ ] Run `npm ci` on CI/deployment hosts.
- [ ] Run `npm run test`, `npm run lint`, and `npm run build` before release.
- [ ] Deploy with a Next.js-compatible Node or platform adapter. Do not assume a plain static-export host.
- [ ] Deploy at the origin root. The current local model/WASM URLs are root-relative and do not support a subpath `basePath` without configuration changes.
- [ ] Confirm the deployment includes every file under `public/models` and `public/mediapipe/wasm`.
- [ ] Confirm the host does not impose a per-file limit below 12 MB; the largest WASM asset is approximately 11 MB.
- [ ] Confirm CDN compression is enabled for JavaScript and WASM where supported.

## HTTPS and camera

- [ ] Serve the public site over HTTPS with a valid certificate.
- [ ] Open the deployed HTTPS origin directly on iPhone Safari and Android Chrome.
- [ ] Confirm no redirect lands on HTTP.
- [ ] Confirm `navigator.mediaDevices.getUserMedia` is available.
- [ ] Grant, deny, and re-enable camera permission.
- [ ] Confirm the response header includes `Permissions-Policy: camera=(self), microphone=(), geolocation=()`.
- [ ] If FormCheck is embedded, note that `X-Frame-Options: SAMEORIGIN` blocks third-party framing and the camera policy only permits the same origin.

Plain LAN URLs such as `http://192.168.x.x` are not valid mobile camera test environments. Browser localhost exemptions apply to the same device only.

## Pose assets

- [ ] `GET /models/pose_landmarker_lite.task` returns 200 and a non-empty binary response.
- [ ] `GET /mediapipe/wasm/vision_wasm_internal.wasm` returns 200 with `application/wasm`.
- [ ] The model and WASM responses include `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- [ ] Test both GPU and CPU fallback paths on representative devices.
- [ ] Confirm the first setup visit shows `PREPARING CAMERA`, then `PREPARING AI COACH` without an invented percentage.
- [ ] Throttle the network once and verify that a failed model request shows `POSE AI UNAVAILABLE` and `Retry Pose AI`.

The model fetch begins before WASM resolution completes, so these resources load in parallel. Asset names are not content-hashed; the cache is intentionally revalidating rather than immutable. If the model or runtime changes, deploy all corresponding model/WASM files together.

## Recovery

- [ ] Stop the camera track or revoke permission and confirm `Reload Camera` appears.
- [ ] Simulate a missing/corrupt pose model and confirm `Retry Pose AI` appears.
- [ ] Confirm an unexpected route render error shows the app error boundary rather than a white screen.
- [ ] Confirm the global fallback renders during a root-layout failure in a production build.
- [ ] Verify Retry does not duplicate camera tracks, inference loops, or speech queues.

## Metadata

- [ ] View source and confirm title, description, Open Graph, Twitter, viewport, theme colors, and apple-web-app metadata.
- [ ] Confirm `/icon`, `/apple-icon`, and `/opengraph-image` return PNG images.
- [ ] Validate the final public URL with an Open Graph debugger after `SITE_URL` and DNS are final.

## Privacy and production cleanup

- [ ] Search production source for frame upload, microphone capture, analytics, and remote inference endpoints; none should exist.
- [ ] Confirm `debug=true` is absent from normal navigation and only enables QA controls when deliberately added to a URL.
- [ ] Confirm no exported landmark replay fixture is bundled or uploaded.
- [ ] Confirm browser console has no application errors during setup, camera switching, workout, and report creation.
- [ ] Keep vendor-generated MediaPipe comments/log plumbing intact; they are part of the supplied runtime, not application debug code.

## Release smoke test

- [ ] Landing → Routine → Setup loads without console errors.
- [ ] Camera permission works on the public HTTPS URL.
- [ ] Body visibility reaches READY.
- [ ] One complete Squat is counted once.
- [ ] Shallow feedback appears only from reliable measurements.
- [ ] Mute cancels queued speech.
- [ ] Set completion, rest, next set, and report still work.
- [ ] Refreshing a locally stored report preserves it on the same origin.
- [ ] Run the separate [mobile QA checklist](mobile-qa.md) on physical iPhone and Android devices.

## Current deployment risks

- First pose use downloads roughly 5.5 MB of model data plus one approximately 10–11 MB WASM runtime variant before browser/CDN compression and caching.
- GPU support and first-load time vary by browser and device; CPU fallback is slower.
- `SpeechSynthesis`, background audio mixing, camera resumption, and screen-lock behavior remain controlled by the mobile browser/OS.
- Routines and reports are origin-bound `localStorage`; changing domains or subdomains does not migrate records.
- A strict Content Security Policy is not enabled yet. Any future CSP must be tested against MediaPipe's WASM initialization before enforcement.
