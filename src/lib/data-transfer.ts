import {
  DEFAULT_REMINDERS,
  STATUS_META,
  daysLeft,
  formatPL,
  getStatus,
  plDni,
  type Item,
} from "./deadline-types";

const CSV_HEADER = ["nazwa", "kategoria", "data_waznosci", "przypomnienia_dni", "notatki"];

function csvCell(value: string): string {
  return /[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function itemsToCSV(items: Item[]): string {
  const rows = items.map((i) =>
    [
      i.name,
      i.category,
      i.expiry_date,
      i.reminder_days_before.join("|"),
      i.notes ?? "",
    ]
      .map(csvCell)
      .join(";"),
  );
  return [CSV_HEADER.join(";"), ...rows].join("\r\n");
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ";" || ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export type ParsedImport = { items: Omit<Item, "id">[]; skipped: number };

export function csvToItems(text: string): ParsedImport {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { items: [], skipped: 0 };

  const first = parseCSVLine(lines[0]!).map((c) => c.toLowerCase());
  const hasHeader = first.includes("nazwa") || first.includes("name");
  const body = hasHeader ? lines.slice(1) : lines;

  const items: Omit<Item, "id">[] = [];
  let skipped = 0;

  for (const line of body) {
    const [name, category, expiry, reminders, notes] = parseCSVLine(line);
    if (!name || !expiry || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      skipped++;
      continue;
    }
    const days = (reminders ?? "")
      .split(/[|,]/)
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isFinite(d) && d >= 0);
    items.push({
      name,
      category: category || "Inne",
      expiry_date: expiry,
      reminder_days_before: days.length ? days : DEFAULT_REMINDERS,
      ...(notes ? { notes } : {}),
    });
  }

  return { items, skipped };
}

export function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- Kalendarz (.ics — Google Calendar, Outlook, Apple) ---------- */

function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function icsEscape(text: string): string {
  return text.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
}

export function itemsToICS(items: Item[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const events = items.flatMap((item) => {
    const start = icsDate(item.expiry_date);
    const end = icsDate(
      new Date(new Date(`${item.expiry_date}T00:00:00`).getTime() + 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
    return [
      "BEGIN:VEVENT",
      `UID:${item.id}@deadline`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(`Termin: ${item.name}`)}`,
      `DESCRIPTION:${icsEscape(
        [`Kategoria: ${item.category}`, item.notes ? `Notatki: ${item.notes}` : ""]
          .filter(Boolean)
          .join("\n"),
      )}`,
      ...item.reminder_days_before.map(
        (d) =>
          `BEGIN:VALARM\r\nTRIGGER:-P${d}D\r\nACTION:DISPLAY\r\nDESCRIPTION:${icsEscape(
            `${item.name} wygasa za ${d} ${plDni(d)}`,
          )}\r\nEND:VALARM`,
      ),
      "END:VEVENT",
    ];
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Deadline//PL",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/* ---------- Raport PDF (przez okno druku przeglądarki) ---------- */

export function openPDFReport(items: Item[]) {
  const sorted = [...items].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date));
  const rows = sorted
    .map((i) => {
      const d = daysLeft(i.expiry_date);
      const status = STATUS_META[getStatus(i.expiry_date)].label;
      const left = d < 0 ? `${Math.abs(d)} ${plDni(Math.abs(d))} po terminie` : `${d} ${plDni(d)}`;
      return `<tr><td>${i.name}</td><td>${i.category}</td><td>${formatPL(
        i.expiry_date,
      )}</td><td>${left}</td><td>${status}</td></tr>`;
    })
    .join("");

  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<title>Deadline — zestawienie terminów</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1c1a;padding:32px}
  h1{font-size:20px;margin:0 0 4px}
  p.sub{margin:0 0 20px;color:#6b6b66;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #e6e6e1}
  th{background:#f3f3f0;font-weight:600}
</style></head><body>
<h1>Zestawienie terminów</h1>
<p class="sub">Wygenerowano ${new Date().toLocaleDateString("pl-PL")} · ${sorted.length} pozycji · Deadline</p>
<table><thead><tr><th>Nazwa</th><th>Kategoria</th><th>Data ważności</th><th>Pozostało</th><th>Status</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  return true;
}
