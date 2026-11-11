import CompanyDetailPage from '@/features/companies/CompanyDetailPage';

export default async function Page({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  return <CompanyDetailPage companyId={Number(companyId)} />;
}
