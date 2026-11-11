import PublicFormView from '@/features/forms/PublicFormView';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <PublicFormView slug={slug} />;
}
