import React from "react";
import "./DisplayTab.css";

export default function SectionDivider({ section }) {
  return (
    <div
      className="section-divider"
      style={{
        top: section.y,
        left: section.x,
        width: section.width,
        height: section.height,
        borderRadius: 16,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        border: "2px dashed #e0e0e0",
        position: "absolute",
        background: "rgba(255,255,255,0.4)",
        backdropFilter: "blur(4px)",
      }}
    />
  );
}
