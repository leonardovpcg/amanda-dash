"use client";

import { NOTICES } from "@/lib/dashboard/data";
import { MONO, cardTitle } from "./ui";

export default function Avisos({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        background: "rgba(38,42,38,.28)",
        backdropFilter: "blur(3px)",
      }}
    >
      <div
        className="dash-notif"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: "24px 26px 14px",
          background: "rgba(252,251,248,.94)",
          border: "1px solid rgba(255,255,255,.9)",
          boxShadow: "0 26px 60px rgba(38,42,38,.24)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={cardTitle}>Avisos de hoje</div>
          <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>4 novos</div>
        </div>
        {NOTICES.map(([title, detail, time, color], i) => (
          <div
            key={i}
            style={{ display: "flex", gap: 13, padding: "15px 0", borderTop: "1px solid #F0EDE5" }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                flex: "none",
                marginTop: 6,
                background: color,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.005em" }}>
                {title}
              </div>
              <div
                style={{ fontSize: "12.5px", color: "#6E6A5F", marginTop: 3, lineHeight: 1.45 }}
              >
                {detail}
              </div>
              <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689", marginTop: 5 }}>
                {time}
              </div>
            </div>
          </div>
        ))}
        <button
          className="dash-btn-ghost"
          onClick={onClose}
          style={{
            width: "100%",
            margin: "8px 0 6px",
            background: "rgba(255,255,255,.7)",
            borderRadius: 999,
            padding: "11px 16px",
            fontSize: "12.5px",
          }}
        >
          Marcar tudo como lido
        </button>
      </div>
    </div>
  );
}
