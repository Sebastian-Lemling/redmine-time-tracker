import { useEffect, useRef } from "react";

export interface SnackbarData {
  message: string;
  action?: { label: string; onClick: () => void };
}

interface Props {
  data: SnackbarData | null;
  onDismiss: () => void;
}

export function Snackbar({ data, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onDismissRef = useRef(onDismiss);
  // eslint-disable-next-line react-hooks/refs
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!data) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onDismissRef.current(), 4000);
    return () => clearTimeout(timerRef.current);
  }, [data]);

  if (!data) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="md-elevation-3"
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 280,
        maxWidth: 560,
        padding: "14px 16px",
        borderRadius: 8,
        backgroundColor: "var(--color-inverse-surface)",
        color: "var(--color-inverse-on-surface)",
        fontSize: 14,
        lineHeight: "20px",
        animation: "snackbar-enter 150ms cubic-bezier(0.05, 0.7, 0.1, 1) both",
      }}
    >
      <span style={{ flex: 1 }}>{data.message}</span>
      {data.action && (
        <button
          onClick={() => {
            data.action!.onClick();
            onDismiss();
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-inverse-primary)",
            fontWeight: 500,
            fontSize: 14,
            padding: "0 4px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            letterSpacing: "0.1px",
          }}
        >
          {data.action.label}
        </button>
      )}
    </div>
  );
}
