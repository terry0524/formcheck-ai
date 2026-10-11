"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, CameraOff, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { evaluateBodyVisibility } from "@/lib/bodyVisibility";
import { BrowserPoseEngine } from "@/lib/poseEngine";
import { clearPoseOverlay, renderPoseOverlay } from "@/lib/poseRenderer";
import type { BodyVisibilityResult, CameraQaMetrics, PoseFrame, PoseRuntimeMetrics } from "@/types/pose";

type CameraState = "requesting" | "active" | "error";
type ModelState = "loading" | "ready" | "error";
type FacingMode = "user" | "environment";
// Soft navigation keeps the chosen lens; no device identifiers are persisted.
let cameraPreference: { mode: FacingMode; deviceId?: string } = { mode: "user" };

export function findUltraWideCamera(devices: Pick<MediaDeviceInfo, "kind" | "label" | "deviceId">[], mode: FacingMode) {
  return devices.find((device) => device.kind === "videoinput" && Boolean(device.deviceId)
    && /ultra[\s-]*wide|초광각|超広角/i.test(device.label)
    && (mode === "user" ? /front|전면|前面/i : /back|rear|후면|背面/i).test(device.label));
}

const INITIAL_VISIBILITY: BodyVisibilityResult = {
  status: "loading",
  message: "AI 자세 분석기를 준비하고 있습니다.",
  confidence: 0,
  missingParts: [],
};

const STATUS_LABEL = {
  loading: "준비 중",
  "no-body": "몸을 찾는 중",
  "multiple-people": "한 명만 서주세요",
  "too-close": "너무 가까워요",
  "body-part-missing": "전신을 맞춰주세요",
  ready: "준비 완료",
  error: "오류",
} as const;

export function cameraErrorMessage(error: unknown) {
  if (!(error instanceof DOMException)) return "카메라를 시작하지 못했습니다. 다시 시도해 주세요.";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "카메라 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.";
  }
  if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
    return "사용 가능한 카메라를 찾지 못했습니다.";
  }
  if (error.name === "NotReadableError" || error.name === "AbortError") {
    return "다른 앱이 카메라를 사용 중입니다. 다른 앱을 닫고 다시 시도해 주세요.";
  }
  return "카메라를 시작하지 못했습니다. 다시 시도해 주세요.";
}

export function cameraPrerequisiteMessage(secureContext: boolean, hasGetUserMedia: boolean) {
  if (!secureContext) return "카메라는 HTTPS 보안 연결에서만 사용할 수 있습니다. HTTPS 주소로 다시 접속해 주세요.";
  if (!hasGetUserMedia) return "이 브라우저에서는 카메라를 사용할 수 없습니다.";
  return null;
}

interface CameraPreviewProps {
  onReadinessChange?: (ready: boolean) => void;
  onPoseFrame?: (frame: PoseFrame | null, visibility: BodyVisibilityResult, timestamp: number) => void;
  variant?: "setup" | "workout";
  children?: ReactNode;
  qaMode?: boolean;
  onQaMetrics?: (metrics: CameraQaMetrics) => void;
}

