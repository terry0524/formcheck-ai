import { ImageResponse } from "next/og";

export const alt = "FormCheck — Choose a routine. Put your phone down. Just train.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#11110f", color: "white", padding: "64px 72px" }}>
      <div style={{ display: "flex", alignItems: "center", color: "#dfff00", fontSize: 28, fontWeight: 900, letterSpacing: "0.12em" }}>FORMCHECK</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 900, lineHeight: 0.94, letterSpacing: "-0.055em" }}>CHOOSE A ROUTINE.</div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 900, lineHeight: 0.94, letterSpacing: "-0.055em" }}>PUT YOUR PHONE DOWN.</div>
        <div style={{ display: "flex", fontSize: 82, fontWeight: 900, lineHeight: 0.94, letterSpacing: "-0.055em", color: "#dfff00" }}>JUST TRAIN.</div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#b8b8b0" }}>Routine apps tell you what to do. FormCheck watches how you do it.</div>
    </div>,
    size,
  );
}
