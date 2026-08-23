"use client";

import { AGENDA } from "@/lib/dashboard/data";
import { MONO, NUM, cardTitle, mono, panel } from "./ui";

export default function Agenda() {
  return (
    <div className="dash-tabpad" style={{ maxWidth: 1440 }}>
      <div className="dash-grid-3">
        {AGENDA.map(([title, subtitle, items]) => (
          <div key={title} style={{ ...panel, padding: "26px 28px 14px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={cardTitle}>{title}</div>
              <div style={{ fontFamily: MONO, fontSize: "10.5px", color: "#9A9689" }}>
                {items.length}
              </div>
            </div>
            <div style={{ fontSize: "12.5px", color: "#8C887C", marginTop: 4 }}>{subtitle}</div>
            <div style={{ marginTop: 18 }}>
              {items.map(([day, month, t, detail, meta, metaColor], i) => (
                <div
                  key={i}
                  style={{ display: "flex", gap: 14, padding: "15px 0", borderTop: "1px solid #F4F1EA" }}
                >
                  <div style={{ width: 52, flex: "none", textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: "17px",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        ...NUM,
                      }}
                    >
                      {day}
                    </div>
                    <div style={mono(10, "#9A9689", { upper: true })}>{month}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13.5px", fontWeight: 600, letterSpacing: "-0.005em" }}>
                      {t}
                    </div>
                    <div style={{ fontSize: "12.5px", color: "#6E6A5F", marginTop: 3 }}>{detail}</div>
                    <div style={{ fontFamily: MONO, fontSize: "10.5px", color: metaColor, marginTop: 5 }}>
                      {meta}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
