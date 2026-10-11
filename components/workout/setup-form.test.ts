import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SetupForm } from "./setup-form";
import { WorkoutSetupClient } from "./workout-setup-client";

describe("hands-free workout start", () => {
  it("allows arming the workout before the user steps into full-body view", () => {
    const html = renderToStaticMarkup(React.createElement(SetupForm, { routineId: "squat-two-set-test" }));
    expect(html).toContain("/workout/squat?routine=squat-two-set-test");
    expect(html).toContain("카메라 켜고 준비하기</a>");
    expect(html).toContain("전신이 보이면 3초 후 자동 시작합니다.");
    expect(html).not.toContain('aria-disabled="true"');
  });
  it("shows preferences before mounting any camera preview", () => {
    const html = renderToStaticMarkup(React.createElement(WorkoutSetupClient, { routineId: "squat-two-set-test" }));
    expect(html).toContain("안내 방식");
    expect(html).toContain("음성 빈도");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("<canvas");
    expect(html.indexOf("안내 방식")).toBeLessThan(html.indexOf("카메라 켜고 준비하기"));
  });
});
