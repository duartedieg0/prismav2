/**
 * Agents Management Client Component
 * Placeholder for CRUD operations on agents
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  model_id: string | null;
  model_name?: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentsManagementClientProps {
  initialAgents: Agent[];
}

export function AgentsManagementClient({
  initialAgents: _initialAgents,
}: AgentsManagementClientProps) {
  return (
    <Button className="gap-2" disabled>
      <Plus className="w-4 h-4" />
      Adicionar Agente
    </Button>
  );
}
