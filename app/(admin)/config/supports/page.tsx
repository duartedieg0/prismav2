/**
 * Admin Configuration - Supports Page
 * Server Component for managing educational supports/accommodations
 *
 * Route: /config/supports (admin only)
 */

import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { SupportsManagementClient } from '@/components/admin/supports-management';

interface Support {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchSupports(): Promise<Support[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const { data: supports } = await supabase
    .from('exam_supports')
    .select('id, name, description, created_at, updated_at')
    .order('name', { ascending: true });

  return (supports || []) as Support[];
}

export default async function SupportsPage() {
  const supports = await fetchSupports();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Suportes Educacionais</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os tipos de suporte/acomodação disponíveis
            </p>
          </div>
          <SupportsManagementClient initialSupports={supports} />
        </div>

        {/* Supports Table */}
        {supports.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum suporte cadastrado
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
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {supports.map((support) => (
                    <tr key={support.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 text-sm font-medium text-foreground">
                        {support.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {support.description || '—'}
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
