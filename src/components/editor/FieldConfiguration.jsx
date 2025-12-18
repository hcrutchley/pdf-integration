import React from 'react';
import { Trash2, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import AirtableFieldPicker from '../airtable/AirtableFieldPicker';

export default function FieldConfiguration({
  fields,
  airtableFields,
  onUpdateField,
  onDeleteField,
  selectedField,
  onSelectField
}) {
  const field = selectedField ? fields.find(f => f.id === selectedField.id) : null;

  if (fields.length === 0) {
    return (
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardContent className="pt-12 pb-12 text-center">
          <Type className="h-12 w-12 mx-auto mb-4 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">
            No fields detected yet. Click "AI Detect Fields" to automatically identify fillable areas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Fields List */}
      <Card className="lg:col-span-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">
            Detected Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {fields.map((f) => (
            <button
              key={f.id}
              onClick={() => onSelectField(f)}
              className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                field?.id === f.id
                  ? 'bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
                  : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {f.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Page {f.page} • {f.type}
                </p>
                {f.airtable_field && (
                  <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                    → {f.airtable_field}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete field "${f.label}"?`)) {
                    onDeleteField(f.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Field Editor */}
      <Card className="lg:col-span-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">
            {field ? `Configure: ${field.label}` : 'Select a field'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!field ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Select a field from the list to configure it
            </div>
          ) : (
            <div className="space-y-6">
              {/* Airtable Mapping */}
              <div>
                <Label>Map to Airtable Field</Label>
                <AirtableFieldPicker
                  fields={airtableFields}
                  value={field.airtable_field}
                  onChange={(value) => onUpdateField(field.id, { airtable_field: value })}
                  placeholder="Select Airtable field..."
                />
              </div>

              {/* Position Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Page</Label>
                  <Input
                    type="number"
                    value={field.page}
                    onChange={(e) => onUpdateField(field.id, { page: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Field Type</Label>
                  <Input value={field.type} disabled />
                </div>
              </div>

              {/* Font Settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Font</Label>
                  <select
                    value={field.font || 'Arial'}
                    onChange={(e) => onUpdateField(field.id, { font: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  >
                    <option>Arial</option>
                    <option>Helvetica</option>
                    <option>Times New Roman</option>
                    <option>Courier</option>
                  </select>
                </div>
                <div>
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={field.font_size || 12}
                    onChange={(e) => onUpdateField(field.id, { font_size: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Alignment */}
              <div>
                <Label className="mb-2 block">Text Alignment</Label>
                <div className="flex gap-2">
                  {['left', 'center', 'right'].map((align) => (
                    <Button
                      key={align}
                      variant={field.alignment === align ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onUpdateField(field.id, { alignment: align })}
                      className={field.alignment === align ? 'bg-teal-600 hover:bg-teal-700' : ''}
                    >
                      {align === 'left' && <AlignLeft className="h-4 w-4" />}
                      {align === 'center' && <AlignCenter className="h-4 w-4" />}
                      {align === 'right' && <AlignRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Text Styles */}
              <div className="space-y-3">
                <Label>Text Style</Label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bold"
                      checked={field.bold || false}
                      onCheckedChange={(checked) => onUpdateField(field.id, { bold: checked })}
                    />
                    <label htmlFor="bold" className="text-sm font-bold cursor-pointer">
                      Bold
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="italic"
                      checked={field.italic || false}
                      onCheckedChange={(checked) => onUpdateField(field.id, { italic: checked })}
                    />
                    <label htmlFor="italic" className="text-sm italic cursor-pointer">
                      Italic
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="underline"
                      checked={field.underline || false}
                      onCheckedChange={(checked) => onUpdateField(field.id, { underline: checked })}
                    />
                    <label htmlFor="underline" className="text-sm underline cursor-pointer">
                      Underline
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}