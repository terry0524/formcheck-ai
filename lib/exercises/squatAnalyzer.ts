import { SquatEngine } from "@/lib/exerciseEngine";
import { SquatFormCoach } from "@/lib/formFeedback";
import type { SquatAnalysis, SquatRepEvaluation } from "@/types/exercise";
import type { ExerciseAnalyzer, ExerciseDetection, ExerciseFeedback, ExerciseFormEvaluation, ExerciseRepEvent } from "@/types/exerciseAnalyzer";
import type { PoseFrame } from "@/types/pose";

export class SquatAnalyzer implements ExerciseAnalyzer {
  readonly exerciseId = "squat";
  readonly supportsReps = true;
  private engine = new SquatEngine();
  private coach = new SquatFormCoach();
  private analysis: SquatAnalysis | null = null;
  private pendingRep: ExerciseRepEvent | null = null;
  private pendingFeedback: ExerciseFeedback | null = null;
  private evaluation: ExerciseFormEvaluation | null = null;

  detectState(frame: PoseFrame | null, timestamp: number): ExerciseDetection {
    this.analysis = this.engine.update(frame, timestamp);
    const cue = this.coach.update(this.analysis, timestamp);
    if (cue) this.pendingFeedback = cue;
    if (!this.analysis.tracking) this.evaluation = null;
    if (this.analysis.completedRep) {
      this.evaluation = toEvaluation(this.analysis.completedRep);
      this.pendingRep = { rep: this.analysis.repCount, evaluation: this.evaluation, rawEvaluation: this.analysis.completedRep };
    }
    const metrics = this.analysis.metrics;
    return {
      state: this.analysis.tracking ? this.analysis.phase : "UNABLE_TO_EVALUATE",
      tracking: this.analysis.tracking,
      side: null,
      metrics: {
        kneeAngle: metrics?.kneeAngle ?? null,
        hipAngle: metrics?.hipAngle ?? null,
        trunkAngle: metrics?.trunkAngle ?? null,
        hipDrop: metrics?.hipDrop ?? null,
        confidence: metrics?.confidence ?? null,
      },
    };
  }

  countRep() {
    const event = this.pendingRep;
    this.pendingRep = null;
    return event;
  }

  evaluateForm() { return this.evaluation; }

  getFeedback() {
    const feedback = this.pendingFeedback;
    this.pendingFeedback = null;
    return feedback;
  }

  reset() {
    this.engine.reset();
    this.coach.reset();
    this.analysis = null;
    this.pendingRep = null;
    this.pendingFeedback = null;
    this.evaluation = null;
  }
}

function toEvaluation(rep: SquatRepEvaluation): ExerciseFormEvaluation {
  return {
    score: rep.score,
    label: rep.label,
    issues: rep.issues,
    side: null,
    scoreBreakdown: {
      depth: rep.categoryScores.depth,
      trunk: rep.categoryScores.trunk,
      alignment: rep.categoryScores.alignment,
    },
  };
}
