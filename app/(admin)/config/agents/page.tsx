/**
 * Admin Configuration - Agents Page
 * Server Component for managing AI agents in the system
 *
 * Route: /config/agents (admin only)
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
import { AgentsManagementClient } from '@/components/admin/agents-management';

interface Agent {
  id: string;
  name: string;
  model_id: string | null;
  model_name?: string | null;
  created_at: string;
  updated_at: string;
}

async function fetchAgents(): Promise<Agent[]> {
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

  const { data: agents } = await supabase
    .from('agents')
    .select(
      'id, name, model_id, created_at, updated_at, ai_models(id, name)'
    )
    .order('created_at', { ascending: false });

  if (!agents) {
    return [];
  }

  return agents.map((agent: Record<string, unknown>) => ({
    id: agent.id as string,
    name: agent.name as string,
    model_id: agent.model_id as string | null,
    model_name: (agent.ai_models as Record<string, unknown>)?.name as string | null,
    created_at: agent.created_at as string,
    updated_at: agent.updated_at as string,
  })) as Agent[];
}

export default async function AgentsPage() {
  const agents = await fetchAgents();

  return (
    <main className="min-h-screen bg-background py-8">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agentes de IA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os agentes de inteligência artificial do sistema
            </p>
          </div>
          <AgentsManagementClient initialAgents={agents} />
        </div>

        {/* Agents Table */}
        {agents.length > 0 && (
          <div className="rounded-lg overflow-hidden bg-surface-container-low border border-outline/10">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-outline/10">
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Nome
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Modelo de IA
                  </TableHead>
                  <TableHead className="px-6 py-4 text-sm font-semibold text-foreground">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow
                    key={agent.id}
                    className="border-b border-outline/10 hover:bg-surface-container-highest/50"
                  >
                    <TableCell className="px-6 py-4 text-sm font-medium text-foreground">
                      {agent.name}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {agent.model_name || '—'}
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
