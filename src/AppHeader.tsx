import { RefreshCw } from "lucide-react";
import { useI18n } from "./i18n/I18nContext";
import { ProfileMenu } from "./components/ui";
import { useAppContext } from "./AppContext";

const fmtHours = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${String(m).padStart(2, "0")}h`;
};

export default function AppHeader() {
  const { t, locale, setLocale, locales } = useI18n();
  const {
    user,
    redmineUrl,
    route,
    navigate,
    todayMinutes,
    weekMinutes,
    unsyncedCount,
    themeMode,
    setThemeMode,
    isRefreshing,
    onRefresh,
  } = useAppContext();
  const activeSection = route.section;

  return (
    <header className="bg-surface-container-low md-elevation-1 sticky top-0 z-30">
      <div className="flex h-14 items-center gap-2 px-6">
        <nav className="-ml-5 flex items-center self-stretch">
          <button
            onClick={() => navigate({ section: "tickets" })}
            className={`nav-tab relative flex h-full items-center px-5 text-sm font-medium tracking-[0.01em] transition-colors ${
              activeSection === "tickets"
                ? "text-on-surface"
                : "text-on-surface-variant hover:bg-on-surface/[0.08]"
            }`}
          >
            {t.tickets}
            {activeSection === "tickets" && (
              <span className="bg-primary absolute bottom-0 left-1/2 h-[3px] w-[calc(100%-16px)] -translate-x-1/2 rounded-full" />
            )}
          </button>

          <button
            onClick={() => navigate({ section: "timelog" })}
            className={`nav-tab relative flex h-full items-center gap-1.5 px-5 text-sm font-medium tracking-[0.01em] transition-colors ${
              activeSection === "timelog"
                ? "text-on-surface"
                : "text-on-surface-variant hover:bg-on-surface/[0.08]"
            }`}
          >
            {t.timeTracking}
            {unsyncedCount > 0 && (
              <span className="bg-error text-on-error flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold">
                {unsyncedCount}
              </span>
            )}
            {activeSection === "timelog" && (
              <span className="bg-primary absolute bottom-0 left-1/2 h-[3px] w-[calc(100%-16px)] -translate-x-1/2 rounded-full" />
            )}
          </button>

          {/* WIP — hidden until overview section is ready */}
          <button
            onClick={() => navigate({ section: "overview" })}
            className={`nav-tab relative hidden h-full items-center px-5 text-sm font-medium tracking-[0.01em] transition-colors ${
              activeSection === "overview"
                ? "text-on-surface"
                : "text-on-surface-variant hover:bg-on-surface/[0.08]"
            }`}
          >
            {t.overview}
            {activeSection === "overview" && (
              <span className="bg-primary absolute bottom-0 left-1/2 h-[3px] w-[calc(100%-16px)] -translate-x-1/2 rounded-full" />
            )}
          </button>
        </nav>

        <div className="flex-1" />

        <div
          className="hidden shrink-0 items-center gap-1.5 md:flex"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          <span className="text-on-surface-variant text-[11px]">
            {t.today}{" "}
            <strong className="text-on-surface font-semibold">{fmtHours(todayMinutes)}</strong>
          </span>
          <span className="text-outline text-[11px]">·</span>
          <span className="text-on-surface-variant text-[11px]">
            {t.week}{" "}
            <strong className="text-on-surface font-semibold">{fmtHours(weekMinutes)}</strong>
          </span>
        </div>

        <button
          onClick={onRefresh}
          className={`md-icon-btn md-icon-btn--standard${isRefreshing ? " md-icon-btn--refreshing" : ""}`}
          aria-label={t.refresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={20} className={isRefreshing ? "refresh-spin" : ""} />
        </button>

        <ProfileMenu
          user={user}
          redmineUrl={redmineUrl}
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          locale={locale}
          locales={locales}
          onLocaleChange={setLocale}
          t={t}
        />
      </div>
    </header>
  );
}
