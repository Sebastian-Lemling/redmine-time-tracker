export interface Translations {
  // App header
  tickets: string;
  timeTracking: string;
  overview: string;
  today: string;
  week: string;
  search: string;
  refresh: string;

  // Theme
  lightMode: string;
  darkMode: string;
  systemTheme: string;

  // Ticket list
  openIssues: (count: number, projects: number) => string;
  filterProjects: string;
  searchProjects: string;
  allProjects: string;
  noTickets: string;
  noTicketsDesc: string;
  searchTickets: string;
  expandAll: string;
  collapseAll: string;
  showTrackedOnly: string;

  // Timer
  start: string;
  pause: string;
  save: string;
  discard: string;
  running: string;
  paused: string;

  // Time log section
  timeLog: string;
  entriesNotSynced: (count: number) => string;
  month: string;
  weekLabel: string;
  syncAll: (count: number) => string;
  noEntries: string;
  noEntriesDesc: string;

  // Month view
  months: string[];
  monthsShort: string[];
  weekdays: string[];
  weekdaysShort: string[];
  dayHeaders: string[];
  formatPickerHeader: (weekday: string, month: string, day: number) => string;
  todayBtn: string;
  prevMonth: string;
  nextMonth: string;
  prevWeek: string;
  nextWeek: string;
  total: string;
  avgPerDay: string;
  workDays: string;
  open: string;
  drafts: string;

  // Detail panel
  local: string;
  remote: string;
  totalLabel: string;
  openTab: string;
  syncedTab: string;
  allSynced: string;
  noOpenEntries: string;
  nothingSyncedYet: string;
  syncedEntriesAppearHere: string;
  noEntriesToday: string;
  noTimeTracked: string;
  selectEntries: string;
  selectAll: string;
  selected: (count: number) => string;
  sortByTime: string;
  sortByProject: string;
  sortByDuration: string;
  sync: string;

  // Duration
  lessTime: string;
  moreTime: string;

  // Actions
  edit: string;
  delete: string;
  cancel: string;
  saveBtn: string;

  // Sync
  syncFailed: string;
  synced: string;
  entriesNeedActivity: (count: number) => string;
  syncedCount: (synced: number, failed: number) => string;

  // Description dialog
  activity: string;
  activityRequired: string;
  whatDidYouDo: string;
  bookTime: string;

  // Edit dialog
  editEntry: string;
  date: string;
  duration: string;
  description: string;
  hours: string;

  // Sync dialog
  syncToRedmine: string;
  syncing: string;

  // Ticket card
  copied: string;
  copyId: (id: number) => string;
  manualBook: string;
  bookDirectly: string;

  // Assignee
  notAssigned: string;

  // Version
  noVersion: string;
  versionUpdated: (name: string) => string;
  versionChangeFailed: string;

  // Status
  statusUpdated: (name: string) => string;
  statusChangeFailed: string;
  typeUpdated: (name: string) => string;
  typeChangeFailed: string;
  assigneeUpdated: string;
  assigneeChangeFailed: string;

  // Errors
  connectionFailed: string;
  checkProxy: string;
  runSetup: string;
  connecting: string;
  dismiss: string;

  // WeekView
  project: string;
  calendarWeek: string;

  // DatePicker
  selectDate: string;

  // ProjectFilter
  filter: string;
  all: string;
  none: string;

  // Ticket card extra
  descriptionOptional: string;
  book: string;

  // ActiveTimer / aria
  timerRunningFor: (id: number, subject: string) => string;
  pauseTimer: string;
  saveTimeEntry: string;
  subtractMinute: string;
  addMinute: string;
  discardTimer: string;
  startTimer: string;
  bookManually: string;

  // AssigneeMenu
  assignPerson: string;
  loading: string;

  // Remote sync
  loadingRemote: string;
  remoteError: string;

  // Ticket description
  noDescription: string;

  // Comments
  comments: string;
  noComments: string;

  // Progress
  progress: string;

  // Language
  language: string;

  // Profile menu
  appearance: string;
  redmineProfile: string;

  // Search panel
  searchAllProjects: string;
  searchPlaceholder: string;
  searchResults: (count: number, total: number) => string;
  noSearchResults: string;
  loadMore: string;
  clearFilters: string;
  pinnedTickets: string;
  recentlyPinned: string;
  allStatuses: string;
  allTrackers: string;
  allPriorities: string;
  allProjectsSearch: string;
  priority: string;
  alreadyAssigned: string;
  myTickets: string;
  noPinnedTickets: string;
  openSearch: string;
  notesComingSoon: string;
  searchTab: string;
  notes: string;
  searchPrompt: string;

  // Search errors
  searchError: string;
  retrySearch: string;
  connectionError: string;

  // Search accessibility
  searchInputLabel: string;
  clearSearchInput: string;
  filterByLabel: (param: string) => string;
  filterMenuOpen: string;
  resultsFound: (count: number) => string;
  pinIssue: (id: number) => string;
  unpinIssue: (id: number) => string;
  filters: string;

  // Search loading
  loadingMoreResults: string;

  // Search keyboard hints
  escToClear: string;

  // Search highlighting
  noExactMatch: string;

  // Search pagination
  showingXofY: (shown: number, total: number) => string;

  // Recent searches
  recentSearches: string;
  clearRecentSearches: string;

  // Sort options
  sortBy: string;
  sortUpdatedDesc: string;
  sortUpdatedAsc: string;
  sortPriorityDesc: string;
  sortCreatedDesc: string;
  sortIdDesc: string;

  // Assignee / version filters
  allAssignees: string;
  allVersions: string;
  assignee: string;
  targetVersion: string;

  // Filter menu states
  openFilterMenu: string;
  closeFilterMenu: string;

  // Conflict detection
  conflictDetected: string;

  // Refresh feedback
  refreshUpdated: (count: number) => string;
  refreshNoChanges: string;
  refreshFailed: string;

  // Undo
  entryDeleted: string;
  undo: string;

  // Favorites
  favorites: string;
  favoritesGroup: string;
  favoriteIssue: (id: number) => string;
  unfavoriteIssue: (id: number) => string;
  noFavorites: string;
}

