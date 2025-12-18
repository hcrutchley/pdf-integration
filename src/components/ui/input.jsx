import React from 'react';

export const Input = React.forwardRef(function Input(
  { className = '', type = 'text', ...props },
  ref
) {
  const base =
    'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return <input ref={ref} type={type} className={[base, className].join(' ')} {...props} />;
});

export default Input;



