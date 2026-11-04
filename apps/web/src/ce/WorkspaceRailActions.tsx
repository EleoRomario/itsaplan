'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { workspaceRowClass, workspaceTileClass } from '@/components/layout/utils/workspaceTile';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { workspacePath } from '@/utils/paths';
import NewWorkspaceModal from '@/features/teams/components/workspace/NewWorkspaceModal';

// Below the workspaces of a rail of tiles or of a list of rows. Opens the modal to create
// a new workspace.
export default function WorkspaceRailActions({ variant = 'tile' }: { variant?: 'tile' | 'row' }) {
  const t = useTranslations('teams.workspace');
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      {variant === 'row' ? (
        <Button
          variant="ghost"
          className={`${workspaceRowClass} text-muted-foreground`}
          onClick={() => setOpen(true)}
        >
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed"
          >
            <Plus className="size-3.5" />
          </span>
          {t('create')}
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={t('create')}
              className={workspaceTileClass(false)}
              onClick={() => setOpen(true)}
            >
              <Plus className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('create')}</TooltipContent>
        </Tooltip>
      )}

      {open && (
        <NewWorkspaceModal
          onClose={() => setOpen(false)}
          onCreated={(workspace) => router.push(workspacePath(workspace.id))}
        />
      )}
    </>
  );
}
