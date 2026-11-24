'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { CompanyRef } from '@/lib/api/endpoints/companies';
import { useUpdateProject } from '@/services/projects.service';
import { usePermissions } from '@/hooks/usePermissions';

export interface GeneralForm {
  key: string;
  name: string;
  description: string;
  companyId: number | null;
  company: CompanyRef | null;
  companiesEnabled: boolean;
  setName: (v: string) => void;
  setDescription: (v: string) => void;
  setCompanyId: (v: number | null) => void;
  // Only an owner may edit; others see the current values read-only.
  editable: boolean;
  saving: boolean;
  canSave: boolean;
  save: () => Promise<void>;
}

// Form state for the General settings page: the project name, description and linked
// company. The key is read-only. Shared between the header Save button and the body
// fields, so it lives in a hook and is threaded into both.
export function useGeneralForm(project: ProjectDetail): GeneralForm {
  const t = useTranslations('settings.general');
  const { isOwner } = usePermissions();
  const {
    key,
    ref,
    name: savedName,
    description: savedDescription,
    companyId: savedCompanyId,
    company,
    companiesEnabled,
  } = project.project;
  const updateProject = useUpdateProject();

  const [name, setName] = useState(savedName);
  const [description, setDescription] = useState(savedDescription);
  const [companyId, setCompanyId] = useState<number | null>(savedCompanyId);

  const trimmedName = name.trim();
  const dirty =
    trimmedName !== savedName || description !== savedDescription || companyId !== savedCompanyId;
  const canSave = isOwner && trimmedName.length > 0 && dirty && !updateProject.isPending;

  async function save() {
    await updateProject.mutateAsync({
      projectKey: ref,
      patch: { name: trimmedName, description, companyId },
    });
    toast.success(t('saved'));
  }

  return {
    key,
    name,
    description,
    companyId,
    company,
    companiesEnabled,
    setName,
    setDescription,
    setCompanyId,
    editable: isOwner,
    saving: updateProject.isPending,
    canSave,
    save,
  };
}
