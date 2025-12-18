import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Play, Pause, Clock, Keyboard, Building2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { db } from '../components/services/database';
import ThemeToggle from '../components/common/ThemeToggle';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useOrgContext } from '../components/context/OrgContext';

const DEFAULT_SHORTCUTS = {
  gridFill: 'Ctrl+F',
  merge: 'M',
  split: 'S',
  toggleGuidesVisible: '',
  toggleGuidesLock: '',
  fieldMode: '',
  guideMode: '',
  undo: 'Ctrl+Z',
  redo: 'Ctrl+Y',
  copy: 'Ctrl+C',
  paste: 'Ctrl+V',
  cut: 'Ctrl+X',
  duplicate: 'Ctrl+D',
  delete: 'Delete'
};

const SHORTCUT_DESCRIPTIONS = {
  gridFill: { label: 'Grid Fill', condition: 'When 2+ guides selected', category: 'Guides' },
  merge: { label: 'Merge Fields', condition: 'When 2+ fields selected', category: 'Fields' },
  split: { label: 'Split Field', condition: 'When 1 field selected', category: 'Fields' },
  toggleGuidesVisible: { label: 'Toggle Guides Visibility', condition: 'Anytime', category: 'Guides' },
  toggleGuidesLock: { label: 'Toggle Guides Lock', condition: 'Anytime', category: 'Guides' },
  fieldMode: { label: 'Switch to Field Mode', condition: 'Anytime', category: 'Modes' },
  guideMode: { label: 'Switch to Guide Mode', condition: 'When guides unlocked', category: 'Modes' },
  undo: { label: 'Undo', condition: 'Anytime', category: 'Edit' },
  redo: { label: 'Redo', condition: 'Anytime', category: 'Edit' },
  copy: { label: 'Copy', condition: 'When fields selected', category: 'Edit' },
  paste: { label: 'Paste', condition: 'Anytime', category: 'Edit' },
  cut: { label: 'Cut', condition: 'When fields selected', category: 'Edit' },
  duplicate: { label: 'Duplicate', condition: 'When fields selected', category: 'Edit' },
  delete: { label: 'Delete', condition: 'When fields/guides selected', category: 'Edit' }
};

