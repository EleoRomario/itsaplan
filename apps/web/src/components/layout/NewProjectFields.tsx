import { useTranslations } from 'next-intl';
import type { CompanyRef, CompanySummary } from '@/lib/api/endpoints/companies';
import { KEY_MAX_LENGTH } from '@/utils/projectKey';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import CompanySelect from '@/components/common/fields/CompanySelect';

export default function NewProjectFields({
  name,
  projectKey,
  description,
  companiesEnabled,
  companyId,
  initialCompany,
  onNameChange,
  onKeyChange,
  onDescriptionChange,
  onCompaniesEnabledChange,
  onCompanyChange,
}: {
  name: string;
  projectKey: string;
  description: string;
  companiesEnabled?: boolean;
  companyId?: number | null;
  initialCompany?: CompanyRef | null;
  onNameChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCompaniesEnabledChange?: (enabled: boolean) => void;
  onCompanyChange?: (id: number | null, company: CompanySummary | null) => void;
}) {
  const t = useTranslations('newProject');

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1.5">
        <Label>{t('name')}</Label>
        <Input autoFocus value={name} onChange={(e) => onNameChange(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>{t('key')}</Label>
        <Input
          value={projectKey}
          onChange={(e) => onKeyChange(e.target.value)}
          maxLength={KEY_MAX_LENGTH}
        />
      </div>
      <div className="flex flex-1 flex-col space-y-1.5">
        <Label>{t('description')}</Label>
        <Textarea
          rows={2}
          className="min-h-20 flex-1 resize-none"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
      {onCompaniesEnabledChange && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <Label className="text-xs font-medium">{t('useCompanies')}</Label>
              <p className="text-[11px] text-muted-foreground">{t('useCompaniesHint')}</p>
            </div>
            <Switch
              checked={companiesEnabled ?? true}
              onCheckedChange={(checked) => {
                onCompaniesEnabledChange(checked);
                if (!checked) onCompanyChange?.(null, null);
              }}
            />
          </div>
          {(companiesEnabled ?? true) && onCompanyChange && (
            <div className="space-y-1 pt-1">
              <Label className="text-xs">{t('companyOptional')}</Label>
              <div>
                <CompanySelect
                  value={companyId ?? null}
                  onChange={(id) => {
                    if (id == null) onCompanyChange(null, null);
                  }}
                  onSelectCompany={(c) => onCompanyChange(c?.id ?? null, c)}
                  fallbackCompany={initialCompany}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{t('companyOptionalHint')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
