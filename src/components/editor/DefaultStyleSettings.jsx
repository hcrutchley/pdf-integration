import React, { useState } from 'react';
import { Save, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function DefaultStyleSettings({ template, onSave }) {
  const [settings, setSettings] = useState({
    default_font: template.default_font || 'Arial',
    default_font_size: template.default_font_size || 12,
    default_alignment: template.default_alignment || 'left',
    default_bold: template.default_bold || false,
    default_italic: template.default_italic || false,
    default_underline: template.default_underline || false
  });

  const handleSave = () => {
    onSave(settings);
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
      <CardHeader>
        <CardTitle className="text-slate-900 dark:text-slate-100">
          Default Style Settings
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          These settings will be applied to all newly detected fields
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>Default Font</Label>
            <select
              value={settings.default_font}
              onChange={(e) => setSettings({ ...settings, default_font: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            >
              <option>Arial</option>
              <option>Helvetica</option>
              <option>Times New Roman</option>
              <option>Courier</option>
              <option>Verdana</option>
            </select>
          </div>

          <div>
            <Label>Default Font Size</Label>
            <Input
              type="number"
              value={settings.default_font_size}
              onChange={(e) => setSettings({ ...settings, default_font_size: parseInt(e.target.value) })}
              min="8"
              max="72"
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Default Text Alignment</Label>
          <div className="flex gap-2">
            {['left', 'center', 'right'].map((align) => (
              <Button
                key={align}
                variant={settings.default_alignment === align ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSettings({ ...settings, default_alignment: align })}
                className={settings.default_alignment === align ? 'bg-teal-600 hover:bg-teal-700' : ''}
              >
                {align === 'left' && <AlignLeft className="h-4 w-4" />}
                {align === 'center' && <AlignCenter className="h-4 w-4" />}
                {align === 'right' && <AlignRight className="h-4 w-4" />}
                <span className="ml-2 capitalize">{align}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label>Default Text Style</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="default_bold"
                checked={settings.default_bold}
                onCheckedChange={(checked) => setSettings({ ...settings, default_bold: checked })}
              />
              <label htmlFor="default_bold" className="text-sm font-bold cursor-pointer">
                Bold
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="default_italic"
                checked={settings.default_italic}
                onCheckedChange={(checked) => setSettings({ ...settings, default_italic: checked })}
              />
              <label htmlFor="default_italic" className="text-sm italic cursor-pointer">
                Italic
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="default_underline"
                checked={settings.default_underline}
                onCheckedChange={(checked) => setSettings({ ...settings, default_underline: checked })}
              />
              <label htmlFor="default_underline" className="text-sm underline cursor-pointer">
                Underline
              </label>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">
          <Save className="h-4 w-4 mr-2" />
          Save Default Settings
        </Button>
      </CardContent>
    </Card>
  );
}