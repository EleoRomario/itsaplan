'use client';

import { useState } from 'react';
import { Check, Code, Copy, ExternalLink, Link2, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ProjectForm } from '@/lib/api/endpoints/forms';

const HEAD = 'text-xs font-medium text-muted-foreground';

export function SettingsFormsTable({
  forms,
  onEdit,
  onToggleEnabled,
  onDelete,
}: {
  forms: ProjectForm[];
  onEdit: (form: ProjectForm) => void;
  onToggleEnabled: (form: ProjectForm, enabled: boolean) => Promise<void>;
  onDelete: (form: ProjectForm) => void;
}) {
  const t = useTranslations('settings.forms');
  const tCommon = useTranslations('common');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  function copyFormLink(form: ProjectForm) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/p/forms/${form.slug}`;
    void navigator.clipboard.writeText(url);
    toast.success(t('linkCopied'));
    setCopiedId(form.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function copyEmbedCode(form: ProjectForm) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const embed = `<iframe src="${origin}/p/forms/${form.slug}" width="100%" height="650" frameborder="0"></iframe>`;
    void navigator.clipboard.writeText(embed);
    toast.success('Código de incrustación copiado');
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <Table className="min-w-[640px] table-fixed">
        <colgroup>
          <col className="w-[35%]" />
          <col className="w-[35%]" />
          <col className="w-[15%]" />
          <col className="w-[15%]" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={HEAD}>{t('columns.form')}</TableHead>
            <TableHead className={HEAD}>{t('columns.link')}</TableHead>
            <TableHead className={HEAD}>{t('columns.enabled')}</TableHead>
            <TableHead className={`${HEAD} text-end`}>{tCommon('actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((form) => (
            <TableRow key={form.id} className="hover:bg-muted/40">
              <TableCell className="px-4 py-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium text-foreground">{form.title}</div>
                  {form.description && (
                    <div className="line-clamp-1 text-xs text-muted-foreground">
                      {form.description}
                    </div>
                  )}
                </div>
              </TableCell>

              <TableCell className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-mono text-foreground/80">/p/forms/{form.slug}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => copyFormLink(form)}
                    title={t('copyLink')}
                  >
                    {copiedId === form.id ? (
                      <Check className="size-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    asChild
                    title={t('openForm')}
                  >
                    <a href={`/p/forms/${form.slug}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </TableCell>

              <TableCell className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(checked) => void onToggleEnabled(form, checked)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {form.enabled ? t('enabled') : t('disabled')}
                  </span>
                </div>
              </TableCell>

              <TableCell className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyFormLink(form)}
                    title={t('copyLink')}
                  >
                    {copiedId === form.id ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Link2 className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyEmbedCode(form)}
                    title="Incrustar (iframe)"
                  >
                    <Code className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(form)}
                    title={t('edit')}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(form)}
                    title={t('delete')}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
