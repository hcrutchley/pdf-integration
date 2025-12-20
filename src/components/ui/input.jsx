import React from 'react';

export const Input = React.forwardRef(function Input(
  { className = '', type = 'text', ...props },
  ref
) {
  const base = [
    'flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm',
    'transition-all duration-200',
    'placeholder:text-slate-400',
    'hover:border-slate-300',
    'focus:outline-none focus:border-teal-500 focus:shadow-sm',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
  ].join(' ');

  return <input ref={ref} type={type} className={[base, className].join(' ')} {...props} />;
});

export default Input;




