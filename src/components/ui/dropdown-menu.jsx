import React, { useState, useRef, useEffect } from 'react';

export function DropdownMenu({ children }) {
  return <div className="relative inline-block text-left">{children}</div>;
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, props);
  }
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className = '', children }) {
  const [open, setOpen] = useState(true);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={[
        'absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
        className,
      ].join(' ')}
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

export function DropdownMenuItem({ className = '', onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}



