import React, { createContext, useContext, useState } from 'react';

// Context to share dialog state between Dialog and DialogTrigger
const DialogContext = createContext(null);

export function Dialog({ open, onOpenChange, children }) {
  // Separate trigger from content
  const triggerChild = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === DialogTrigger
  );
  const contentChildren = React.Children.toArray(children).filter(
    child => React.isValidElement(child) && child.type !== DialogTrigger
  );

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {/* Always render the trigger */}
      {triggerChild}

      {/* Only render the dialog content when open */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-lg max-w-lg w-full mx-4">
            {contentChildren.map((child, index) =>
              React.isValidElement(child)
                ? React.cloneElement(child, { key: index, onOpenChange })
                : child
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({ asChild, children }) {
  const ctx = useContext(DialogContext);

  const handleClick = (e) => {
    // Call original onClick if exists
    if (children?.props?.onClick) {
      children.props.onClick(e);
    }
    // Open the dialog
    if (ctx?.onOpenChange) {
      ctx.onOpenChange(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
}

export function DialogContent({ children, onOpenChange }) {
  return (
    <div className="p-6 space-y-4">
      {/* Close button */}
      <button
        type="button"
        onClick={() => onOpenChange?.(false)}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {children}
    </div>
  );
}

export function DialogHeader({ children }) {
  return <div className="space-y-1 border-b border-slate-200 dark:border-slate-700 pb-3">{children}</div>;
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{children}</h2>;
}

export function DialogFooter({ children }) {
  return <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">{children}</div>;
}
