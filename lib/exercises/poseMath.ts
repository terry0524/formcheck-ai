import type { PoseLandmark } from "@/types/pose";

export function angleBetween(a: PoseLandmark, vertex: PoseLandmark, c: PoseLandmark) {
  const first = { x: a.x - vertex.x, y: a.y - vertex.y, z: a.z - vertex.z };
  const second = { x: c.x - vertex.x, y: c.y - vertex.y, z: c.z - vertex.z };
  const denominator = Math.hypot(first.x, first.y, first.z) * Math.hypot(second.x, second.y, second.z);
  if (denominator < 1e-6) return null;
  const cosine = clamp((first.x * second.x + first.y * second.y + first.z * second.z) / denominator, -1, 1);
  return Math.acos(cosine) * 180 / Math.PI;
}

export function midpoint(a: PoseLandmark, b: PoseLandmark): PoseLandmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, visibility: (a.visibility + b.visibility) / 2 };
}

export function minVisibility(points: Array<PoseLandmark | undefined>) {
  return points.length === 0 || points.some((point) => !point) ? 0 : Math.min(...points.map((point) => point?.visibility ?? 0));
}

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function smooth(previous: number, next: number, alpha = 0.3) {
  return previous + alpha * (next - previous);
}
