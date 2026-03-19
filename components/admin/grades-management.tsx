/**
 * Grades Management Client Component
 * Placeholder for CRUD operations on grade levels
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface GradeLevel {
  id: string;
  level: number;
  name: string;
  created_at: string;
}

interface GradesManagementClientProps {
  initialGrades: GradeLevel[];
}

export function GradesManagementClient(
  props: GradesManagementClientProps
) {
  return (
    <Button className="gap-2" disabled>
      <Plus className="w-4 h-4" />
      Adicionar Série
    </Button>
  );
}
