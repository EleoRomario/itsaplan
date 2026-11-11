'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PublicShareFrame from '@/components/common/page/PublicShareFrame';
import { Button } from '@/components/ui/button';
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
import { usePublicFormQuery, useSubmitPublicForm } from '@/services/forms.service';
import type { FormQuestion } from '@/lib/api/endpoints/forms';

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: FormQuestion;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const strVal = (value as string) ?? '';
  switch (question.type) {
    case 'textarea':
      return (
        <Textarea
          id={`q-${question.id}`}
          required={question.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={3}
        />
      );
    case 'select':
      return (
        <Select value={strVal} onValueChange={onChange} required={question.required}>
          <SelectTrigger id={`q-${question.id}`}>
            <SelectValue placeholder={question.placeholder || 'Select an option'} />
          </SelectTrigger>
          <SelectContent>
            {(question.options ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'date':
      return (
        <Input
          id={`q-${question.id}`}
          type="date"
          required={question.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <Input
          id={`q-${question.id}`}
          type="text"
          required={question.required}
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
        />
      );
  }
}

export default function PublicFormView({ slug }: { slug: string }) {
  const tCommon = useTranslations('common');

  const { data: form, isLoading, isError } = usePublicFormQuery(slug);
  const submitMutation = useSubmitPublicForm(slug);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submittedIssueKey, setSubmittedIssueKey] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PublicShareFrame>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-xl animate-pulse space-y-4 rounded-2xl border border-border/60 bg-card p-8 shadow-sm">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="space-y-3 pt-4">
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
              <div className="h-24 rounded bg-muted" />
            </div>
          </div>
        </div>
      </PublicShareFrame>
    );
  }

  if (isError || !form || !form.enabled) {
    return (
      <PublicShareFrame>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
            <AlertCircle className="mx-auto size-10 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Form not available</h1>
            <p className="text-sm text-muted-foreground">
              This form is either disabled, does not exist, or is no longer taking submissions.
            </p>
          </div>
        </div>
      </PublicShareFrame>
    );
  }

  function handleAnswerChange(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !title.trim()) return;

    const result = await submitMutation.mutateAsync({
      name: name.trim(),
      email: email.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      answers,
    });

    if (result.success) {
      setSubmittedIssueKey(result.issueKey);
    }
  }

  function handleReset() {
    setName('');
    setEmail('');
    setTitle('');
    setDescription('');
    setAnswers({});
    setSubmittedIssueKey(null);
  }

  return (
    <PublicShareFrame>
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-xl rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-10">
          {submittedIssueKey ? (
            <div className="space-y-4 py-8 text-center">
              <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">Request submitted</h2>
                <p className="text-sm text-muted-foreground">
                  Thank you! Your request has been recorded with identifier{' '}
                  <span className="font-mono font-medium text-foreground">{submittedIssueKey}</span>
                  .
                </p>
              </div>
              <div className="pt-4">
                <Button variant="outline" onClick={handleReset}>
                  Submit another request
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              <div className="space-y-2 border-b border-border/50 pb-5">
                <div className="inline-block rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {form.project.name}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{form.title}</h1>
                {form.description && (
                  <p className="text-sm whitespace-pre-line text-muted-foreground">
                    {form.description}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="submitter-name">
                      Your name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="submitter-name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="submitter-email">
                      Email address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="submitter-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issue-title">
                    Subject / Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="issue-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief summary of your request"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issue-details">Details</Label>
                  <Textarea
                    id="issue-details"
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide as much context or description as needed"
                  />
                </div>

                {form.questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={`q-${q.id}`}>
                      {q.label} {q.required && <span className="text-destructive">*</span>}
                    </Label>
                    <QuestionInput
                      question={q}
                      value={answers[q.id]}
                      onChange={(val) => handleAnswerChange(q.id, val)}
                    />
                  </div>
                ))}
              </div>

              {submitMutation.isError && (
                <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  Failed to submit form. Please check your answers and try again.
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full gap-2"
                  disabled={submitMutation.isPending}
                >
                  <Send className="size-4" />
                  {submitMutation.isPending ? tCommon('saving') : 'Submit request'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </PublicShareFrame>
  );
}
