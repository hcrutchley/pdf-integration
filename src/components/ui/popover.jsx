import React, { useState, useRef, useEffect, useContext, createContext } from 'react';

// Simple context-based popover implementation that supports controlled `open`
// and `onOpenChange` props similar to shadcn/ui.

const PopoverContext = createContext(null);

export function Popover({ children, open: openProp, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setUncontrolledOpen;

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block w-full">{children}</div>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({ asChild, children, ...props }) {
  const ctx = useContext(PopoverContext);
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

export function PopoverContent({ className = '', children }) {
  const ctx = useContext(PopoverContext);
  const ref = useRef(null);

  const open = ctx ? ctx.open : false;
  const setOpen = ctx ? ctx.setOpen : () => {};

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, setOpen]);

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