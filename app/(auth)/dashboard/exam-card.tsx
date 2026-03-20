'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { BookOpen, Pencil, Trash2 } from 'lucide-react';
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
        return;
      }

      setShowDeleteDialog(false);
      // Refresh the page to update the exam list
      router.refresh();
    } catch (error) {
      console.error('Error deleting exam:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="relative bg-surface-container-low rounded-lg overflow-hidden hover:bg-opacity-90 transition-colors">
        {/* Left border indicator — thick, colored */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.barColor}`}
        />

        {/* Card Content */}
        <div className="p-6 pl-6">
          <div className="flex flex-col h-full gap-4">
            {/* Header: Status badge + Action buttons */}
            <div className="flex items-start justify-between gap-4">
              <Badge
                variant={statusConfig.badgeVariant}
                className="flex-shrink-0"
              >
                {statusConfig.badgeLabel}
              </Badge>
              {/* Action buttons — only if not processing */}
              {!statusConfig.actionDisabled && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => router.push(`/exams/${exam.id}/edit`)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 hover:bg-muted rounded-md"
                    title="Editar prova"
                    aria-label="Editar prova"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1.5 hover:bg-muted rounded-md"
                    title="Deletar prova"
                    aria-label="Deletar prova"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Title section — headline emphasis */}
            <div className="flex-1">
              <h3 className="font-display text-xl font-bold text-foreground line-clamp-2 leading-tight">
                {exam.title}
              </h3>
            </div>

            {/* Metadata: Subject, Grade Level */}
            <div className="text-sm text-muted-foreground font-sans space-y-1">
              {exam.subject && (
                <p className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  {exam.subject.name}
                  {exam.grade_level && <span className="text-muted-foreground">·</span>}
                  {exam.grade_level && <span>{exam.grade_level.name}</span>}
                </p>
              )}
              {!exam.subject && exam.grade_level && (
                <p className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 flex-shrink-0" />
                  {exam.grade_level.name}
                </p>
              )}
            </div>

            {/* Time indicator */}
            <p className="text-xs text-muted-foreground font-mono">
              {formatRelativeDate(exam.updated_at)}
            </p>

            {/* Action button */}
            <Link href={actionHref} className="block mt-2">
              <Button
                variant="default"
                size="sm"
                disabled={statusConfig.actionDisabled}
                className="w-full"
              >
                {statusConfig.actionLabel}
              </Button>
            </Link>
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
