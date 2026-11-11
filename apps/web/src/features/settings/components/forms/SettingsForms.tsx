'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { NewProjectFormInput, ProjectForm } from '@/lib/api/endpoints/forms';
import {
  useCreateProjectForm,
  useDeleteProjectForm,
  useProjectFormsQuery,
  useUpdateProjectForm,
} from '@/services/forms.service';
import ListSkeleton from '@/components/common/skeleton/ListSkeleton';
import SettingsConfirmDeleteDialog from '../crud/SettingsConfirmDeleteDialog';
import { SettingsFormsEditor } from './SettingsFormsEditor';
import { SettingsFormsTable } from './SettingsFormsTable';

const BLANK_FORM: NewProjectFormInput = {
  title: '',
  description: '',
  slug: '',
  enabled: true,
  typeId: null,
  columnId: null,
  questions: [
    {
      id: 'q_1',
      label: 'Tipo de solicitud',
      type: 'select',
      required: true,
      options: ['Error o Bug', 'Mejora o Función', 'Pregunta o Duda'],
    },
    {
      id: 'q_2',
      label: 'Pasos para reproducir o detalles',
      type: 'textarea',
      required: false,
      placeholder: 'Describe con claridad la situación...',
    },
  ],
};

export default function SettingsForms({
  project,
  requestNew,
  onNewHandled,
}: {
  project: ProjectDetail;
  requestNew: boolean;
  onNewHandled: () => void;
}) {
  const t = useTranslations('settings.forms');
  const projectKey = project.project.ref;

  const formsQuery = useProjectFormsQuery(projectKey);
  const forms = formsQuery.data ?? [];
  const createForm = useCreateProjectForm(projectKey);
  const updateForm = useUpdateProjectForm(projectKey);
  const deleteForm = useDeleteProjectForm(projectKey);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editorForm, setEditorForm] = useState<NewProjectFormInput>(BLANK_FORM);
  const [deleting, setDeleting] = useState<ProjectForm | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!requestNew) return;
    setEditingId(null);
    setEditorForm(BLANK_FORM);
    onNewHandled();
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [requestNew, onNewHandled]);

  const saving = createForm.isPending || updateForm.isPending;

  function handleEdit(form: ProjectForm) {
    setEditingId(form.id);
    setEditorForm({
      title: form.title,
      description: form.description ?? '',
      slug: form.slug,
      enabled: form.enabled,
      typeId: form.typeId,
      columnId: form.columnId,
      questions: form.questions ?? [],
    });
    editorRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditorForm(BLANK_FORM);
  }

  function handleEditorChange(patch: Partial<NewProjectFormInput>) {
    setEditorForm((prev) => ({ ...prev, ...patch }));
  }

  async function handleSave() {
    if (editingId) {
      await updateForm.mutateAsync({ formId: editingId, patch: editorForm });
      setEditingId(null);
      setEditorForm(BLANK_FORM);
    } else {
      await createForm.mutateAsync(editorForm);
      setEditorForm(BLANK_FORM);
    }
  }

  async function handleToggleEnabled(form: ProjectForm, enabled: boolean) {
    await updateForm.mutateAsync({ formId: form.id, patch: { enabled } });
  }

  return (
    <div className="flex flex-col gap-10">
      {/* Table section */}
      <div>
        {formsQuery.isPending ? (
          <ListSkeleton rows={3} rowClassName="h-12" />
        ) : forms.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('emptyHint')}
          </div>
        ) : (
          <SettingsFormsTable
            forms={forms}
            onEdit={handleEdit}
            onToggleEnabled={handleToggleEnabled}
            onDelete={setDeleting}
          />
        )}
      </div>

      {/* Editor section */}
      <div ref={editorRef}>
        <SettingsFormsEditor
          project={project}
          form={editorForm}
          editingId={editingId}
          saving={saving}
          onChange={handleEditorChange}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      {deleting && (
        <SettingsConfirmDeleteDialog
          title={t('deleteTitle')}
          confirmLabel={t('delete')}
          message={t.rich('deleteMessage', {
            title: deleting.title,
            v: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
          onConfirm={async () => {
            await deleteForm.mutateAsync(deleting.id);
            if (editingId === deleting.id) handleCancelEdit();
            setDeleting(null);
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
