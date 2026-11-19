import { useTranslations } from 'next-intl';
import type { Team } from '@/lib/api/endpoints/teams';
import { KEY_MAX_LENGTH } from '@/utils/projectKey';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CopyGroup, CopyInclude } from '@/utils/copyOptions';
import CopyProjectOptions from '@/components/layout/CopyProjectOptions';

// The copy-a-project form. The fields are few and the sections to carry over are
// many, so everything stacks full width instead of leaving one short column next
// to a tall one.
export default function CopyProjectForm({
  name,
  projectKey,
  description,
  teamId,
  teams,
  columns,
  include,
  onNameChange,
  onKeyChange,
  onDescriptionChange,
  onTeamChange,
  onIncludeChange,
}: {
  name: string;
  projectKey: string;
  description: string;
  teamId: number;
  teams: Team[];
  columns: CopyGroup[][];
  include: CopyInclude;
  onNameChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTeamChange: (teamId: number) => void;
  onIncludeChange: (value: CopyInclude) => void;
}) {
  const t = useTranslations('newProject');

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label>{t('name')}</Label>
          <Input autoFocus value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:w-40">
          <Label>{t('copyKey')}</Label>
          <Input
            value={projectKey}
            onChange={(e) => onKeyChange(e.target.value)}
            maxLength={KEY_MAX_LENGTH}
          />
        </div>
      </div>
      {teams.length > 1 && (
        <div className="space-y-1.5">
          <Label>{t('team')}</Label>
          <Select value={String(teamId)} onValueChange={(v) => onTeamChange(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teams.map((one) => (
                <SelectItem key={one.id} value={String(one.id)}>
                  {one.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label>{t('description')}</Label>
        <Textarea
          rows={2}
          className="resize-none"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      <CopyProjectOptions columns={columns} value={include} onChange={onIncludeChange} />
    </div>
  );
}
