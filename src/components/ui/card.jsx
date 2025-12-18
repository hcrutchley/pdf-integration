import React from 'react';

export function Card({ className = '', ...props }) {
  const base =
    'rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800';
  return <div className={[base, className].join(' ')} {...props} />;
}

export function CardHeader({ className = '', ...props }) {
  const base = 'flex flex-col space-y-1.5 p-5 border-b border-slate-100 dark:border-slate-800';
  return <div className={[base, className].join(' ')} {...props} />;
}

export function CardTitle({ className = '', ...props }) {
  const base = 'text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50';
  return <h3 className={[base, className].join(' ')} {...props} />;
}

export function CardDescription({ className = '', ...props }) {
  const base = 'text-sm text-slate-500 dark:text-slate-400';
  return <p className={[base, className].join(' ')} {...props} />;
}

export function CardContent({ className = '', ...props }) {
  const base = 'p-5 pt-3';
  return <div className={[base, className].join(' ')} {...props} />;
}

export function CardFooter({ className = '', ...props }) {
  const base = 'flex items-center p-5 pt-0 border-t border-slate-100 dark:border-slate-800';
  return <div className={[base, className].join(' ')} {...props} />;
}



