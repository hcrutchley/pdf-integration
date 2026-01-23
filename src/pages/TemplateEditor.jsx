import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '../components/services/database';
import { aiService } from '../components/services/aiService';
import { airtableService } from '../components/services/airtableService';
import { fileStorage } from '../components/services/fileStorage';
import { pdfService } from '../components/services/pdfService';
import { exportTemplate } from '../components/services/exportService';
import EditorLayout from '../components/editor/EditorLayout';
import SettingsView from '../components/editor/SettingsView';
import DesignView from '../components/editor/DesignView';
import { createPageUrl } from '@/utils';


const AUTOSAVE_INTERVAL_MS = 60000; // 60 seconds

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Dirty flag for tracking unsaved changes
  const isDirtyRef = useRef(false);

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

  // Check if there are unpublished changes
  const hasUnpublishedChanges = useMemo(() => {
    if (!template) return false;

    // Check if draft fields differ from published fields
    const draftFields = template.draft_fields;
    const publishedFields = template.fields;
    const draftPdfUrl = template.draft_pdf_url;
    const publishedPdfUrl = template.pdf_url;

    // If there are draft fields that differ from published
    if (draftFields && JSON.stringify(draftFields) !== JSON.stringify(publishedFields)) {
      return true;
    }

    // If there's a draft PDF that differs
    if (draftPdfUrl && draftPdfUrl !== publishedPdfUrl) {
      return true;
    }

    // Check if template has never been published
    if (!template.published_at && (template.fields?.length > 0 || template.pdf_url)) {
      return true;
    }

    return false;
  }, [template]);

  // Get the working fields (draft if exists, otherwise published)
  const workingFields = useMemo(() => {
    if (!template) return [];
    return template.draft_fields || template.fields || [];
  }, [template]);

  // Get the working PDF URL (draft if exists, otherwise published)
  const workingPdfUrl = useMemo(() => {
    if (!template) return null;
    return template.draft_pdf_url || template.pdf_url;
  }, [template]);

  // Silent sync to server (no toast)
  const syncToServer = useCallback(async (showToast = false) => {
    if (!templateId) return;

    try {
      setIsSyncing(true);
      const currentCache = queryClient.getQueryData(['template', templateId]);
      if (!currentCache) return;

      const latestTemplate = await db.templates.get(templateId);

      const fullData = {
        ...latestTemplate,
        ...currentCache,
        guides // Include current guides state
      };

      // Save to draft_fields instead of fields
      if (fullData.fields && !fullData.draft_fields) {
        fullData.draft_fields = fullData.fields;
      }

      // Ensure pdf_url handling
      if (!fullData.pdf_url && latestTemplate?.pdf_url) {
        fullData.pdf_url = latestTemplate.pdf_url;
      }
      if (!fullData.draft_pdf_url && latestTemplate?.draft_pdf_url) {
        fullData.draft_pdf_url = latestTemplate.draft_pdf_url;
      }

      const { id, created_date, updated_date, ...sanitizedData } = fullData;
      await db.templates.update(templateId, sanitizedData);

      isDirtyRef.current = false;

      // Invalidate queries to sync
      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['template', templateId]);

      if (showToast) {
        toast.success('Draft saved successfully');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      if (showToast) {
        toast.error('Failed to save changes');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [templateId, queryClient, guides]);

  // Publish handler - copies draft to live
  const handlePublish = useCallback(async () => {
    if (!templateId || !template) return;

    setIsPublishing(true);
    try {
      const updates = {
        // Copy draft fields to published
        fields: template.draft_fields || template.fields || [],
        // Copy draft PDF to published
        pdf_url: template.draft_pdf_url || template.pdf_url,
        // Clear draft state
        draft_fields: null,
        draft_pdf_url: null,
        // Set published timestamp
        published_at: new Date().toISOString(),
        // Mark as enabled
        enabled: true
      };

      await db.templates.update(templateId, updates);

      // Update cache
      queryClient.setQueryData(['template', templateId], (prev) => ({
        ...prev,
        ...updates
      }));

      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['template', templateId]);

      toast.success('Template published! Changes are now live.');
    } catch (error) {
      console.error('Publish failed:', error);
      toast.error('Failed to publish template');
    } finally {
      setIsPublishing(false);
    }
  }, [templateId, template, queryClient]);

  // Discard draft handler - reverts to published version
  const handleDiscardDraft = useCallback(async () => {
    if (!templateId || !template) return;

    if (!confirm('Are you sure you want to discard all unpublished changes? This cannot be undone.')) {
      return;
    }

    try {
      const updates = {
        draft_fields: null,
        draft_pdf_url: null
      };

      await db.templates.update(templateId, updates);

      // Update cache
      queryClient.setQueryData(['template', templateId], (prev) => ({
        ...prev,
        ...updates
      }));

      queryClient.invalidateQueries(['templates']);
      queryClient.invalidateQueries(['template', templateId]);

      toast.success('Draft discarded. Reverted to published version.');
    } catch (error) {
      console.error('Discard failed:', error);
      toast.error('Failed to discard changes');
    }
  }, [templateId, template, queryClient]);

  // Autosave interval (60 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) {
        console.log('[AUTOSAVE] Syncing dirty changes...');
        syncToServer(false); // Silent autosave
      }
    }, AUTOSAVE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [syncToServer]);

  // Sync on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        console.log('[UNMOUNT] Syncing unsaved changes...');
        syncToServer(false);
      }
    };
  }, [syncToServer]);

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
      if (records.length > 0 && !selectedTestRecord) {
        setSelectedTestRecord(records[0].id);
      }
    } catch (error) {
      console.error('Failed to load test records:', error);
    }
  };

  const handleDetectFields = async () => {
    const pdfUrl = workingPdfUrl;
    if (!pdfUrl) return;

    setIsDetecting(true);
    try {
      const detectedFields = await aiService.detectPDFFields(pdfUrl);

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

      // Update cache with draft_fields and mark dirty
      queryClient.setQueryData(['template', templateId], (prev) => ({
        ...prev,
        draft_fields: fieldsWithIds
      }));
      isDirtyRef.current = true;
    } catch (error) {
      console.error('Field detection failed:', error);
      alert('Failed to detect fields. Please try again.');
    } finally {
      setIsDetecting(false);
    }
  };

  // Optimistic update helper - updates cache and marks dirty (saves to draft)
  const updateCache = useCallback((updates) => {
    queryClient.setQueryData(['template', templateId], (prev) => {
      const newData = { ...prev };

      // If updating fields, save to draft_fields
      if (updates.fields) {
        newData.draft_fields = updates.fields;
        delete updates.fields;
      }

      // If updating pdf_url directly (like upload), save to draft_pdf_url
      if (updates.pdf_url && !updates.draft_pdf_url) {
        newData.draft_pdf_url = updates.pdf_url;
        delete updates.pdf_url;
      }

      Object.assign(newData, updates);

      // Safety: preserve pdf_url
      if (!newData.pdf_url && prev?.pdf_url) {
        newData.pdf_url = prev.pdf_url;
      }

      return newData;
    });
    isDirtyRef.current = true;
  }, [queryClient, templateId]);

  const handleUpdateField = useCallback((fieldId, updates) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.draft_fields || currentData?.fields || template?.fields || [];

    const updatedFields = currentFields.map(f =>
      f.id === fieldId ? { ...f, ...updates } : f
    );

    updateCache({ fields: updatedFields });
  }, [queryClient, templateId, template?.fields, updateCache]);

  const handleDeleteField = useCallback((fieldId) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.draft_fields || currentData?.fields || template?.fields || [];
    const updatedFields = currentFields.filter(f => f.id !== fieldId);

    if (selectedField?.id === fieldId) {
      setSelectedField(null);
    }

    updateCache({ fields: updatedFields });
  }, [queryClient, templateId, template?.fields, selectedField, updateCache]);

  const handleAddField = useCallback((newField) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.draft_fields || currentData?.fields || template?.fields || [];
    const updatedFields = [...currentFields, newField];

    updateCache({ fields: updatedFields });
  }, [queryClient, templateId, template?.fields, updateCache]);

  const handleBulkFieldAdd = useCallback((newFields) => {
    const currentData = queryClient.getQueryData(['template', templateId]);
    const currentFields = currentData?.draft_fields || currentData?.fields || template?.fields || [];
    const updatedFields = [...currentFields, ...newFields];

    updateCache({ fields: updatedFields });
  }, [queryClient, templateId, template?.fields, updateCache]);

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

      // Use working (draft) fields and PDF for preview
      const pdfBlob = await pdfService.generatePDF(
        workingPdfUrl,
        workingFields,
        record.fields
      );

      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to generate preview');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Manual save (with toast)
  const handleManualSave = useCallback(() => {
    // Include guides in the update
    updateCache({ guides });
    syncToServer(true); // Show toast for manual save
  }, [guides, updateCache, syncToServer]);

  // Settings save handler (for SettingsView changes)
  const handleSettingsSave = useCallback((updates) => {
    updateCache(updates);
  }, [updateCache]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!template || !workingPdfUrl) {
      toast.error('Cannot export: Template has no PDF');
      return;
    }

    setIsExporting(true);
    try {
      await exportTemplate({ ...template, fields: workingFields }, workingPdfUrl);
      toast.success('Template exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export template');
    } finally {
      setIsExporting(false);
    }
  }, [template, workingPdfUrl, workingFields]);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Create a modified template object that uses draft fields for display
  const displayTemplate = useMemo(() => {
    if (!template) return null;
    return {
      ...template,
      fields: workingFields,
      pdf_url: workingPdfUrl
    };
  }, [template, workingFields, workingPdfUrl]);

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
      onSave={handleManualSave}
      onPreview={handlePreview}
      onExport={handleExport}
      onPublish={handlePublish}
      onDiscardDraft={handleDiscardDraft}
      isPreviewing={isPreviewing}
      canPreview={!!(selectedTestRecord && template.airtable_connection_id)}
      isSaving={isSyncing}
      isExporting={isExporting}
      isPublishing={isPublishing}
      hasUnpublishedChanges={hasUnpublishedChanges}
      publishedAt={template.published_at}
      onSettingsToggle={() => setSettingsOpen(!settingsOpen)}
      settingsOpen={settingsOpen}
    >

      <DesignView
        template={displayTemplate}
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
        airtableFields={airtableFields}
        // Settings props
        settingsOpen={settingsOpen}
        connections={connections}
        availableBases={availableBases}
        availableTables={availableTables}
        testRecords={testRecords}
        selectedTestRecord={selectedTestRecord}
        setSelectedTestRecord={setSelectedTestRecord}
        loadingBases={loadingBases}
        onSettingsSave={handleSettingsSave}
        onDetectFields={handleDetectFields}
        isDetecting={isDetecting}
        setupPollingNow={setupPollingNow}
        setSetupPollingNow={setSetupPollingNow}
      />
    </EditorLayout>
  );
}
