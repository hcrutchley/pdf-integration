import React, { useState, useRef, useEffect } from 'react';

export function Popover({ children }) {
  return <div className="relative inline-block w-full">{children}</div>;
}

export function PopoverTrigger({ asChild, children, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}

export function PopoverContent({ className = '', children }) {
  const [open, setOpen] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={[
        'absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}