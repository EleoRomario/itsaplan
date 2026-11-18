'use client';

import { Workflow } from 'lucide-react';
import type { ProjectDetail } from '@/lib/api/endpoints/projects';
import type { SettingsSection } from '@/utils/settingsSections';
import SettingsWorkflowsPreview from '@/features/settings/components/workflows/SettingsWorkflowsPreview';

// A self-hosted instance lists the core's project settings sections with a preview of the
// agent workflows section after schedules.
export default function useProjectSettingsSections(
  _project: ProjectDetail | null,
  core: SettingsSection[],
): SettingsSection[] {
  return insertAfter(core, 'schedules', {
    slug: 'workflows',
    icon: Workflow,
    resource: 'agent_schedules',
    group: 'ai-team',
    Component: SettingsWorkflowsPreview,
  });
}

function insertAfter(sections: SettingsSection[], slug: string, section: SettingsSection) {
  const at = sections.findIndex((one) => one.slug === slug) + 1;
  return [...sections.slice(0, at), section, ...sections.slice(at)];
}