export function CameraPreview({
  onReadinessChange,
  onPoseFrame,
  variant = "setup",
  children,
  qaMode = false,
  onQaMetrics,
}: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<BrowserPoseEngine | null>(null);
  const latestFrameRef = useRef<PoseFrame | null>(null);
  const latestVisibilityRef = useRef<BodyVisibilityResult>(INITIAL_VISIBILITY);
  const lastVideoTimeRef = useRef(-1);
  const lastInferenceAtRef = useRef(0);
  const lastUiCommitRef = useRef(0);
  const fpsWindowRef = useRef({ startedAt: 0, frames: 0, fps: 0 });
  const cameraFpsWindowRef = useRef({ startedAt: 0, frames: 0, fps: 0 });
  const renderFpsWindowRef = useRef({ startedAt: 0, frames: 0, fps: 0 });
  const readinessRef = useRef(false);
  const cameraRequestRef = useRef(0);

  const [cameraState, setCameraState] = useState<CameraState>("requesting");
  const [modelState, setModelState] = useState<ModelState>("loading");
  const [modelAttempt, setModelAttempt] = useState(0);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [lensNotice, setLensNotice] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [modelError, setModelError] = useState("");
  const [visibility, setVisibility] = useState<BodyVisibilityResult>(INITIAL_VISIBILITY);
  const [metrics, setMetrics] = useState<PoseRuntimeMetrics>({ fps: 0, inferenceMs: 0, delegate: null });
  const [debug, setDebug] = useState(qaMode);
  const [targetFps, setTargetFps] = useState(20);

  const publishReadiness = useCallback((ready: boolean) => {
    if (readinessRef.current === ready) return;
    readinessRef.current = ready;
    onReadinessChange?.(ready);
  }, [onReadinessChange]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    latestFrameRef.current = null;
    clearPoseOverlay(canvasRef.current);
    publishReadiness(false);
  }, [publishReadiness]);

  const startCamera = useCallback(async (mode: FacingMode, deviceId?: string) => {
    const requestId = ++cameraRequestRef.current;
    setCameraState("requesting");
    setCameraError("");
    setVisibility(INITIAL_VISIBILITY);
    latestVisibilityRef.current = INITIAL_VISIBILITY;
    publishReadiness(false);
    latestFrameRef.current = null;
    clearPoseOverlay(canvasRef.current);
    setLensNotice("");
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });

    const prerequisiteError = cameraPrerequisiteMessage(window.isSecureContext, Boolean(navigator.mediaDevices?.getUserMedia));
    if (prerequisiteError) {
      setCameraError(prerequisiteError);
      setCameraState("error");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: mode } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
      };
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        if (!deviceId || !(error instanceof DOMException) || !["OverconstrainedError", "NotFoundError"].includes(error.name)) throw error;
        if (requestId !== cameraRequestRef.current) return;
        stream = await navigator.mediaDevices.getUserMedia({ ...constraints, video: { ...(constraints.video as MediaTrackConstraints), deviceId: undefined, facingMode: { ideal: mode } } });
        deviceId = undefined;
        setLensNotice("광각을 사용할 수 없어 기본 카메라로 돌아왔습니다.");
      }
      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      setActiveDeviceId(videoTrack?.getSettings().deviceId ?? "");
      cameraPreference = { mode, deviceId };
      if (videoTrack) {
        videoTrack.onended = () => {
          if (requestId !== cameraRequestRef.current || streamRef.current !== stream) return;
          setCameraError("카메라 스트림이 중단되었습니다. 화면을 다시 활성화한 뒤 재시도해 주세요.");
          setCameraState("error");
          publishReadiness(false);
        };
      }
      const video = videoRef.current;
      if (!video) throw new Error("카메라 확인 is unavailable.");
      video.srcObject = stream;
      await video.play();
      if (requestId !== cameraRequestRef.current) return;
      setCameraState("active");
      // Lens names are usable only after permission. Enumeration failure must
      // not interrupt a working camera or guess a lens from array ordering.
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (requestId === cameraRequestRef.current) setCameraDevices(devices);
      } catch { /* Keep the existing front/rear control. */ }
    } catch (error) {
      if (requestId !== cameraRequestRef.current) return;
      stopCamera();
      setCameraError(cameraErrorMessage(error));
      setCameraState("error");
    }
  }, [publishReadiness, stopCamera]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setFacingMode(cameraPreference.mode);
        void startCamera(cameraPreference.mode, cameraPreference.deviceId);
      }
    });
    return () => {
      cancelled = true;
      cameraRequestRef.current += 1;
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    let cancelled = false;
    const engine = new BrowserPoseEngine();
    engineRef.current = engine;

    void engine.initialize().then(() => {
      if (cancelled) return;
      setMetrics((current) => ({ ...current, delegate: engine.delegate }));
      setModelState("ready");
    }).catch(() => {
      if (cancelled) return;
      setModelError("AI 자세 분석기를 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해 주세요.");
      setModelState("error");
      publishReadiness(false);
    });

    return () => {
      cancelled = true;
      engine.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [modelAttempt, publishReadiness]);

  useEffect(() => {
    if (!qaMode || cameraState !== "active") return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let animationFrame = 0;
    let videoFrame = 0;
    let previousVideoTime = -1;
    cameraFpsWindowRef.current = { startedAt: performance.now(), frames: 0, fps: 0 };

    const recordFrame = (now: number) => {
      const windowState = cameraFpsWindowRef.current;
      windowState.frames += 1;
      const elapsed = now - windowState.startedAt;
      if (elapsed >= 1000) {
        windowState.fps = windowState.frames * 1000 / elapsed;
        windowState.frames = 0;
        windowState.startedAt = now;
      }
    };

    const frameApi = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    };
    if (typeof frameApi.requestVideoFrameCallback === "function") {
      const onVideoFrame: VideoFrameRequestCallback = (now) => {
        if (cancelled) return;
        recordFrame(now);
        videoFrame = frameApi.requestVideoFrameCallback!(onVideoFrame);
      };
      videoFrame = frameApi.requestVideoFrameCallback(onVideoFrame);
      return () => {
        cancelled = true;
        frameApi.cancelVideoFrameCallback?.(videoFrame);
      };
    }

    const fallback = (now: number) => {
      if (cancelled) return;
      if (video.currentTime !== previousVideoTime) {
        previousVideoTime = video.currentTime;
        recordFrame(now);
      }
      animationFrame = requestAnimationFrame(fallback);
    };
    animationFrame = requestAnimationFrame(fallback);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [cameraState, qaMode]);

  useEffect(() => {
    if (cameraState !== "active" || modelState !== "ready") return;
    let animationFrame = 0;
    let cancelled = false;
    const interval = 1000 / targetFps;
    lastInferenceAtRef.current = 0;
    lastVideoTimeRef.current = -1;
    fpsWindowRef.current = { startedAt: performance.now(), frames: 0, fps: 0 };

    const infer = (now: number) => {
      if (cancelled) return;
      animationFrame = requestAnimationFrame(infer);
      const video = videoRef.current;
      const engine = engineRef.current;
      if (!video || !engine || now - lastInferenceAtRef.current < interval || video.currentTime === lastVideoTimeRef.current) return;

      lastInferenceAtRef.current = now;
      lastVideoTimeRef.current = video.currentTime;
      try {
        const frame = engine.estimate(video, now);
        const bodyVisibility = evaluateBodyVisibility(frame);
        const previousStatus = latestVisibilityRef.current.status;
        latestFrameRef.current = frame;
        latestVisibilityRef.current = bodyVisibility;
        onPoseFrame?.(frame, bodyVisibility, now);

        const fpsWindow = fpsWindowRef.current;
        fpsWindow.frames += 1;
        const elapsed = now - fpsWindow.startedAt;
        if (elapsed >= 1000) {
          fpsWindow.fps = (fpsWindow.frames * 1000) / elapsed;
          fpsWindow.frames = 0;
          fpsWindow.startedAt = now;

          if (qaMode) {
            const track = streamRef.current?.getVideoTracks()[0];
            const settings = track?.getSettings();
            const viewport = window.visualViewport;
            onQaMetrics?.({
              sampledAt: Date.now(),
              cameraFps: cameraFpsWindowRef.current.fps,
              poseFps: fpsWindow.fps,
              renderFps: renderFpsWindowRef.current.fps,
              inferenceMs: frame?.inferenceMs ?? 0,
              confidence: bodyVisibility.confidence,
              delegate: engine.delegate,
              cameraWidth: video.videoWidth || settings?.width || 0,
              cameraHeight: video.videoHeight || settings?.height || 0,
              requestedFacingMode: facingMode,
              actualFacingMode: settings?.facingMode ?? "unknown",
              streamState: !track ? "unavailable" : track.readyState === "ended" ? "ended" : track.muted ? "muted" : "active",
              viewportWidth: Math.round(viewport?.width ?? window.innerWidth),
              viewportHeight: Math.round(viewport?.height ?? window.innerHeight),
              orientation: window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape",
              pageVisibility: document.visibilityState,
            });
          }
        }

        const statusChanged = bodyVisibility.status !== previousStatus;
        if (statusChanged || now - lastUiCommitRef.current >= 250) {
          lastUiCommitRef.current = now;
          setVisibility(bodyVisibility);
          setMetrics({ fps: fpsWindow.fps, inferenceMs: frame?.inferenceMs ?? 0, delegate: engine.delegate });
          publishReadiness(bodyVisibility.status === "ready");
        }
      } catch {
        setModelError("자세 감지 중 오류가 발생했습니다. 분석기를 다시 시작해 주세요.");
        setModelState("error");
        publishReadiness(false);
      }
    };

    animationFrame = requestAnimationFrame(infer);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [cameraState, facingMode, modelState, onPoseFrame, onQaMetrics, publishReadiness, qaMode, targetFps]);

  useEffect(() => {
    if (cameraState !== "active") return;
    let animationFrame = 0;
    let cancelled = false;
    renderFpsWindowRef.current = { startedAt: performance.now(), frames: 0, fps: 0 };
    const render = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        renderPoseOverlay(canvas, video, latestFrameRef.current, latestVisibilityRef.current, debug, facingMode === "user");
      }
      if (qaMode) {
        const windowState = renderFpsWindowRef.current;
        const now = performance.now();
        if (windowState.startedAt === 0) windowState.startedAt = now;
        windowState.frames += 1;
        const elapsed = now - windowState.startedAt;
        if (elapsed >= 1000) {
          windowState.fps = windowState.frames * 1000 / elapsed;
          windowState.frames = 0;
          windowState.startedAt = now;
        }
      }
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, [cameraState, debug, facingMode, qaMode]);

  async function flipCamera() {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    await startCamera(nextMode);
  }

  const displayVisibility = modelState === "ready" ? visibility : INITIAL_VISIBILITY;
  const isReady = displayVisibility.status === "ready";
  const loadingPose = cameraState === "active" && modelState === "loading";
  const ultraWide = findUltraWideCamera(cameraDevices, facingMode);
  const usingUltraWide = Boolean(ultraWide && ultraWide.deviceId === activeDeviceId);
  const standardCamera = cameraDevices.find((device) => device.kind === "videoinput" && device.deviceId
    && !/ultra|초광각|超広角|tele|dual|triple/i.test(device.label)
    && (facingMode === "user" ? /front|전면|前面/i : /back|rear|후면|背面/i).test(device.label));

  return (
    <div className={variant === "workout" ? "h-full" : undefined}>
      <div className={variant === "workout" ? "relative h-full min-h-[100svh] overflow-hidden bg-[#111]" : "relative aspect-[4/5] overflow-hidden bg-[#111] sm:aspect-[16/10]"}>
        <video ref={videoRef} autoPlay muted playsInline className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`} />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />

        {cameraState === "active" && modelState === "ready" && (
          <>
            {variant === "setup" && <div className="pointer-events-none absolute inset-[7%_10%] border border-dashed border-white/35" aria-hidden="true" />}
            <div className={`absolute right-4 z-30 flex gap-2 ${variant === "workout" ? "top-16 sm:right-7 sm:top-20" : "top-4"}`}>
              {ultraWide && <Button type="button" variant="outline" size="sm" className="min-h-11 border-white/30 bg-black/70 text-white" aria-pressed={usingUltraWide} disabled={usingUltraWide && !standardCamera} onClick={() => startCamera(facingMode, usingUltraWide ? standardCamera?.deviceId : ultraWide.deviceId)}>{usingUltraWide ? "광각 사용 중" : "광각"}</Button>}
              <Button type="button" variant="outline" size="sm" onClick={flipCamera} className="size-11 border-white/30 bg-black/70 px-0 text-white" aria-label="카메라 전환"><RefreshCw className="size-5" /></Button>
            </div>
            {lensNotice && <p role="status" className="absolute inset-x-4 top-32 z-30 bg-black/80 p-2 text-xs font-bold text-white">{lensNotice}</p>}
            {variant === "setup" && <div className="pointer-events-none absolute inset-x-4 bottom-4 bg-black/78 px-4 py-3 text-white">
              <div className="flex items-center gap-3">
                <span className={`size-3 shrink-0 rounded-full ${isReady ? "bg-[var(--accent)]" : "bg-[#ffb743]"}`} />
                <div><p className="text-sm font-black tracking-[0.12em]">{STATUS_LABEL[displayVisibility.status]}</p><p className="mt-0.5 text-sm text-white/75">{displayVisibility.message}</p></div>
              </div>
            </div>}
            {children}
            {variant === "workout" && (
              <>
                {qaMode && <label className="absolute right-4 top-28 z-30 flex items-center gap-3 bg-black/75 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white sm:right-7 sm:top-32">
                  Landmarks <Switch checked={debug} onCheckedChange={setDebug} aria-label="Toggle pose landmark overlay" />
                </label>}
              </>
            )}
          </>
        )}

        {(cameraState !== "active" || modelState !== "ready") && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[#111]/94 px-6 text-center text-white" role={cameraState === "error" || modelState === "error" ? "alert" : "status"} aria-live="polite">
            {cameraState === "error" ? <CameraOff className="size-10" /> : modelState === "error" ? <TriangleAlert className="size-10" /> : <Camera className="size-10" />}
            <div>
              <p className="text-xl font-black">{cameraState === "error" ? "카메라를 사용할 수 없습니다" : modelState === "error" ? "자세 분석을 시작하지 못했습니다" : loadingPose ? "자세 분석 준비 중" : "카메라 준비 중"}</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/65">{cameraState === "error" ? cameraError : modelState === "error" ? modelError : loadingPose ? "기기에서 자세 분석 모델을 준비하고 있습니다." : "카메라를 준비하고 있습니다."}</p>
            </div>
            {cameraState === "error" && <Button variant="accent" onClick={() => startCamera(facingMode, cameraPreference.deviceId)}><RotateCcw className="size-4" /> 카메라 다시 시작</Button>}
            {cameraState === "active" && modelState === "error" && <Button variant="accent" onClick={() => { setModelState("loading"); setModelError(""); setModelAttempt((attempt) => attempt + 1); }}><RotateCcw className="size-4" /> 자세 분석 재시도</Button>}
          </div>
        )}
      </div>

      {variant === "setup" && <div className="border border-t-0 border-[var(--line)] bg-white">
        <div className="flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-[0.1em]">
          <span>전신 확인</span>
          <span className={`flex items-center gap-2 ${isReady ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}>
            <span className={`size-2 rounded-full ${isReady ? "bg-[var(--accent-strong)]" : cameraState === "error" || modelState === "error" ? "bg-red-600" : "bg-[#8b8b82]"}`} />
            {cameraState === "error" || modelState === "error" ? "Unavailable" : STATUS_LABEL[displayVisibility.status]}
          </span>
        </div>
        {qaMode && <div className="grid gap-4 border-t border-[var(--line)] px-4 py-4 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-[0.1em]">Debug mode<Switch checked={debug} onCheckedChange={setDebug} aria-label="Toggle pose debug mode" /></label>
          <label className="flex items-center justify-between gap-4 text-xs font-black uppercase tracking-[0.1em]">
            Pose rate
            <select value={targetFps} onChange={(event) => setTargetFps(Number(event.target.value))} className="h-10 border border-[var(--ink)] bg-white px-3 text-xs font-black" aria-label="Pose inference rate">
              <option value={10}>10 FPS</option><option value={20}>20 FPS</option><option value={30}>30 FPS</option>
            </select>
          </label>
        </div>}
        {qaMode && debug && (
          <div className="grid grid-cols-4 border-t border-[var(--line)] bg-[var(--ink)] px-4 py-3 text-center text-white">
            <DebugMetric label="FPS" value={metrics.fps.toFixed(1)} />
            <DebugMetric label="Confidence" value={displayVisibility.confidence.toFixed(2)} />
            <DebugMetric label="Inference" value={`${metrics.inferenceMs.toFixed(1)} ms`} />
            <DebugMetric label="Delegate" value={metrics.delegate ?? "—"} />
          </div>
        )}
      </div>}
    </div>
  );
}

function DebugMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/45">{label}</p><p className="mt-1 text-xs font-black">{value}</p></div>;
}
