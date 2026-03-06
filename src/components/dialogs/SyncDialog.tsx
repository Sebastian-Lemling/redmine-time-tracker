import { useState, useEffect } from "react";
import { Loader2, Upload } from "lucide-react";
import { M3Select } from "../ui/M3Select";
import type { RedmineActivity, TimeLogEntry } from "../../types/redmine";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  entry: TimeLogEntry;
  activities: RedmineActivity[];
  onSync: (entryId: string, activityId: number) => Promise<void>;
  onCancel: () => void;
}

export function SyncDialog({ entry, activities, onSync, onCancel }: Props) {
  const { t } = useI18n();
  const [activityId, setActivityId] = useState(entry.activityId?.toString() || "");
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activities.length === 0) return;
    const currentValid = activityId && activities.some((a) => a.id.toString() === activityId);
    if (!currentValid) {
      const stored =
        entry.activityId && activities.some((a) => a.id === entry.activityId)
          ? entry.activityId.toString()
          : null;
      if (stored) {
        setActivityId(stored);
      } else {
        const def = activities.find((a) => a.is_default) || activities[0];
        setActivityId(def.id.toString());
      }
    }
  }, [activities]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !syncing) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel, syncing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activityId) return;
    setSyncing(true);
    setError(null);
    try {
      await onSync(entry.id, Number(activityId));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.syncFailed);
    } finally {
      setSyncing(false);
    }
  };

  const hours = entry.duration / 60;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !syncing) onCancel();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="md-elevation-3"
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "var(--md-dialog-surface)",
          borderRadius: 28,
          animation: "md-scale-in 200ms cubic-bezier(0, 0, 0.2, 1) both",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 24, paddingBottom: 16 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: "var(--color-primary-container)",
                color: "var(--color-on-primary-container)",
              }}
            >
              <Upload style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h3
                id="sync-dialog-title"
                className="md-headline-small"
                style={{ color: "var(--color-on-surface)" }}
              >
                {t.syncToRedmine}
              </h3>
            </div>
          </div>
          <p className="md-body-medium" style={{ color: "var(--color-on-surface-variant)" }}>
            {t.activityRequired}
          </p>
        </div>

        <div style={{ padding: "0 24px", marginBottom: 16 }}>
          <div
            style={{
              backgroundColor: "var(--color-surface-container-low)",
              border: "1px solid var(--color-outline-variant)",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className="md-title-small truncate"
                style={{ color: "var(--color-on-surface)", flex: 1 }}
              >
                #{entry.issueId} &middot; {entry.issueSubject}
              </span>
              <span
                className="md-title-small shrink-0"
                style={{
                  color: "var(--color-on-surface)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {hours.toFixed(2)}h
              </span>
            </div>
            {entry.description && (
              <p
                className="md-body-small"
                style={{
                  color: "var(--color-on-surface-variant)",
                  marginTop: 8,
                }}
              >
                {entry.description}
              </p>
            )}
          </div>
        </div>

        <div style={{ padding: "0 24px", marginBottom: 8 }}>
          <M3Select
            label={t.activityRequired}
            value={activityId}
            options={activities.map((a) => ({ value: String(a.id), label: a.name }))}
            onChange={setActivityId}
            elevated
          />
        </div>

        {error && (
          <div
            style={{
              margin: "0 24px 8px",
              backgroundColor: "var(--color-error-container)",
              color: "var(--color-on-error-container)",
              borderRadius: 12,
              padding: "12px 16px",
            }}
          >
            <span className="md-body-medium">{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2" style={{ padding: "16px 24px 24px" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={syncing}
            className="md-label-large md-interactive"
            style={{
              padding: "10px 24px",
              color: "var(--color-primary)",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
              opacity: syncing ? 0.38 : 1,
            }}
          >
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={syncing || !activityId}
            className="md-label-large md-interactive flex items-center gap-2"
            style={{
              padding: "10px 24px",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-on-primary)",
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
              opacity: syncing || !activityId ? 0.38 : 1,
            }}
          >
            {syncing ? (
              <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
            ) : (
              <Upload style={{ width: 18, height: 18 }} />
            )}
            {syncing ? t.syncing : t.sync}
          </button>
        </div>
      </form>
    </div>
  );
}
