// Accessible accordion section with keyboard support (Enter/Space to toggle, aria-expanded).

import { useRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionProps {
  id: string;
  index: number;
  title: string;
  badge?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function Accordion({ id, index, title, badge, isOpen, onToggle, children }: AccordionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const headerId = `accordion-header-${id}`;
  const panelId = `accordion-panel-${id}`;

  return (
    <div className="card overflow-hidden">
      <h2>
        <button
          id={headerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle();
            }
          }}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-ink-50"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
              {index}
            </span>
            <span className="text-base font-semibold text-ink-800">{title}</span>
            {badge}
          </span>
          <ChevronDown
            size={20}
            className={`flex-shrink-0 text-ink-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </h2>
      <div
        ref={contentRef}
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-ink-200 px-5 py-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
