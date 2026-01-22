import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Layers } from 'lucide-react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

/**
 * BatchFormatPanel - Shown when multiple fields are selected
 * Allows batch updating of font, size, alignment, and text styling
 */
export default function BatchFormatPanel({
    selectedFields = [],
    fields = [],
    onBatchUpdate
}) {
    // Get the actual field objects for the selected IDs
    const selectedFieldObjects = useMemo(() => {
        return selectedFields.map(id => fields.find(f => f.id === id)).filter(Boolean);
    }, [selectedFields, fields]);

    // Calculate mixed state for each property
    const mixedState = useMemo(() => {
        if (selectedFieldObjects.length === 0) return {};

        const first = selectedFieldObjects[0];
        return {
            font: selectedFieldObjects.every(f => f.font === first.font) ? first.font : null,
            font_size: selectedFieldObjects.every(f => f.font_size === first.font_size) ? first.font_size : null,
            font_color: selectedFieldObjects.every(f => f.font_color === first.font_color) ? first.font_color : null,
            alignment: selectedFieldObjects.every(f => f.alignment === first.alignment) ? first.alignment : null,
            vertical_alignment: selectedFieldObjects.every(f => f.vertical_alignment === first.vertical_alignment) ? first.vertical_alignment : null,
            bold: selectedFieldObjects.every(f => f.bold === first.bold) ? first.bold : null,
            italic: selectedFieldObjects.every(f => f.italic === first.italic) ? first.italic : null,
            underline: selectedFieldObjects.every(f => f.underline === first.underline) ? first.underline : null,
        };
    }, [selectedFieldObjects]);

    const handleUpdate = (updates) => {
        if (onBatchUpdate) {
            onBatchUpdate(selectedFields, updates);
        }
    };

    if (selectedFieldObjects.length < 2) {
        return null;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                        <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            Batch Format
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedFieldObjects.length} fields selected
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <Accordion type="single" collapsible defaultValue="font" className="w-full">
                    {/* Font Settings */}
                    <AccordionItem value="font" className="border rounded-lg px-3">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                            Font Settings
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pb-3">
                            <div>
                                <Label className="text-xs text-slate-600 dark:text-slate-400">Font Family</Label>
                                <select
                                    value={mixedState.font || ''}
                                    onChange={(e) => handleUpdate({ font: e.target.value })}
                                    className="w-full h-8 px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800"
                                >
                                    {mixedState.font === null && (
                                        <option value="" disabled>Mixed</option>
                                    )}
                                    <option value="Arial">Arial</option>
                                    <option value="Helvetica">Helvetica</option>
                                    <option value="Times">Times</option>
                                    <option value="Courier">Courier</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs text-slate-600 dark:text-slate-400">Font Size</Label>
                                    <Input
                                        type="number"
                                        value={mixedState.font_size ?? ''}
                                        placeholder={mixedState.font_size === null ? "Mixed" : ""}
                                        onChange={(e) => handleUpdate({ font_size: parseFloat(e.target.value) })}
                                        min="6"
                                        max="72"
                                        className="h-8"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-600 dark:text-slate-400">Font Color</Label>
                                    <div className="flex gap-1">
                                        <Input
                                            type="color"
                                            value={mixedState.font_color || '#000000'}
                                            onChange={(e) => handleUpdate({ font_color: e.target.value })}
                                            className="h-8 w-10 p-1 cursor-pointer"
                                        />
                                        <Input
                                            type="text"
                                            value={mixedState.font_color || ''}
                                            placeholder={mixedState.font_color === null ? "Mixed" : "#000000"}
                                            onChange={(e) => handleUpdate({ font_color: e.target.value })}
                                            className="h-8 flex-1 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Alignment */}
                    <AccordionItem value="alignment" className="border rounded-lg px-3 mt-2">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                            Text Alignment
                        </AccordionTrigger>
                        <AccordionContent className="pb-3 space-y-3">
                            <div>
                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2 block">Horizontal</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={mixedState.alignment === 'left' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleUpdate({ alignment: 'left' })}
                                        className={`flex-1 transition-all ${mixedState.alignment === null ? 'border-dashed' : ''}`}
                                        title="Align Left"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                                        </svg>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mixedState.alignment === 'center' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleUpdate({ alignment: 'center' })}
                                        className={`flex-1 transition-all ${mixedState.alignment === null ? 'border-dashed' : ''}`}
                                        title="Align Center"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                                        </svg>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mixedState.alignment === 'right' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleUpdate({ alignment: 'right' })}
                                        className={`flex-1 transition-all ${mixedState.alignment === null ? 'border-dashed' : ''}`}
                                        title="Align Right"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-600 dark:text-slate-400 mb-2 block">Vertical</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={mixedState.vertical_alignment === 'top' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleUpdate({ vertical_alignment: 'top' })}
                                        className={`flex-1 transition-all ${mixedState.vertical_alignment === null ? 'border-dashed' : ''}`}
                                        title="Align Top"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16M6 8h12M6 12h10" />
                                        </svg>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mixedState.vertical_alignment === 'middle' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleUpdate({ vertical_alignment: 'middle' })}
                                        className={`flex-1 transition-all ${mixedState.vertical_alignment === null ? 'border-dashed' : ''}`}
                                        title="Align Middle"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8h12M4 12h16M6 16h12" />
                                        </svg>
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={mixedState.vertical_alignment === 'bottom' ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => handleUpdate({ vertical_alignment: 'bottom' })}
                                        className={`flex-1 transition-all ${mixedState.vertical_alignment === null ? 'border-dashed' : ''}`}
                                        title="Align Bottom"
                                    >
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h10M6 16h12M4 20h16" />
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>

                    {/* Text Formatting */}
                    <AccordionItem value="formatting" className="border rounded-lg px-3 mt-2">
                        <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                            Text Formatting
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={mixedState.bold === true ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleUpdate({ bold: mixedState.bold === null ? true : !mixedState.bold })}
                                    className={`flex-1 ${mixedState.bold === null ? 'border-dashed' : ''}`}
                                    title={mixedState.bold === null ? "Bold (Mixed)" : "Bold"}
                                >
                                    <Bold className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={mixedState.italic === true ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleUpdate({ italic: mixedState.italic === null ? true : !mixedState.italic })}
                                    className={`flex-1 ${mixedState.italic === null ? 'border-dashed' : ''}`}
                                    title={mixedState.italic === null ? "Italic (Mixed)" : "Italic"}
                                >
                                    <Italic className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant={mixedState.underline === true ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleUpdate({ underline: mixedState.underline === null ? true : !mixedState.underline })}
                                    className={`flex-1 ${mixedState.underline === null ? 'border-dashed' : ''}`}
                                    title={mixedState.underline === null ? "Underline (Mixed)" : "Underline"}
                                >
                                    <Underline className="h-4 w-4" />
                                </Button>
                            </div>
                            {(mixedState.bold === null || mixedState.italic === null || mixedState.underline === null) && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                                    Dashed borders indicate mixed values. Click to apply to all.
                                </p>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}
