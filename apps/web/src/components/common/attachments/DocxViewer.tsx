import { useEffect, useRef, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DocxViewer({
  url,
  filename,
  fullscreen,
}: {
  url: string;
  filename: string;
  fullscreen: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(url, { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(async (blob) => {
        if (!active || !containerRef.current) return;
        const docx = await import('docx-preview');
        containerRef.current.innerHTML = '';
        await docx.renderAsync(blob, containerRef.current, undefined, {
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          experimental: true,
        });
        if (active) setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to render document');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url]);

  return (
    <div
      className={`relative flex w-full flex-col overflow-hidden rounded-md border bg-muted/20 ${
        fullscreen ? 'h-full flex-1' : 'max-h-[75vh]'
      }`}
    >
      {loading && (
        <div className="flex h-64 w-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" asChild>
            <a href={`${url}?download=1`} download={filename}>
              <Download className="mr-2 size-4" /> Download
            </a>
          </Button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`flex-1 overflow-auto bg-white p-6 text-zinc-950 shadow-inner select-text ${
          loading || error ? 'hidden' : ''
        }`}
      />
    </div>
  );
}
