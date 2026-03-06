import { createPortal } from "react-dom";
import { Sun, Moon, Monitor, Check, ExternalLink } from "lucide-react";
import { useDropdown } from "../../hooks/useDropdown";
import type { ThemeMode } from "../../hooks/useTheme";
import type { Translations, Locale } from "../../i18n/translations";

interface Props {
  user: { firstname: string; lastname: string; mail?: string };
  redmineUrl: string;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  locale: Locale;
  locales: { code: Locale; label: string; flag: string }[];
  onLocaleChange: (code: Locale) => void;
  t: Translations;
}

export function ProfileMenu({
  user,
  redmineUrl,
  themeMode,
  onThemeModeChange,
  locale,
  locales,
  onLocaleChange,
  t,
}: Props) {
  const { open, toggle, close, triggerRef, menuRef, pos } = useDropdown<
    HTMLButtonElement,
    HTMLDivElement
  >({ alignRight: true, menuWidth: 280 });

  const initials = (user.firstname?.[0] ?? "") + (user.lastname?.[0] ?? "");
  const fullName = `${user.firstname} ${user.lastname}`.trim();

  const themeModes: { mode: ThemeMode; icon: typeof Sun; label: string }[] = [
    { mode: "light", icon: Sun, label: t.lightMode },
    { mode: "dark", icon: Moon, label: t.darkMode },
    { mode: "system", icon: Monitor, label: t.systemTheme },
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        className="profile-menu__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        title={fullName}
      >
        <span className="profile-menu__avatar">{initials}</span>
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="profile-menu md-elevation-2"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="profile-menu__header">
              <div className="profile-menu__avatar profile-menu__avatar--large">{initials}</div>
              <div style={{ minWidth: 0 }}>
                <div className="profile-menu__name">{fullName}</div>
                {user.mail && <div className="profile-menu__email">{user.mail}</div>}
              </div>
            </div>

            <div className="profile-menu__divider" />

            <div className="profile-menu__section-label">{t.appearance}</div>
            <div className="profile-menu__theme-group">
              {themeModes.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  className="profile-menu__theme-btn"
                  data-active={themeMode === mode || undefined}
                  onClick={() => onThemeModeChange(mode)}
                  title={label}
                  aria-label={label}
                  aria-pressed={themeMode === mode}
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>

            <div className="profile-menu__divider" />

            <div className="profile-menu__section-label">{t.language}</div>
            {locales.map((l) => (
              <button
                key={l.code}
                type="button"
                className="profile-menu__item"
                data-selected={l.code === locale || undefined}
                onClick={() => {
                  onLocaleChange(l.code);
                  close();
                }}
              >
                <span className="profile-menu__item-flag">{l.flag}</span>
                <span>{l.label}</span>
                {l.code === locale && <Check size={16} className="profile-menu__check" />}
              </button>
            ))}

            <div className="profile-menu__divider" />

            <a
              href={`${redmineUrl}/my/account`}
              target="_blank"
              rel="noopener noreferrer"
              className="profile-menu__item profile-menu__link"
              onClick={close}
            >
              <span>{t.redmineProfile}</span>
              <ExternalLink size={14} className="profile-menu__check" />
            </a>
          </div>,
          document.body,
        )}
    </>
  );
}
