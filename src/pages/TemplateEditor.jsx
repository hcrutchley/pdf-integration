import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../components/services/database';
import { aiService } from '../components/services/aiService';
import { airtableService } from '../components/services/airtableService';
import { fileStorage } from '../components/services/fileStorage';
import { pdfService } from '../components/services/pdfService';
import EditorLayout from '../components/editor/EditorLayout';
import SettingsView from '../components/editor/SettingsView';
import DesignView from '../components/editor/DesignView';
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
    onSuccess: () => {
      // Just invalidate and refetch to ensure we have the absolute source of truth
      // relying on the optimistic update in handleSave for immediate UI feedback
      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['template', templateId]);
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
    // Get latest fields from CACHE to avoid stale closures
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.fields || template?.fields || [];

    const updatedFields = currentFields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    );

    // Skip save during active dragging/resizing for performance
    if (skipSave) {
      queryClient.setQueryData(['template', templateId], (prev) => ({
        ...prev,
        fields: updatedFields
      }));
      return;
    }

    // Immediate optimistic update for local responsiveness
    queryClient.setQueryData(['template', templateId], (prev) => {
      const newData = { ...prev, fields: updatedFields };
      // SAFETY CHECK
      if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
        newData.pdf_url = prev?.pdf_url || template?.pdf_url;
      }
      return newData;
    });

    // Debounce the actual save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // Use handleSave for consistency and safety
      handleSave({ fields: updatedFields });
    }, 2000);
  };

  const handleDeleteField = (fieldId) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.fields || template?.fields || [];
    const updatedFields = currentFields.filter(f => f.id !== fieldId);

    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }
    // Clear any pending saves and delete immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Use safe handleSave
    handleSave({ fields: updatedFields });
  };

  const handleAddField = (newField) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.fields || template?.fields || [];
    const updatedFields = [...currentFields, newField];
    handleSave({ fields: updatedFields });
  };

  const handleBulkFieldAdd = (newFields) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.fields || template?.fields || [];
    const updatedFields = [...currentFields, ...newFields];
    handleSave({ fields: updatedFields });
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
      // 0. OPTIMISTIC UPDATE (Moved to top for instant feedback on Add/Delete)
      queryClient.setQueryData(['template', templateId], (prev) => {
        const newData = {
          ...prev,
          ...updates
        };
        // CRITICAL: Ensure `pdf_url` is never lost during optimistic update
        if (!newData.pdf_url && (prev?.pdf_url || template?.pdf_url)) {
          newData.pdf_url = prev?.pdf_url || template?.pdf_url;
        }
        return newData;
      });

      // 1. Fetch latest "truth" from server to ensure we don't overwrite with stale data
      const latestTemplate = await db.templates.get(templateId);

      // 2. Client-Side Merge: Apply our updates to the fresh template
      // CRITICAL: Use current cache data as the base for client state, NOT the closure 'template' which might be stale
      const currentCache = queryClient.getQueryData(['template', templateId]);
      const clientState = currentCache || template;

      const fullData = {
        ...latestTemplate,
        ...clientState, // Use fresh client state
        ...updates   // Apply the new updates on top
      };

      // CRITICAL: Ensure `pdf_url` is never lost. 
      if (!fullData.pdf_url && latestTemplate.pdf_url) {
        fullData.pdf_url = latestTemplate.pdf_url;
      }

      // 3. Sanitize: Remove readonly fields that shouldn't be sent back
      const { id, created_date, updated_date, ...sanitizedData } = fullData;

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
        <div className="text-slate-600 dark:text-slate-400 animate-pulse">Loading Studio...</div>
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

  return (
    <EditorLayout
      templateName={template.name}
      activeTab={mode === 'config' ? 'settings' : 'design'} // Mapping legacy mode to new tab names
      onTabChange={(tab) => setMode(tab === 'settings' ? 'config' : 'editor')}
      onSave={() => handleSave({ guides })}
      onPreview={handlePreview}
      isPreviewing={isPreviewing}
      canPreview={!!(selectedTestRecord && template.airtable_connection_id)}
      isSaving={updateMutation.isLoading}
    >
      {mode === 'config' ? (
        <SettingsView
          template={template}
          connections={connections}
          availableBases={availableBases}
          availableTables={availableTables}
          testRecords={testRecords}
          selectedTestRecord={selectedTestRecord}
          setSelectedTestRecord={setSelectedTestRecord}
          loadingBases={loadingBases}
          onSave={handleSave}
          onDetectFields={handleDetectFields}
          isDetecting={isDetecting}
          setupPollingNow={setupPollingNow}
          setSetupPollingNow={setSetupPollingNow}
        />
      ) : (
        <DesignView
          template={template}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          handleAddField={handleAddField}
          handleBulkFieldAdd={handleBulkFieldAdd}
          setSelectedField={setSelectedField}
          selectedField={selectedField}
          guides={guides}
          setGuides={setGuides}
          queryClient={queryClient}
          templateId={templateId}
          updateMutation={updateMutation}
          airtableFields={airtableFields}
        />
      )}
    </EditorLayout>
  );
}