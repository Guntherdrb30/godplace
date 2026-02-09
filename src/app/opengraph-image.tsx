import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Godplaces.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(120deg, #FFFFFF 0%, #EAF7F6 45%, #EAF1F2 100%)",
          padding: 64,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 28, color: "#004B57", letterSpacing: -0.5 }}>Godplaces.</div>
          <div style={{ fontSize: 64, color: "#004B57", lineHeight: 1.05, letterSpacing: -1.2 }}>
            Alquiler temporal en Venezuela
          </div>
          <div style={{ fontSize: 28, color: "rgba(0,75,87,0.75)", maxWidth: 900 }}>
            Catálogo aprobado, verificación KYC y operación centralizada.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 22, color: "rgba(0,75,87,0.7)" }}>
            Desarrollado y operado por Trends172Tech.com
          </div>
          <div style={{ width: 90, height: 14, borderRadius: 999, background: "#32B5AD" }} />
        </div>
      </div>
    ),
    size,
  );
}
