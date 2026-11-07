import { useEffect, useState } from 'react';
import { Copy, Check, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TextViewer({
  url,
  filename,
  fullscreen,
}: {
  url: string;
  filename: string;
  fullscreen: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((content) => {
        if (!active) return;
        setText(content);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to load text');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url]);

  function copyText() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || text === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm text-destructive">{error ?? 'Unable to preview text'}</p>
        <Button variant="outline" size="sm" asChild>
          <a href={`${url}?download=1`} download={filename}>
            <Download className="mr-2 size-4" /> Download
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-md border bg-muted/40 font-mono text-xs ${
        fullscreen ? 'h-full flex-1' : 'max-h-[70vh]'
      }`}
    >
      <div className="flex items-center justify-between border-b bg-muted/70 px-3 py-1.5 text-muted-foreground">
        <span>{filename}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={copyText}>
          {copied ? (
            <>
              <Check className="mr-1 size-3 text-emerald-500" /> Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 size-3" /> Copy
            </>
          )}
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4 leading-relaxed whitespace-pre-wrap text-foreground select-text">
        <code>{text}</code>
      </pre>
    </div>
  );
}
