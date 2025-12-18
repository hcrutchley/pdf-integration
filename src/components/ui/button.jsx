import React from 'react';

export function Button({ className = '', variant = 'default', size = 'default', ...props }) {
  const base =
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500 disabled:opacity-50 disabled:pointer-events-none';

  const variants = {
    default:
      'bg-teal-600 text-white hover:bg-teal-700 shadow-sm',
    outline:
      'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100',
  };

  const sizes = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3',
    icon: 'h-9 w-9',
  };

  const classes = [base, variants[variant] || variants.default, sizes[size] || sizes.default, className]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
}

export default Button;



