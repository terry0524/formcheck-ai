"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowRight, Pause, Play, RotateCcw, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { CameraPreview } from "@/components/camera/camera-preview";
import { MobileQaPanel } from "@/components/workout/mobile-qa-panel";
import { Button } from "@/components/ui/button";
import { getExerciseName } from "@/lib/exercises";
import { createExerciseAnalyzer, hasExerciseAnalyzer } from "@/lib/exercises/index";
import { buildWorkoutReport, workoutSetKey } from "@/lib/reportEngine";
import { saveWorkoutReport } from "@/lib/reportStorage";
import {
  canUseVoiceCoach,
  getSquatPhaseVoiceCue,
  getWorkoutTransitionCue,
  speakCoachCue,
  squatVoiceCue,
  stopVoiceCoach,
} from "@/lib/voiceCoach";
import { WorkoutEngine } from "@/lib/workoutEngine";
import { saveSquatWorkout } from "@/lib/workoutStorage";
import { captureSquatReplayFrame, createSquatReplayFixture } from "@/lib/squatReplay";
import type { SquatRepEvaluation } from "@/types/exercise";
import type { ExerciseAnalyzer, ExerciseDetection, ExerciseFeedback } from "@/types/exerciseAnalyzer";
import type { BodyVisibilityResult, CameraQaMetrics, PoseFrame } from "@/types/pose";
import type { CapturedRepEvaluation, CapturedTimedEvaluation } from "@/types/report";
import type { Routine } from "@/types/routine";
import type { SquatReplayFrame } from "@/types/squatReplay";
import type { FeedbackMode, VoiceFrequency, WorkoutEngineSnapshot } from "@/types/workout";

const INITIAL_ANALYSIS: ExerciseDetection = {
  state: "SEARCHING",
  tracking: false,
  side: null,
  metrics: {},
};

const subscribeVoiceAvailability = () => () => undefined;

interface RoutineWorkoutProps {
  routine: Routine;
  feedbackMode: FeedbackMode;
  voiceFrequency: VoiceFrequency;
  qaMode?: boolean;
}

type CompletedExerciseEvaluation = CapturedRepEvaluation;

