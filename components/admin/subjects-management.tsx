/**
 * Subjects Management Client Component
 * Placeholder for CRUD operations on subjects
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface SubjectsManagementClientProps {
  initialSubjects: Subject[];
}

export function SubjectsManagementClient(
  props: SubjectsManagementClientProps
) {
  return (
    <Button className="gap-2" disabled>
      <Plus className="w-4 h-4" />
      Adicionar Disciplina
    </Button>
  );
}
