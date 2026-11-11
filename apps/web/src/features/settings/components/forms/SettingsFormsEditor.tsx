'use client';

import { useState } from 'react';
import {
  CalendarDays,
  CircleChevronDown,
  GripVertical,
  Plus,
  TextAlignStart,
  Trash2,
  Type,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type {
  FormQuestion,
  FormQuestionType,
  NewProjectFormInput,
} from '@/lib/api/endpoints/forms';

const TABS = ['form', 'questions', 'issue', 'design'] as const;

const QUESTION_ICONS: Record<FormQuestionType, typeof Type> = {
  text: Type,
  textarea: TextAlignStart,
  select: CircleChevronDown,
  date: CalendarDays,
};

export function SettingsFormsEditor({
  project,
  form,
  editingId,
  saving,
  onChange,
  onSave,
  onCancelEdit,
}: {
  project: ProjectDetail;
  form: NewProjectFormInput;
  editingId: number | null;
  saving: boolean;
  onChange: (patch: Partial<NewProjectFormInput>) => void;
  onSave: () => Promise<void>;
  onCancelEdit: () => void;
}) {
  const t = useTranslations('sections.previews.forms');
  const tSettings = useTranslations('settings.forms');
  const tCommon = useTranslations('common');
  const [activeTab, setActiveTab] = useState<string>('questions');

  const questions = form.questions ?? [];

  function addQuestion() {
    const newQuestion: FormQuestion = {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: `Pregunta ${questions.length + 1}`,
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
    };
    onChange({ questions: [...questions, newQuestion] });
  }

  function updateQuestion(index: number, patch: Partial<FormQuestion>) {
    const next = [...questions];
    next[index] = { ...next[index], ...patch };
    onChange({ questions: next });
  }

  function removeQuestion(index: number) {
    onChange({ questions: questions.filter((_, i) => i !== index) });
  }

  const valid = (form.title?.trim().length ?? 0) > 0;

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">
          {editingId ? `Editar: ${form.title || 'Formulario'}` : t('new')}
        </h2>
        {editingId && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
            Cancelar edición
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        {/* Left Side: Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-0">
          <TabsList variant="line">
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab: Formulario */}
          <TabsContent value="form" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="editor-title">{tSettings('title')}</Label>
              <Input
                id="editor-title"
                required
                value={form.title ?? ''}
                onChange={(e) => onChange({ title: e.target.value })}
                placeholder={tSettings('titlePlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-description">{tSettings('description')}</Label>
              <Textarea
                id="editor-description"
                rows={3}
                value={form.description ?? ''}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder={tSettings('descriptionPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editor-slug">{tSettings('slug')}</Label>
              <div className="flex items-center rounded-md border border-input bg-transparent px-3">
                <span className="text-xs text-muted-foreground select-none">/p/forms/</span>
                <input
                  id="editor-slug"
                  className="flex h-9 w-full rounded-md bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
                  value={form.slug ?? ''}
                  onChange={(e) =>
                    onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })
                  }
                  placeholder="slug-del-formulario"
                />
              </div>
              <p className="text-xs text-muted-foreground">{tSettings('slugHint')}</p>
            </div>
          </TabsContent>

          {/* Tab: Preguntas */}
          <TabsContent value="questions" className="space-y-2.5 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{t('questionsHint')}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addQuestion}
                className="flex h-7 items-center gap-1.5 px-2 text-sm text-foreground hover:bg-muted"
              >
                <Plus className="size-4" />
                {tCommon('add')}
              </Button>
            </div>

            <div className="space-y-2 rounded-md border p-2">
              {questions.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No hay preguntas adicionales. Haz clic en <strong>+ Añadir</strong> para agregar
                  campos al formulario.
                </div>
              ) : (
                questions.map((q, idx) => {
                  const Icon = QUESTION_ICONS[q.type] ?? Type;
                  return (
                    <div
                      key={q.id}
                      className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="size-4 shrink-0 text-muted-foreground/50" />
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <Input
                          value={q.label}
                          onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                          className="h-8 flex-1 text-xs"
                          placeholder="Etiqueta de la pregunta"
                        />
                        <Select
                          value={q.type}
                          onValueChange={(val: FormQuestionType) =>
                            updateQuestion(idx, { type: val })
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Texto corto</SelectItem>
                            <SelectItem value="textarea">Texto largo</SelectItem>
                            <SelectItem value="select">Menú selección</SelectItem>
                            <SelectItem value="date">Fecha</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeQuestion(idx)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between gap-4 pl-6 text-xs">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`q_req_${q.id}`}
                            checked={q.required}
                            onCheckedChange={(checked) =>
                              updateQuestion(idx, { required: checked === true })
                            }
                          />
                          <label
                            htmlFor={`q_req_${q.id}`}
                            className="cursor-pointer text-muted-foreground select-none"
                          >
                            Obligatorio
                          </label>
                        </div>

                        {q.type === 'select' && (
                          <Input
                            placeholder="Opciones separadas por coma"
                            value={(q.options ?? []).join(', ')}
                            onChange={(e) =>
                              updateQuestion(idx, {
                                options: e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="h-7 max-w-xs text-xs"
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Tab: Ticket */}
          <TabsContent value="issue" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="issue-type-select">{tSettings('issueType')}</Label>
              <Select
                value={form.typeId != null ? String(form.typeId) : 'none'}
                onValueChange={(val) => onChange({ typeId: val === 'none' ? null : Number(val) })}
              >
                <SelectTrigger id="issue-type-select">
                  <SelectValue placeholder={tSettings('issueTypeHint')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tipo por defecto</SelectItem>
                  {project.issueTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{tSettings('issueTypeHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issue-column-select">{tSettings('column')}</Label>
              <Select
                value={form.columnId != null ? String(form.columnId) : 'none'}
                onValueChange={(val) => onChange({ columnId: val === 'none' ? null : Number(val) })}
              >
                <SelectTrigger id="issue-column-select">
                  <SelectValue placeholder={tSettings('columnHint')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Primera columna del tablero</SelectItem>
                  {project.columns.map((col) => (
                    <SelectItem key={col.id} value={String(col.id)}>
                      {col.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{tSettings('columnHint')}</p>
            </div>
          </TabsContent>

          {/* Tab: Diseño */}
          <TabsContent value="design" className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label>Encabezado del proyecto en formulario</Label>
              <Input
                disabled
                value={project.project.name}
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Se muestra en la parte superior del formulario público.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Texto del botón de envío</Label>
              <Input placeholder="Enviar solicitud" defaultValue="Enviar solicitud" />
            </div>
          </TabsContent>
        </Tabs>

        {/* Right Side: Live Interactive Preview */}
        <div className="hidden min-w-0 flex-col border-s ps-6 md:flex">
          <span className="flex h-9 items-center text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {t('preview')}
          </span>
          <div className="mt-2 space-y-5 rounded-lg border border-border/70 bg-card p-6 shadow-sm">
            <div className="space-y-1 border-b border-border/50 pb-3">
              <div className="inline-block rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {project.project.name}
              </div>
              <h3 className="text-lg font-bold text-foreground">
                {form.title?.trim() || 'Nuevo formulario'}
              </h3>
              {form.description && (
                <p className="text-xs whitespace-pre-line text-muted-foreground">
                  {form.description}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-foreground">
                  {t('name')} <span className="text-destructive">*</span>
                </div>
                <Input disabled placeholder="Nombre completo" className="h-8 bg-muted/30 text-xs" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-foreground">
                  {t('email')} <span className="text-destructive">*</span>
                </div>
                <Input
                  disabled
                  placeholder="correo@ejemplo.com"
                  className="h-8 bg-muted/30 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-foreground">
                  Título / Asunto <span className="text-destructive">*</span>
                </div>
                <Input
                  disabled
                  placeholder="Resumen del requerimiento"
                  className="h-8 bg-muted/30 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-foreground">Detalles</div>
                <Textarea
                  disabled
                  rows={2}
                  placeholder="Descripción opcional"
                  className="bg-muted/30 text-xs"
                />
              </div>

              {questions.map((q) => (
                <div key={q.id} className="space-y-1">
                  <div className="text-xs font-medium text-foreground">
                    {q.label || 'Pregunta sin título'}{' '}
                    {q.required && <span className="text-destructive">*</span>}
                  </div>
                  {q.type === 'textarea' ? (
                    <Textarea
                      disabled
                      rows={2}
                      placeholder={q.placeholder}
                      className="bg-muted/30 text-xs"
                    />
                  ) : q.type === 'select' ? (
                    <Select disabled>
                      <SelectTrigger className="h-8 bg-muted/30 text-xs">
                        <SelectValue
                          placeholder={
                            q.placeholder || (q.options?.length ? q.options[0] : 'Seleccionar...')
                          }
                        />
                      </SelectTrigger>
                    </Select>
                  ) : q.type === 'date' ? (
                    <Input disabled type="date" className="h-8 bg-muted/30 text-xs" />
                  ) : (
                    <Input
                      disabled
                      placeholder={q.placeholder}
                      className="h-8 bg-muted/30 text-xs"
                    />
                  )}
                </div>
              ))}
            </div>

            <Button disabled size="sm" className="w-full text-xs">
              Enviar solicitud
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/60 pt-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={form.enabled ?? true}
            onCheckedChange={(checked) => onChange({ enabled: checked })}
          />
          <span className="text-sm font-medium">{t('enabled')}</span>
        </div>

        <Button
          type="button"
          onClick={() => void onSave()}
          disabled={!valid || saving}
          className="min-w-28"
        >
          {saving ? tCommon('saving') : editingId ? tCommon('save') : 'Crear formulario'}
        </Button>
      </div>
    </section>
  );
}
