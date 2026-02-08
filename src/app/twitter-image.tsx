import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Godplaces.";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, rgba(50,181,173,0.18) 0%, #FFFFFF 40%, rgba(0,75,87,0.10) 100%)",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 26, color: "#004B57" }}>Godplaces.</div>
          <div style={{ fontSize: 58, color: "#004B57", lineHeight: 1.06 }}>
            Hospédate mejor en Venezuela
          </div>
        </div>
        <div style={{ fontSize: 22, color: "rgba(0,75,87,0.7)" }}>
          Desarrollado y operado por Trends172Tech.com
        </div>
      </div>
    ),
    size,
  );
}

