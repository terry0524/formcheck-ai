"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Circle, Download, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExerciseDetection } from "@/types/exerciseAnalyzer";
import type { BodyVisibilityResult, CameraQaMetrics } from "@/types/pose";
import type { FeedbackMode, VoiceFrequency, WorkoutEngineSnapshot } from "@/types/workout";

interface MobileQaPanelProps {
  camera: CameraQaMetrics | null;
  workout: WorkoutEngineSnapshot;
  analysis: ExerciseDetection;
  visibility: BodyVisibilityResult["status"];
  feedbackMode: FeedbackMode;
  voiceFrequency: VoiceFrequency;
  muted: boolean;
  sessionStartedAt: number;
  workoutStartedAt: number | null;
  replayRecording: boolean;
  replayFrameCount: number;
  onReplayRecordingChange: (recording: boolean) => void;
  onReplayExport: () => void;
}

interface QaEvent {
  at: string;
  type: "visibility" | "orientation" | "camera";
  value: string;
}

function heapMegabytes() {
  if (typeof performance === "undefined") return null;
  const memory = (performance as Performance & { memory?: { usedJSHeapSize?: number } }).memory;
  return memory?.usedJSHeapSize ? Math.round(memory.usedJSHeapSize / 1024 / 1024 * 10) / 10 : null;
}

