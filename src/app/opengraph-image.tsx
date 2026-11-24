import { ImageResponse } from "next/og";
import { profile } from "@/data/portfolio";

export const alt = `${profile.name}: ${profile.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "radial-gradient(120% 90% at 30% 110%, #17324c 0%, #0b1724 40%, #000 100%)",
          color: "#e5e7eb",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", fontSize: 34, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
          {profile.logoLines.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 34, fontWeight: 700, letterSpacing: 3 }}>
          <span style={{ color: "#374151" }}>[[</span>
          <span style={{ color: "#d9eaf5" }}>{`   [${profile.role.toUpperCase()}]`}</span>
          <span style={{ color: "#7f9eb3", fontSize: 26, marginTop: 16 }}>Unity · C# · XR Interaction Toolkit · Meta SDK</span>
          <span style={{ color: "#f99c00", fontSize: 26, marginTop: 8 }}>5th Prize · Global Game Jam 2026</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#6a7282" }}>
          <span>{profile.location}</span>
          <span>{profile.email}</span>
        </div>
      </div>
    ),
    size,
  );
}
