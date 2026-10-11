import { describe, expect, it } from "vitest";
import { cameraErrorMessage, cameraPrerequisiteMessage, findUltraWideCamera } from "@/components/camera/camera-preview";

describe("explicit ultrawide lens detection", () => {
  const cameras: Pick<MediaDeviceInfo, "kind" | "label" | "deviceId">[] = [
    { kind: "videoinput", label: "Back Camera", deviceId: "main" },
    { kind: "videoinput", label: "Back Ultra Wide Camera", deviceId: "wide" },
    { kind: "videoinput", label: "Front Ultra-Wide Camera", deviceId: "front-wide" },
  ];
  it("selects only a named lens with the requested facing direction", () => {
    expect(findUltraWideCamera(cameras, "environment")?.deviceId).toBe("wide");
    expect(findUltraWideCamera(cameras, "user")?.deviceId).toBe("front-wide");
  });
  it("does not guess unnamed, virtual or ordinary wide cameras", () => {
    expect(findUltraWideCamera([{ kind: "videoinput", label: "Back Wide Angle Camera", deviceId: "a" }, { kind: "videoinput", label: "Back Triple Camera", deviceId: "b" }, { kind: "videoinput", label: "", deviceId: "c" }], "environment")).toBeUndefined();
  });
  it("rejects missing IDs and unspecified facing direction", () => {
    expect(findUltraWideCamera([{ kind: "videoinput", label: "Ultra Wide Camera", deviceId: "a" }, { kind: "videoinput", label: "Back Ultra Wide Camera", deviceId: "" }], "environment")).toBeUndefined();
  });
});

describe("cameraErrorMessage", () => {
  it("explains a denied camera permission", () => {
    expect(cameraErrorMessage(new DOMException("denied", "NotAllowedError"))).toContain("권한이 거부");
  });

  it("explains a missing camera", () => {
    expect(cameraErrorMessage(new DOMException("missing", "NotFoundError"))).toContain("카메라를 찾지 못했습니다");
  });

  it("explains a busy camera", () => {
    expect(cameraErrorMessage(new DOMException("busy", "NotReadableError"))).toContain("다른 앱이 카메라를 사용 중");
  });
});

describe("cameraPrerequisiteMessage", () => {
  it("requires HTTPS outside the browser's trusted localhost exception", () => {
    expect(cameraPrerequisiteMessage(false, true)).toContain("HTTPS");
  });

  it("accepts a secure context with getUserMedia", () => {
    expect(cameraPrerequisiteMessage(true, true)).toBeNull();
  });
});
