import React from 'react';

export function Label({ className = '', ...props }) {
  const base = 'text-sm font-medium text-slate-700 mb-1 block';
  return <label className={[base, className].join(' ')} {...props} />;
}

export default Label;



