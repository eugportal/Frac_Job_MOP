// Save status indicator showing last-saved timestamp and dirty state.

import { Check, Loader2, CloudOff } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';

interface SaveStatusProps {
  isDirty: boolean;
  lastSaved: Date | null;
}

export function SaveStatus({ isDirty, lastSaved }: SaveStatusProps) {
  if (isDirty) {
    return (
      <span className="badge bg-amber-100 text-amber-700">
        <Loader2 size={12} className="animate-spin" />
        Unsaved changes
      </span>
    );
  }

  if (!lastSaved) {
    return (
      <span className="badge bg-ink-100 text-ink-500">
        <CloudOff size={12} />
        Not saved
      </span>
    );
  }

  return (
    <span className="badge bg-accent-100 text-accent-700">
      <Check size={12} />
      Saved · {formatDateTime(lastSaved.toISOString())}
    </span>
  );
}
