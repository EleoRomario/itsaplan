import { useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SheetData = {
  name: string;
  rows: unknown[][];
};

function parseCsv(text: string): unknown[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const row: string[] = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuote && line[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if ((char === ',' || char === '\t' || char === ';') && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    return row;
  });
}

function columnLabel(index: number): string {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
}

export default function SpreadsheetViewer({
  url,
  filename,
  isCsv,
  fullscreen,
}: {
  url: string;
  filename: string;
  isCsv: boolean;
  fullscreen: boolean;
}) {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    if (isCsv) {
      fetch(url, { credentials: 'include' })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((text) => {
          if (!active) return;
          const rows = parseCsv(text);
          setSheets([{ name: 'Sheet1', rows }]);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          setError(err instanceof Error ? err.message : 'Failed to parse CSV');
          setLoading(false);
        });
      return () => {
        active = false;
      };
    }

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(async (blob) => {
        if (!active) return;
        const readXlsxFileModule = await import('read-excel-file/browser');
        const readXlsxFile = readXlsxFileModule.default;
        const result = await readXlsxFile(blob);
        if (!active) return;

        const loadedSheets: SheetData[] = Array.isArray(result)
          ? result.map((item) => ({
              name: item.sheet || 'Sheet',
              rows: item.data ?? [],
            }))
          : [{ name: 'Sheet1', rows: [] }];

        setSheets(loadedSheets.length > 0 ? loadedSheets : [{ name: 'Sheet1', rows: [] }]);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to parse spreadsheet');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, isCsv]);

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || sheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-destructive">{error ?? 'Unable to preview spreadsheet'}</p>
        <Button variant="outline" size="sm" asChild>
          <a href={`${url}?download=1`} download={filename}>
            <Download className="mr-2 size-4" /> Download
          </a>
        </Button>
      </div>
    );
  }

  const currentSheet = sheets[activeSheetIndex] ?? sheets[0];
  const maxRows = 200;
  const rowsToDisplay = currentSheet.rows.slice(0, maxRows);
  const truncated = currentSheet.rows.length > maxRows;
  const maxCols = Math.max(0, ...rowsToDisplay.map((r) => r.length));

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-md border bg-card text-xs ${
        fullscreen ? 'h-full flex-1' : 'max-h-[75vh]'
      }`}
    >
      {sheets.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto border-b bg-muted/40 px-2 py-1">
          {sheets.map((sheet, idx) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActiveSheetIndex(idx)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                idx === activeSheetIndex
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto select-text">
        <table className="min-w-full border-collapse border border-border text-left">
          <thead className="sticky top-0 z-10 bg-muted/80 font-semibold text-muted-foreground backdrop-blur-xs">
            <tr>
              <th className="w-10 border border-border bg-muted/90 px-2 py-1 text-center font-mono text-[10px]">
                #
              </th>
              {Array.from({ length: maxCols }).map((_, cIdx) => (
                <th key={cIdx} className="border border-border px-3 py-1 font-mono text-[10px]">
                  {columnLabel(cIdx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowsToDisplay.map((row, rIdx) => (
              <tr key={rIdx} className="even:bg-muted/10 hover:bg-muted/40">
                <td className="border border-border bg-muted/30 px-2 py-1 text-center font-mono text-[10px] text-muted-foreground">
                  {rIdx + 1}
                </td>
                {Array.from({ length: maxCols }).map((_, cIdx) => (
                  <td
                    key={cIdx}
                    className="max-w-xs truncate border border-border px-3 py-1 text-foreground"
                    title={row[cIdx] !== null && row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                  >
                    {row[cIdx] !== null && row[cIdx] !== undefined ? String(row[cIdx]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {truncated && (
        <div className="border-t bg-muted/30 px-3 py-1 text-center text-[11px] text-muted-foreground">
          Showing first {maxRows} rows. Download the file to view all {currentSheet.rows.length}{' '}
          rows.
        </div>
      )}
    </div>
  );
}
