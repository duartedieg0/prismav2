'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BookOpen, MoreVertical, Pencil, Trash2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { ExamStatus } from '@/lib/types/extraction';

interface Subject {
  id: string;
  name: string;
}

interface GradeLevel {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  created_at: string;
  updated_at: string;
  subject?: Subject | null;
  grade_level?: GradeLevel | null;
}

interface StatusConfig {
  barColor: string;
  badgeVariant: 'status-draft' | 'status-processing' | 'status-ready' | 'status-error' | 'status-archived';
  badgeLabel: string;
  actionLabel: string;
  actionDisabled: boolean;
}

interface ExamCardProps {
  exam: Exam;
  statusConfig: StatusConfig;
  actionHref: string;
  formatRelativeDate: (dateStr: string) => string;
}

export function ExamCard({
  exam,
  statusConfig,
  actionHref,
  formatRelativeDate,
}: ExamCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', exam.id);

      if (error) {
        console.error('Failed to delete exam:', error);
        setShowDeleteDialog(false);
        return;
      }

      setShowDeleteDialog(false);
      router.refresh();
    } catch (error) {
      console.error('Error deleting exam:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Render action element based on exam status — matching prototype:
   * - ready: green text link "Visualizar →"
   * - processing: green text "Adaptando..." with spinner
   * - draft: green filled "Continuar" button
   * - error: red text "Ver detalhes" with warning icon
   */
  function renderAction() {
    switch (exam.status) {
      case 'ready':
        return (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-container transition-colors"
          >
            {statusConfig.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        );
      case 'uploading':
      case 'processing':
      case 'awaiting_answers':
        return (
          <span className="inline-flex items-center gap-1.5 text-sm text-primary">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {statusConfig.actionLabel}
          </span>
        );
      case 'draft':
        return (
          <Link href={actionHref}>
            <Button
              variant="default"
              size="sm"
              className="bg-primary hover:bg-primary-container text-primary-foreground font-display font-semibold"
            >
              {statusConfig.actionLabel}
            </Button>
          </Link>
        );
      case 'error':
        return (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors"
          >
            {statusConfig.actionLabel}
            <AlertCircle className="w-4 h-4" />
          </Link>
        );
      default:
        return (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary-container transition-colors"
          >
            {statusConfig.actionLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        );
    }
  }

  return (
    <>
      <div className="relative bg-card rounded-lg overflow-hidden hover:shadow-sm transition-all">
        {/* Left border indicator — thick, colored */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.barColor}`}
        />

        {/* Card Content */}
        <div className="p-6 pl-7 flex flex-col gap-4">
          {/* Header: Status badge + Three-dot menu */}
          <div className="flex items-start justify-between">
            <Badge
              variant={statusConfig.badgeVariant}
              className="flex-shrink-0"
            >
              {statusConfig.badgeLabel}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                  aria-label="Opções da prova"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/exams/${exam.id}/edit`)}>
                  <Pencil className="w-4 h-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Title */}
          <h3 className="font-display text-xl font-bold text-foreground line-clamp-2 leading-tight">
            {exam.title}
          </h3>

          {/* Metadata: Subject + Grade Level */}
          {(exam.subject || exam.grade_level) && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
              <BookOpen className="w-4 h-4 flex-shrink-0" />
              {exam.subject?.name}
              {exam.subject && exam.grade_level && (
                <span className="text-muted-foreground">·</span>
              )}
              {exam.grade_level?.name}
            </p>
          )}

          {/* Separator + Footer: Time + Action */}
          <div className="border-t border-border/10 pt-4 mt-auto flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-sans">
              {formatRelativeDate(exam.updated_at)}
            </span>
            {renderAction()}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar prova?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A prova &quot;{exam.title}&quot; será
              permanentemente deletada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? 'Deletando...' : 'Deletar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
