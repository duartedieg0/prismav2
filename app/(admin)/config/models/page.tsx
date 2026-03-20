/**
 * Admin Configuration - AI Models Page
 * Server Component for managing AI models in the system
 *
 * Route: /config/models (admin only)
 * Features:
 * - CRUD operations for AI models (Create, Read, Update, Delete)
 * - Table display with all models using shadcn Table
 * - Add model button opens dialog with form
 * - Edit model inline or via modal
 * - Delete with confirmation
 * - Set default model checkbox
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AIModelsManagementClient } from '@/components/admin/ai-models-management';

interface AiModel {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all AI models from database
 */
async function fetchAiModels(): Promise<AiModel[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: models, error } = await supabase
    .from('ai_models')
    .select('id, name, description, is_default, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error || !models) {
    return [];
  }

  return models as AiModel[];
}

export default async function AiModelsPage() {
  const models = await fetchAiModels();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        <AIModelsManagementClient initialModels={models} />

        {/* Models Table */}
        {models.length > 0 && (
          <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-outline/10">
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Descrição
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Padrão
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => (
                  <TableRow
                    key={model.id}
                    className="border-b border-outline/10 hover:bg-surface-container-highest/50"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                      {model.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {model.description || '—'}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      {model.is_default ? (
                        <span className="inline-flex items-center rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          Padrão
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm" />
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </main>
  );
}
