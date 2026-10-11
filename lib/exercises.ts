import type { ExerciseDefinition } from "@/types/exercise";

export const exerciseCatalog: Record<string, ExerciseDefinition> = {
  squat: { id: "squat", name: "스쿼트" },
  "reverse-lunge": { id: "reverse-lunge", name: "리버스 런지" },
  lunge: { id: "lunge", name: "런지" },
  "glute-bridge": { id: "glute-bridge", name: "글루트 브리지" },
  "air-squat": { id: "air-squat", name: "맨몸 스쿼트" },
  "standing-knee-drive": { id: "standing-knee-drive", name: "서서 무릎 올리기" },
  plank: { id: "plank", name: "플랭크" },
  "squat-reach": { id: "squat-reach", name: "스쿼트 리치" },
  "push-up": { id: "push-up", name: "Push-Up" },
  "mountain-climber": { id: "mountain-climber", name: "마운틴 클라이머" },
  "tempo-squat": { id: "tempo-squat", name: "템포 스쿼트" },
  "split-squat": { id: "split-squat", name: "스플릿 스쿼트" },
  "calf-raise": { id: "calf-raise", name: "카프 레이즈" },
  "wall-sit": { id: "wall-sit", name: "월 싯" },
  "dead-bug": { id: "dead-bug", name: "데드 버그" },
  "bird-dog": { id: "bird-dog", name: "버드 독" },
  "shoulder-tap": { id: "shoulder-tap", name: "숄더 탭" },
  "incline-push-up": { id: "incline-push-up", name: "Incline Push-Up" },
  "high-knees": { id: "high-knees", name: "하이 니즈" },
  "side-plank": { id: "side-plank", name: "사이드 플랭크" },
  "donkey-kick": { id: "donkey-kick", name: "동키 킥" },
};

export function getExerciseName(exerciseId: string) {
  return exerciseCatalog[exerciseId]?.name ?? exerciseId.replaceAll("-", " ");
}
