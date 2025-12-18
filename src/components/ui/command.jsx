import React, { useState } from 'react';

export function Command({ children, className = '' }) {
  return (
    <div
      className={[
        'rounded-md border border-slate-200 bg-white text-slate-900 shadow-sm',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function CommandInput({ value, onValueChange, placeholder }) {
  return (
    <div className="border-b border-slate-200 px-3 py-2">
      <input
        className="w-full bg-transparent text-sm outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange && onValueChange(e.target.value)}
      />
    </div>
  );
}

export function CommandEmpty({ children }) {
  return <div className="px-3 py-2 text-sm text-slate-500">{children}</div>;
}

export function CommandGroup({ children, heading }) {
  return (
    <div className="py-1">
      {heading && (
        <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

export function CommandItem({ children, onSelect }) {
  const [active, setActive] = useState(false);
  return (
    <div
      className={[
        'cursor-pointer px-3 py-1.5 text-sm',
        active ? 'bg-slate-100' : 'hover:bg-slate-100',
      ].join(' ')}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onClick={() => onSelect && onSelect()}
    >
      {children}
    </div>
  );
}



