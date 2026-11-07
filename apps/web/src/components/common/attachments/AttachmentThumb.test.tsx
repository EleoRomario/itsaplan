import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import AttachmentThumb from './AttachmentThumb';

const imgSrc = (contentType: string) =>
  renderToStaticMarkup(
    <AttachmentThumb
      attachment={{ url: '/media/attachments/abc/raw', contentType, filename: 'logo' }}
    />,
  ).match(/<img[^>]* src="([^"]+)"/)?.[1];

describe('AttachmentThumb', () => {
  // The optimizer refuses SVG, so routing it there showed a broken thumbnail (#659).
  it('shows an SVG from its own URL, not through the image optimizer', () => {
    assert.equal(imgSrc('image/svg+xml'), '/media/attachments/abc/raw');
    assert.equal(imgSrc('image/svg+xml; charset=utf-8'), '/media/attachments/abc/raw');
  });

  it('still sends other images through the optimizer', () => {
    assert.match(
      imgSrc('image/png') ?? '',
      /^\/_next\/image\?url=%2Fmedia%2Fattachments%2Fabc%2Fraw/,
    );
  });

  it('renders specialized glyphs for non-image embeddables', () => {
    const markup = (contentType: string, filename = 'file') =>
      renderToStaticMarkup(
        <AttachmentThumb
          attachment={{ url: '/media/attachments/abc/raw', contentType, filename }}
        />,
      );

    assert.ok(markup('audio/mp3', 'song.mp3').includes('<svg'));
    assert.ok(markup('application/pdf', 'doc.pdf').includes('text-red-500'));
    assert.ok(markup('application/vnd.ms-excel', 'data.xls').includes('text-emerald-600'));
    assert.ok(
      markup(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc.docx',
      ).includes('text-blue-600'),
    );
    assert.ok(markup('text/plain', 'note.txt').includes('<svg'));
  });
});