export function RoutineWorkout({ routine, feedbackMode, voiceFrequency, qaMode = false }: RoutineWorkoutProps) {
  const router = useRouter();
  const [workoutEngine] = useState(() => new WorkoutEngine(routine));
  const [startedAt] = useState(() => new Date().toISOString());
  const initialWorkout = workoutEngine.getSnapshot();
  const workoutRef = useRef(initialWorkout);
  const analyzerRef = useRef<ExerciseAnalyzer | null>(createExerciseAnalyzer(initialWorkout.currentExercise.exerciseId));
  const latestAnalysisRef = useRef(INITIAL_ANALYSIS);
  const lastUiUpdateRef = useRef(0);
  const bodyStatusRef = useRef<BodyVisibilityResult["status"]>("loading");
  const mutedRef = useRef(feedbackMode === "screen");
  const flashTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const repHistoryRef = useRef<CompletedExerciseEvaluation[]>([]);
  const timedHistoryRef = useRef<CapturedTimedEvaluation[]>([]);
  const lastTimedSampleAtRef = useRef(new Map<string, number>());
  const completedSetKeysRef = useRef(new Set<string>());
  const workoutStartedAtRef = useRef<number | null>(null);
  const reportSavedRef = useRef(false);
  const squatHistoryRef = useRef<SquatRepEvaluation[]>([]);
  const replayFramesRef = useRef<SquatReplayFrame[]>([]);
  const replayRecordingRef = useRef(false);
  const replayStartedAtRef = useRef(0);
  const replayLastCapturedAtRef = useRef(-Infinity);
  const [workout, setWorkout] = useState(initialWorkout);
  const [analysis, setAnalysis] = useState(INITIAL_ANALYSIS);
  const [bodyStatus, setBodyStatus] = useState<BodyVisibilityResult["status"]>("loading");
  const [countdown, setCountdown] = useState(3);
  const [transitionCountdown, setTransitionCountdown] = useState(3);
  const [repFlash, setRepFlash] = useState<number | null>(null);
  const [activeFeedback, setActiveFeedback] = useState<ExerciseFeedback | null>(null);
  const [repHistory, setRepHistory] = useState<CompletedExerciseEvaluation[]>([]);
  const [isMuted, setIsMuted] = useState(feedbackMode === "screen");
  const [voiceFailed, setVoiceFailed] = useState(false);
  const [reportSaveFailed, setReportSaveFailed] = useState(false);
  const [qaMetrics, setQaMetrics] = useState<CameraQaMetrics | null>(null);
  const [workoutStartedAt, setWorkoutStartedAt] = useState<number | null>(null);
  const [replayRecording, setReplayRecording] = useState(false);
  const [replayFrameCount, setReplayFrameCount] = useState(0);
  const voiceAvailable = useSyncExternalStore(subscribeVoiceAvailability, canUseVoiceCoach, () => false);

  const speakIfEnabled = useCallback((message: string) => {
    if (mutedRef.current || !canUseVoiceCoach()) return false;
    return speakCoachCue(message, () => setVoiceFailed(true));
  }, []);

  const resetExerciseAnalysis = useCallback((exerciseId: string) => {
    analyzerRef.current = createExerciseAnalyzer(exerciseId);
    latestAnalysisRef.current = INITIAL_ANALYSIS;
    setAnalysis(INITIAL_ANALYSIS);
    setActiveFeedback(null);
    setRepFlash(null);
  }, []);

  const commitWorkout = useCallback((next: WorkoutEngineSnapshot) => {
    const previous = workoutRef.current;
    if (previous.state === "READY" && next.state === "EXERCISE" && workoutStartedAtRef.current === null) {
      workoutStartedAtRef.current = Date.now();
      setWorkoutStartedAt(workoutStartedAtRef.current);
    }
    const enteringExercise = next.state === "EXERCISE" && (
      previous.state !== "EXERCISE"
      || previous.currentExerciseIndex !== next.currentExerciseIndex
      || previous.currentSet !== next.currentSet
    );
    workoutRef.current = next;
    if (enteringExercise) resetExerciseAnalysis(next.currentExercise.exerciseId);
    setWorkout(next);
  }, [resetExerciseAnalysis]);

  useEffect(() => {
    if (workout.state !== "WORKOUT_COMPLETE" || reportSavedRef.current) return;
    reportSavedRef.current = true;
    const completedAt = new Date();
    const report = buildWorkoutReport({
      id: startedAt,
      routine,
      startedAt: new Date(workoutStartedAtRef.current ?? Date.parse(startedAt)).toISOString(),
      completedAt: completedAt.toISOString(),
      snapshot: workout,
      completedSetKeys: completedSetKeysRef.current,
      reps: repHistoryRef.current,
      timedSamples: timedHistoryRef.current,
    });
    if (!saveWorkoutReport(report)) {
      setReportSaveFailed(true);
      return;
    }
    router.replace(`/report/${encodeURIComponent(report.id)}`);
  }, [routine, router, startedAt, workout]);

  useEffect(() => () => {
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    stopVoiceCoach();
  }, []);

  useEffect(() => {
    if (workout.state !== "READY" || bodyStatus !== "ready") return;
    const deadline = Date.now() + 3000;
    const update = () => setCountdown(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 100);
    const timeout = window.setTimeout(() => {
      commitWorkout(workoutEngine.start(Date.now()));
      speakIfEnabled(getWorkoutTransitionCue("start"));
    }, 3000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [bodyStatus, commitWorkout, speakIfEnabled, workout.state, workoutEngine]);

  useEffect(() => {
    if (workout.state !== "SET_COMPLETE" || workout.paused) return;
    const timeout = window.setTimeout(() => {
      const next = workoutEngine.advance(Date.now());
      commitWorkout(next);
      if (next.state === "REST") {
        speakIfEnabled(getWorkoutTransitionCue("rest-start", { restSeconds: next.currentExercise.restSeconds }));
      } else if (next.state === "NEXT_EXERCISE") {
        speakIfEnabled(getWorkoutTransitionCue("next", { nextExercise: next.nextExercise ? getExerciseName(next.nextExercise.exerciseId) : undefined }));
      } else if (next.state === "WORKOUT_COMPLETE") {
        speakIfEnabled(getWorkoutTransitionCue("complete"));
      }
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [commitWorkout, speakIfEnabled, workout.paused, workout.state, workoutEngine]);

  useEffect(() => {
    const timedExercise = workout.state === "EXERCISE" && workout.currentExercise.duration !== undefined;
    if ((workout.state !== "REST" && !timedExercise) || workout.paused) return;
    const interval = window.setInterval(() => {
      const previous = workoutRef.current;
      const next = workoutEngine.tick(Date.now());
      if (previous.state === "EXERCISE" && next.state === "SET_COMPLETE") {
        completedSetKeysRef.current.add(workoutSetKey(previous.currentExerciseIndex, previous.currentSet));
      }
      const secondsChanged = previous.restRemainingSeconds !== next.restRemainingSeconds
        || previous.exerciseRemainingSeconds !== next.exerciseRemainingSeconds;
      if (secondsChanged || previous.state !== next.state) commitWorkout(next);
      if (previous.state === "REST" && next.state === "NEXT_SET") {
        speakIfEnabled(`${getWorkoutTransitionCue("rest-end")} ${getWorkoutTransitionCue("next-set")}`);
      }
    }, 200);
    return () => window.clearInterval(interval);
  }, [commitWorkout, speakIfEnabled, workout.currentExercise.duration, workout.paused, workout.state, workoutEngine]);

  useEffect(() => {
    if ((workout.state !== "NEXT_SET" && workout.state !== "NEXT_EXERCISE") || workout.paused) return;
    const deadline = Date.now() + 3000;
    const update = () => setTransitionCountdown(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const interval = window.setInterval(update, 100);
    const timeout = window.setTimeout(() => commitWorkout(workoutEngine.advance(Date.now())), 3000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [commitWorkout, workout.paused, workout.state, workoutEngine]);

  const handlePoseFrame = useCallback((frame: PoseFrame | null, visibility: BodyVisibilityResult, timestamp: number) => {
    if (visibility.status !== bodyStatusRef.current) {
      bodyStatusRef.current = visibility.status;
      setBodyStatus(visibility.status);
    }
    const currentWorkout = workoutRef.current;
    if (qaMode && currentWorkout.currentExercise.exerciseId === "squat" && replayRecordingRef.current && timestamp - replayLastCapturedAtRef.current >= 100) {
      replayLastCapturedAtRef.current = timestamp;
      replayFramesRef.current.push(captureSquatReplayFrame(frame, visibility.confidence, visibility.status, replayStartedAtRef.current, timestamp));
      if (replayFramesRef.current.length >= 1200) {
        replayRecordingRef.current = false;
        setReplayRecording(false);
      }
      if (replayFramesRef.current.length % 5 === 0 || replayFramesRef.current.length === 1) {
        setReplayFrameCount(replayFramesRef.current.length);
      }
    }
    const analyzer = analyzerRef.current;
    if (currentWorkout.state !== "EXERCISE" || currentWorkout.paused || !analyzer) return;

    // Never count or evaluate form unless exactly one confident full body is
    // visible. Passing null also lets analyzers reject interrupted cycles.
    const result = analyzer.detectState(visibility.status === "ready" ? frame : null, timestamp);
    const previous = latestAnalysisRef.current;
    latestAnalysisRef.current = result;
    const repEvent = analyzer.countRep();
    const formCue = analyzer.getFeedback();
    const evaluation = analyzer.evaluateForm();

    if (currentWorkout.currentExercise.duration !== undefined && evaluation) {
      const sampleKey = workoutSetKey(currentWorkout.currentExerciseIndex, currentWorkout.currentSet);
      const lastSampleAt = lastTimedSampleAtRef.current.get(sampleKey) ?? -Infinity;
      if (timestamp - lastSampleAt >= 500) {
        lastTimedSampleAtRef.current.set(sampleKey, timestamp);
        timedHistoryRef.current.push({
          ...evaluation,
          exerciseId: currentWorkout.currentExercise.exerciseId,
          exerciseIndex: currentWorkout.currentExerciseIndex,
          set: currentWorkout.currentSet,
          capturedAt: timestamp,
        });
      }
    }

    if (currentWorkout.currentExercise.exerciseId === "squat" && result.state !== previous.state && (result.state === "DESCENDING" || result.state === "ASCENDING")) {
      const phaseCue = getSquatPhaseVoiceCue(result.state, voiceFrequency);
      if (phaseCue) speakIfEnabled(phaseCue);
    }

    if (repEvent) {
      const nextWorkout = workoutEngine.recordRep(Date.now());
      setRepFlash(nextWorkout.currentRep);
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setRepFlash(null), 850);

      const completed: CompletedExerciseEvaluation = { ...repEvent.evaluation, rep: nextWorkout.currentRep, exerciseId: currentWorkout.currentExercise.exerciseId, exerciseIndex: currentWorkout.currentExerciseIndex, set: currentWorkout.currentSet };
      const nextHistory = [...repHistoryRef.current, completed];
      repHistoryRef.current = nextHistory;
      setRepHistory(nextHistory);
      if (nextWorkout.state === "SET_COMPLETE") {
        completedSetKeysRef.current.add(workoutSetKey(currentWorkout.currentExerciseIndex, currentWorkout.currentSet));
      }

      if (currentWorkout.currentExercise.exerciseId === "squat" && repEvent.rawEvaluation) {
        const rawHistory = [...squatHistoryRef.current, repEvent.rawEvaluation as SquatRepEvaluation];
        squatHistoryRef.current = rawHistory;
        saveSquatWorkout({
          id: startedAt,
          exercise: "squat",
          targetReps: currentWorkout.targetReps ?? 0,
          feedbackMode,
          voiceFrequency,
          startedAt,
          updatedAt: new Date().toISOString(),
          reps: rawHistory,
        });
      }

      commitWorkout(nextWorkout);
      if (nextWorkout.state === "EXERCISE") {
        if (formCue) speakIfEnabled(formCue.message);
        else if (!mutedRef.current && nextWorkout.targetReps !== null) {
          squatVoiceCue(nextWorkout.currentRep, nextWorkout.targetReps, "hybrid", voiceFrequency, () => setVoiceFailed(true));
        }
      }
    } else if (formCue) {
      speakIfEnabled(formCue.message);
    }

    if (formCue) {
      setActiveFeedback(formCue);
      if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = window.setTimeout(() => setActiveFeedback(null), 2800);
    }

    const importantChange = Boolean(repEvent) || result.state !== previous.state || result.tracking !== previous.tracking;
    if (importantChange || timestamp - lastUiUpdateRef.current >= 100) {
      lastUiUpdateRef.current = timestamp;
      setAnalysis(result);
    }
  }, [commitWorkout, feedbackMode, qaMode, speakIfEnabled, startedAt, voiceFrequency, workoutEngine]);

  function setReplayCapture(recording: boolean) {
    if (recording) {
      replayFramesRef.current = [];
      replayStartedAtRef.current = performance.now();
      replayLastCapturedAtRef.current = -Infinity;
      setReplayFrameCount(0);
    }
    replayRecordingRef.current = recording;
    setReplayRecording(recording);
    if (!recording) setReplayFrameCount(replayFramesRef.current.length);
  }

  function exportReplay() {
    if (replayFramesRef.current.length === 0) return;
    replayRecordingRef.current = false;
    setReplayRecording(false);
    setReplayFrameCount(replayFramesRef.current.length);
    const fixture = createSquatReplayFixture(replayFramesRef.current);
    const url = URL.createObjectURL(new Blob([JSON.stringify(fixture, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `formcheck-squat-landmarks-${new Date().toISOString().replaceAll(":", "-")}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function toggleMute() {
    if (!voiceAvailable) return;
    if (voiceFailed) {
      mutedRef.current = false;
      setIsMuted(false);
      setVoiceFailed(false);
      speakCoachCue("음성 안내를 다시 시작합니다.", () => setVoiceFailed(true));
      return;
    }
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    if (nextMuted) stopVoiceCoach();
    else speakCoachCue("음성 켜짐.", () => setVoiceFailed(true));
  }

  function togglePause() {
    const next = workoutEngine.togglePause(Date.now());
    commitWorkout(next);
    if (next.paused) {
      stopVoiceCoach();
    } else {
      speakIfEnabled(getWorkoutTransitionCue("resume"));
    }
  }

  function skip() {
    const previous = workoutRef.current;
    const next = workoutEngine.skip(Date.now());
    commitWorkout(next);
    if (previous.state === "REST" && next.state === "NEXT_SET") speakIfEnabled(getWorkoutTransitionCue("next-set"));
  }

  function previous() {
    const next = workoutEngine.previous(Date.now());
    const targetKey = workoutSetKey(next.currentExerciseIndex, next.currentSet);
    completedSetKeysRef.current.delete(targetKey);
    repHistoryRef.current = repHistoryRef.current.filter((item) => item.exerciseIndex !== next.currentExerciseIndex || item.set !== next.currentSet);
    timedHistoryRef.current = timedHistoryRef.current.filter((item) => item.exerciseIndex !== next.currentExerciseIndex || item.set !== next.currentSet);
    lastTimedSampleAtRef.current.delete(targetKey);
    setRepHistory(repHistoryRef.current);
    commitWorkout(next);
  }

  function endWorkout() {
    stopVoiceCoach();
    commitWorkout(workoutEngine.end(Date.now()));
  }

  const audio = { isMuted: isMuted || !voiceAvailable, voiceAvailable, voiceFailed, toggleMute };
  if (workout.state === "WORKOUT_COMPLETE") {
    const averageScore = repHistory.length > 0 ? Math.round(repHistory.reduce((sum, rep) => sum + rep.score, 0) / repHistory.length) : null;
    return (
      <PhaseScreen audio={audio}>
        <p className="text-xl font-black uppercase tracking-[0.22em] text-[var(--accent)]">{workout.endedEarly ? "운동 종료" : "운동 완료"}</p>
        <h1 className="mt-5 text-[clamp(4rem,18vw,9rem)] font-black uppercase leading-[0.85] tracking-[-0.07em]">{workout.endedEarly ? "기록 저장" : "완료"}</h1>
        <p className="mt-7 text-lg font-black text-white/60">{workout.completedSets} / {workout.totalSets} SETS{averageScore === null ? "" : ` · FORM ${averageScore}`}</p>
        <p className="mt-4 text-sm font-bold text-white/55">{reportSaveFailed ? "이 기기에 결과를 저장하지 못했습니다." : "측정 결과를 정리하는 중입니다."}</p>
        {reportSaveFailed && <Button asChild variant="accent" size="lg" className="mt-9"><Link href="/home">홈으로 <ArrowRight className="size-5" /></Link></Button>}
      </PhaseScreen>
    );
  }

  const currentName = getExerciseName(workout.currentExercise.exerciseId);
  const nextName = workout.nextExercise ? getExerciseName(workout.nextExercise.exerciseId) : "운동 완료";
  const nextStep = workout.currentSet < workout.currentExercise.sets
    ? `${currentName} · 세트 ${workout.currentSet + 1}`
    : nextName;
  const lastEvaluation = repHistory.findLast((evaluation) => evaluation.exerciseId === workout.currentExercise.exerciseId && evaluation.set === workout.currentSet) ?? null;
  const analyzerAvailable = hasExerciseAnalyzer(workout.currentExercise.exerciseId);
  const richVisuals = feedbackMode !== "voice" || isMuted || !voiceAvailable;

  return (
    <main className="h-[100svh] overflow-hidden bg-[var(--ink)] text-white">
      <CameraPreview variant="workout" onPoseFrame={handlePoseFrame} qaMode={qaMode} onQaMetrics={qaMode ? setQaMetrics : undefined}>
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col bg-black/20">
          <header className="grid grid-cols-[1fr_auto] items-start gap-3 px-4 pt-4 sm:px-7 sm:pt-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">{routine.title}</p>
              <h1 className="mt-1 text-2xl font-black uppercase tracking-[-0.05em]">{currentName}</h1>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-white/60">세트 {workout.currentSet} / {workout.currentExercise.sets}</p>
            </div>
            <AudioControl {...audio} />
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
            <WorkoutStage
              workout={workout}
              analysis={analysis}
              bodyStatus={bodyStatus}
              countdown={countdown}
              transitionCountdown={transitionCountdown}
              repFlash={repFlash}
              activeFeedback={activeFeedback}
              lastEvaluation={lastEvaluation}
              currentName={currentName}
              nextName={nextName}
              richVisuals={richVisuals}
              analyzerAvailable={analyzerAvailable}
            />
          </div>

          <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-40 sm:inset-x-6 sm:bottom-6">
            <p className="mb-2 truncate text-center text-[10px] font-black uppercase tracking-[0.15em] text-white/65">다음 · {nextStep}</p>
            <ManualControls workout={workout} onPause={togglePause} onSkip={skip} onPrevious={previous} onEnd={endWorkout} />
          </div>

          {workout.paused && <div className="absolute inset-0 z-30 grid place-items-center bg-black/75"><div><Pause className="mx-auto size-12" /><p className="mt-4 text-4xl font-black uppercase tracking-[-0.04em]">일시정지</p></div></div>}
        </div>
      </CameraPreview>
      {qaMode && <MobileQaPanel
        camera={qaMetrics}
        workout={workout}
        analysis={analysis}
        visibility={bodyStatus}
        feedbackMode={feedbackMode}
        voiceFrequency={voiceFrequency}
        muted={isMuted || !voiceAvailable}
        sessionStartedAt={Date.parse(startedAt)}
        workoutStartedAt={workoutStartedAt}
        replayRecording={replayRecording}
        replayFrameCount={replayFrameCount}
        onReplayRecordingChange={setReplayCapture}
        onReplayExport={exportReplay}
      />}
    </main>
  );
}

function WorkoutStage({
  workout,
  analysis,
  bodyStatus,
  countdown,
  transitionCountdown,
  repFlash,
  activeFeedback,
  lastEvaluation,
  currentName,
  nextName,
  richVisuals,
  analyzerAvailable,
}: {
  workout: WorkoutEngineSnapshot;
  analysis: ExerciseDetection;
  bodyStatus: BodyVisibilityResult["status"];
  countdown: number;
  transitionCountdown: number;
  repFlash: number | null;
  activeFeedback: ExerciseFeedback | null;
  lastEvaluation: CompletedExerciseEvaluation | null;
  currentName: string;
  nextName: string;
  richVisuals: boolean;
  analyzerAvailable: boolean;
}) {
  if (workout.state === "READY") {
    const ready = bodyStatus === "ready";
    const message = bodyGuidance(bodyStatus);
    return ready
      ? <><p className="text-sm font-black uppercase tracking-[0.2em] text-white/60">운동 시작까지</p><BigNumber>{countdown}</BigNumber></>
      : <><p className="text-[clamp(3.5rem,16vw,8rem)] font-black uppercase leading-none tracking-[-0.07em]">준비하세요</p><Status>{message}</Status></>;
  }

  if (workout.state === "SET_COMPLETE") {
    return <><p className="text-xl font-black uppercase tracking-[0.2em] text-[var(--accent)]">세트 {workout.currentSet}</p><p className="mt-4 text-[clamp(4rem,18vw,9rem)] font-black uppercase leading-none tracking-[-0.07em]">완료</p></>;
  }

  if (workout.state === "REST") {
    return <><p className="text-xl font-black uppercase tracking-[0.2em] text-[var(--accent)]">휴식</p><BigTime seconds={workout.restRemainingSeconds} /><p className="mt-6 text-sm font-black uppercase tracking-[0.14em] text-white/55">다음 · {currentName} · 세트 {workout.currentSet + 1}</p></>;
  }

  if (workout.state === "NEXT_SET") {
    return <><p className="text-xl font-black uppercase tracking-[0.2em] text-[var(--accent)]">다음 세트</p><BigNumber>{transitionCountdown}</BigNumber><p className="text-2xl font-black uppercase">{currentName} · 세트 {workout.currentSet}</p></>;
  }

  if (workout.state === "NEXT_EXERCISE") {
    return <><p className="text-xl font-black uppercase tracking-[0.2em] text-[var(--accent)]">다음 운동</p><p className="mt-5 text-[clamp(3.5rem,16vw,8rem)] font-black uppercase leading-[0.86] tracking-[-0.07em]">{nextName}</p><p className="mt-7 text-6xl font-black">{transitionCountdown}</p></>;
  }

  if (workout.currentExercise.duration !== undefined) {
    const timedStatus = activeFeedback ? "자세 확인" : analysis.tracking ? formatAnalyzerState(analysis.state) : bodyGuidance(bodyStatus);
    return <><p className="text-xl font-black uppercase tracking-[0.18em] text-[var(--accent)]">유지하세요</p><BigTime seconds={workout.exerciseRemainingSeconds ?? workout.currentExercise.duration} />{analyzerAvailable && <Status warning={Boolean(activeFeedback)}>{timedStatus}</Status>}{activeFeedback && <p className="mt-3 max-w-[90vw] bg-black/75 px-5 py-3 text-xl font-black sm:text-3xl">{activeFeedback.message}</p>}</>;
  }

  if (!analyzerAvailable) {
    return <><p className="text-[clamp(3.5rem,16vw,8rem)] font-black uppercase leading-[0.86] tracking-[-0.07em]">{currentName}</p><Status>자동 분석 미지원</Status><p className="mt-4 text-sm font-bold text-white/60">건너뛰기를 눌러 다음 운동으로 이동하세요.</p></>;
  }

  const trackingMessage = analysis.tracking ? formatAnalyzerState(analysis.state, analysis.side) : bodyGuidance(bodyStatus);
  const formStatus = activeFeedback ? "자세 확인" : analysis.tracking ? (lastEvaluation?.label === "NEEDS IMPROVEMENT" ? "자세 확인" : "좋아요") : trackingMessage;
  return (
    <>
      {repFlash !== null && <p className="mb-2 text-2xl font-black uppercase tracking-[0.15em] text-[var(--accent)] sm:text-4xl">{repFlash}회 완료</p>}
      <div className="flex items-baseline justify-center font-black leading-none drop-shadow-[0_3px_20px_rgba(0,0,0,.55)]">
        <span className={`${richVisuals ? "text-[clamp(9rem,38vw,22rem)]" : "text-[clamp(6rem,26vw,14rem)]"} tracking-[-0.09em]`}>{workout.currentRep}</span>
        <span className={`${richVisuals ? "text-[clamp(2rem,8vw,5rem)]" : "text-[clamp(1.5rem,6vw,3rem)]"} ml-3 text-white/55`}>/ {workout.targetReps}</span>
      </div>
      {(richVisuals || activeFeedback) && <Status warning={Boolean(activeFeedback) || lastEvaluation?.label === "NEEDS IMPROVEMENT"}>{formStatus}</Status>}
      {(activeFeedback || (richVisuals && lastEvaluation)) && <p className="mt-3 max-w-[90vw] bg-black/75 px-5 py-3 text-xl font-black sm:text-3xl">{activeFeedback ? activeFeedback.message : `${lastEvaluation?.rep}회 완료`}</p>}
    </>
  );
}

function bodyGuidance(status: BodyVisibilityResult["status"]) {
  if (status === "multiple-people") return "한 명만 서주세요";
  if (status === "too-close") return "뒤로 이동하세요";
  if (status === "body-part-missing") return "발까지 화면에 맞춰주세요";
  return "전신 위치로 이동하세요";
}

function ManualControls({ workout, onPause, onSkip, onPrevious, onEnd }: { workout: WorkoutEngineSnapshot; onPause: () => void; onSkip: () => void; onPrevious: () => void; onEnd: () => void }) {
  const PauseIcon = workout.paused ? Play : Pause;
  return (
    <div className="grid grid-cols-4 border border-white/25 bg-black/72">
      <ControlButton onClick={onPause} label={workout.paused ? "계속" : "일시정지"} icon={<PauseIcon />} />
      <ControlButton onClick={onSkip} label="건너뛰기" icon={<SkipForward />} />
      <ControlButton onClick={onPrevious} label="이전" icon={<RotateCcw />} />
      <ControlButton onClick={onEnd} label="종료" icon={<Square />} />
    </div>
  );
}

function ControlButton({ onClick, label, icon }: { onClick: () => void; label: string; icon: ReactNode }) {
  return <Button type="button" variant="ghost" size="sm" onClick={onClick} className="min-h-11 gap-1 border-0 border-r border-white/20 px-1 text-[9px] text-white last:border-r-0 hover:bg-white hover:text-[var(--ink)] [&_svg]:size-3.5">{icon}{label}</Button>;
}

interface AudioControlProps {
  isMuted: boolean;
  voiceAvailable: boolean;
  voiceFailed: boolean;
  toggleMute: () => void;
}

function AudioControl({ isMuted, voiceAvailable, voiceFailed, toggleMute }: AudioControlProps) {
  const Icon = isMuted ? VolumeX : Volume2;
  const label = !voiceAvailable ? "음성 미지원" : voiceFailed ? "음성 재시도" : isMuted ? "음성 켜기" : "음소거";
  return <Button type="button" variant="outline" size="sm" onClick={toggleMute} disabled={!voiceAvailable} className="pointer-events-auto min-h-11 border-white/35 bg-black/65 px-3 text-[10px] text-white hover:bg-white hover:text-[var(--ink)] disabled:opacity-45" aria-label={label}><Icon className="size-4" />{label}</Button>;
}

function PhaseScreen({ children, audio }: { children: ReactNode; audio: AudioControlProps }) {
  return <main className="relative grid min-h-[100svh] place-items-center overflow-hidden bg-[var(--ink)] p-6 text-center text-white"><div className="absolute right-4 top-4 sm:right-7 sm:top-6"><AudioControl {...audio} /></div><div className="w-full max-w-3xl">{children}</div></main>;
}

function BigNumber({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[clamp(10rem,45vw,24rem)] font-black leading-none tracking-[-0.08em]">{children}</p>;
}

function BigTime({ seconds }: { seconds: number }) {
  return <p className="mt-4 text-[clamp(7rem,34vw,18rem)] font-black leading-none tracking-[-0.08em]">{formatTime(seconds)}</p>;
}

function Status({ children, warning = false }: { children: ReactNode; warning?: boolean }) {
  return <p className={`mt-6 border px-6 py-2 text-xl font-black uppercase tracking-[0.14em] sm:text-3xl ${warning ? "border-[#ffb743] bg-black/75 text-[#ffcf7d]" : "border-white/35 bg-black/65"}`}>{children}</p>;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatAnalyzerState(state: string, side: "left" | "right" | null = null) {
  const labels: Record<string, string> = { STANDING: "서 있는 중", DESCENDING: "내려가는 중", BOTTOM: "아래 자세", ASCENDING: "올라오는 중", UP: "위 자세", DOWN: "아래 자세", HOLDING: "유지 중", CHECK_FORM: "자세 확인", UNABLE_TO_EVALUATE: "평가할 수 없습니다", SEARCHING: "몸을 찾는 중" };
  return `${labels[state] ?? "자세 확인 중"}${side ? ` · ${side === "left" ? "왼쪽" : "오른쪽"}` : ""}`;
}
