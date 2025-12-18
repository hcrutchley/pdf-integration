import React from 'react';

export function Tabs({ value, onValueChange, children, className = '' }) {
  return (
    <div className={className}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { value, onValueChange })
          : child
      )}
    </div>
  );
}

export function TabsList({ children, className = '' }) {
  return <div className={['inline-flex rounded-md bg-slate-100 p-1', className].join(' ')}>{children}</div>;
}

export function TabsTrigger({ value, onValueChange, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={() => onValueChange && onValueChange(value)}
      className={[
        'px-3 py-1 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow',
        className,
      ].join(' ')}
      data-state="inactive"
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}