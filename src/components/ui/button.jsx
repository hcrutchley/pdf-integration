import React from 'react';

export function Button({ className = '', variant = 'default', size = 'default', ...props }) {
  const base = [
    'inline-flex items-center justify-center rounded-md text-sm font-medium',
    'transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500',
    'disabled:opacity-50 disabled:pointer-events-none',
    'active:scale-[0.98]',
  ].join(' ');

  const variants = {
    default:
      'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-600/25 hover:shadow-lg hover:shadow-teal-600/30',
    outline:
      'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm hover:shadow',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900',
    destructive:
      'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/25 hover:shadow-lg',
  };

  const sizes = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-11 px-6',
    icon: 'h-9 w-9',
  };

  const classes = [base, variants[variant] || variants.default, sizes[size] || sizes.default, className]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
}

export default Button;




