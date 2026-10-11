import type { ExerciseFeedback } from "@/types/exerciseAnalyzer";

export class FeedbackGate {
  private pending = new Map<string, number>();
  private lastEmitted = new Map<string, number>();

  sustained(code: string, message: string, condition: boolean, timestamp: number, sustainMs = 350, cooldownMs = 7000): ExerciseFeedback | null {
    if (!condition) {
      this.pending.delete(code);
      return null;
    }
    const since = this.pending.get(code);
    if (since === undefined) {
      this.pending.set(code, timestamp);
      return null;
    }
    if (timestamp - since < sustainMs) return null;
    this.pending.delete(code);
    return this.emit(code, message, timestamp, cooldownMs);
  }

  emit(code: string, message: string, timestamp: number, cooldownMs = 7000) {
    if (timestamp - (this.lastEmitted.get(code) ?? -Infinity) < cooldownMs) return null;
    this.lastEmitted.set(code, timestamp);
    return { code, message, emittedAt: timestamp };
  }

  reset() {
    this.pending.clear();
    this.lastEmitted.clear();
  }
}
