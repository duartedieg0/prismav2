/**
 * AI Models Management Client Component
 * Placeholder for CRUD operations on AI models
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface AiModel {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface AiModelsManagementClientProps {
  initialModels: AiModel[];
}

export function AiModelsManagementClient(
  props: AiModelsManagementClientProps
) {
  return (
    <Button className="gap-2" disabled>
      <Plus className="w-4 h-4" />
      Adicionar Modelo
    </Button>
  );
}
