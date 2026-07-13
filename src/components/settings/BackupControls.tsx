"use client";

import { useRef, useState } from "react";
import { getAuthHeader } from "@/lib/auth/get-auth-header";
import { useOnlineStatus } from "@/lib/use-online-status";
import { ConfirmationDialog } from "@/components/actions/ConfirmationDialog";
import { Button } from "@/components/ui/Button";

type PendingImport = {
  raw: unknown;
  profilesCount: number;
  listsCount: number;
  tasksCount: number;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A lightweight local shape check only — the server independently
 * re-validates the full structure (specification §27) before writing
 * anything. This is just enough to show a meaningful summary before
 * asking for confirmation.
 */
function readLocalSummary(data: unknown): PendingImport | null {
  if (!isPlainRecord(data)) return null;
  const { profiles, lists, tasks } = data;
  if (!Array.isArray(profiles) || !Array.isArray(lists) || !Array.isArray(tasks)) return null;
  return {
    raw: data,
    profilesCount: profiles.length,
    listsCount: lists.length,
    tasksCount: tasks.length,
  };
}

export function BackupControls() {
  const isOnline = useOnlineStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("not_authenticated");

      const response = await fetch("/api/backup/export", { headers: authHeader });
      if (!response.ok) throw new Error("export_failed");

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `listy-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("לא ניתן היה לייצא את הגיבוי. נסו שוב.");
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    setImportResult(null);
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const summary = readLocalSummary(parsed);
      if (!summary) {
        setImportError("קובץ הגיבוי אינו תקין.");
        return;
      }
      setPendingImport(summary);
    } catch {
      setImportError("קובץ הגיבוי אינו תקין.");
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) return;
    setImporting(true);
    setImportError(null);

    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) throw new Error("not_authenticated");

      const response = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(pendingImport.raw),
      });

      if (!response.ok) {
        setImportError("לא ניתן היה לייבא את הגיבוי. ודאו שהקובץ תקין ונסו שוב.");
        return;
      }

      const result = await response.json();
      setImportResult(
        `יובאו ${result.profilesImported} משתמשים, ${result.listsImported} רשימות ו-${result.tasksImported} משימות, כעותק חדש.`,
      );
      setPendingImport(null);
    } catch {
      setImportError("לא ניתן היה לייבא את הגיבוי. נסו שוב.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-bold text-text">גיבוי נתונים</span>

        <Button variant="secondary" onClick={handleExport} disabled={exporting || !isOnline} fullWidth>
          {exporting ? "מייצאים..." : "ייצוא גיבוי"}
        </Button>
        {exportError ? <p className="text-sm text-danger">{exportError}</p> : null}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileSelected}
          disabled={!isOnline}
        />
        <Button
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={!isOnline}
          fullWidth
        >
          ייבוא גיבוי
        </Button>
        {importError ? <p className="text-sm text-danger">{importError}</p> : null}
        {importResult ? <p className="text-sm text-text">{importResult}</p> : null}
      </div>

      <ConfirmationDialog
        open={pendingImport !== null}
        title="ייבוא גיבוי"
        description={
          pendingImport
            ? `הקובץ מכיל ${pendingImport.profilesCount} משתמשים, ${pendingImport.listsCount} רשימות ו-${pendingImport.tasksCount} משימות. הייבוא ייצור עותק חדש ולא יחליף נתונים קיימים.`
            : undefined
        }
        confirmLabel="ייבוא"
        confirming={importing}
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImport(null)}
      />
    </div>
  );
}
