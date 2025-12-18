import React from 'react';

export function Badge({ className = '', ...props }) {
  const base =
    'inline-flex items-center rounded-full border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 bg-slate-50';
  return <span className={[base, className].join(' ')} {...props} />;
}

export default Badge;



