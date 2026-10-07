// Shared validation helpers (Rules: validation via lib, no heavy deps).
export function isValidUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return true; // optional fields accept empty
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isNonEmpty(title: string): boolean {
  return title.trim().length > 0;
}

/** Minimal CSV parser (quoted commas + escaped quotes). Returns non-empty rows. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] ?? '';
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else if (ch !== '\r') {
      cur += ch;
    }
  }
  row.push(cur);
  rows.push(row);
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}
