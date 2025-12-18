import React from 'react';

export function Dialog({ open, onOpenChange, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-lg w-full mx-4">
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child, { onOpenChange })
            : child
        )}
      </div>
    </div>
  );
}

export function DialogTrigger({ asChild, children }) {
  if (asChild) return children;
  return children;
}

export function DialogContent({ children }) {
  return <div className="p-6 space-y-4">{children}</div>;
}

export function DialogHeader({ children }) {
  return <div className="space-y-1 border-b border-slate-200 pb-3">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function DialogFooter({ children }) {
  return <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-4">{children}</div>;
}



