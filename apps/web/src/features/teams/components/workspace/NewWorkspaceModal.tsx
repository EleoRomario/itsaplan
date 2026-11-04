'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Modal from '@/components/common/overlay/Modal';
import { Button } from '@/components/ui/button';
import { useCreateWorkspace } from '@/services/workspaces.service';
import type { Workspace } from '@/lib/api/endpoints/workspaces';

// Creates a workspace with the current user as its owner. Name only: everything else
// a workspace carries (its teams, its members) is added afterwards.
export default function NewWorkspaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (workspace: Workspace) => void;
}) {
  const t = useTranslations('teams.workspace');
  const [name, setName] = useState('');
  const createWorkspace = useCreateWorkspace();

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !createWorkspace.isPending;

  function submit() {
    if (!canSubmit) return;
    createWorkspace.mutate(
      { name: trimmed },
      {
        onSuccess: (workspace) => {
          onClose();
          onCreated?.(workspace);
        },
      },
    );
  }

  return (
    <Modal title={t('create')} onClose={onClose} className="pb-3">
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Building2 className="size-5" />
          </div>
          <input
            dir={name ? 'auto' : undefined}
            className="w-full bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground"
            placeholder={t('info.workspaceHint')}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) submit();
            }}
            autoFocus
          />
        </div>

        <p className="mt-3 text-sm text-muted-foreground">{t('info.description')}</p>

        <div className="mt-4 flex items-center border-t pt-3">
          <Button className="ms-auto" disabled={!canSubmit} onClick={submit}>
            {t('create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
