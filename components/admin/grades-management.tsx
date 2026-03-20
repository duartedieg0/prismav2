/**
 * Grades Management Client Component
 * CRUD operations on grade levels with search, table, and delete confirmation
 */

'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';

interface GradeLevel {
  id: string;
  level: number;
  name: string;
  created_at: string;
}

interface GradesManagementClientProps {
  initialGrades: GradeLevel[];
}

export function GradesManagementClient({
  initialGrades,
}: GradesManagementClientProps) {
  const [grades, setGrades] = useState<GradeLevel[]>(initialGrades);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<GradeLevel | null>(null);

  const filteredGrades = useMemo(
    () =>
      grades.filter((grade) =>
        grade.name.toLowerCase().includes(search.toLowerCase())
      ),
    [grades, search]
  );

  const handleAdd = () => {
    // TODO: Implement add modal
    console.log('Add grade');
  };

  const handleEdit = (grade: GradeLevel) => {
    // TODO: Implement edit modal
    console.log('Edit grade:', grade);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setGrades((prev) => prev.filter((g) => g.id !== deleteTarget.id));
      setDeleteTarget(null);
      // TODO: Implement API call to delete
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-display-md font-display text-foreground">
          Séries
        </h1>
        <Button variant="default" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Adicionar Série
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Buscar séries"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-caption uppercase tracking-wide text-muted-foreground font-medium">
                Série
              </th>
              <th className="px-4 py-3 text-left text-caption uppercase tracking-wide text-muted-foreground font-medium">
                Nível
              </th>
              <th className="px-4 py-3 text-right text-caption uppercase tracking-wide text-muted-foreground font-medium w-24">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredGrades.map((grade) => (
              <tr key={grade.id} className="hover:bg-muted/50 h-12">
                <td className="px-4 py-2 text-body">{grade.name}</td>
                <td className="px-4 py-2 text-body text-muted-foreground">
                  {grade.level}
                </td>
                <td className="px-4 py-2 text-right">
                  <TooltipProvider>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(grade)}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">Editar {grade.name}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(grade)}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">
                              Deletar {grade.name}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Deletar</TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredGrades.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <p className="text-body text-muted-foreground">
              Nenhuma série encontrada.
            </p>
            <Button variant="default" size="sm" onClick={handleAdd}>
              Adicionar primeira série
            </Button>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tem certeza?</DialogTitle>
            <DialogDescription>
              Esta ação irá deletar permanentemente &quot;{deleteTarget?.name}&quot;. Não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
