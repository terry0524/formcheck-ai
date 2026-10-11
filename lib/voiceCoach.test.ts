import { afterEach, describe, expect, it, vi } from "vitest";
import { getSquatPhaseVoiceCue, getSquatVoiceCue, getWorkoutTransitionCue, speakCoachCue, stopVoiceCoach } from "@/lib/voiceCoach";

afterEach(() => {
  stopVoiceCoach();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getSquatVoiceCue", () => {
  it("keeps minimal coaching to milestones", () => {
    expect(getSquatVoiceCue(1, 12, "minimal")).toBeNull();
    expect(getSquatVoiceCue(5, 12, "minimal")).toBe("5회.");
    expect(getSquatVoiceCue(6, 12, "minimal")).toBe("절반 완료.");
    expect(getSquatVoiceCue(10, 12, "minimal")).toBe("10회.");
    expect(getSquatVoiceCue(12, 12, "minimal")).toBeNull();
  });

  it("reads every rep in detailed mode", () => {
    expect(getSquatVoiceCue(3, 12, "detailed")).toBe("3회.");
  });

  it("adds phase guidance only in detailed mode", () => {
    expect(getSquatPhaseVoiceCue("DESCENDING", "normal")).toBeNull();
    expect(getSquatPhaseVoiceCue("DESCENDING", "detailed")).toBe("내려갑니다.");
    expect(getSquatPhaseVoiceCue("ASCENDING", "detailed")).toBe("일어납니다.");
  });

  it("keeps workout transition messages short", () => {
    expect(getWorkoutTransitionCue("start")).toBe("운동을 시작합니다.");
    expect(getWorkoutTransitionCue("rest-start", { restSeconds: 60 })).toBe("세트 완료. 60초 휴식.");
    expect(getWorkoutTransitionCue("rest-end")).toBe("휴식 종료.");
    expect(getWorkoutTransitionCue("next-set")).toBe("다음 세트 시작합니다.");
    expect(getWorkoutTransitionCue("next", { nextExercise: "리버스 런지" })).toBe("다음 운동, 리버스 런지.");
    expect(getWorkoutTransitionCue("complete")).toBe("운동 완료.");
  });

  it("cancels speech immediately when mute is activated", () => {
    const cancel = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { cancel } });
    stopVoiceCoach();
    expect(cancel).toHaveBeenCalledOnce();
  });

  it("deduplicates speech and rejects messages that are too long", () => {
    const cancel = vi.fn();
    const speak = vi.fn();
    class Utterance {
      lang = "";
      rate = 1;
      pitch = 1;
      constructor(readonly text: string) {}
    }
    vi.stubGlobal("window", { speechSynthesis: { cancel, speak } });
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.spyOn(Date, "now").mockReturnValue(1000);

    expect(speakCoachCue("  세트 완료.  ")).toBe(true);
    expect(speakCoachCue("세트 완료.")).toBe(false);
    expect(speakCoachCue("가".repeat(49))).toBe(false);
    expect(speak).toHaveBeenCalledOnce();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("drops cues instead of building a queue while speech is active", () => {
    const speak = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { speaking: true, speak, cancel: vi.fn() } });
    vi.stubGlobal("SpeechSynthesisUtterance", class {});
    expect(speakCoachCue("좋습니다.")).toBe(false);
    expect(speak).not.toHaveBeenCalled();
  });

  it("reports speech errors and allows a user-gesture retry", () => {
    const speak = vi.fn();
    const onError = vi.fn();
    vi.stubGlobal("window", { speechSynthesis: { speak, cancel: vi.fn() } });
    vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(readonly text: string) {} });
    expect(speakCoachCue("음성 켜짐.", onError)).toBe(true);
    speak.mock.calls[0][0].onerror({ error: "not-allowed" });
    expect(onError).toHaveBeenCalledOnce();
    expect(speakCoachCue("음성 켜짐.", onError)).toBe(true);
    expect(speak.mock.calls[1][0].lang).toBe("ko-KR");
    expect(speak.mock.calls[1][0].volume).toBe(1);
  });
});
