import React, { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Underline, Layout, Type, Database, Info, Copy, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import AirtableFieldPicker from '../airtable/AirtableFieldPicker';

export default function FieldPropertiesPanel({
  field,
  onUpdate,
  airtableFields = []
}) {
  const [localField, setLocalField] = useState(field);
  const [copiedColor, setCopiedColor] = useState(false);
  const updateTimeoutRef = useRef(null);

  useEffect(() => {
    setLocalField(field);
  }, [field]);

  const handleLocalChange = (updates) => {
    const updatedField = { ...localField, ...updates };
    setLocalField(updatedField);

    // Debounce the update
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate(field.id, updates);
    }, 300);
  };

  const handleImmediateChange = (updates) => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    onUpdate(field.id, updates);
    setLocalField({ ...localField, ...updates });
  };

  if (!field) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Info className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
          No Field Selected
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Click on a field to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="layout" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-4 mt-4">
          <TabsTrigger value="layout" className="text-xs">
            <Layout className="h-3 w-3 mr-1" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Type className="h-3 w-3 mr-1" />
            Style
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs">
            <Database className="h-3 w-3 mr-1" />
            Data
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="layout" className="p-4 space-y-4 m-0">
            <Accordion type="single" collapsible defaultValue="position" className="w-full">
              <AccordionItem value="position" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                  Position & Size
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">X Position</Label>
                      <Input
                        type="number"
                        value={Math.round(localField?.x || 0)}
                        onChange={(e) => handleLocalChange({ x: parseFloat(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Y Position</Label>
                      <Input
                        type="number"
                        value={Math.round(localField?.y || 0)}
                        onChange={(e) => handleLocalChange({ y: parseFloat(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Width</Label>
                      <Input
                        type="number"
                        value={Math.round(localField?.width || 0)}
                        onChange={(e) => handleLocalChange({ width: parseFloat(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Height</Label>
                      <Input
                        type="number"
                        value={Math.round(localField?.height || 0)}
                        onChange={(e) => handleLocalChange({ height: parseFloat(e.target.value) })}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Page Number</Label>
                    <Input
                      type="number"
                      value={localField?.page || 1}
                      onChange={(e) => handleLocalChange({ page: parseInt(e.target.value) })}
                      min="1"
                      className="h-8"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="label" className="border rounded-lg px-3 mt-2">
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                  Field Label
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <Input
                    value={localField?.label || ''}
                    onChange={(e) => handleLocalChange({ label: e.target.value })}
                    placeholder="Field label"
                    className="h-8"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Display name for this field in the editor
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="style" className="p-4 space-y-4 m-0">
            <Accordion type="single" collapsible defaultValue="font" className="w-full">
              <AccordionItem value="font" className="border rounded-lg px-3">
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                  Font Settings
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pb-3">
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Font Family</Label>
                    <select
                      value={localField?.font || 'Arial'}
                      onChange={(e) => handleImmediateChange({ font: e.target.value })}
                      className="w-full h-8 px-3 py-1 border border-slate-300 dark:border-slate-600 rounded-md text-sm bg-white dark:bg-slate-800"
                    >
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
                        value={localField?.font_size || 12}
                        onChange={(e) => handleLocalChange({ font_size: parseFloat(e.target.value) })}
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
                          value={localField?.font_color || '#000000'}
                          onChange={(e) => handleImmediateChange({ font_color: e.target.value })}
                          className="h-8 w-10 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={localField?.font_color || '#000000'}
                          onChange={(e) => handleLocalChange({ font_color: e.target.value })}
                          placeholder="#000000"
                          className="h-8 flex-1 font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            navigator.clipboard.writeText(localField?.font_color || '#000000');
                            setCopiedColor(true);
                            setTimeout(() => setCopiedColor(false), 1500);
                          }}
                          title="Copy hex code"
                        >
                          {copiedColor ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

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
                        variant={localField?.alignment === 'left' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImmediateChange({ alignment: 'left' })}
                        className="flex-1 transition-all"
                        title="Align Left"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant={localField?.alignment === 'center' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImmediateChange({ alignment: 'center' })}
                        className="flex-1 transition-all"
                        title="Align Center"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M4 18h16" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant={localField?.alignment === 'right' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImmediateChange({ alignment: 'right' })}
                        className="flex-1 transition-all"
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
                        variant={localField?.vertical_alignment === 'top' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImmediateChange({ vertical_alignment: 'top' })}
                        className="flex-1 transition-all"
                        title="Align Top"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16M6 8h12M6 12h10" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant={localField?.vertical_alignment === 'middle' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImmediateChange({ vertical_alignment: 'middle' })}
                        className="flex-1 transition-all"
                        title="Align Middle"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 8h12M4 12h16M6 16h12" />
                        </svg>
                      </Button>
                      <Button
                        type="button"
                        variant={localField?.vertical_alignment === 'bottom' ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleImmediateChange({ vertical_alignment: 'bottom' })}
                        className="flex-1 transition-all"
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

              <AccordionItem value="formatting" className="border rounded-lg px-3 mt-2">
                <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                  Text Formatting
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={localField?.bold ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleImmediateChange({ bold: !localField?.bold })}
                      className="flex-1"
                      title="Bold"
                    >
                      <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={localField?.italic ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleImmediateChange({ italic: !localField?.italic })}
                      className="flex-1"
                      title="Italic"
                    >
                      <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={localField?.underline ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleImmediateChange({ underline: !localField?.underline })}
                      className="flex-1"
                      title="Underline"
                    >
                      <Underline className="h-4 w-4" />
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          <TabsContent value="data" className="p-4 space-y-4 m-0">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Airtable Field Mapping</Label>
              <AirtableFieldPicker
                fields={airtableFields}
                value={localField?.airtable_field}
                onChange={(value) => handleImmediateChange({ airtable_field: value })}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect this field to an Airtable column to populate data automatically
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Special Values</Label>
              <select
                value={localField?.special_value || ''}
                onChange={(e) => handleImmediateChange({ special_value: e.target.value || null })}
                className="w-full h-9 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-transparent transition-all"
              >
                <option value="">None - Use Airtable Field</option>
                <optgroup label="Date Values" className="text-slate-600 dark:text-slate-400">
                  <option value="today">Today's Date</option>
                  <option value="yesterday">Yesterday's Date</option>
                  <option value="tomorrow">Tomorrow's Date</option>
                </optgroup>
                <optgroup label="Custom Text" className="text-slate-600 dark:text-slate-400">
                  <option value="custom">Custom Text</option>
                </optgroup>
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Override Airtable data with dynamic dates or custom text
              </p>
            </div>

            {localField?.special_value === 'custom' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Custom Text</Label>
                <Input
                  value={localField?.custom_text || ''}
                  onChange={(e) => handleLocalChange({ custom_text: e.target.value })}
                  placeholder="Enter custom text"
                  className="h-8"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This text will appear in the PDF for this field
                </p>
              </div>
            )}

            {localField?.airtable_field && !localField?.special_value && (
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-teal-900 dark:text-teal-100">
                      Mapped to: {localField.airtable_field}
                    </p>
                    <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                      Data from this column will be inserted into the PDF at this field's location
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}