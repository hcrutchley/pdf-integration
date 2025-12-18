import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Database, Trash2, Check, X, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { db } from '../components/services/database';
import { airtableService } from '../components/services/airtableService';
import SearchableSelect from '../components/ui/SearchableSelect';
import { useOrgContext } from '../components/context/OrgContext';

export default function Connections() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', api_key: '', is_default: false });
  const [testStatus, setTestStatus] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [availableBases, setAvailableBases] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [loadingBases, setLoadingBases] = useState(false);
  
  const queryClient = useQueryClient();
  const { getContextFilter } = useOrgContext();

  const { data: allConnections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll()
  });

  const contextFilter = getContextFilter();
  const connections = allConnections.filter(c => 
    (contextFilter.organization_id === null && !c.organization_id) ||
    (c.organization_id === contextFilter.organization_id)
  );

  const createMutation = useMutation({
    mutationFn: (data) => db.connections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
      setIsCreateOpen(false);
      setFormData({ name: '', api_key: '' });
      setTestStatus(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.connections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.connections.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['connections']);
    }
  });

  const handleTestConnection = async () => {
    if (!formData.api_key) return;

    setIsTesting(true);
    try {
      const result = await airtableService.testConnection(formData.api_key);
      setTestStatus(result);
      
      if (result.valid) {
        loadBases(formData.api_key);
      }
    } catch (error) {
      setTestStatus({ valid: false, error: error.message });
    } finally {
      setIsTesting(false);
    }
  };

  const loadBases = async (apiKey) => {
    try {
      setLoadingBases(true);
      const bases = await airtableService.getBases(apiKey);
      setAvailableBases(bases);
    } catch (error) {
      console.error('Failed to load bases:', error);
    } finally {
      setLoadingBases(false);
    }
  };

  const loadTables = async (apiKey, baseId) => {
    try {
      const tables = await airtableService.getBaseSchema(apiKey, baseId);
      setAvailableTables(tables);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.api_key) {
      alert('Please fill in all fields');
      return;
    }

    if (formData.is_default) {
      const defaultConnections = connections.filter(c => c.is_default);
      for (const conn of defaultConnections) {
        await updateMutation.mutateAsync({
          id: conn.id,
          data: { is_default: false }
        });
      }
    }

    await createMutation.mutateAsync({
      ...formData,
      organization_id: contextFilter.organization_id
    });
  };

  const handleSetDefault = async (connection) => {
    const defaultConnections = connections.filter(c => c.is_default && c.id !== connection.id);
    for (const conn of defaultConnections) {
      await updateMutation.mutateAsync({
        id: conn.id,
        data: { is_default: false }
      });
    }
    
    updateMutation.mutate({
      id: connection.id,
      data: { is_default: !connection.is_default }
    });
  };

  const handleDelete = (connection) => {
    if (confirm(`Delete connection "${connection.name}"?`)) {
      deleteMutation.mutate(connection.id);
    }
  };

  useEffect(() => {
    if (formData.default_base_id) {
      loadTables(formData.api_key, formData.default_base_id);
    }
  }, [formData.default_base_id]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Airtable Connections
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage your Airtable API connections
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Connection
          </Button>
        </div>

        {/* Connections Grid */}
        {connections.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-12 pb-12 text-center">
              <Database className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                No connections yet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Add your first Airtable connection to get started
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Connection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connections.map((connection) => (
              <Card
                key={connection.id}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                        <Database className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {connection.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {connection.status === 'active' ? 'Active' : 'Inactive'}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
                          {connection.api_key.substring(0, 20)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant={connection.is_default ? "default" : "ghost"}
                        size="icon"
                        onClick={() => handleSetDefault(connection)}
                        className={connection.is_default ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                      >
                        <Star className={`h-4 w-4 ${connection.is_default ? 'fill-white' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(connection)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Airtable Connection</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Connection Name</Label>
                <Input
                  placeholder="My Airtable"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Personal Access Token</Label>
                <Input
                  type="password"
                  placeholder="patXXXXXXXXXXXXXXXX"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create a token at airtable.com/create/tokens
                </p>
              </div>

              {/* Test Connection */}
              <div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={!formData.api_key || isTesting}
                    size="sm"
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                  {testStatus && (
                    <div className="flex items-center gap-1">
                      {testStatus.valid ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-600">Valid</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <span className="text-sm text-red-600">Invalid</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {testStatus && !testStatus.valid && testStatus.error && (
                  <p className="text-xs text-red-600 mt-2">
                    {testStatus.error}
                  </p>
                )}
              </div>

              {testStatus?.valid && (
                <>
                  <div>
                    <Label>Default Base (Optional)</Label>
                    <SearchableSelect
                      value={formData.default_base_id || ''}
                      onChange={(value) => setFormData({ ...formData, default_base_id: value })}
                      options={availableBases.map(b => ({ value: b.id, label: b.name }))}
                      placeholder="Select default base"
                      loading={loadingBases}
                    />
                  </div>

                  {formData.default_base_id && (
                    <div>
                      <Label>Default Table (Optional)</Label>
                      <SearchableSelect
                        value={formData.default_table_name || ''}
                        onChange={(value) => setFormData({ ...formData, default_table_name: value })}
                        options={availableTables.map(t => ({ value: t.name, label: t.name }))}
                        placeholder="Select default table"
                      />
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is-default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                    <Label htmlFor="is-default" className="cursor-pointer">
                      Use as default for new templates
                    </Label>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!testStatus?.valid}
                className="bg-teal-600 hover:bg-teal-700"
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}