import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Database, Zap, Type, Sparkles, Layers, Settings } from 'lucide-react';
import PDFViewer from './PDFViewer';
import FieldPropertiesPanel from './FieldPropertiesPanel';
import QuickFieldDialog from './QuickFieldDialog';
import SearchableSelect from '../ui/SearchableSelect';
import { cn } from '@/lib/utils';
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
    // Settings props
    settingsOpen,
    connections = [],
    availableBases = [],
    availableTables = [],
    testRecords = [],
    selectedTestRecord,
    setSelectedTestRecord,
    loadingBases,
    onSettingsSave,
    onDetectFields,
    isDetecting,
    setupPollingNow,
    setSetupPollingNow,
}) {
    const navigate = useNavigate();
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [panelTab, setPanelTab] = useState('properties'); // 'properties' | 'data' | 'automation'

    // Resizable sidebar logic
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback((mouseDownEvent) => {
        mouseDownEvent.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent) => {
        if (isResizing) {
            const newWidth = document.body.clientWidth - mouseMoveEvent.clientX;
            // Min/Max constraints
            if (newWidth > 200 && newWidth < 800) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    // Auto-switch to properties when field is selected
    useEffect(() => {
        if (selectedField) {
            setPanelTab('properties');
        }
    }, [selectedField?.id]);

    // Shift+A keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e) => {
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

            {/* Drag Handle */}
            <div
                className={cn(
                    "w-1 h-full cursor-col-resize hover:bg-teal-500 active:bg-teal-600 transition-colors z-30",
                    isResizing && "bg-teal-600"
                )}
                onMouseDown={startResizing}
            />

            {/* Right Panel with Tabs */}
            <div style={{ width: sidebarWidth }} className="flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-xl z-20 flex flex-col h-full overflow-hidden">

                {/* Panel Tab Navigation */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={() => setPanelTab('properties')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2",
                            panelTab === 'properties'
                                ? "border-teal-500 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-800"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        Properties
                    </button>
                    <button
                        onClick={() => setPanelTab('data')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2",
                            panelTab === 'data'
                                ? "border-teal-500 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-800"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Database className="h-3.5 w-3.5" />
                        Data
                    </button>
                    <button
                        onClick={() => setPanelTab('automation')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2",
                            panelTab === 'automation'
                                ? "border-teal-500 text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-800"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Auto
                    </button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto">

                    {/* Properties Tab */}
                    {panelTab === 'properties' && (
                        <>
                            {selectedField ? (
                                <FieldPropertiesPanel
                                    field={selectedField}
                                    onUpdate={onUpdateField}
                                    airtableFields={airtableFields}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                                        <Type className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Select a field to edit
                                    </p>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Or press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-[10px] font-mono">⇧A</kbd> to quick add
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {/* Data Tab */}
                    {panelTab === 'data' && (
                        <div className="p-4 space-y-4">
                            <div>
                                <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Connection</Label>
                                <SearchableSelect
                                    value={template.airtable_connection_id || ''}
                                    onChange={(value) => onSettingsSave({ airtable_connection_id: value })}
                                    options={connections.map(c => ({ value: c.id, label: c.name }))}
                                    placeholder="Select connection"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Base</Label>
                                    <SearchableSelect
                                        value={template.airtable_base_id || ''}
                                        onChange={(value) => onSettingsSave({ airtable_base_id: value, airtable_table_name: '' })}
                                        options={availableBases.map(b => ({ value: b.id, label: b.name }))}
                                        placeholder="Base"
                                        disabled={!template.airtable_connection_id}
                                        loading={loadingBases}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Table</Label>
                                    <SearchableSelect
                                        value={template.airtable_table_name || ''}
                                        onChange={(value) => onSettingsSave({ airtable_table_name: value })}
                                        options={availableTables.map(t => ({ value: t.name, label: t.name }))}
                                        placeholder="Table"
                                        disabled={!template.airtable_base_id}
                                    />
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Test Record</Label>
                                <SearchableSelect
                                    value={selectedTestRecord || ''}
                                    onChange={setSelectedTestRecord}
                                    options={testRecords.map(r => ({
                                        value: r.id,
                                        label: r.fields['Application number'] || r.fields.Name || r.fields.Title || r.id.substring(0, 8)
                                    }))}
                                    placeholder="Select for preview..."
                                    disabled={!template.airtable_table_name}
                                />
                                <p className="text-xs text-slate-400 mt-1.5">Used for live preview generation</p>
                            </div>

                            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onDetectFields}
                                    disabled={isDetecting}
                                    className="w-full"
                                >
                                    <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                                    {isDetecting ? 'Detecting...' : 'AI Field Detection'}
                                </Button>
                                <p className="text-xs text-slate-400 mt-1.5 text-center">Auto-detect fillable areas in PDF</p>
                            </div>
                        </div>
                    )}

                    {/* Automation Tab */}
                    {panelTab === 'automation' && (
                        <div className="p-4 space-y-4">
                            <div>
                                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Trigger Conditions</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs text-slate-500 mb-1 block">Field Name</Label>
                                        <Input
                                            value={template.trigger_field || ''}
                                            onChange={(e) => onSettingsSave({ trigger_field: e.target.value })}
                                            placeholder="e.g. Status"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-slate-500 mb-1 block">Equals Value</Label>
                                        <Input
                                            value={template.trigger_value || ''}
                                            onChange={(e) => onSettingsSave({ trigger_value: e.target.value })}
                                            placeholder="e.g. Approved"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5">Generate PDF when this condition is met</p>
                            </div>

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Output</h3>
                                <div>
                                    <Label className="text-xs text-slate-500 mb-1 block">Attachment Field</Label>
                                    <Input
                                        value={template.output_field || ''}
                                        onChange={(e) => onSettingsSave({ output_field: e.target.value })}
                                        placeholder="e.g. Generated PDF"
                                        className="h-8 text-sm"
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5">Where to save the generated PDF</p>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="setup-polling"
                                        checked={setupPollingNow}
                                        onCheckedChange={setSetupPollingNow}
                                    />
                                    <Label htmlFor="setup-polling" className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                                        Enable active polling
                                    </Label>
                                </div>
                                <p className="text-xs text-slate-400 mt-1.5 ml-6">Check Airtable periodically for triggers</p>
                            </div>
                        </div>
                    )}
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
