import React from 'react';

export function Checkbox({ checked, onCheckedChange, className = '' }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange && onCheckedChange(!checked)}
      className={[
        'h-4 w-4 rounded border border-slate-300 flex items-center justify-center text-xs',
        checked ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white',
        className,
      ].join(' ')}
    >
      {checked ? '✓' : ''}
    </button>
  );
}

export default Checkbox;