export const de: Translations = {
  tickets: "Tickets",
  timeTracking: "Zeiterfassung",
  overview: "Übersicht",
  today: "Heute",
  week: "Woche",
  search: "Suche",
  refresh: "Aktualisieren",

  lightMode: "Helles Design",
  darkMode: "Dunkles Design",
  systemTheme: "System",

  openIssues: (count, projects) =>
    `${count} offene ${count === 1 ? "Issue" : "Issues"} in ${projects} ${projects === 1 ? "Projekt" : "Projekten"}`,
  filterProjects: "Projekte filtern",
  searchProjects: "Projekte suchen...",
  allProjects: "Alle Projekte",
  noTickets: "Keine Tickets",
  noTicketsDesc: "Keine offenen Tickets gefunden",
  searchTickets: "Tickets durchsuchen",
  expandAll: "Alle aufklappen",
  collapseAll: "Alle zuklappen",
  showTrackedOnly: "Nur getrackte Tickets",

  start: "Starten",
  pause: "Pause",
  save: "Speichern",
  discard: "Verwerfen",
  running: "Läuft",
  paused: "Pausiert",

  timeLog: "Zeiterfassung",
  entriesNotSynced: (count) =>
    `${count} ${count === 1 ? "Entwurf" : "Entwürfe"} noch nicht gesendet`,
  month: "Monat",
  weekLabel: "Woche",
  syncAll: (count) => `Alle syncen (${count})`,
  noEntries: "Noch keine Einträge",
  noEntriesDesc: "Starte einen Timer bei einem Ticket oben",

  months: [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ],
  monthsShort: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  weekdays: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"],
  weekdaysShort: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  dayHeaders: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
  formatPickerHeader: (wd, mon, d) => `${wd}., ${d}. ${mon}.`,
  todayBtn: "Heute",
  prevMonth: "Vorheriger Monat",
  nextMonth: "Nächster Monat",
  prevWeek: "Vorherige Woche",
  nextWeek: "Nächste Woche",
  total: "Gesamt",
  avgPerDay: "Ø pro Tag",
  workDays: "Arbeitstage",
  open: "Offen",
  drafts: "Entwürfe",

  local: "lokal",
  remote: "remote",
  totalLabel: "gesamt",
  openTab: "Entwürfe",
  syncedTab: "Gesendet",
  allSynced: "Alle gesendet",
  noOpenEntries: "Keine Entwürfe",
  nothingSyncedYet: "Noch nichts gesendet",
  syncedEntriesAppearHere: "Gesendete Einträge erscheinen hier",
  noEntriesToday: "Keine Einträge",
  noTimeTracked: "Keine Zeiten erfasst",
  selectEntries: "Einträge auswählen",
  selectAll: "Alle auswählen",
  selected: (count) => `${count} ausgewählt`,
  sortByTime: "Zeit",
  sortByProject: "Projekt",
  sortByDuration: "Dauer",
  sync: "Senden",

  lessTime: "15 Minuten weniger",
  moreTime: "15 Minuten mehr",

  edit: "Bearbeiten",
  delete: "Löschen",
  cancel: "Abbrechen",
  saveBtn: "Speichern",

  syncFailed: "Sync fehlgeschlagen",
  synced: "Gesendet",
  entriesNeedActivity: (count) =>
    `${count} ${count === 1 ? "Eintrag braucht" : "Einträge brauchen"} eine Aktivität`,
  syncedCount: (synced, failed) =>
    failed === 0 ? `${synced} gesendet` : `${synced} gesendet, ${failed} fehlgeschlagen`,

  activity: "Aktivität",
  activityRequired: "Aktivität *",
  whatDidYouDo: "Was hast du gemacht?",
  bookTime: "Zeit buchen",

  editEntry: "Eintrag bearbeiten",
  date: "Datum",
  duration: "Dauer",
  description: "Beschreibung",
  hours: "Stunden",

  syncToRedmine: "Zu Redmine synchronisieren",
  syncing: "Synchronisiere...",

  copied: "Kopiert!",
  copyId: (id) => `#${id} kopieren`,
  manualBook: "Manuell buchen",
  bookDirectly: "Direkt buchen",

  notAssigned: "Nicht zugewiesen",

  noVersion: "Keine Version",
  versionUpdated: (name) => `Version → ${name}`,
  versionChangeFailed: "Versions-Änderung fehlgeschlagen",

  statusUpdated: (name) => `Status → ${name}`,
  statusChangeFailed: "Status-Änderung fehlgeschlagen",
  typeUpdated: (name) => `Typ → ${name}`,
  typeChangeFailed: "Typ-Änderung fehlgeschlagen",
  assigneeUpdated: "Zuständigkeit aktualisiert",
  assigneeChangeFailed: "Zuweisungs-Änderung fehlgeschlagen",

  connectionFailed: "Verbindung fehlgeschlagen",
  checkProxy: "Proxy und Zugangsdaten prüfen.",
  runSetup: "Ausführen:",
  connecting: "Verbinde...",
  dismiss: "Schließen",

  project: "Projekt",
  calendarWeek: "KW",

  selectDate: "Datum auswählen",

  filter: "Filter",
  all: "Alle",
  none: "Keine",

  descriptionOptional: "Beschreibung (optional)",
  book: "Buchen",

  timerRunningFor: (id, subject) => `Timer läuft für #${id} – ${subject}`,
  pauseTimer: "Timer pausieren",
  saveTimeEntry: "Zeiteintrag speichern",
  subtractMinute: "1 Minute abziehen",
  addMinute: "1 Minute addieren",
  discardTimer: "Timer verwerfen",
  startTimer: "Timer starten",
  bookManually: "Manuell buchen",

  assignPerson: "Person zuweisen",
  loading: "Laden…",

  loadingRemote: "Lade Remote-Einträge…",
  remoteError: "Remote-Daten nicht verfügbar",

  noDescription: "Keine Beschreibung",

  comments: "Kommentare",
  noComments: "Keine Kommentare",

  progress: "Fortschritt",

  language: "Sprache",

  appearance: "Erscheinungsbild",
  redmineProfile: "Redmine-Profil",

  searchAllProjects: "Alle Projekte durchsuchen",
  searchPlaceholder: "Redmine durchsuchen…",
  searchResults: (count, total) => `${count} von ${total}`,
  noSearchResults: "Keine Issues gefunden",
  loadMore: "Mehr laden",
  clearFilters: "Filter zurücksetzen",
  pinnedTickets: "Angepinnt",
  recentlyPinned: "Zuletzt",
  allStatuses: "Alle Status",
  allTrackers: "Alle Tracker",
  allPriorities: "Alle Prioritäten",
  allProjectsSearch: "Alle Projekte",
  priority: "Priorität",
  alreadyAssigned: "Dir zugewiesen",
  myTickets: "Eigene Tickets",
  noPinnedTickets: "Keine gepinnten Tickets.",
  openSearch: "Suche öffnen",
  notesComingSoon: "Notizen — demnächst",
  searchTab: "Suche",
  notes: "Notizen",
  searchPrompt: "Redmine durchsuchen",

  searchError: "Suche fehlgeschlagen",
  retrySearch: "Erneut versuchen",
  connectionError: "Keine Verbindung zum Server",

  searchInputLabel: "Tickets suchen",
  clearSearchInput: "Suche leeren",
  filterByLabel: (param) => `Filtern nach ${param}`,
  filterMenuOpen: "Filtermenü geöffnet",
  resultsFound: (count) => `${count} Ergebnisse gefunden`,
  pinIssue: (id) => `Ticket #${id} anpinnen`,
  unpinIssue: (id) => `Ticket #${id} loslösen`,
  filters: "Filter",

  loadingMoreResults: "Weitere Ergebnisse werden geladen…",

  escToClear: "Escape zum Leeren",

  noExactMatch: "Kein exakter Treffer",

  showingXofY: (shown, total) => `${shown} von ${total} angezeigt`,

  recentSearches: "Letzte Suchen",
  clearRecentSearches: "Suchverlauf leeren",

  sortBy: "Sortierung",
  sortUpdatedDesc: "Zuletzt aktualisiert",
  sortUpdatedAsc: "Älteste Aktualisierung",
  sortPriorityDesc: "Höchste Priorität",
  sortCreatedDesc: "Zuletzt erstellt",
  sortIdDesc: "Neueste ID",

  allAssignees: "Alle Zuständigen",
  allVersions: "Alle Versionen",
  assignee: "Zuständiger",
  targetVersion: "Zielversion",

  openFilterMenu: "Filtermenü öffnen",
  closeFilterMenu: "Filtermenü schließen",

  conflictDetected:
    "Ticket wurde zwischenzeitlich geändert und aktualisiert. Bitte erneut versuchen.",

  refreshUpdated: (count) => `${count} ${count === 1 ? "Ticket" : "Tickets"} aktualisiert`,
  refreshNoChanges: "Bereits aktuell",
  refreshFailed: "Aktualisierung fehlgeschlagen",

  entryDeleted: "Eintrag gelöscht",
  undo: "Rückgängig",

  favorites: "Favoriten",
  favoritesGroup: "★ Favoriten",
  favoriteIssue: (id) => `Ticket #${id} als Favorit markieren`,
  unfavoriteIssue: (id) => `Ticket #${id} aus Favoriten entfernen`,
  noFavorites: "Keine Favoriten.",
};

