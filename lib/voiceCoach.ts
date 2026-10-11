import type { FeedbackMode, VoiceFrequency } from "@/types/workout";

const MAX_COACH_MESSAGE_LENGTH = 48;
const DUPLICATE_SPEECH_WINDOW_MS = 1500;
let lastSpokenMessage = "";
let lastSpokenAt = -Infinity;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function canUseVoiceCoach() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakCoachCue(message: string, onError?: () => void) {
  if (!canUseVoiceCoach()) return false;
  const normalized = message.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > MAX_COACH_MESSAGE_LENGTH) return false;
  const now = Date.now();
  if (normalized === lastSpokenMessage && now - lastSpokenAt < DUPLICATE_SPEECH_WINDOW_MS) return false;
  const synthesis = window.speechSynthesis;
  if (synthesis.paused) synthesis.resume();
  // Never build a stale speech queue or cancel immediately before speak:
  // Safari can apply that cancellation to the newly submitted utterance.
  if (synthesis.speaking || synthesis.pending) return false;
  lastSpokenMessage = normalized;
  lastSpokenAt = now;
  const utterance = new SpeechSynthesisUtterance(normalized);
  utterance.lang = /[가-힣]/.test(normalized) ? "ko-KR" : "en-US";
  utterance.rate = 1.05;
  utterance.pitch = 0.95;
  utterance.volume = 1;
  const voices = synthesis.getVoices?.() ?? [];
  const matching = voices.filter((voice) => voice.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2)));
  const voice = matching.find((voice) => voice.localService) ?? matching[0];
  if (voice) utterance.voice = voice;
  activeUtterance = utterance;
  utterance.onend = () => { if (activeUtterance === utterance) activeUtterance = null; };
  utterance.onerror = (event) => {
    if (activeUtterance !== utterance) return;
    activeUtterance = null;
    lastSpokenMessage = "";
    if (event.error !== "canceled" && event.error !== "interrupted") onError?.();
  };
  try {
    synthesis.speak(utterance);
  } catch {
    activeUtterance = null;
    lastSpokenMessage = "";
    onError?.();
    return false;
  }
  return true;
}

export function squatVoiceCue(
  repCount: number,
  targetReps: number,
  mode: FeedbackMode,
  frequency: VoiceFrequency,
  onError?: () => void,
) {
  if (mode === "screen") return false;
  const cue = getSquatVoiceCue(repCount, targetReps, frequency);
  return cue ? speakCoachCue(cue, onError) : false;
}

export function getSquatVoiceCue(repCount: number, targetReps: number, frequency: VoiceFrequency) {
  if (repCount >= targetReps) return null;
  if (frequency === "detailed") return `${repCount}회.`;
  if (frequency === "normal" && (repCount % 2 === 0 || repCount === 1)) return `${repCount}회.`;

  const halfway = Math.ceil(targetReps / 2);
  if (repCount === halfway) return "절반 완료.";
  if (repCount === 5 || repCount === 10) return `${repCount}회.`;
  return null;
}

export function getSquatPhaseVoiceCue(phase: "DESCENDING" | "ASCENDING", frequency: VoiceFrequency) {
  if (frequency !== "detailed") return null;
  return phase === "DESCENDING" ? "내려갑니다." : "일어납니다.";
}

export function getWorkoutTransitionCue(
  transition: "start" | "rest-start" | "rest-end" | "next-set" | "next" | "complete" | "pause" | "resume",
  options: { restSeconds?: number; nextExercise?: string } = {},
) {
  if (transition === "start") return "운동을 시작합니다.";
  if (transition === "rest-start") return `세트 완료. ${options.restSeconds ?? 60}초 휴식.`;
  if (transition === "rest-end") return "휴식 종료.";
  if (transition === "next-set") return "다음 세트 시작합니다.";
  if (transition === "complete") return "운동 완료.";
  if (transition === "pause") return "일시정지.";
  if (transition === "resume") return "계속합니다.";
  return `다음 운동, ${options.nextExercise ?? "리버스 런지"}.`;
}

export function stopVoiceCoach() {
  lastSpokenMessage = "";
  lastSpokenAt = -Infinity;
  activeUtterance = null;
  if (canUseVoiceCoach()) window.speechSynthesis.cancel();
}
