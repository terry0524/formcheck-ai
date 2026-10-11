import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#11110f", color: "#dfff00", fontSize: 82, fontWeight: 900, letterSpacing: "-0.08em" }}>FC</div>,
    size,
  );
}
