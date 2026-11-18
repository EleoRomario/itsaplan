'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useSession } from '@/lib/auth-client';
import PageSkeleton from '@/components/common/skeleton/PageSkeleton';

// Scalar is a heavy client-only bundle: keep it out of the shared bundle and off
// the server.
const ScalarReference = dynamic(() => import('./components/ScalarReference'), {
  ssr: false,
  loading: () => <PageSkeleton rows={8} />,
});

// Mounted at /:team/:projectKey/api, but the spec it renders is instance-wide
// and restricted to the instance owner ("god").
export default function ApiDocsPage() {
  const t = useTranslations('nav');
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isGod = mounted && session?.user.role === 'god';
  const sessionSettled = mounted && !isPending;
  const { resolvedTheme } = useTheme();

  if (isGod) return <ScalarReference dark={resolvedTheme !== 'light'} />;
  if (sessionSettled) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
        {t('godModeOwnerOnly')}
      </div>
    );
  }
  return <PageSkeleton rows={8} />;
}
