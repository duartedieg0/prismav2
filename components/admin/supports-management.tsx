/**
 * Supports Management Client Component
 * Placeholder for CRUD operations on supports
 */

'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

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
  initialSupports: _initialSupports,
}: SupportsManagementClientProps) {
  return (
    <Button className="gap-2" disabled>
      <Plus className="w-4 h-4" />
      Adicionar Suporte
    </Button>
  );
}
