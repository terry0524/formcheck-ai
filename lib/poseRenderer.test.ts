import { describe, expect, it } from "vitest";
import { getCoverTransform, mapPosePoint } from "@/lib/poseRenderer";

const center = { x: 0.5, y: 0.5, z: 0, visibility: 1 };

describe("poseRenderer object-cover mapping", () => {
  it("keeps the source center aligned in a portrait viewport", () => {
    const transform = getCoverTransform(1280, 720, 390, 844, false);
    expect(mapPosePoint(center, transform)).toEqual({ x: 195, y: 422 });
    expect(transform.width).toBeGreaterThan(390);
  });

  it("keeps the source center aligned in a landscape viewport", () => {
    const transform = getCoverTransform(1280, 720, 844, 390, false);
    expect(mapPosePoint(center, transform).x).toBeCloseTo(422);
    expect(mapPosePoint(center, transform).y).toBeCloseTo(195);
    expect(transform.height).toBeGreaterThan(390);
  });

  it("mirrors overlay coordinates with the front-camera preview", () => {
    const point = { x: 0.25, y: 0.4, z: 0, visibility: 1 };
    const normal = mapPosePoint(point, getCoverTransform(1280, 720, 390, 844, false));
    const mirrored = mapPosePoint(point, getCoverTransform(1280, 720, 390, 844, true));
    expect(mirrored.x).toBeCloseTo(390 - normal.x);
    expect(mirrored.y).toBeCloseTo(normal.y);
  });
});
