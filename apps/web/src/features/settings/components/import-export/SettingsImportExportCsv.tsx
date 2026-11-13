'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SettingsCard from '@/components/common/page/SettingsCard';
import SettingsSection from '@/components/common/page/SettingsSection';
import { AgentChatImportPreview } from '@/components/common/agent-chat/AgentChatImportPreview';
import {
  uploadImportFile,
  updateImportMapping,
  confirmImport,
  discardImport,
  type IssueImport,
  type ImportConfirmResult,
} from '@/lib/api/endpoints/imports';

const MAPPABLE_FIELDS = [
  { key: 'title', labelKey: 'fieldTitle', required: true },
  { key: 'description', labelKey: 'fieldDescription', required: false },
  { key: 'priority', labelKey: 'fieldPriority', required: false },
  { key: 'dueDate', labelKey: 'fieldDueDate', required: false },
  { key: 'state', labelKey: 'fieldState', required: false },
  { key: 'assignee', labelKey: 'fieldAssignee', required: false },
  { key: 'labels', labelKey: 'fieldLabels', required: false },
] as const;

export default function SettingsImportExportCsv({ project }: { project: ProjectDetail }) {
  const t = useTranslations('settings.importExport.csv');
  const projectKey = project.project.ref;

  const [draft, setDraft] = useState<IssueImport | null>(null);
  const [result, setResult] = useState<ImportConfirmResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(file: File) {
    setError(null);
    setUploading(true);
    try {
      const res = await uploadImportFile(projectKey, file);
      setDraft(res);
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
  }

  function downloadSampleCsv() {
    const content =
      'Title,Description,Priority,Due Date,Status,Assignee,Labels\n' +
      '"Implementar autenticación OAuth","Añadir soporte para Google y GitHub","high","2026-12-01","Backlog","admin@example.com","auth,backend"\n' +
      '"Diseñar pantalla de login","Crear interfaz con componentes Tailwind","medium","2026-12-05","To Do","","frontend,ui"\n' +
      '"Escribir pruebas de integración","Añadir tests para endpoints principales","low","2026-12-10","Backlog","","testing"\n';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_importacion_tareas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleMappingChange(fieldKey: string, headerValue: string) {
    if (!draft) return;
    setError(null);
    setUpdating(true);

    const nextMapping: Record<string, string> = { ...(draft.mapping ?? {}) };
    if (!headerValue || headerValue === '__none__') {
      delete nextMapping[fieldKey];
    } else {
      nextMapping[fieldKey] = headerValue;
    }

    try {
      const updated = await updateImportMapping(draft.id, nextMapping);
      setDraft(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdating(false);
    }
  }

  async function handleConfirm() {
    if (!draft) return;
    setError(null);
    setConfirming(true);
    try {
      const res = await confirmImport(draft.id);
      setResult(res);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConfirming(false);
    }
  }

  async function handleReset() {
    if (draft) {
      void discardImport(draft.id).catch(() => {});
    }
    setDraft(null);
    setResult(null);
    setError(null);
  }

  const validRowCount = draft?.preview?.rows.filter((r) => !r.skip).length ?? 0;
  const skipRowCount = draft?.preview?.rows.filter((r) => Boolean(r.skip)).length ?? 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RESULT VIEW */}
      {result && (
        <SettingsSection title={t('successTitle')} description="">
          <SettingsCard className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-green-600">
              <CheckCircle2 className="size-6 shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{t('successTitle')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('successCount', { count: result.imported.length })}
                </p>
              </div>
            </div>

            {result.imported.length > 0 && (
              <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-md border bg-muted/20 p-3 text-sm">
                {result.imported.map((issue) => (
                  <div key={issue.key} className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {issue.key}
                    </Badge>
                    <span className="truncate">{issue.title}</span>
                  </div>
                ))}
              </div>
            )}

            {result.skipped.length > 0 && (
              <div className="space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                <p className="font-medium">{t('skippedCount', { count: result.skipped.length })}</p>
                <ul className="list-disc space-y-0.5 ps-4">
                  {result.skipped.slice(0, 10).map((skip, i) => (
                    <li key={i}>
                      Fila {skip.row}: {skip.reason}
                    </li>
                  ))}
                  {result.skipped.length > 10 && (
                    <li>... y {result.skipped.length - 10} filas más.</li>
                  )}
                </ul>
              </div>
            )}

            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="size-4" />
              {t('importMore')}
            </Button>
          </SettingsCard>
        </SettingsSection>
      )}

      {/* UPLOAD VIEW (When no active draft and no result) */}
      {!draft && !result && (
        <SettingsSection title={t('title')} description={t('hint')}>
          <SettingsCard className="space-y-4 p-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.docx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={onFileInputChange}
              />
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                {uploading ? (
                  <Loader2 className="size-8 animate-spin" />
                ) : (
                  <UploadCloud className="size-8" />
                )}
              </div>
              <div className="space-y-1">
                <p className="font-medium">{uploading ? t('confirming') : t('dropzone')}</p>
                <p className="text-xs text-muted-foreground">{t('formats')}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={downloadSampleCsv}
              >
                <Download className="size-3.5" />
                {t('downloadTemplate')}
              </Button>
            </div>
          </SettingsCard>
        </SettingsSection>
      )}

      {/* MAPPING & PREVIEW VIEW (When draft is loaded) */}
      {draft && (
        <>
          {/* File summary banner */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="size-5 text-primary" />
              <div>
                <span className="font-medium">{draft.filename}</span>
                <span className="ms-2 text-xs text-muted-foreground">
                  ({(draft.sizeBytes / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Badge variant="secondary" className="ms-2">
                {t('totalRows', { count: draft.preview?.totalRows ?? 0 })}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t('changeFile')}
            </Button>
          </div>

          {/* Column Mapping Section */}
          <SettingsSection title={t('mappingTitle')} description={t('mappingHint')}>
            <SettingsCard className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {MAPPABLE_FIELDS.map((f) => {
                  const currentValue = draft.mapping?.[f.key] ?? '__none__';
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <label className="flex items-center gap-1 text-xs font-medium text-foreground">
                        {t(f.labelKey)}
                        {f.required && <span className="text-destructive">*</span>}
                      </label>
                      <Select
                        value={currentValue}
                        onValueChange={(val) => void handleMappingChange(f.key, val)}
                        disabled={updating || confirming}
                      >
                        <SelectTrigger className="w-full text-xs">
                          <SelectValue placeholder={t('noField')} />
                        </SelectTrigger>
                        <SelectContent>
                          {!f.required && (
                            <SelectItem value="__none__" className="text-xs text-muted-foreground">
                              {t('noField')}
                            </SelectItem>
                          )}
                          {draft.headers?.map((h) => (
                            <SelectItem key={h} value={h} className="text-xs">
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </SettingsCard>
          </SettingsSection>

          {/* Preview Section */}
          {draft.preview && (
            <SettingsSection title={t('previewTitle')} description={t('previewHint')}>
              <SettingsCard className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-green-600/40 bg-green-500/10 text-green-700"
                  >
                    {t('validRows', { count: validRowCount })}
                  </Badge>
                  {skipRowCount > 0 && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 bg-amber-500/10 text-amber-700"
                    >
                      {t('skipRows', { count: skipRowCount })}
                    </Badge>
                  )}
                  {updating && (
                    <span className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" />
                      Actualizando vista previa...
                    </span>
                  )}
                </div>

                <div className="overflow-hidden rounded-lg border p-2">
                  <AgentChatImportPreview
                    columns={draft.preview.columns}
                    rows={draft.preview.rows}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={handleReset} disabled={confirming}>
                    {t('cancel')}
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={validRowCount === 0 || confirming || updating}
                    className="gap-2"
                  >
                    {confirming && <Loader2 className="size-4 animate-spin" />}
                    {confirming ? t('confirming') : t('confirm')}
                  </Button>
                </div>
              </SettingsCard>
            </SettingsSection>
          )}
        </>
      )}
    </div>
  );
}
