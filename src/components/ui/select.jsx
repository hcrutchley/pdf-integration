import React from 'react';

export function Select({ value, onValueChange, children }) {
  return (
    <select
      className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm"
      value={value}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
    >
      {children}
    </select>
  );
}

export function SelectTrigger({ children, ...props }) {
  return (
    <button
      type="button"
      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-left flex items-center justify-between"
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ children }) {
  return <span>{children}</span>;
}

export function SelectContent({ children }) {
  return <div className="mt-1 rounded-md border border-slate-200 bg-white shadow">{children}</div>;
}

export function SelectItem({ children, onSelect }) {
  return (
    <div
      className="px-3 py-1.5 text-sm hover:bg-slate-100 cursor-pointer"
      onClick={onSelect}
    >
      {children}
    </div>
  );
}



