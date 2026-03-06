import { ChevronRight } from "lucide-react";
import { formatDurationHM } from "../../lib/dates";
import { useI18n } from "../../i18n/I18nContext";

interface Props {
  totalMinutes: number;
  avgPerDay: number;
  workDays: number;
  totalUnsyncedCount: number;
  firstUnsyncedDay: number | null;
  showBatchBar: boolean;
  selectedCount: number;
  batchSyncing: boolean;
  onNavigateToDay: (day: number) => void;
  onBatchSync: () => void;
}

export function MonthViewFooter({
  totalMinutes,
  avgPerDay,
  workDays,
  totalUnsyncedCount,
  firstUnsyncedDay,
  showBatchBar,
  selectedCount,
  batchSyncing,
  onNavigateToDay,
  onBatchSync,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="cal-footer">
      <div className="cal-footer__stats">
        <span className="cal-footer__chip cal-footer__chip--primary">
          {t.total} <strong>{formatDurationHM(totalMinutes)}</strong>
        </span>
        <span className="cal-footer__chip">
          {t.avgPerDay} <strong>{formatDurationHM(avgPerDay)}</strong>
        </span>
        <span className="cal-footer__chip">
          {t.workDays} <strong>{workDays}</strong>
        </span>
        {totalUnsyncedCount > 0 && (
          <button
            className="cal-footer__chip cal-footer__chip--warn"
            onClick={() => firstUnsyncedDay && onNavigateToDay(firstUnsyncedDay)}
          >
            {t.drafts} <strong>{totalUnsyncedCount}</strong>
            <ChevronRight className="cal-footer__chip-icon" />
          </button>
        )}
      </div>

      {showBatchBar && (
        <div className="cal-footer__batch">
          <span className="cal-footer__batch-count">{t.selected(selectedCount)}</span>
          <button onClick={onBatchSync} className="cal-footer__batch-sync" disabled={batchSyncing}>
            {batchSyncing ? t.syncing : t.sync}
          </button>
        </div>
      )}
    </div>
  );
}
