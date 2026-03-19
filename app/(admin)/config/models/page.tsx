/**
 * Admin Configuration - AI Models Page
 * Server Component for managing AI models in the system
 *
 * Route: /config/models (admin only)
 * Features:
 * - CRUD operations for AI models (Create, Read, Update, Delete)
 * - Table display with all models
 * - Add model button opens dialog with form
 * - Edit model inline or via modal
 * - Delete with confirmation
 * - Set default model checkbox
 */

import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { AiModelsManagementClient } from '@/components/admin/ai-models-management';

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Modelos de IA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os modelos de inteligência artificial disponíveis no sistema
            </p>
          </div>
          <AiModelsManagementClient initialModels={models} />
        </div>

        {/* Models Table */}
        {models.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum modelo de IA cadastrado
              </p>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Padrão
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {models.map((model) => (
                    <tr key={model.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {model.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {model.description || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {model.is_default ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                            Padrão
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}