export default function Settings() {
  const queryClient = useQueryClient();
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [recordingKey, setRecordingKey] = useState(false);
  const { organizations } = useOrgContext();

  const { data: pollingConfig } = useQuery({
    queryKey: ['polling-config'],
    queryFn: () => db.pollingConfig.get()
  });

  const [intervalMinutes, setIntervalMinutes] = useState(pollingConfig?.interval_minutes || 5);
  
  const [defaultContext, setDefaultContext] = useState(
    localStorage.getItem('defaultContext') || 'personal'
  );
  const [defaultOrgId, setDefaultOrgId] = useState(
    localStorage.getItem('defaultOrgId') || ''
  );

  React.useEffect(() => {
    const saved = localStorage.getItem('pdfEditorShortcuts');
    if (saved) {
      setShortcuts({ ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) });
    }
  }, []);

  const saveShortcuts = (newShortcuts) => {
    localStorage.setItem('pdfEditorShortcuts', JSON.stringify(newShortcuts));
    setShortcuts(newShortcuts);
  };

  const handleShortcutRecord = (action) => {
    setEditingShortcut(action);
    setRecordingKey(true);
  };

  const handleKeyDown = (e, action) => {
    if (!recordingKey) return;
    e.preventDefault();
    
    const key = e.key.toUpperCase();
    if (key === 'ESCAPE') {
      setRecordingKey(false);
      setEditingShortcut(null);
      return;
    }
    
    const modifiers = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('Ctrl');
    if (e.shiftKey) modifiers.push('Shift');
    if (e.altKey) modifiers.push('Alt');
    
    const shortcutKey = [...modifiers, key].join('+');
    const newShortcuts = { ...shortcuts, [action]: shortcutKey };
    saveShortcuts(newShortcuts);
    setRecordingKey(false);
    setEditingShortcut(null);
  };

  const clearShortcut = (action) => {
    const newShortcuts = { ...shortcuts, [action]: '' };
    saveShortcuts(newShortcuts);
  };

  const resetToDefaults = () => {
    saveShortcuts(DEFAULT_SHORTCUTS);
  };

  const saveDefaultContext = () => {
    localStorage.setItem('defaultContext', defaultContext);
    if (defaultContext === 'organization') {
      localStorage.setItem('defaultOrgId', defaultOrgId);
    }
    window.location.reload();
  };

  const updatePollingMutation = useMutation({
    mutationFn: (data) => db.pollingConfig.createOrUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['polling-config']);
    }
  });

  const handleTogglePolling = async (enabled) => {
    await updatePollingMutation.mutateAsync({
      enabled,
      interval_minutes: intervalMinutes,
      last_poll_time: enabled ? new Date().toISOString() : pollingConfig?.last_poll_time
    });
  };

  const handleUpdateInterval = async () => {
    if (intervalMinutes < 1) {
      alert('Interval must be at least 1 minute');
      return;
    }

    await updatePollingMutation.mutateAsync({
      enabled: pollingConfig?.enabled || false,
      interval_minutes: intervalMinutes
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure app preferences and automation
          </p>
        </div>

        {/* Appearance */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Theme</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Switch between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Default Context */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Default Context
            </CardTitle>
            <CardDescription>
              Choose what context to load when you open the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Context Type</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={defaultContext === 'personal' ? 'default' : 'outline'}
                  onClick={() => setDefaultContext('personal')}
                  className="flex-1"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Personal
                </Button>
                <Button
                  variant={defaultContext === 'organization' ? 'default' : 'outline'}
                  onClick={() => setDefaultContext('organization')}
                  className="flex-1"
                  disabled={organizations.length === 0}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Organization
                </Button>
              </div>
            </div>

            {defaultContext === 'organization' && organizations.length > 0 && (
              <div>
                <Label>Default Organization</Label>
                <SearchableSelect
                  value={defaultOrgId}
                  onChange={setDefaultOrgId}
                  options={organizations.map(org => ({ value: org.id, label: org.name }))}
                  placeholder="Select organization"
                />
              </div>
            )}

            <Button onClick={saveDefaultContext} className="w-full">
              Save Default Context
            </Button>
          </CardContent>
        </Card>

        {/* Polling Configuration */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Automatic Polling
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Automatically check Airtable for new records to process while the app is open
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Enable Polling</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Runs in the background while app is open
                </p>
              </div>
              <Switch
                checked={pollingConfig?.enabled || false}
                onCheckedChange={handleTogglePolling}
              />
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <Label>Polling Interval (minutes)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 1)}
                  className="w-32"
                />
                <Button
                  variant="outline"
                  onClick={handleUpdateInterval}
                >
                  Update
                </Button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How often to check Airtable for new records
              </p>
            </div>

            {/* Status */}
            {pollingConfig?.enabled && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Polling Active
                  </span>
                </div>
                {pollingConfig.last_poll_time && (
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    Last checked: {new Date(pollingConfig.last_poll_time).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            {!pollingConfig?.enabled && (
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-2">
                  <Pause className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Polling Inactive
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  Enable polling to automatically process records
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">How Polling Works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Polling only runs while the app is open in your browser</li>
                  <li>Checks all active templates for records matching trigger conditions</li>
                  <li>Automatically generates PDFs and uploads to Airtable</li>
                  <li>For 24/7 background processing, backend functions would be needed</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Keyboard className="h-5 w-5 text-teal-600" />
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Keyboard Shortcuts
              </CardTitle>
            </div>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Customize keyboard shortcuts for PDF editor actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(
              Object.entries(SHORTCUT_DESCRIPTIONS).reduce((acc, [key, val]) => {
                if (!acc[val.category]) acc[val.category] = [];
                acc[val.category].push([key, val]);
                return acc;
              }, {})
            ).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {items.map(([action, { label, condition }]) => (
                    <div
                      key={action}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {condition}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {editingShortcut === action && recordingKey ? (
                          <div
                            className="px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-900 dark:text-teal-100 rounded font-mono text-sm animate-pulse"
                            onKeyDown={(e) => handleKeyDown(e, action)}
                            tabIndex={0}
                            autoFocus
                          >
                            Press key...
                          </div>
                        ) : (
                          <button
                            onClick={() => handleShortcutRecord(action)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded font-mono text-sm hover:bg-slate-200 dark:hover:bg-slate-600 min-w-[80px] text-center"
                          >
                            {shortcuts[action] || 'None'}
                          </button>
                        )}
                        {shortcuts[action] && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => clearShortcut(action)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Button
                onClick={resetToDefaults}
                variant="outline"
                className="w-full"
              >
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}