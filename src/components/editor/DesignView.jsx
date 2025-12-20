import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import PDFViewer from './PDFViewer';
import FieldPropertiesPanel from './FieldPropertiesPanel';
import QuickFieldDialog from './QuickFieldDialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function DesignView({
    template,
    onUpdateField,
    onDeleteField,
    handleAddField,
    handleBulkFieldAdd,
    setSelectedField,
    selectedField,
    guides,
    setGuides,
    queryClient,
    templateId,
    airtableFields,
}) {
    const navigate = useNavigate();
    const [quickAddOpen, setQuickAddOpen] = useState(false);

    // Shift+A keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.shiftKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setQuickAddOpen(true);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleQuickFieldSelect = useCallback((newField) => {
        handleAddField(newField);
        // Select the newly added field
        setSelectedField(newField);
    }, [handleAddField, setSelectedField]);

    // Check if PDF is uploaded
    if (!template.pdf_url) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-100 dark:bg-slate-900 text-slate-500">
                <div className="text-center max-w-md p-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">PDF Missing</h3>
                    <p className="mb-6 text-slate-600 dark:text-slate-400">This template doesn't have a PDF file yet. Go to Settings or the Templates page to upload one.</p>
                    <Button onClick={() => navigate(createPageUrl('Templates'))}>
                        Go back to upload
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex w-full h-full overflow-hidden">
            {/* Main Canvas Area */}
            <div className="flex-1 h-full relative">
                <PDFViewer
                    pdfUrl={template.pdf_url}
                    fields={template.fields || []}
                    onFieldUpdate={onUpdateField}
                    onFieldDelete={onDeleteField}
                    onFieldAdd={handleAddField}
                    onBulkFieldAdd={handleBulkFieldAdd}
                    onFieldSelect={(fieldId) => {
                        const field = template.fields?.find(f => f.id === fieldId);
                        setSelectedField(field);
                    }}
                    selectedFieldId={selectedField?.id}
                    defaultFont={template.default_font}
                    defaultFontSize={template.default_font_size}
                    defaultAlignment={template.default_alignment}
                    defaultBold={template.default_bold}
                    defaultItalic={template.default_italic}
                    defaultUnderline={template.default_underline}
                    guides={guides}
                    onGuidesChange={setGuides}
                    template={template}
                    queryClient={queryClient}
                    templateId={templateId}
                    airtableFields={airtableFields}
                />

                {/* Shift+A hint */}
                <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-slate-800/80 backdrop-blur text-white text-xs rounded-full flex items-center gap-2 shadow-lg">
                    <kbd className="px-1.5 py-0.5 bg-slate-600 rounded text-[10px] font-mono">⇧A</kbd>
                    <span className="text-slate-300">Quick add field</span>
                </div>
            </div>

            {/* Right Properties Panel */}
            <div className="w-80 flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl z-20 flex flex-col h-full">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50"></div>
                    <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                        Properties
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <FieldPropertiesPanel
                        field={selectedField}
                        onUpdate={onUpdateField}
                        airtableFields={airtableFields}
                    />
                </div>
            </div>

            {/* Quick Add Field Dialog */}
            <QuickFieldDialog
                isOpen={quickAddOpen}
                onClose={() => setQuickAddOpen(false)}
                airtableFields={airtableFields}
                onFieldSelect={handleQuickFieldSelect}
                defaultStyles={{
                    font: template.default_font,
                    font_size: template.default_font_size,
                    alignment: template.default_alignment,
                    bold: template.default_bold,
                    italic: template.default_italic,
                    underline: template.default_underline
                }}
            />
        </div>
    );
}
