import React from 'react';

export function Switch({ checked, onCheckedChange, className = '' }) {
  const base =
    'relative inline-flex h-5 w-9 items-center rounded-full border border-slate-300 transition-colors cursor-pointer';
  const knob =
    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={[
        base,
        checked ? 'bg-teal-600 border-teal-600' : 'bg-slate-200 border-slate-300',
        className,
      ].join(' ')}
    >
      <span
        className={[
          knob,
          checked ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

export default Switch;



