import React, { useEffect, useRef } from 'react';
import { Trash2, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter } from 'lucide-react';

export default function ContextMenu({ x, y, onClose, items }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
      style={{ left: x, top: y }}
    >
      {items.map((item, idx) => (
        item.divider ? (
          <div key={idx} className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
        ) : (
          <button
            key={idx}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-300"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        )
      ))}
    </div>
  );
}