export const en: Translations = {
  tickets: "Tickets",
  timeTracking: "Time Tracking",
  overview: "Overview",
  today: "Today",
  week: "Week",
  search: "Search",
  refresh: "Refresh",

  lightMode: "Light mode",
  darkMode: "Dark mode",
  systemTheme: "System",

  openIssues: (count, projects) =>
    `${count} open ${count === 1 ? "issue" : "issues"} in ${projects} ${projects === 1 ? "project" : "projects"}`,
  filterProjects: "Filter projects",
  searchProjects: "Search projects...",
  allProjects: "All projects",
  noTickets: "No tickets",
  noTicketsDesc: "No open tickets found",
  searchTickets: "Search tickets",
  expandAll: "Expand all",
  collapseAll: "Collapse all",
  showTrackedOnly: "Tracked tickets only",

  start: "Start",
  pause: "Pause",
  save: "Save",
  discard: "Discard",
  running: "Running",
  paused: "Paused",

  timeLog: "Time Tracking",
  entriesNotSynced: (count) => `${count} ${count === 1 ? "draft" : "drafts"} not sent`,
  month: "Month",
  weekLabel: "Week",
  syncAll: (count) => `Sync all (${count})`,
  noEntries: "No entries yet",
  noEntriesDesc: "Start a timer on a ticket above",

  months: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthsShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  weekdays: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  weekdaysShort: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  dayHeaders: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  formatPickerHeader: (wd, mon, d) => `${wd}, ${mon} ${d}`,
  todayBtn: "Today",
  prevMonth: "Previous month",
  nextMonth: "Next month",
  prevWeek: "Previous week",
  nextWeek: "Next week",
  total: "Total",
  avgPerDay: "Avg per day",
  workDays: "Work days",
  open: "Open",
  drafts: "Drafts",

  local: "local",
  remote: "remote",
  totalLabel: "total",
  openTab: "Drafts",
  syncedTab: "Sent",
  allSynced: "All sent",
  noOpenEntries: "No drafts",
  nothingSyncedYet: "Nothing sent yet",
  syncedEntriesAppearHere: "Sent entries appear here",
  noEntriesToday: "No entries",
  noTimeTracked: "No time tracked",
  selectEntries: "Select entries",
  selectAll: "Select all",
  selected: (count) => `${count} selected`,
  sortByTime: "Time",
  sortByProject: "Project",
  sortByDuration: "Duration",
  sync: "Send",

  lessTime: "15 minutes less",
  moreTime: "15 minutes more",

  edit: "Edit",
  delete: "Delete",
  cancel: "Cancel",
  saveBtn: "Save",

  syncFailed: "Sync failed",
  synced: "Sent",
  entriesNeedActivity: (count) =>
    `${count} ${count === 1 ? "entry needs" : "entries need"} an activity`,
  syncedCount: (synced, failed) =>
    failed === 0 ? `${synced} sent` : `${synced} sent, ${failed} failed`,

  activity: "Activity",
  activityRequired: "Activity *",
  whatDidYouDo: "What did you do?",
  bookTime: "Book time",

  editEntry: "Edit entry",
  date: "Date",
  duration: "Duration",
  description: "Description",
  hours: "hours",

  syncToRedmine: "Sync to Redmine",
  syncing: "Syncing...",

  copied: "Copied!",
  copyId: (id) => `Copy #${id}`,
  manualBook: "Manual booking",
  bookDirectly: "Book directly",

  notAssigned: "Unassigned",

  noVersion: "No version",
  versionUpdated: (name) => `Version → ${name}`,
  versionChangeFailed: "Version change failed",

  statusUpdated: (name) => `Status → ${name}`,
  statusChangeFailed: "Status change failed",
  typeUpdated: (name) => `Type → ${name}`,
  typeChangeFailed: "Type change failed",
  assigneeUpdated: "Assignee updated",
  assigneeChangeFailed: "Assignment change failed",

  connectionFailed: "Connection Failed",
  checkProxy: "Check proxy and credentials.",
  runSetup: "Run:",
  connecting: "Connecting...",
  dismiss: "Dismiss",

  project: "Project",
  calendarWeek: "CW",

  selectDate: "Select date",

  filter: "Filter",
  all: "All",
  none: "None",

  descriptionOptional: "Description (optional)",
  book: "Book",

  timerRunningFor: (id, subject) => `Timer running for #${id} – ${subject}`,
  pauseTimer: "Pause timer",
  saveTimeEntry: "Save time entry",
  subtractMinute: "Subtract 1 minute",
  addMinute: "Add 1 minute",
  discardTimer: "Discard timer",
  startTimer: "Start timer",
  bookManually: "Book manually",

  assignPerson: "Assign person",
  loading: "Loading…",

  loadingRemote: "Loading remote entries…",
  remoteError: "Remote data unavailable",

  noDescription: "No description",

  comments: "Comments",
  noComments: "No comments",

  progress: "Progress",

  language: "Language",

  appearance: "Appearance",
  redmineProfile: "Redmine Profile",

  searchAllProjects: "Search all projects",
  searchPlaceholder: "Search Redmine…",
  searchResults: (count, total) => `${count} of ${total}`,
  noSearchResults: "No issues found",
  loadMore: "Load more",
  clearFilters: "Clear filters",
  pinnedTickets: "Pinned",
  recentlyPinned: "Recent",
  allStatuses: "All statuses",
  allTrackers: "All trackers",
  allPriorities: "All priorities",
  allProjectsSearch: "All projects",
  priority: "Priority",
  alreadyAssigned: "Assigned to you",
  myTickets: "My Tickets",
  noPinnedTickets: "No pinned tickets.",
  openSearch: "Open search",
  notesComingSoon: "Notes — coming soon",
  searchTab: "Search",
  notes: "Notes",
  searchPrompt: "Search Redmine",

  searchError: "Search failed",
  retrySearch: "Retry",
  connectionError: "Cannot connect to server",

  searchInputLabel: "Search tickets",
  clearSearchInput: "Clear search",
  filterByLabel: (param) => `Filter by ${param}`,
  filterMenuOpen: "Filter menu open",
  resultsFound: (count) => `${count} results found`,
  pinIssue: (id) => `Pin issue #${id}`,
  unpinIssue: (id) => `Unpin issue #${id}`,
  filters: "Filters",

  loadingMoreResults: "Loading more results…",

  escToClear: "Press Escape to clear",

  noExactMatch: "No exact match",

  showingXofY: (shown, total) => `Showing ${shown} of ${total}`,

  recentSearches: "Recent searches",
  clearRecentSearches: "Clear search history",

  sortBy: "Sort by",
  sortUpdatedDesc: "Recently updated",
  sortUpdatedAsc: "Oldest updated",
  sortPriorityDesc: "Highest priority",
  sortCreatedDesc: "Recently created",
  sortIdDesc: "Newest ID",

  allAssignees: "All assignees",
  allVersions: "All versions",
  assignee: "Assignee",
  targetVersion: "Target version",

  openFilterMenu: "Open filter menu",
  closeFilterMenu: "Close filter menu",

  conflictDetected: "Ticket was modified by someone else and has been updated. Please try again.",

  refreshUpdated: (count) => `${count} ${count === 1 ? "ticket" : "tickets"} updated`,
  refreshNoChanges: "Already up to date",
  refreshFailed: "Refresh failed",

  entryDeleted: "Entry deleted",
  undo: "Undo",

  favorites: "Favorites",
  favoritesGroup: "★ Favorites",
  favoriteIssue: (id) => `Add issue #${id} to favorites`,
  unfavoriteIssue: (id) => `Remove issue #${id} from favorites`,
  noFavorites: "No favorites.",
};

export type Locale = "en" | "de";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "EN" },
  { code: "de", label: "Deutsch", flag: "DE" },
];

export const translations: Record<Locale, Translations> = { en, de };
