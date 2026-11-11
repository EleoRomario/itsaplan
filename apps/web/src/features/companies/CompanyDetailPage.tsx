'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  User,
  FileText,
  History,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Upload,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useShell } from '@/context/shellContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useCompanyQuery,
  useCompanyActivityQuery,
  useSetCompanyBlacklistMutation,
  useUpdateCompanyMutation,
  useAddCompanyContactMutation,
  useDeleteCompanyContactMutation,
  useUploadCompanyAttachmentMutation,
  useDeleteCompanyAttachmentMutation,
} from '@/services/companies.service';
import { useMembersQuery } from '@/services/members.service';
import { companiesPath } from '@/utils/paths';
import SectionPageView from '@/components/common/page/SectionPageView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CompanyDetailPage({ companyId }: { companyId: number }) {
  const t = useTranslations('companies');
  const { project } = useShell();
  const { isAdmin } = usePermissions(project);
  const projectKey = project?.project.ref ?? '';

  const { data: company, isLoading } = useCompanyQuery(companyId);
  const { data: activity = [], isLoading: isLoadingActivity } = useCompanyActivityQuery(companyId);

  const membersQuery = useMembersQuery(projectKey, { kind: 'human', page: 1, pageSize: 50 });
  const members = membersQuery.data?.items ?? [];

  // Blacklist modal state
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');

  // Reassign modal state
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignUserId, setReassignUserId] = useState('');

  // Contact modal state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactDocId, setContactDocId] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [isLegalRep, setIsLegalRep] = useState(false);

  // Attachment upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('Ficha RUC');
  const [docYear, setDocYear] = useState<number>(new Date().getFullYear());

  const blacklistMutation = useSetCompanyBlacklistMutation(companyId);
  const updateCompanyMutation = useUpdateCompanyMutation(companyId);
  const addContactMutation = useAddCompanyContactMutation(companyId);
  const deleteContactMutation = useDeleteCompanyContactMutation(companyId);
  const uploadAttachmentMutation = useUploadCompanyAttachmentMutation(companyId);
  const deleteAttachmentMutation = useDeleteCompanyAttachmentMutation(companyId);

  const handleReassign = async () => {
    if (!reassignUserId) return;
    await updateCompanyMutation.mutateAsync({ ownerUserId: reassignUserId });
    setReassignOpen(false);
  };

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">{t('loading')}</div>;
  }

  if (!company) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">{t('noCompanies')}</div>
    );
  }

  const handleToggleBlacklist = async () => {
    const nextState = !company.isBlacklisted;
    await blacklistMutation.mutateAsync({
      isBlacklisted: nextState,
      blacklistReason: nextState ? blacklistReason.trim() : undefined,
    });
    setBlacklistOpen(false);
    setBlacklistReason('');
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) return;

    await addContactMutation.mutateAsync({
      name: contactName.trim(),
      role: contactRole.trim() || undefined,
      email: contactEmail.trim() || undefined,
      phone: contactPhone.trim() || undefined,
      documentId: contactDocId.trim() || undefined,
      isPrimary,
      isLegalRepresentative: isLegalRep,
    });

    setContactOpen(false);
    setContactName('');
    setContactRole('');
    setContactEmail('');
    setContactPhone('');
    setContactDocId('');
    setIsPrimary(false);
    setIsLegalRep(false);
  };

  const handleUploadAttachment = async () => {
    if (!uploadFile) return;
    await uploadAttachmentMutation.mutateAsync({
      file: uploadFile,
      meta: {
        documentType: docType,
        year: docYear,
      },
    });
    setUploadFile(null);
  };

  return (
    <SectionPageView
      title={company.name}
      description={`RUC: ${company.taxId} ${company.tradeName ? `• ${company.tradeName}` : ''}`}
      wide
      actions={
        <div className="flex items-center gap-2">
          <Link href={companiesPath(projectKey)}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              {t('title')}
            </Button>
          </Link>
          {isAdmin && (
            <Button
              variant={company.isBlacklisted ? 'outline' : 'destructive'}
              size="sm"
              className="gap-1.5"
              onClick={() => setBlacklistOpen(true)}
            >
              {company.isBlacklisted ? (
                <>
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {t('blacklistModal.removeTitle')}
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4" />
                  {t('blacklistModal.addTitle')}
                </>
              )}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Blacklist Alert Banner */}
        {company.isBlacklisted && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1 text-sm">
              <div className="font-semibold">{t('blacklistBannerTitle')}</div>
              <p>{t('blacklistBannerDesc')}</p>
              {company.blacklistReason && (
                <p className="mt-1 rounded bg-destructive/15 p-2 font-mono text-xs">
                  {t('reason')} {company.blacklistReason}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Company Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 text-xs text-muted-foreground">{t('newModal.taxIdLabel')}</div>
            <div className="font-mono text-sm font-medium">{company.taxId}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 text-xs text-muted-foreground">{t('status')}</div>
            <div>
              <Badge variant="outline">{company.status}</Badge>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 text-xs text-muted-foreground">{t('assignedExecutive')}</div>
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-sm font-medium">
                {company.owner?.name || company.owner?.email || 'Sin asignar'}
              </span>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px] text-primary"
                  onClick={() => {
                    setReassignUserId(company.ownerUserId ?? '');
                    setReassignOpen(true);
                  }}
                >
                  {t('reassign')}
                </Button>
              )}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 text-xs text-muted-foreground">{t('location')}</div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {company.city
                ? `${company.city}, ${company.country}`
                : company.country || t('notRegistered')}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-1 text-xs text-muted-foreground">{t('mainContact')}</div>
            <div className="flex items-center gap-1.5 truncate text-sm font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {company.email || t('notRegistered')}
            </div>
          </div>
        </div>

        {/* Tabs: Master Documents, Contacts, Cross-Project Activity */}
        <Tabs defaultValue="attachments" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="attachments" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              {t('tabs.documents')} ({company.attachments?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1.5 text-xs">
              <User className="h-3.5 w-3.5" />
              {t('tabs.contacts')} ({company.contacts?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5 text-xs">
              <History className="h-3.5 w-3.5" />
              {t('tabs.activity')} ({activity.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB: ATTACHMENTS */}
          <TabsContent value="attachments" className="space-y-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
              <div className="text-xs text-muted-foreground">{t('documents.description')}</div>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder={t('documents.typePlaceholder')}
                  className="h-8 w-48 text-xs"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder={t('documents.yearPlaceholder')}
                  className="h-8 w-20 text-xs"
                  value={docYear}
                  onChange={(e) => setDocYear(Number(e.target.value))}
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadFile(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    asChild
                  >
                    <span>
                      <Upload className="h-3.5 w-3.5" />
                      {uploadFile ? uploadFile.name : t('documents.selectFile')}
                    </span>
                  </Button>
                </label>
                {uploadFile && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleUploadAttachment}
                    disabled={uploadAttachmentMutation.isPending}
                  >
                    {uploadAttachmentMutation.isPending ? 'Uploading...' : t('documents.save')}
                  </Button>
                )}
              </div>
            </div>

            {company.attachments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                {t('documents.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {company.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex flex-col justify-between rounded-lg border bg-card p-3"
                  >
                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold">{att.filename}</span>
                        {att.year && (
                          <Badge variant="secondary" className="h-4 text-[10px]">
                            {att.year}
                          </Badge>
                        )}
                      </div>
                      <div className="mb-2 text-[11px] text-muted-foreground">
                        {att.documentType || 'Document'} • {(att.sizeBytes / 1024).toFixed(0)} KB
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-xs">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        <FileText className="h-3 w-3" />
                        {t('documents.viewDownload')}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteAttachmentMutation.mutate(att.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: CONTACTS */}
          <TabsContent value="contacts" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('contacts.description')}</span>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setContactOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('contacts.add')}
              </Button>
            </div>

            {company.contacts.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                {t('contacts.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {company.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between rounded-lg border bg-card p-3.5"
                  >
                    <div>
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <span className="truncate text-xs font-medium">{c.name}</span>
                        <div className="flex items-center gap-1">
                          {c.isPrimary && (
                            <Badge variant="default" className="h-4 text-[9px]">
                              {t('contacts.principalBadge')}
                            </Badge>
                          )}
                          {c.isLegalRepresentative && (
                            <Badge variant="secondary" className="h-4 text-[9px]">
                              {t('contacts.legalRepBadge')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mb-2 text-[11px] text-muted-foreground">
                        {c.role || '—'}
                        {c.documentId ? ` • DNI: ${c.documentId}` : ''}
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {c.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end border-t pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteContactMutation.mutate(c.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB: ACTIVITY */}
          <TabsContent value="activity" className="space-y-4 pt-4">
            <div className="mb-2 text-xs text-muted-foreground">{t('activity.description')}</div>

            {isLoadingActivity ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {t('activity.loading')}
              </div>
            ) : activity.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                {t('activity.empty')}
              </div>
            ) : (
              <div className="divide-y rounded-lg border bg-card">
                {activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 text-xs hover:bg-muted/40"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>{item.projectName}</span>
                        <span>•</span>
                        <Badge variant="outline" className="h-4 text-[10px]">
                          {item.columnName}
                        </Badge>
                      </div>
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Blacklist Modal */}
      <Dialog open={blacklistOpen} onOpenChange={setBlacklistOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {company.isBlacklisted ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  {t('blacklistModal.removeTitle')}
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                  {t('blacklistModal.addTitle')}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3 text-sm">
            {company.isBlacklisted ? (
              <p className="text-xs text-muted-foreground">
                {t('blacklistModal.removeConfirm', { name: company.name })}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{t('blacklistModal.addNotice')}</p>
                <div className="space-y-1">
                  <Label htmlFor="reason">{t('blacklistModal.reasonLabel')}</Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    placeholder={t('blacklistModal.reasonPlaceholder')}
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlacklistOpen(false)}
              disabled={blacklistMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={company.isBlacklisted ? 'default' : 'destructive'}
              onClick={handleToggleBlacklist}
              disabled={
                blacklistMutation.isPending || (!company.isBlacklisted && !blacklistReason.trim())
              }
            >
              {blacklistMutation.isPending
                ? 'Saving...'
                : company.isBlacklisted
                  ? t('blacklistModal.confirmRemoval')
                  : t('blacklistModal.confirmBlacklist')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Modal */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAddContact}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('contacts.add')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3 text-sm">
              <div className="space-y-1">
                <Label htmlFor="contactName">{t('contacts.nameLabel')}</Label>
                <Input
                  id="contactName"
                  required
                  placeholder="Juan Pérez"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="contactRole">{t('contacts.roleLabel')}</Label>
                  <Input
                    id="contactRole"
                    placeholder="Gerente General"
                    value={contactRole}
                    onChange={(e) => setContactRole(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactDocId">{t('contacts.docIdLabel')}</Label>
                  <Input
                    id="contactDocId"
                    placeholder="12345678"
                    value={contactDocId}
                    onChange={(e) => setContactDocId(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="contactEmail">{t('contacts.emailLabel')}</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="jperez@acme.pe"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contactPhone">{t('contacts.phoneLabel')}</Label>
                  <Input
                    id="contactPhone"
                    placeholder="+51 987654321"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 text-xs">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPrimary}
                    onChange={(e) => setIsPrimary(e.target.checked)}
                  />
                  <span>{t('contacts.isPrimary')}</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isLegalRep}
                    onChange={(e) => setIsLegalRep(e.target.checked)}
                  />
                  <span>{t('contacts.isLegalRep')}</span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setContactOpen(false)}
                disabled={addContactMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addContactMutation.isPending}>
                {addContactMutation.isPending ? 'Saving...' : t('contacts.add')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reassign Executive Modal */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('reassignTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-4 text-sm">
            <div className="space-y-1">
              <Label>{t('assignedExecutive')}</Label>
              <Select value={reassignUserId} onValueChange={setReassignUserId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t('selectExecutive')} />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId} className="text-xs">
                      {m.name || m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReassignOpen(false)}
              disabled={updateCompanyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleReassign}
              disabled={updateCompanyMutation.isPending || !reassignUserId}
            >
              {updateCompanyMutation.isPending ? 'Saving...' : t('reassign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionPageView>
  );
}
