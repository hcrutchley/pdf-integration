import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function QuickFieldDialog({
    isOpen,
    onClose,
    airtableFields = [],
    onFieldSelect,
    defaultStyles = {}
}) {
    const [search, setSearch] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
            setSearch('');
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const filteredFields = airtableFields.filter(field =>
        field.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelectField = (field) => {
        onFieldSelect({
            id: `field_${Date.now()}`,
            label: field.name,
            x: 100,
            y: 100,
            page: 1,
            width: defaultStyles.width || 200,
            height: defaultStyles.height || 30,
            airtable_field: field.name,
            font: defaultStyles.font || 'Arial',
            font_size: defaultStyles.font_size || 12,
            alignment: defaultStyles.alignment || 'left',
            bold: defaultStyles.bold || false,
            italic: defaultStyles.italic || false,
            underline: defaultStyles.underline || false
        });
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Dialog */}
            <div
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
                    <Search className="h-5 w-5 text-slate-400" />
                    <Input
                        ref={inputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Airtable fields..."
                        className="flex-1 border-0 bg-transparent text-lg focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Results */}
                <div className="max-h-[300px] overflow-y-auto">
                    {filteredFields.length === 0 ? (
                        <div className="p-6 text-center text-slate-500">
                            {airtableFields.length === 0
                                ? 'No Airtable fields available. Connect a table first.'
                                : 'No matching fields found.'
                            }
                        </div>
                    ) : (
                        <div className="p-2">
                            {filteredFields.map((field) => (
                                <button
                                    key={field.name}
                                    onClick={() => handleSelectField(field)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                >
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">
                                            {field.name}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {field.type}
                                        </div>
                                    </div>
                                    <Plus className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                        <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">↵</kbd>
                        <span>to add</span>
                        <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono ml-2">esc</kbd>
                        <span>to close</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
