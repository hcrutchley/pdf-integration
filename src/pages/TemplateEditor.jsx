import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Play, Settings, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '../components/services/database';
import { aiService } from '../components/services/aiService';
import { airtableService } from '../components/services/airtableService';
import { fileStorage } from '../components/services/fileStorage';
import { pdfService } from '../components/services/pdfService';
import SearchableSelect from '../components/ui/SearchableSelect';
import PDFViewer from '../components/editor/PDFViewer';
import FieldPropertiesPanel from '../components/editor/FieldPropertiesPanel';
import FieldConfiguration from '../components/editor/FieldConfiguration';
import DefaultStyleSettings from '../components/editor/DefaultStyleSettings';
import { createPageUrl } from '@/utils';

export default function TemplateEditor() {
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDetecting, setIsDetecting] = useState(false);
  const [airtableFields, setAirtableFields] = useState([]);
  const [selectedField, setSelectedField] = useState(null);
  const [availableBases, setAvailableBases] = useState([]);
  const [loadingBases, setLoadingBases] = useState(false);
  const [availableTables, setAvailableTables] = useState([]);
  const [setupPollingNow, setSetupPollingNow] = useState(false);
  const modeParam = searchParams.get('mode');
  const [mode, setMode] = useState(modeParam === 'editor' ? 'editor' : 'config');
  const [testRecords, setTestRecords] = useState([]);
  const [selectedTestRecord, setSelectedTestRecord] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [guides, setGuides] = useState({ vertical: [], horizontal: [] });
  const saveTimeoutRef = useRef(null);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: async () => {
      const templates = await db.templates.getAll();
      const template = templates.find(t => t.id === templateId);
      if (template?.guides) {
        setGuides(template.guides);
      }
      return template;
    },
    enabled: !!templateId
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll()
  });

  const updateMutation = useMutation({
    mutationFn: (data) => db.templates.update(templateId, data),
    onSuccess: (returnedData) => {
      // Use the merged data returned by the API to update cache directly
      // This avoids refetching potentially stale data from the server
      queryClient.setQueryData(['template', templateId], (prev) => ({
        ...prev,
        ...returnedData
      }));
      queryClient.invalidateQueries(['templates']);
      toast.success('Template saved successfully');
    }
  });

  // Load bases when connection changes
  useEffect(() => {
    if (template?.airtable_connection_id) {
      loadBases();
    }
  }, [template?.airtable_connection_id]);

  // Load tables when base changes
  useEffect(() => {
    if (template?.airtable_connection_id && template?.airtable_base_id) {
      loadTables();
    }
  }, [template?.airtable_connection_id, template?.airtable_base_id]);

  // Load test records when table changes
  useEffect(() => {
    if (template?.airtable_connection_id && template?.airtable_base_id && template?.airtable_table_name) {
      loadTestRecords();
    }
  }, [template?.airtable_connection_id, template?.airtable_base_id, template?.airtable_table_name]);

  // Load Airtable fields when connection/base/table changes
  useEffect(() => {
    if (template?.airtable_connection_id && template?.airtable_base_id && template?.airtable_table_name) {
      loadAirtableFields();
    }
  }, [template?.airtable_connection_id, template?.airtable_base_id, template?.airtable_table_name]);

  const loadBases = async () => {
    try {
      const connection = connections.find(c => c.id === template.airtable_connection_id);
      if (!connection) return;

      setLoadingBases(true);
      const bases = await airtableService.getBases(connection.api_key);
      setAvailableBases(bases);
    } catch (error) {
      console.error('Failed to load bases:', error);
    } finally {
      setLoadingBases(false);
    }
  };

  const loadTables = async () => {
    try {
      const connection = connections.find(c => c.id === template.airtable_connection_id);
      if (!connection) return;

      const tables = await airtableService.getBaseSchema(connection.api_key, template.airtable_base_id);
      setAvailableTables(tables);
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const loadAirtableFields = async () => {
    try {
      const connection = connections.find(c => c.id === template.airtable_connection_id);
      if (!connection) return;

      const tables = await airtableService.getBaseSchema(connection.api_key, template.airtable_base_id);
      const tableSchema = tables.find(t => t.name === template.airtable_table_name);

      if (tableSchema) {
        setAirtableFields(tableSchema.fields || []);
      }
    } catch (error) {
      console.error('Failed to load Airtable fields:', error);
    }
  };

  const loadTestRecords = async () => {
    try {
      const connection = connections.find(c => c.id === template.airtable_connection_id);
      if (!connection) return;

      const records = await airtableService.getRecords(
        connection.api_key,
        template.airtable_base_id,
        template.airtable_table_name,
        { maxRecords: 100 }
      );
      setTestRecords(records);
      // Auto-select first record if none selected
      if (records.length > 0 && !selectedTestRecord) {
        setSelectedTestRecord(records[0].id);
      }
    } catch (error) {
      console.error('Failed to load test records:', error);
    }
  };

  const handleDetectFields = async () => {
    if (!template?.pdf_url) return;

    setIsDetecting(true);
    try {
      const detectedFields = await aiService.detectPDFFields(template.pdf_url);

      const fieldsWithIds = detectedFields.map((field, index) => ({
        ...field,
        id: `field_${Date.now()}_${index}`,
        airtable_field: null,
        font: template.default_font || 'Arial',
        font_size: template.default_font_size || 12,
        alignment: template.default_alignment || 'left',
        bold: template.default_bold || false,
        italic: template.default_italic || false,
        underline: template.default_underline || false
      }));

      await updateMutation.mutateAsync({
        fields: fieldsWithIds
      });
    } catch (error) {
      console.error('Field detection failed:', error);
      alert('Failed to detect fields. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUpdateField = (fieldId, updates, skipSave = false) => {
    const updatedFields = template.fields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    // Optimistically update the UI immediately
    queryClient.setQueryData(['template', templateId], {
      ...template,
      fields: updatedFields
    });

    // Skip save during active dragging/resizing for performance
    if (skipSave) return;

    // Debounce the actual save - wait 60 seconds before syncing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      updateMutation.mutate({ fields: updatedFields }, {
        onSuccess: () => {
          // Silent success - no toast for auto-save
        }
      });
    }, 60000); // 60 seconds
  };

  const handleDeleteField = (fieldId) => {
    const updatedFields = template.fields.filter(f => f.id !== fieldId);
    // Optimistically update UI
    queryClient.setQueryData(['template', templateId], {
      ...template,
      fields: updatedFields
    });
    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
    // Clear any pending saves and delete immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    updateMutation.mutate({ fields: updatedFields });
  };

  const handleAddField = (newField) => {
    const updatedFields = [...(template.fields || []), newField];
    // Optimistically update the UI
    queryClient.setQueryData(['template', templateId], {
      ...template,
      fields: updatedFields
    });
    updateMutation.mutate({ fields: updatedFields });
  };

  const handleBulkFieldAdd = (newFields) => {
    const updatedFields = [...(template.fields || []), ...newFields];
    // Optimistically update the UI
    queryClient.setQueryData(['template', templateId], {
      ...template,
      fields: updatedFields
    });
    updateMutation.mutate({ fields: updatedFields });
  };

  const handlePreview = async () => {
    if (!selectedTestRecord) {
      alert('Please select a test record first');
      return;
    }

    setIsPreviewing(true);
    try {
      const connection = connections.find(c => c.id === template.airtable_connection_id);
      if (!connection) throw new Error('Connection not found');

      const record = await airtableService.getRecord(
        connection.api_key,
        template.airtable_base_id,
        template.airtable_table_name,
        selectedTestRecord
      );

      const pdfBlob = await pdfService.generatePDF(
        template.pdf_url,
        template.fields || [],
        record.fields
      );

      // Open in new tab instead of auto-download
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to generate preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleSave = async (updates) => {
    try {
      // 1. Fetch latest "truth" from server to ensure we don't overwrite with stale data
      const latestTemplate = await db.templates.get(templateId);

      // 2. Client-Side Merge: Apply our updates to the fresh template
      const fullData = {
        ...latestTemplate,
        ...template, // Use current UI state as base (in case of unsaved changes)
        ...updates   // Apply the new updates on top
      };

      // 3. Sanitize: Remove readonly fields that shouldn't be sent back
      // This helps prevent 502 errors if the backend chokes on them
      const { id, created_date, updated_date, ...sanitizedData } = fullData;

      // Optimistically update the UI immediately
      queryClient.setQueryData(['template', templateId], (prev) => ({
        ...prev,
        ...updates
      }));

      // 4. Send the sanitized full object
      await updateMutation.mutateAsync(sanitizedData);

      // If setup polling now is checked and all required fields are set
      if (setupPollingNow && updates.status === 'active') {
        const pollingConfig = await db.pollingConfig.get();
        if (pollingConfig && !pollingConfig.enabled) {
          await db.pollingConfig.createOrUpdate({
            enabled: true,
            interval_minutes: pollingConfig.interval_minutes || 5,
            last_poll_time: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save changes. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Template not found</div>
      </div>
    );
  }

  if (mode === 'editor') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(createPageUrl('Templates'))}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {template.name}
                </h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setMode('config')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                onClick={() => {
                  if (saveTimeoutRef.current) {
                    clearTimeout(saveTimeoutRef.current);
                  }
                  updateMutation.mutate({ fields: template.fields, guides });
                }}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={handlePreview}
                disabled={!selectedTestRecord || isPreviewing || !template.airtable_connection_id}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {isPreviewing ? (
                  'Generating...'
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview in New Tab
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* PDF Viewer */}
          <div className="flex-1">
            {!template.pdf_url ? (
              <div className="flex items-center justify-center h-full bg-slate-100 text-slate-500">
                <div className="text-center">
                  <p className="mb-4">No PDF uploaded for this template.</p>
                  <Button onClick={() => navigate(createPageUrl('Templates'))}>
                    Go back to upload
                  </Button>
                </div>
              </div>
            ) : (
              <PDFViewer
                pdfUrl={template.pdf_url}
                fields={template.fields || []}
                onFieldUpdate={handleUpdateField}
                onFieldDelete={handleDeleteField}
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
                updateMutation={updateMutation}
                airtableFields={airtableFields}
              />
            )}
          </div>

          {/* Properties Panel */}
          <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 shadow-lg">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800">
              <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                Properties
              </h2>
            </div>
            <FieldPropertiesPanel
              field={selectedField}
              onUpdate={handleUpdateField}
              airtableFields={airtableFields}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(createPageUrl('Templates'))}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {template.name}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Configure template settings and field mappings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDetectFields}
              disabled={isDetecting}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isDetecting ? 'Detecting...' : 'AI Detect Fields'}
            </Button>
            <Button
              onClick={() => setMode('editor')}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Visual Editor
            </Button>
            <Button
              onClick={() => setMode('editor')}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Done Config
            </Button>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings">Template Settings</TabsTrigger>
            <TabsTrigger value="fields">Field Mappings ({template.fields?.length || 0})</TabsTrigger>
            <TabsTrigger value="styling">Default Styling</TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Airtable Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Airtable Connection</Label>
                  <SearchableSelect
                    value={template.airtable_connection_id || ''}
                    onChange={(value) => handleSave({ airtable_connection_id: value })}
                    options={connections.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="Select connection"
                  />
                </div>

                <div>
                  <Label>Base</Label>
                  <SearchableSelect
                    value={template.airtable_base_id || ''}
                    onChange={(value) => handleSave({ airtable_base_id: value, airtable_table_name: '' })}
                    options={availableBases.map(b => ({ value: b.id, label: b.name }))}
                    placeholder="Select base"
                    disabled={!template.airtable_connection_id}
                    loading={loadingBases}
                  />
                </div>

                <div>
                  <Label>Table</Label>
                  <SearchableSelect
                    value={template.airtable_table_name || ''}
                    onChange={(value) => handleSave({ airtable_table_name: value })}
                    options={availableTables.map(t => ({ value: t.name, label: t.name }))}
                    placeholder="Select table"
                    disabled={!template.airtable_base_id}
                  />
                </div>

                <div>
                  <Label>Test Record (for preview)</Label>
                  <SearchableSelect
                    value={selectedTestRecord || ''}
                    onChange={setSelectedTestRecord}
                    options={testRecords.map(r => ({
                      value: r.id,
                      label: r.fields['Application number'] || r.fields.Name || r.fields.Title || r.id.substring(0, 8)
                    }))}
                    placeholder="Select test record"
                    disabled={!template.airtable_table_name}
                  />
                </div>

                <div>
                  <Label>Trigger Field (field to watch)</Label>
                  <Input
                    value={template.trigger_field || ''}
                    onChange={(e) => handleSave({ trigger_field: e.target.value })}
                    placeholder="Status"
                  />
                </div>

                <div>
                  <Label>Trigger Value (value that triggers generation)</Label>
                  <Input
                    value={template.trigger_value || ''}
                    onChange={(e) => handleSave({ trigger_value: e.target.value })}
                    placeholder="Generate PDF"
                  />
                </div>

                <div>
                  <Label>Output Field (where to upload PDF)</Label>
                  <Input
                    value={template.output_field || ''}
                    onChange={(e) => handleSave({ output_field: e.target.value })}
                    placeholder="PDF Attachment"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Checkbox
                    id="setup-polling"
                    checked={setupPollingNow}
                    onCheckedChange={setSetupPollingNow}
                  />
                  <Label htmlFor="setup-polling" className="cursor-pointer">
                    Enable automatic polling when I activate this template
                  </Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fields">
            <FieldConfiguration
              fields={template.fields || []}
              airtableFields={airtableFields}
              onUpdateField={handleUpdateField}
              onDeleteField={handleDeleteField}
              selectedField={selectedField}
              onSelectField={setSelectedField}
            />
          </TabsContent>

          <TabsContent value="styling">
            <DefaultStyleSettings
              template={template}
              onSave={handleSave}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}