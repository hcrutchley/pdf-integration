import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Play, Pause, Clock, Keyboard, Building2, Users, User, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { db } from '../components/services/database';
import ThemeToggle from '../components/common/ThemeToggle';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useOrgContext } from '../components/context/OrgContext';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

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
  const { user, logout, updateProfile } = useAuth();
  
  // Auth state
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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
    
    // Don't record just modifiers
    if (['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key)) return;
    
    const combo = [...modifiers, key].join('+');
    
    saveShortcuts({ ...shortcuts, [action]: combo });
    setRecordingKey(false);
    setEditingShortcut(null);
  };

  const savePollingConfig = async (enabled) => {
    await db.pollingConfig.save({
      enabled,
      interval_minutes: intervalMinutes,
      last_run: pollingConfig?.last_run
    });
    queryClient.invalidateQueries(['polling-config']);
  };

  const saveDefaultContext = () => {
    localStorage.setItem('defaultContext', defaultContext);
    if (defaultOrgId) {
      localStorage.setItem('defaultOrgId', defaultOrgId);
    }
    toast.success('Default context saved');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      const data = {};
      if (newUsername) data.newUsername = newUsername;
      if (newPassword) {
        data.newPassword = newPassword;
        data.currentPassword = currentPassword;
      }
      
      const result = await updateProfile(data);
      if (result.success) {
        toast.success('Profile updated successfully');
        setNewUsername('');
        setNewPassword('');
        setCurrentPassword('');
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Configure app preferences and account
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Account Settings */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100 flex items-center">
              <User className="h-5 w-5 mr-2" />
              Account Settings
            </CardTitle>
            <CardDescription>
              Manage your profile and credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Current Username: {user?.username}</Label>
                  <Input 
                    placeholder="New Username (optional)" 
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium mb-4">Change Password</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input 
                      type="password"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Password (Required for password change)</Label>
                    <Input 
                      type="password"
                      placeholder="Current Password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      required={!!newPassword}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={authLoading || (!newUsername && !newPassword)}>
                  {authLoading ? 'Updating...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
              <div className="space-y-0.5">
                <Label className="text-base">Enable Polling</Label>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {pollingConfig?.enabled ? 'Polling is active' : 'Polling is paused'}
                </p>
              </div>
              <Switch
                checked={pollingConfig?.enabled || false}
                onCheckedChange={(checked) => savePollingConfig(checked)}
              />
            </div>

            {/* Interval Setting */}
            <div className="space-y-2">
              <Label>Check Frequency (minutes)</Label>
              <div className="flex items-center gap-4">
                <Clock className="h-4 w-4 text-slate-500" />
                <Input
                  type="number"
                  min="1"
                  max="60"
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(parseInt(e.target.value) || 5)}
                  className="w-24"
                />
                <Button 
                  variant="outline"
                  onClick={() => savePollingConfig(pollingConfig?.enabled)}
                  disabled={intervalMinutes === pollingConfig?.interval_minutes}
                >
                  Update Interval
                </Button>
              </div>
            </div>

            {/* Status */}
            {pollingConfig?.last_run && (
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg text-sm">
                <p className="text-slate-600 dark:text-slate-400">
                  Last check: {new Date(pollingConfig.last_run).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Keyboard Shortcuts
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click on a shortcut to record a new key combination
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {Object.entries(
                Object.entries(SHORTCUT_DESCRIPTIONS).reduce((acc, [key, desc]) => {
                  if (!acc[desc.category]) acc[desc.category] = [];
                  acc[desc.category].push(key);
                  return acc;
                }, {})
              ).map(([category, keys]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {keys.map(key => (
                      <div key={key} className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {SHORTCUT_DESCRIPTIONS[key].label}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {SHORTCUT_DESCRIPTIONS[key].condition}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`w-32 font-mono text-xs ${
                            editingShortcut === key ? 'border-primary text-primary ring-2 ring-primary/20' : ''
                          }`}
                          onClick={() => handleShortcutRecord(key)}
                          onKeyDown={(e) => handleKeyDown(e, key)}
                        >
                          {editingShortcut === key ? (
                            recordingKey ? 'Press keys...' : 'Click to record'
                          ) : (
                            shortcuts[key] || 'None'
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShortcuts(DEFAULT_SHORTCUTS);
                  localStorage.removeItem('pdfEditorShortcuts');
                }}
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
