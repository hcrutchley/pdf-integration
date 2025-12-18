import React, { useState } from 'react';

export function Accordion({ children, type = 'single', collapsible = true }) {
  // Simple uncontrolled accordion; ignores type/collapsible for now
  return <div className="space-y-2">{children}</div>;
}

export function AccordionItem({ value, children, className = '' }) {
  return (
    <div className={['border border-slate-200 rounded-md', className].join(' ')}>
      {children}
    </div>
  );
}

export function AccordionTrigger({ children, className = '' }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className={[
        'w-full flex items-center justify-between px-3 py-2 text-sm font-medium',
        className,
      ].join(' ')}
    >
      <span>{children}</span>
      <span>{open ? '−' : '+'}</span>
    </button>
  );
}

export function AccordionContent({ children, className = '' }) {
  return <div className={['px-3 pb-3 text-sm text-slate-700', className].join(' ')}>{children}</div>;
}



