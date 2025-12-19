import React, { useState, useRef, useEffect, useContext, createContext } from 'react';

// Simple context-based dropdown menu that behaves like shadcn/ui:
// - <DropdownMenu> provides open state
// - <DropdownMenuTrigger> toggles it
// - <DropdownMenuContent> shows when open and closes on outside click

const DropdownContext = createContext(null);

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  const ctx = useContext(DropdownContext);
  const handleClick = (e) => {
    if (children && children.props && typeof children.props.onClick === 'function') {
      children.props.onClick(e);
    }
    if (ctx) {
      ctx.setOpen(!ctx.open);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className = '', children }) {
  const ctx = useContext(DropdownContext);
  const ref = useRef(null);

  const open = ctx ? ctx.open : false;
  const setOpen = ctx ? ctx.setOpen : () => { };

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={[
        'absolute left-0 mt-2 w-56 origin-top-left rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50',
        className,
      ].join(' ')}
    >
      <div className="py-1">{children}</div>
    </div>
  );
}

export function DropdownMenuItem({ className = '', onClick, children }) {
  const ctx = useContext(DropdownContext);
  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (ctx) ctx.setOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        'w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
