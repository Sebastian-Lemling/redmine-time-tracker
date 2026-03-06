import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDropdown } from "../../hooks/useDropdown";

const DONE_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export function ProgressRingMenu({
  value,
  color,
  trackColor,
  onSelect,
}: {
  value: number;
  color: string;
  trackColor: string;
  onSelect?: (value: number) => void;
}) {
  const {
    open,
    setOpen,
    triggerRef: btnRef,
    menuRef,
    pos,
  } = useDropdown<HTMLButtonElement, HTMLUListElement>({ alignRight: true, menuWidth: 80 });
  const [anim, setAnim] = useState<"idle" | "reset" | "fill" | "glow">("idle");
  const size = 28;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;

  useEffect(() => {
    if (anim === "reset") {
      requestAnimationFrame(() => setAnim("fill"));
    } else if (anim === "fill") {
      const t = setTimeout(() => setAnim("glow"), 600);
      return () => clearTimeout(t);
    } else if (anim === "glow") {
      const t = setTimeout(() => setAnim("idle"), 400);
      return () => clearTimeout(t);
    }
  }, [anim]);

  const handleMouseEnter = () => {
    if (anim === "idle" && value > 0) setAnim("reset");
  };

  const currentOffset = anim === "reset" ? circumference : offset;
  const fillTransition =
    anim === "reset" ? "none" : "stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)";

  return (
    <>
      <button
        ref={btnRef}
        className={`progress-ring${anim === "glow" ? " progress-ring--glow" : ""}`}
        title={`${value}%`}
        onClick={() => onSelect && setOpen((v) => !v)}
        onMouseEnter={handleMouseEnter}
        type="button"
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={currentOffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: fillTransition }}
          />
        </svg>
        <span className="progress-ring__label">{value}</span>
      </button>

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            className="progress-ring__menu md-elevation-2"
            role="listbox"
            style={{ top: pos.top, left: pos.left }}
          >
            {DONE_STEPS.map((step) => (
              <li
                key={step}
                role="option"
                aria-selected={step === value}
                className={`progress-ring__item${step === value ? " progress-ring__item--active" : ""}`}
                onClick={() => {
                  onSelect?.(step);
                  setOpen(false);
                }}
              >
                {step}%
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
