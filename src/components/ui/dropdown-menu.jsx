import React, { useState, useRef, useEffect, useContext, createContext } from 'react';
import ReactDOM from 'react-dom';
import { ChevronRight } from 'lucide-react';

// Simple context-based dropdown menu that behaves like shadcn/ui:
// - <DropdownMenu> provides open state
// - <DropdownMenuTrigger> toggles it
// - <DropdownMenuContent> shows when open and closes on outside click

const DropdownContext = createContext(null);
const SubMenuContext = createContext(null);

export function DropdownMenu({ children }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRef }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild, children, ...props }) {
  const ctx = useContext(DropdownContext);
  const ref = useRef(null);

  const handleClick = (e) => {
    if (children && children.props && typeof children.props.onClick === 'function') {
      children.props.onClick(e);
    }
    if (ctx) {
      ctx.triggerRef.current = ref.current;
      ctx.setOpen(!ctx.open);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" ref={ref} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className = '', children, align = 'start' }) {
  const ctx = useContext(DropdownContext);
  const ref = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const open = ctx ? ctx.open : false;
  const setOpen = ctx ? ctx.setOpen : () => { };
  const triggerRef = ctx?.triggerRef;

  useEffect(() => {
    if (!open || !triggerRef?.current) return;

    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();

    // Position below the trigger
    let left = align === 'end' ? rect.right - 224 : rect.left; // 224 = w-56 (14rem)
    const top = rect.bottom + 8;

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + 224 > window.innerWidth - 8) left = window.innerWidth - 232;

    setPosition({ top, left });
  }, [open, align, triggerRef]);

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

  // Use portal to render at document body level, escaping parent overflow constraints
  return ReactDOM.createPortal(
    <div
      ref={ref}
      style={{ position: 'fixed', top: position.top, left: position.left }}
      className={[
        'w-56 origin-top-left rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]',
        className,
      ].join(' ')}
    >
      <div className="py-1">{children}</div>
    </div>,
    document.body
  );
}

export function DropdownMenuItem({ className = '', onClick, children, disabled = false }) {
  const ctx = useContext(DropdownContext);
  const handleClick = (e) => {
    if (disabled) return;
    if (onClick) onClick(e);
    if (ctx) ctx.setOpen(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={[
        'w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center',
        disabled ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' : 'text-slate-700 dark:text-slate-200',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className = '' }) {
  return (
    <div className={`my-1 h-px bg-slate-200 dark:bg-slate-700 ${className}`} />
  );
}

// Submenu components
export function DropdownMenuSub({ children }) {
  const [subOpen, setSubOpen] = useState(false);
  const triggerRef = useRef(null);
  return (
    <SubMenuContext.Provider value={{ subOpen, setSubOpen, triggerRef }}>
      <div
        className="relative"
        onMouseEnter={() => setSubOpen(true)}
        onMouseLeave={() => setSubOpen(false)}
      >
        {children}
      </div>
    </SubMenuContext.Provider>
  );
}

export function DropdownMenuSubTrigger({ children, onClick }) {
  const ctx = useContext(SubMenuContext);
  const ref = useRef(null);

  useEffect(() => {
    if (ctx) {
      ctx.triggerRef.current = ref.current;
    }
  });

  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
    >
      <span className="flex items-center">{children}</span>
      <ChevronRight className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function DropdownMenuSubContent({ children }) {
  const ctx = useContext(SubMenuContext);
  const subOpen = ctx ? ctx.subOpen : false;
  const triggerRef = ctx?.triggerRef;
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!subOpen || !triggerRef?.current) return;

    const trigger = triggerRef.current;
    const rect = trigger.getBoundingClientRect();

    // Position to the right of the trigger
    let left = rect.right + 4;
    let top = rect.top;

    // If too close to right edge, position to the left
    if (left + 192 > window.innerWidth - 8) {
      left = rect.left - 196;
    }

    // Keep within viewport vertically
    if (top < 8) top = 8;

    setPosition({ top, left });
  }, [subOpen, triggerRef]);

  if (!subOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', top: position.top, left: position.left }}
      className="w-48 origin-top-left rounded-md bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]"
      onMouseEnter={() => ctx?.setSubOpen(true)}
      onMouseLeave={() => ctx?.setSubOpen(false)}
    >
      <div className="py-1">{children}</div>
    </div>,
    document.body
  );
}

