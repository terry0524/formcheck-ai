import type { DemoRoutine, Difficulty, Routine, RoutineCategory } from "@/types/routine";

// Keep persisted IDs/enums stable; translate only their display labels.
export const difficultyLabels: Record<Difficulty, string> = { Beginner: "초급", Intermediate: "중급", Advanced: "고급" };
export const routineCategoryLabels: Record<RoutineCategory, string> = {
  Featured: "추천", Beginner: "초급", "Home Workout": "홈트", "Lower Body": "하체", "Upper Body": "상체", "No Equipment": "맨몸", "Quick Workout": "짧은 운동",
};

export const routineCategories: readonly RoutineCategory[] = ["Featured", "Beginner", "Home Workout", "Lower Body", "Upper Body", "No Equipment", "Quick Workout"];

export const routines: DemoRoutine[] = [
  {
    id: "beginner-lower-body", title: "초급 하체 루틴", description: "스쿼트와 런지를 차분한 속도로 연습하는 하체 루틴입니다.", difficulty: "Beginner", estimatedDuration: 20, focus: "하체 · 엉덩이",
    categories: ["Featured", "Beginner", "Home Workout", "Lower Body", "No Equipment"], origin: "demo",
    exercises: [{ exerciseId: "squat", sets: 3, reps: 12, restSeconds: 60 }, { exerciseId: "reverse-lunge", sets: 3, reps: 10, restSeconds: 60 }, { exerciseId: "glute-bridge", sets: 3, reps: 15, restSeconds: 45 }],
  },
  {
    id: "morning-ten", title: "10분 아침 운동", description: "하체와 코어를 가볍게 깨우는 아침 루틴입니다.", difficulty: "Beginner", estimatedDuration: 10, focus: "가동성 · 코어",
    categories: ["Featured", "Beginner", "Home Workout", "No Equipment", "Quick Workout"], origin: "demo",
    exercises: [{ exerciseId: "air-squat", sets: 2, reps: 10, restSeconds: 30 }, { exerciseId: "standing-knee-drive", sets: 2, duration: 30, restSeconds: 30 }, { exerciseId: "plank", sets: 2, duration: 30, restSeconds: 30 }],
  },
  {
    id: "no-equipment-full-body", title: "맨몸 전신 운동", description: "작은 공간에서 진행하는 전신 맨몸 루틴입니다.", difficulty: "Intermediate", estimatedDuration: 25, focus: "전신",
    categories: ["Featured", "Home Workout", "No Equipment"], origin: "demo",
    exercises: [{ exerciseId: "squat-reach", sets: 3, reps: 12, restSeconds: 45 }, { exerciseId: "push-up", sets: 3, reps: 10, restSeconds: 60 }, { exerciseId: "mountain-climber", sets: 3, duration: 30, restSeconds: 45 }],
  },
  {
    id: "leg-day", title: "차분한 하체 운동", description: "속도를 조절하며 균형과 하체 움직임을 연습합니다.", difficulty: "Intermediate", estimatedDuration: 35, focus: "하체",
    categories: ["Featured", "Home Workout", "Lower Body", "No Equipment"], origin: "demo",
    exercises: [{ exerciseId: "tempo-squat", sets: 4, reps: 10, restSeconds: 60 }, { exerciseId: "split-squat", sets: 3, reps: 10, restSeconds: 60 }, { exerciseId: "calf-raise", sets: 3, reps: 18, restSeconds: 45 }],
  },
  {
    id: "core-reset", title: "코어 기초 운동", description: "서두르지 않고 몸통을 안정시키는 바닥 운동입니다.", difficulty: "Beginner", estimatedDuration: 12, focus: "코어",
    categories: ["Beginner", "Home Workout", "No Equipment", "Quick Workout"], origin: "demo",
    exercises: [{ exerciseId: "dead-bug", sets: 3, reps: 8, restSeconds: 30 }, { exerciseId: "bird-dog", sets: 3, reps: 8, restSeconds: 30 }, { exerciseId: "plank", sets: 2, duration: 30, restSeconds: 30 }],
  },
  {
    id: "upper-body-foundations", title: "상체 기초 운동", description: "기울기를 활용한 푸시업과 상체 맨몸 운동입니다.", difficulty: "Beginner", estimatedDuration: 18, focus: "가슴 · 어깨",
    categories: ["Beginner", "Home Workout", "Upper Body", "No Equipment"], origin: "demo",
    exercises: [{ exerciseId: "incline-push-up", sets: 3, reps: 10, restSeconds: 60 }, { exerciseId: "shoulder-tap", sets: 3, reps: 12, restSeconds: 45 }, { exerciseId: "side-plank", sets: 2, duration: 25, restSeconds: 30 }],
  },
  {
    id: "express-sweat", title: "8분 짧은 운동", description: "시간이 짧은 날을 위한 세 가지 맨몸 동작입니다.", difficulty: "Intermediate", estimatedDuration: 8, focus: "짧은 운동 · 유산소",
    categories: ["Home Workout", "No Equipment", "Quick Workout"], origin: "demo",
    exercises: [{ exerciseId: "squat", sets: 2, reps: 12, restSeconds: 20 }, { exerciseId: "high-knees", sets: 2, duration: 30, restSeconds: 20 }, { exerciseId: "mountain-climber", sets: 2, duration: 25, restSeconds: 20 }],
  },
  {
    id: "glute-leg-strength", title: "엉덩이·하체 운동", description: "엉덩이와 하체를 번갈아 사용하는 루틴입니다.", difficulty: "Intermediate", estimatedDuration: 28, focus: "엉덩이 · 하체",
    categories: ["Home Workout", "Lower Body", "No Equipment"], origin: "demo",
    exercises: [{ exerciseId: "glute-bridge", sets: 4, reps: 15, restSeconds: 45 }, { exerciseId: "reverse-lunge", sets: 3, reps: 10, restSeconds: 60 }, { exerciseId: "donkey-kick", sets: 3, reps: 12, restSeconds: 45 }],
  },
  {
    id: "push-core", title: "상체·코어 운동", description: "푸시업과 코어 안정 동작을 번갈아 진행합니다.", difficulty: "Intermediate", estimatedDuration: 22, focus: "상체 · 코어",
    categories: ["Home Workout", "Upper Body", "No Equipment"], origin: "demo",
    exercises: [{ exerciseId: "push-up", sets: 3, reps: 8, restSeconds: 60 }, { exerciseId: "dead-bug", sets: 3, reps: 10, restSeconds: 30 }, { exerciseId: "shoulder-tap", sets: 3, reps: 12, restSeconds: 45 }],
  },
  {
    id: "low-impact-conditioning", title: "점프 없는 유산소", description: "점프 없이 진행하는 간단한 유산소 루틴입니다.", difficulty: "Beginner", estimatedDuration: 15, focus: "점프 없음 · 유산소",
    categories: ["Beginner", "Home Workout", "No Equipment", "Quick Workout"], origin: "demo",
    exercises: [{ exerciseId: "standing-knee-drive", sets: 3, duration: 35, restSeconds: 25 }, { exerciseId: "squat", sets: 3, reps: 10, restSeconds: 40 }, { exerciseId: "wall-sit", sets: 2, duration: 30, restSeconds: 35 }],
  },
];

export const squatTwoSetTestRoutine: Routine = {
  id: "squat-two-set-test", title: "스쿼트 시연", description: "실제 카메라 자세 분석으로 스쿼트 5회씩 2세트를 진행합니다. 시연용 휴식은 5초입니다.", difficulty: "Beginner", estimatedDuration: 2, focus: "대회 시연",
  exercises: [{ exerciseId: "squat", sets: 2, reps: 5, restSeconds: 5 }],
};

export function getRoutine(id: string): Routine | undefined {
  if (id === squatTwoSetTestRoutine.id) return squatTwoSetTestRoutine;
  return routines.find((routine) => routine.id === id);
}
