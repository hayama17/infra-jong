import React from "react";

const BACKBONE_CHARS = new Set(["S", "I", "A"]);

/**
 * Single tile component for インフラ雀.
 * Backbone chars (S, I, A) get orange/cyan gradient style.
 * Finisher chars get gray/navy style.
 */
export default function Tile({ char, onClick, selected, locked, faded }) {
  const isBackbone = BACKBONE_CHARS.has(char);

  const baseStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "52px",
    height: "68px",
    borderRadius: "8px",
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: "700",
    fontSize: "1.4rem",
    cursor: onClick && !locked ? "pointer" : "default",
    userSelect: "none",
    transition: "transform 0.15s, box-shadow 0.15s, opacity 0.15s",
    position: "relative",
    flexShrink: 0,
    opacity: faded ? 0.4 : 1,
    border: selected ? "2px solid #58a6ff" : "2px solid transparent",
    transform: selected ? "translateY(-8px)" : "none",
    boxShadow: selected
      ? "0 8px 24px rgba(88, 166, 255, 0.5)"
      : locked
      ? "0 2px 8px rgba(0,0,0,0.4)"
      : "0 4px 12px rgba(0,0,0,0.3)",
  };

  const backboneStyle = {
    ...baseStyle,
    background: "linear-gradient(135deg, #ff7e35 0%, #00d4ff 100%)",
    color: "#0d1117",
  };

  const finisherStyle = {
    ...baseStyle,
    background: "linear-gradient(135deg, #30363d 0%, #1c2a3a 100%)",
    color: "#e6edf3",
  };

  const lockedStyle = {
    ...baseStyle,
    background: "linear-gradient(135deg, #1a3a2a 0%, #0d2818 100%)",
    color: "#3fb950",
    cursor: "default",
    border: "2px solid #238636",
  };

  let style = isBackbone ? backboneStyle : finisherStyle;
  if (locked) style = lockedStyle;

  const handleClick = () => {
    if (onClick && !locked) onClick();
  };

  return (
    <div style={style} onClick={handleClick} title={char}>
      {char}
      {locked && (
        <span
          style={{
            position: "absolute",
            top: "2px",
            right: "4px",
            fontSize: "0.5rem",
            color: "#3fb950",
            opacity: 0.8,
          }}
        >
          ✓
        </span>
      )}
    </div>
  );
}
