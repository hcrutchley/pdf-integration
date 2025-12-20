import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Database, FileText, Zap, Type } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect';
import DefaultStyleSettings from './DefaultStyleSettings';

export default function SettingsView({
    template,
    connections,
    availableBases,
    availableTables,
    testRecords,
    selectedTestRecord,
    setSelectedTestRecord,
    loadingBases,
    onSave,
    onDetectFields,
    isDetecting,
    setupPollingNow,
    setSetupPollingNow
}) {
    return (
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-900 p-6 sm:p-10">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Intro / Header for the view */}
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Template Configuration</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage data variance, automation rules, and global styles.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Section 1: Data Source */}
                    <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                <Database className="h-4 w-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">Data Source</span>
                            </div>
                            <CardTitle>Airtable Connection</CardTitle>
                            <CardDescription>Connect this template to your Airtable data.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Connection</Label>
                                <SearchableSelect
                                    value={template.airtable_connection_id || ''}
                                    onChange={(value) => onSave({ airtable_connection_id: value })}
                                    options={connections.map(c => ({ value: c.id, label: c.name }))}
                                    placeholder="Select connection"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Base</Label>
                                    <SearchableSelect
                                        value={template.airtable_base_id || ''}
                                        onChange={(value) => onSave({ airtable_base_id: value, airtable_table_name: '' })}
                                        options={availableBases.map(b => ({ value: b.id, label: b.name }))}
                                        placeholder="Select base"
                                        disabled={!template.airtable_connection_id}
                                        loading={loadingBases}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Table</Label>
                                    <SearchableSelect
                                        value={template.airtable_table_name || ''}
                                        onChange={(value) => onSave({ airtable_table_name: value })}
                                        options={availableTables.map(t => ({ value: t.name, label: t.name }))}
                                        placeholder="Select table"
                                        disabled={!template.airtable_base_id}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Test Record (Preview Data)</Label>
                                <SearchableSelect
                                    value={selectedTestRecord || ''}
                                    onChange={setSelectedTestRecord}
                                    options={testRecords.map(r => ({
                                        value: r.id,
                                        label: r.fields['Application number'] || r.fields.Name || r.fields.Title || r.id.substring(0, 8)
                                    }))}
                                    placeholder="Select a record to test with..."
                                    disabled={!template.airtable_table_name}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2: Automation & PDF */}
                    <div className="space-y-8">
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                    <Zap className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Automation</span>
                                </div>
                                <CardTitle>Trigger & Output</CardTitle>
                                <CardDescription>Define when to generate PDF and where to save it.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Trigger Field</Label>
                                        <Input
                                            value={template.trigger_field || ''}
                                            onChange={(e) => onSave({ trigger_field: e.target.value })}
                                            placeholder="e.g. Status"
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Trigger Value</Label>
                                        <Input
                                            value={template.trigger_value || ''}
                                            onChange={(e) => onSave({ trigger_value: e.target.value })}
                                            placeholder="e.g. Approved"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">Output Field (Attachment)</Label>
                                    <Input
                                        value={template.output_field || ''}
                                        onChange={(e) => onSave({ output_field: e.target.value })}
                                        placeholder="e.g. Generated PDF"
                                    />
                                </div>
                                <div className="flex items-center space-x-2 pt-2">
                                    <Checkbox
                                        id="setup-polling"
                                        checked={setupPollingNow}
                                        onCheckedChange={setSetupPollingNow}
                                    />
                                    <Label htmlFor="setup-polling" className="cursor-pointer text-sm text-slate-600 dark:text-slate-300">
                                        Enable active polling for this template
                                    </Label>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                                    <FileText className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">PDF Source</span>
                                </div>
                                <CardTitle>Template File</CardTitle>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                                    {template.pdf_url ? 'PDF Uploaded' : 'No PDF'}
                                </div>
                                <Button variant="outline" size="sm" onClick={onDetectFields} disabled={isDetecting}>
                                    <Sparkles className="h-4 w-4 mr-2 text-amber-500" />
                                    {isDetecting ? 'Analysing...' : 'AI Field Detection'}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section 3: Global Styles */}
                    <div className="lg:col-span-2">
                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-500"></div>
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                                    <Type className="h-4 w-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Design System</span>
                                </div>
                                <CardTitle>Global Defaults</CardTitle>
                                <CardDescription>Set default styles for new fields.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <DefaultStyleSettings template={template} onSave={onSave} />
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
    );
}
