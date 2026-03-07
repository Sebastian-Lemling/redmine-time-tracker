import { describe, it, expect } from "vitest";
import { de, en, LOCALES, translations, type Locale } from "./translations";

describe("translations", () => {
  describe("de and en have matching keys", () => {
    it("both objects have the same keys", () => {
      const deKeys = Object.keys(de).sort();
      const enKeys = Object.keys(en).sort();
      expect(deKeys).toEqual(enKeys);
    });
  });

  describe("LOCALES", () => {
    it("lists en and de", () => {
      const codes = LOCALES.map((l) => l.code);
      expect(codes).toContain("en");
      expect(codes).toContain("de");
    });

    it("each locale has label and flag", () => {
      for (const locale of LOCALES) {
        expect(locale.label).toBeTruthy();
        expect(locale.flag).toBeTruthy();
      }
    });
  });

  describe("translations record", () => {
    it("maps locale codes to translation objects", () => {
      expect(translations.en).toBe(en);
      expect(translations.de).toBe(de);
    });

    it("Locale type covers all entries", () => {
      const keys = Object.keys(translations) as Locale[];
      expect(keys).toEqual(["en", "de"]);
    });
  });

  describe("parameterized functions - de", () => {
    it("openIssues with singular", () => {
      expect(de.openIssues(1, 1)).toBe("1 offene Issue in 1 Projekt");
    });

    it("openIssues with plural", () => {
      expect(de.openIssues(5, 3)).toBe("5 offene Issues in 3 Projekten");
    });

    it("openIssues with zero", () => {
      expect(de.openIssues(0, 0)).toBe("0 offene Issues in 0 Projekten");
    });

    it("entriesNotSynced singular", () => {
      expect(de.entriesNotSynced(1)).toBe("1 Entwurf noch nicht gesendet");
    });

    it("entriesNotSynced plural", () => {
      expect(de.entriesNotSynced(3)).toBe("3 Entwürfe noch nicht gesendet");
    });

    it("syncAll", () => {
      expect(de.syncAll(5)).toBe("Alle syncen (5)");
    });

    it("selected", () => {
      expect(de.selected(2)).toBe("2 ausgewählt");
    });

    it("entriesNeedActivity singular", () => {
      expect(de.entriesNeedActivity(1)).toBe("1 Eintrag braucht eine Aktivität");
    });

    it("entriesNeedActivity plural", () => {
      expect(de.entriesNeedActivity(4)).toBe("4 Einträge brauchen eine Aktivität");
    });

    it("syncedCount no failures", () => {
      expect(de.syncedCount(3, 0)).toBe("3 gesendet");
    });

    it("syncedCount with failures", () => {
      expect(de.syncedCount(2, 1)).toBe("2 gesendet, 1 fehlgeschlagen");
    });

    it("copyId", () => {
      expect(de.copyId(42)).toBe("#42 kopieren");
    });

    it("versionUpdated", () => {
      expect(de.versionUpdated("v2.0")).toBe("Version → v2.0");
    });

    it("statusUpdated", () => {
      expect(de.statusUpdated("In Bearbeitung")).toBe("Status → In Bearbeitung");
    });

    it("typeUpdated", () => {
      expect(de.typeUpdated("Feature")).toBe("Typ → Feature");
    });

    it("timerRunningFor", () => {
      expect(de.timerRunningFor(99, "Login Fix")).toBe("Timer läuft für #99 – Login Fix");
    });

    it("formatPickerHeader", () => {
      expect(de.formatPickerHeader("Mo", "Jan", 5)).toBe("Mo., 5. Jan.");
    });

    it("searchResults", () => {
      expect(de.searchResults(10, 50)).toBe("10 von 50");
    });

    it("filterByLabel", () => {
      expect(de.filterByLabel("Status")).toBe("Filtern nach Status");
    });

    it("resultsFound", () => {
      expect(de.resultsFound(7)).toBe("7 Ergebnisse gefunden");
    });

    it("pinIssue", () => {
      expect(de.pinIssue(123)).toBe("Ticket #123 anpinnen");
    });

    it("unpinIssue", () => {
      expect(de.unpinIssue(123)).toBe("Ticket #123 loslösen");
    });

    it("showingXofY", () => {
      expect(de.showingXofY(10, 25)).toBe("10 von 25 angezeigt");
    });

    it("refreshUpdated singular", () => {
      expect(de.refreshUpdated(1)).toBe("1 Ticket aktualisiert");
    });

    it("refreshUpdated plural", () => {
      expect(de.refreshUpdated(5)).toBe("5 Tickets aktualisiert");
    });

    it("openInRedmine contains id and Redmine", () => {
      const result = de.openInRedmine(42);
      expect(result).toContain("42");
      expect(result).toContain("Redmine");
    });

    it("issuePinned contains id", () => {
      expect(de.issuePinned(42)).toContain("42");
    });

    it("issueUnpinned contains id", () => {
      expect(de.issueUnpinned(42)).toContain("42");
    });

    it("issueFavorited contains id", () => {
      expect(de.issueFavorited(42)).toContain("42");
    });

    it("issueUnfavorited contains id", () => {
      expect(de.issueUnfavorited(42)).toContain("42");
    });

    it("timeAgo contains value", () => {
      expect(de.timeAgo(2, "day")).toContain("2");
    });

    it("justNow is non-empty", () => {
      expect(de.justNow.length).toBeGreaterThan(0);
    });
  });

  describe("parameterized functions - en", () => {
    it("openIssues with singular", () => {
      expect(en.openIssues(1, 1)).toBe("1 open issue in 1 project");
    });

    it("openIssues with plural", () => {
      expect(en.openIssues(5, 3)).toBe("5 open issues in 3 projects");
    });

    it("openIssues with zero", () => {
      expect(en.openIssues(0, 0)).toBe("0 open issues in 0 projects");
    });

    it("entriesNotSynced singular", () => {
      expect(en.entriesNotSynced(1)).toBe("1 draft not sent");
    });

    it("entriesNotSynced plural", () => {
      expect(en.entriesNotSynced(3)).toBe("3 drafts not sent");
    });

    it("syncAll", () => {
      expect(en.syncAll(5)).toBe("Sync all (5)");
    });

    it("selected", () => {
      expect(en.selected(2)).toBe("2 selected");
    });

    it("entriesNeedActivity singular", () => {
      expect(en.entriesNeedActivity(1)).toBe("1 entry needs an activity");
    });

    it("entriesNeedActivity plural", () => {
      expect(en.entriesNeedActivity(4)).toBe("4 entries need an activity");
    });

    it("syncedCount no failures", () => {
      expect(en.syncedCount(3, 0)).toBe("3 sent");
    });

    it("syncedCount with failures", () => {
      expect(en.syncedCount(2, 1)).toBe("2 sent, 1 failed");
    });

    it("copyId", () => {
      expect(en.copyId(42)).toBe("Copy #42");
    });

    it("versionUpdated", () => {
      expect(en.versionUpdated("v2.0")).toBe("Version → v2.0");
    });

    it("statusUpdated", () => {
      expect(en.statusUpdated("In Progress")).toBe("Status → In Progress");
    });

    it("typeUpdated", () => {
      expect(en.typeUpdated("Feature")).toBe("Type → Feature");
    });

    it("timerRunningFor", () => {
      expect(en.timerRunningFor(99, "Login Fix")).toBe("Timer running for #99 – Login Fix");
    });

    it("formatPickerHeader", () => {
      expect(en.formatPickerHeader("Mo", "Jan", 5)).toBe("Mo, Jan 5");
    });

    it("searchResults", () => {
      expect(en.searchResults(10, 50)).toBe("10 of 50");
    });

    it("filterByLabel", () => {
      expect(en.filterByLabel("Status")).toBe("Filter by Status");
    });

    it("resultsFound", () => {
      expect(en.resultsFound(7)).toBe("7 results found");
    });

    it("pinIssue", () => {
      expect(en.pinIssue(123)).toBe("Pin issue #123");
    });

    it("unpinIssue", () => {
      expect(en.unpinIssue(123)).toBe("Unpin issue #123");
    });

    it("showingXofY", () => {
      expect(en.showingXofY(10, 25)).toBe("Showing 10 of 25");
    });

    it("refreshUpdated singular", () => {
      expect(en.refreshUpdated(1)).toBe("1 ticket updated");
    });

    it("refreshUpdated plural", () => {
      expect(en.refreshUpdated(5)).toBe("5 tickets updated");
    });

    it("openInRedmine contains id and Redmine", () => {
      const result = en.openInRedmine(42);
      expect(result).toContain("42");
      expect(result).toContain("Redmine");
    });

    it("issuePinned contains id", () => {
      expect(en.issuePinned(42)).toContain("42");
    });

    it("issueUnpinned contains id", () => {
      expect(en.issueUnpinned(42)).toContain("42");
    });

    it("issueFavorited contains id", () => {
      expect(en.issueFavorited(42)).toContain("42");
    });

    it("issueUnfavorited contains id", () => {
      expect(en.issueUnfavorited(42)).toContain("42");
    });

    it("timeAgo contains value", () => {
      expect(en.timeAgo(2, "day")).toContain("2");
    });

    it("justNow is non-empty", () => {
      expect(en.justNow.length).toBeGreaterThan(0);
    });
  });

  describe("array translations", () => {
    it("de.months has 12 entries", () => {
      expect(de.months).toHaveLength(12);
      expect(de.months[0]).toBe("Januar");
      expect(de.months[11]).toBe("Dezember");
    });

    it("en.months has 12 entries", () => {
      expect(en.months).toHaveLength(12);
      expect(en.months[0]).toBe("January");
      expect(en.months[11]).toBe("December");
    });

    it("de.monthsShort has 12 entries", () => {
      expect(de.monthsShort).toHaveLength(12);
      expect(de.monthsShort[0]).toBe("Jan");
      expect(de.monthsShort[11]).toBe("Dez");
    });

    it("en.monthsShort has 12 entries", () => {
      expect(en.monthsShort).toHaveLength(12);
      expect(en.monthsShort[0]).toBe("Jan");
      expect(en.monthsShort[11]).toBe("Dec");
    });

    it("de.weekdays has 7 entries", () => {
      expect(de.weekdays).toHaveLength(7);
      expect(de.weekdays[0]).toBe("Sonntag");
      expect(de.weekdays[6]).toBe("Samstag");
    });

    it("en.weekdays has 7 entries", () => {
      expect(en.weekdays).toHaveLength(7);
      expect(en.weekdays[0]).toBe("Sunday");
      expect(en.weekdays[6]).toBe("Saturday");
    });

    it("de.weekdaysShort has 7 entries", () => {
      expect(de.weekdaysShort).toHaveLength(7);
    });

    it("en.weekdaysShort has 7 entries", () => {
      expect(en.weekdaysShort).toHaveLength(7);
    });

    it("de.dayHeaders has 7 entries starting with Mo", () => {
      expect(de.dayHeaders).toHaveLength(7);
      expect(de.dayHeaders[0]).toBe("Mo");
    });

    it("en.dayHeaders has 7 entries starting with Mo", () => {
      expect(en.dayHeaders).toHaveLength(7);
      expect(en.dayHeaders[0]).toBe("Mo");
    });
  });

  describe("static string samples", () => {
    it("de strings are German", () => {
      expect(de.tickets).toBe("Tickets");
      expect(de.timeTracking).toBe("Zeiterfassung");
      expect(de.cancel).toBe("Abbrechen");
      expect(de.saveBtn).toBe("Speichern");
      expect(de.editEntry).toBe("Eintrag bearbeiten");
      expect(de.date).toBe("Datum");
    });

    it("en strings are English", () => {
      expect(en.tickets).toBe("Tickets");
      expect(en.timeTracking).toBe("Time Tracking");
      expect(en.cancel).toBe("Cancel");
      expect(en.saveBtn).toBe("Save");
      expect(en.editEntry).toBe("Edit entry");
      expect(en.date).toBe("Date");
    });
  });
});