function time(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function value(number: number, digits = 1) {
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

export function MobileQaPanel({
  camera,
  workout,
  analysis,
  visibility,
  feedbackMode,
  voiceFrequency,
  muted,
  sessionStartedAt,
  workoutStartedAt,
  replayRecording,
  replayFrameCount,
  onReplayRecordingChange,
  onReplayExport,
}: MobileQaPanelProps) {
  const [open, setOpen] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [heap, setHeap] = useState<number | null>(null);
  const samplesRef = useRef<Array<Record<string, unknown>>>([]);
  const eventsRef = useRef<QaEvent[]>([]);
  const lastSampleAtRef = useRef(0);
  const previousCameraRef = useRef("");

  useEffect(() => {
    const update = () => {
      setElapsed(workoutStartedAt === null ? 0 : Math.max(0, Math.floor((Date.now() - workoutStartedAt) / 1000)));
      setHeap(heapMegabytes());
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [workoutStartedAt]);

  useEffect(() => {
    const recordVisibility = () => eventsRef.current.push({ at: new Date().toISOString(), type: "visibility", value: document.visibilityState });
    const recordOrientation = () => eventsRef.current.push({
      at: new Date().toISOString(),
      type: "orientation",
      value: window.matchMedia("(orientation: portrait)").matches ? "portrait" : "landscape",
    });
    document.addEventListener("visibilitychange", recordVisibility);
    window.addEventListener("orientationchange", recordOrientation);
    return () => {
      document.removeEventListener("visibilitychange", recordVisibility);
      window.removeEventListener("orientationchange", recordOrientation);
    };
  }, []);

  useEffect(() => {
    if (!camera) return;
    const cameraState = `${camera.requestedFacingMode}:${camera.actualFacingMode}:${camera.streamState}`;
    if (cameraState !== previousCameraRef.current) {
      previousCameraRef.current = cameraState;
      eventsRef.current.push({ at: new Date(camera.sampledAt).toISOString(), type: "camera", value: cameraState });
    }
    if (camera.sampledAt - lastSampleAtRef.current < 5000) return;
    lastSampleAtRef.current = camera.sampledAt;
    samplesRef.current.push({
      ...camera,
      heapMb: heapMegabytes(),
      workoutState: workout.state,
      exerciseId: workout.currentExercise.exerciseId,
      set: workout.currentSet,
      rep: workout.currentRep,
      repState: analysis.state,
      visibility,
      feedbackMode,
      voiceFrequency,
      muted,
      elapsedWorkoutSeconds: workoutStartedAt === null ? 0 : Math.max(0, Math.floor((camera.sampledAt - workoutStartedAt) / 1000)),
    });
    if (samplesRef.current.length > 1000) samplesRef.current.shift();
    setSampleCount(samplesRef.current.length);
  }, [analysis.state, camera, feedbackMode, muted, visibility, voiceFrequency, workout, workoutStartedAt]);

  function exportMeasurements() {
    const payload = {
      schema: "formcheck-mobile-qa-v1",
      startedAt: new Date(sessionStartedAt).toISOString(),
      exportedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      note: "Performance and state telemetry only. No video frames or landmark coordinates are included.",
      samples: samplesRef.current,
      events: eventsRef.current,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `formcheck-mobile-qa-${new Date().toISOString().replaceAll(":", "-")}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (!open) {
    return <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)} className="pointer-events-auto fixed left-3 top-28 z-50 min-h-11 border-white/40 bg-black/80 text-[10px] text-white"><ChevronDown className="size-4" /> QA</Button>;
  }

  const entries = [
    ["CAM / POSE", camera ? `${value(camera.cameraFps)} / ${value(camera.poseFps)} FPS` : "—"],
    ["RENDER", camera ? `${value(camera.renderFps)} FPS` : "—"],
    ["INFERENCE", camera ? `${value(camera.inferenceMs)} ms` : "—"],
    ["CONFIDENCE", camera ? value(camera.confidence, 2) : "—"],
    ["DELEGATE", camera?.delegate ?? "—"],
    ["CAMERA", camera ? `${camera.cameraWidth}×${camera.cameraHeight} · ${camera.requestedFacingMode}` : "—"],
    ["STREAM", camera ? `${camera.streamState} · ${camera.actualFacingMode}` : "—"],
    ["VIEWPORT", camera ? `${camera.viewportWidth}×${camera.viewportHeight} · ${camera.orientation}` : "—"],
    ["PAGE", camera?.pageVisibility ?? "unknown"],
    ["WORKOUT", `${workout.state}${workout.paused ? " · PAUSED" : ""}`],
    ["EXERCISE", `${workout.currentExercise.exerciseId} · SET ${workout.currentSet}`],
    ["REP STATE", `${workout.currentRep} · ${analysis.state}`],
    ["VISIBILITY", visibility],
    ["VOICE", `${feedbackMode} · ${voiceFrequency} · ${muted ? "MUTED" : "ON"}`],
    ["ELAPSED", time(elapsed)],
    ["JS HEAP", heap === null ? "N/A" : `${heap.toFixed(1)} MB`],
    ["SAMPLES", String(sampleCount)],
  ];

  return (
    <aside className="pointer-events-auto fixed left-3 top-28 z-50 max-h-[46svh] w-[min(20rem,calc(100vw-1.5rem))] overflow-auto border border-white/35 bg-black/88 p-3 font-mono text-[10px] text-white shadow-2xl" aria-label="Mobile QA metrics">
      <div className="sticky top-0 mb-3 flex items-center justify-between border-b border-white/20 bg-black pb-2">
        <strong className="tracking-[0.14em] text-[var(--accent)]">MOBILE QA</strong>
        <button type="button" onClick={() => setOpen(false)} className="flex min-h-11 min-w-11 items-center justify-center" aria-label="Hide Mobile QA panel"><ChevronUp className="size-4" /></button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        {entries.map(([label, detail]) => <div key={label} className="contents"><span className="text-white/45">{label}</span><strong className="break-all text-right">{detail}</strong></div>)}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={exportMeasurements} className="mt-4 min-h-11 w-full border-white/35 bg-transparent text-[10px] text-white"><Download className="size-4" /> Export JSON</Button>
      <p className="mt-2 leading-relaxed text-white/45">5-second samples. No video or landmark coordinates.</p>
      <div className="mt-4 border-t border-white/20 pt-4">
        <p className="mb-2 text-white/45">LANDMARK REPLAY · {replayFrameCount} FRAMES</p>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onReplayRecordingChange(!replayRecording)} className="min-h-11 border-white/35 bg-transparent text-[10px] text-white">
            {replayRecording ? <Square className="size-3.5" /> : <Circle className="size-3.5 fill-current text-red-400" />}
            {replayRecording ? "Stop" : "Record"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onReplayExport} disabled={replayFrameCount === 0} className="min-h-11 border-white/35 bg-transparent text-[10px] text-white"><Download className="size-4" /> Export replay</Button>
        </div>
        <p className="mt-2 leading-relaxed text-white/45">Opt-in only. Stores pose coordinates in memory until export; never stores video.</p>
      </div>
    </aside>
  );
}
