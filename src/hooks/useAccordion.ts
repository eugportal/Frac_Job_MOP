// Accordion open/close state hook with single-open default and keyboard support.

import { useState } from 'react';

export type AccordionId = 'main' | 'completion' | 'jobCost';

export function useAccordion(initial: AccordionId = 'main') {
  const [openId, setOpenId] = useState<AccordionId | null>(initial);

  const toggle = (id: AccordionId) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const open = (id: AccordionId) => setOpenId(id);
  const close = (id: AccordionId) => setOpenId((prev) => (prev === id ? null : prev));

  return { openId, toggle, open, close, setOpenId };
}
