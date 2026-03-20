/**
 * Supports Management Client Component
 * CRUD operations on supports with search, table, and delete confirmation
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

interface Support {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface SupportsManagementClientProps {
  initialSupports: Support[];
}

export function SupportsManagementClient({
  initialSupports,
}: SupportsManagementClientProps) {
  const [supports, setSupports] = useState<Support[]>(initialSupports);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Support | null>(null);

  const filteredSupports = useMemo(
    () =>
      supports.filter((support) =>
        support.name.toLowerCase().includes(search.toLowerCase())
      ),
    [supports, search]
  );

  const handleAdd = () => {
    // TODO: Implement add modal
    console.log('Add support');
  };

  const handleEdit = (support: Support) => {
    // TODO: Implement edit modal
    console.log('Edit support:', support);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      setSupports((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
      // TODO: Implement API call to delete
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-display-md font-display text-foreground">
          Suportes
        </h1>
        <Button variant="default" size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4" aria-hidden="true" />
          Adicionar Suporte
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
          aria-label="Buscar suportes"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-caption uppercase tracking-wide text-muted-foreground font-medium">
                Nome
              </th>
              <th className="px-4 py-3 text-left text-caption uppercase tracking-wide text-muted-foreground font-medium">
                Descrição
              </th>
              <th className="px-4 py-3 text-right text-caption uppercase tracking-wide text-muted-foreground font-medium w-24">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredSupports.map((support) => (
              <tr key={support.id} className="hover:bg-muted/50 h-12">
                <td className="px-4 py-2 text-body">{support.name}</td>
                <td className="px-4 py-2 text-body text-muted-foreground">
                  {support.description || '-'}
                </td>
                <td className="px-4 py-2 text-right">
                  <TooltipProvider>
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(support)}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">
                              Editar {support.name}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteTarget(support)}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">
                              Deletar {support.name}
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
        {filteredSupports.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3 text-center">
            <p className="text-body text-muted-foreground">
              Nenhum suporte encontrado.
            </p>
            <Button variant="default" size="sm" onClick={handleAdd}>
              Adicionar primeiro suporte
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
