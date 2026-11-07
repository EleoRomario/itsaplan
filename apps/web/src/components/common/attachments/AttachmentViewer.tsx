import { useState } from 'react';
import type { Attachment } from '@/lib/api/endpoints/attachments';
import {
  isImage,
  isVideo,
  isAudio,
  isPdf,
  isDocx,
  isSpreadsheet,
  isCsv,
  isText,
} from '@/components/common/editor/attachmentEmbed';
import Modal from '@/components/common/overlay/Modal';
import { Headphones, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TextViewer from './TextViewer';
import DocxViewer from './DocxViewer';
import SpreadsheetViewer from './SpreadsheetViewer';

export default function AttachmentViewer({
  attachment,
  onClose,
}: {
  attachment: Attachment;
  onClose: () => void;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const size = fullscreen ? 'max-h-full' : 'max-h-[70vh]';

  return (
    <Modal
      title={attachment.filename}
      onClose={onClose}
      wide="xl"
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
    >
      <div className={cn('flex min-h-0 items-center justify-center', fullscreen && 'flex-1 pb-4')}>
        {isImage(attachment) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={attachment.url}
            alt={attachment.filename}
            className={cn('max-w-full rounded-md object-contain', size)}
          />
        )}

        {isVideo(attachment) && (
          <video src={attachment.url} controls className={cn('max-w-full rounded-md', size)} />
        )}

        {isAudio(attachment) && (
          <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 py-8">
            <div className="flex size-20 items-center justify-center rounded-full bg-muted">
              <Headphones className="size-10 text-muted-foreground" />
            </div>
            <p className="max-w-xs truncate text-sm font-medium text-foreground">
              {attachment.filename}
            </p>
            <audio src={attachment.url} controls className="w-full" autoPlay />
          </div>
        )}

        {isPdf(attachment) && (
          <iframe
            src={attachment.url}
            title={attachment.filename}
            className={cn(
              'w-full rounded-md border-0 bg-white shadow-xs',
              fullscreen ? 'h-full min-h-[80vh] flex-1' : 'h-[75vh]',
            )}
          />
        )}

        {isDocx(attachment) && (
          <DocxViewer url={attachment.url} filename={attachment.filename} fullscreen={fullscreen} />
        )}

        {(isSpreadsheet(attachment) || isCsv(attachment)) && (
          <SpreadsheetViewer
            url={attachment.url}
            filename={attachment.filename}
            isCsv={isCsv(attachment)}
            fullscreen={fullscreen}
          />
        )}

        {isText(attachment) && (
          <TextViewer url={attachment.url} filename={attachment.filename} fullscreen={fullscreen} />
        )}

        {!isImage(attachment) &&
          !isVideo(attachment) &&
          !isAudio(attachment) &&
          !isPdf(attachment) &&
          !isDocx(attachment) &&
          !isSpreadsheet(attachment) &&
          !isCsv(attachment) &&
          !isText(attachment) && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Preview not available for this file type.
              </p>
              <Button variant="outline" size="sm" asChild>
                <a href={`${attachment.url}?download=1`} download={attachment.filename}>
                  <Download className="mr-2 size-4" /> Download
                </a>
              </Button>
            </div>
          )}
      </div>
    </Modal>
  );
}
