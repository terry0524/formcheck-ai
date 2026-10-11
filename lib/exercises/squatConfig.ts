/**
 * Squat calibration values live here so state transitions and scoring can be
 * audited together. Angles are degrees, normalized distances use image height,
 * velocities are units/second, and durations are milliseconds.
 */
export const SQUAT_CONFIG = {
  geometry: {
    minimumLandmarkVisibility: 0.5,
    minimumBodyScale: 0.08,
    alignment: {
      minimumBodyHeight: 0.35,
      minimumLandmarkVisibility: 0.65,
      minimumShoulderWidthRatio: 0.22,
      minimumHipWidthRatio: 0.1,
      minimumReferenceWidth: 0.04,
      expectedKneeWidthRatio: 0.82,
    },
  },
  tracking: {
    minimumConfidence: 0.58,
    resetAfterLossMs: 500,
  },
  smoothing: {
    timeConstantMs: 120,
    initialDeltaMs: 50,
    minimumDeltaMs: 16,
    maximumDeltaMs: 250,
    standingBaselineAlpha: 0.04,
  },
  state: {
    standing: {
      minimumKneeAngle: 160,
      minimumHipAngle: 150,
    },
    descending: {
      maximumKneeAngle: 154,
      maximumHipAngle: 150,
      minimumHipDrop: 0.02,
      maximumKneeVelocity: -6,
      sustainMs: 120,
    },
    bottom: {
      maximumKneeAngle: 120,
      maximumHipAngle: 130,
      minimumHipDrop: 0.08,
      sustainMs: 160,
    },
    ascending: {
      minimumKneeAngle: 128,
      minimumKneeVelocity: 8,
      maximumHipVelocity: -0.01,
      sustainMs: 120,
    },
    completion: {
      // A completed ascent may estimate a straightened knee several degrees
      // below the 160-degree baseline gate. Use a separate return boundary;
      // bottom evidence, hip extension, hip-height recovery and dwell still apply.
      minimumKneeAngle: 154,
      maximumHipDrop: 0.055,
      sustainMs: 200,
    },
    incomplete: {
      maximumHipDrop: 0.05,
      sustainMs: 180,
    },
    minimumRepMs: 700,
    repDebounceMs: 700,
    maximumActivePhaseMs: 6000,
  },
  quality: {
    weights: {
      depth: 40,
      trunk: 35,
      alignment: 25,
    },
    optimalKneeAngle: 100,
    shallowKneeAngle: 105,
    optimalHipDrop: 0.12,
    shallowMinimumHipDrop: 0.1,
    trunkScoreStartAngle: 38,
    trunkIssueAngle: 42,
    alignmentScoreStart: 0.08,
    alignmentIssue: 0.12,
    depthKneeLossPerDegree: 4,
    depthHipDropLossPerUnit: 250,
    trunkLossPerDegree: 4,
    alignmentLossPerUnit: 500,
    goodScore: 80,
    shallowFeedbackSustainMs: 300,
    feedbackSustainMs: 350,
    feedbackCooldownMs: 7000,
    trunkFeedbackMargin: 3,
    alignmentFeedbackMargin: 0.02,
  },
} as const;

export const SQUAT_SCORE_WEIGHTS = SQUAT_CONFIG.quality.weights;
