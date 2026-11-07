import Image from 'next/image';
import { FileIcon, FileSpreadsheet, FileText, FileCode, Headphones } from 'lucide-react';
import {
  isImage,
  isSvg,
  isVideo,
  isAudio,
  isPdf,
  isDocx,
  isSpreadsheet,
  isCsv,
  isText,
  type Embeddable,
} from '@/components/common/editor/attachmentEmbed';

export default function AttachmentThumb({
  attachment,
  sizes = '40px',
}: {
  attachment: Embeddable;
  sizes?: string;
}) {
  if (isImage(attachment))
    return (
      <Image
        src={attachment.url}
        alt={attachment.filename}
        fill
        sizes={sizes}
        unoptimized={attachment.url.startsWith('blob:') || isSvg(attachment)}
        draggable={false}
        className="object-cover"
      />
    );
  if (isVideo(attachment))
    return (
      <video src={attachment.url} className="size-full object-cover" muted draggable={false} />
    );
  if (isAudio(attachment)) return <Headphones className="text-muted-foreground" />;
  if (isPdf(attachment)) return <FileText className="text-red-500" />;
  if (isSpreadsheet(attachment) || isCsv(attachment))
    return <FileSpreadsheet className="text-emerald-600 dark:text-emerald-400" />;
  if (isDocx(attachment)) return <FileText className="text-blue-600 dark:text-blue-400" />;
  if (isText(attachment)) return <FileCode className="text-muted-foreground" />;
  return <FileIcon className="text-muted-foreground" />;
}
