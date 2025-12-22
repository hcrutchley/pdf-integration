import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileUp, Database, ArrowRight, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { parseImportFile, parseBatchImport, importTemplateFull, importTemplateFieldsOnly } from '../services/exportService';
import { toast } from 'sonner';

export default function ImportTemplateDialog({
    isOpen,
    onClose,
    connections = [],
    onImportComplete
}) {
    const fileInputRef = useRef(null);
    const [step, setStep] = useState('upload'); // 'upload', 'configure', 'importing'
    const [importData, setImportData] = useState(null);
    const [selectedConnection, setSelectedConnection] = useState('');
    const [importMode, setImportMode] = useState('full'); // 'full', 'fields_only', or 'batch'
    const [error, setError] = useState(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileSelect = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setError(null);

            if (file.name.endsWith('.airpdf')) {
                const data = await parseImportFile(file);
                data.type = 'single';
                setImportData(data);
                setImportMode('full');
                setStep('configure');
            } else if (file.name.endsWith('.zip')) {
                const items = await parseBatchImport(file);
                if (items.length === 0) throw new Error('No importable files found in ZIP');

                setImportData({ type: 'batch', items });
                setImportMode('batch');
                setStep('configure');
            } else {
                setError('Please select a valid .airpdf or .zip file');
            }
        } catch (err) {
            setError(err.message);
        }
    }, []);

    const handleImport = useCallback(async () => {
        if (!importData || !selectedConnection) {
            setError('Please select a connection');
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            await onImportComplete({
                data: importData,
                connectionId: selectedConnection,
                mode: importMode
            });

            handleClose();
            toast.success('Import completed successfully');
        } catch (err) {
            setError(err.message || 'Import failed');
        } finally {
            setIsImporting(false);
        }
    }, [importData, selectedConnection, importMode, onImportComplete]);

    const handleClose = useCallback(() => {
        setStep('upload');
        setImportData(null);
        setSelectedConnection('');
        setImportMode('full');
        setError(null);
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                            <Upload className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                Import Template
                            </h2>
                            <p className="text-sm text-slate-500">
                                {step === 'upload' ? 'Upload .airpdf or .zip' : 'Configure import settings'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {step === 'upload' && (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 transition-colors"
                        >
                            <FileUp className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                            <p className="text-slate-600 dark:text-slate-300 font-medium">
                                Click to upload .airpdf or .zip
                            </p>
                            <p className="text-sm text-slate-400 mt-2">
                                Support for single templates or batch export archives
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".airpdf,.zip"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}

                    {step === 'configure' && importData && (
                        <div className="space-y-5">
                            {/* Import Preview */}
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {importData.type === 'batch' ? 'Batch Archive Detected' : 'File parsed successfully'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {importData.type === 'batch' ? (
                                        <>
                                            <div>
                                                <span className="text-slate-500">Total Items:</span>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {importData.items.length} files
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Types:</span>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {importData.items.filter(i => i.type === 'airpdf').length} .airpdf, {importData.items.filter(i => i.type === 'pdf').length} .pdf
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="text-slate-500">Template:</span>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {importData.template.name}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Fields:</span>
                                                <p className="font-medium text-slate-900 dark:text-slate-100">
                                                    {importData.template.fields?.length || 0} fields
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Connection Mapping */}
                            <div>
                                <Label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                    Map to Connection
                                </Label>
                                <SearchableSelect
                                    value={selectedConnection}
                                    onChange={setSelectedConnection}
                                    options={connections.map(c => ({ value: c.id, label: c.name }))}
                                    placeholder="Select Airtable connection..."
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    All templates will be mapped to this connection
                                </p>
                            </div>

                            {/* Import Mode selection only for single files */}
                            {importData.type !== 'batch' && (
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-2 block">
                                        Import Mode
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setImportMode('full')}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${importMode === 'full'
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                                Full Import
                                            </p>
                                        </button>
                                        <button
                                            onClick={() => setImportMode('fields_only')}
                                            className={`p-3 rounded-lg border-2 text-left transition-all ${importMode === 'fields_only'
                                                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                                                : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                                                Fields Only
                                            </p>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                    <Button variant="ghost" onClick={handleClose}>
                        Cancel
                    </Button>
                    {step === 'configure' && (
                        <Button
                            onClick={handleImport}
                            disabled={!selectedConnection || isImporting}
                        >
                            {isImporting ? 'Importing...' : (
                                <>
                                    {importData.type === 'batch' ? 'Start Batch Import' : 'Import Template'}
                                    <ArrowRight className="h-4 w-4 ml-2" />
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

