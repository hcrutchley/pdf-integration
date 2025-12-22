import React, { useState, useCallback, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Upload, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '../components/services/database';
import { fileStorage } from '../components/services/fileStorage';
import SectionManager from '../components/sections/SectionManager';
import TemplateCard from '../components/templates/TemplateCard';
import ImportTemplateDialog from '../components/import/ImportTemplateDialog';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useOrgContext } from '../components/context/OrgContext';
import { toast } from 'sonner';

// Helper to convert base64 to blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

export default function Templates() {
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getContextFilter } = useOrgContext();


  const { data: allTemplates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.templates.getAll()
  });

  const contextFilter = getContextFilter();
  const templates = allTemplates.filter(t =>
    (contextFilter.organization_id === null && !t.organization_id) ||
    (t.organization_id === contextFilter.organization_id)
  );

  const { data: allSections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => db.sections.getAll()
  });

  const sections = allSections.filter(s =>
    (contextFilter.organization_id === null && !s.organization_id) ||
    (s.organization_id === contextFilter.organization_id)
  );

  // Build flat section list with levels for move menu
  const flatSections = useMemo(() => {
    const buildTree = (parentId = null, level = 0) => {
      return sections
        .filter(s => (s.parent_id || null) === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .flatMap(section => [
          { ...section, level },
          ...buildTree(section.id, level + 1)
        ]);
    };
    return buildTree();
  }, [sections]);


  const createTemplateMutation = useMutation({
    mutationFn: (data) => db.templates.create(data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries(['templates']);
      navigate(createPageUrl('TemplateEditor') + `?id=${newTemplate.id}`);
    }
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }) => db.templates.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => db.templates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['templates']);
    }
  });

  const createSectionMutation = useMutation({
    mutationFn: (data) => db.sections.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sections']);
    }
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }) => db.sections.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['sections']);
    }
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id) => db.sections.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['sections']);
    }
  });

  const { data: allConnections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll()
  });

  const connections = allConnections.filter(c =>
    (contextFilter.organization_id === null && !c.organization_id) ||
    (c.organization_id === contextFilter.organization_id)
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const fileUrl = await fileStorage.uploadFile(file);

      // Find default connection
      const defaultConnection = connections.find(c => c.is_default);

      await createTemplateMutation.mutateAsync({
        name: file.name.replace('.pdf', ''),
        pdf_url: fileUrl,
        section_id: selectedSection?.id || null,
        status: 'draft',
        fields: [],
        airtable_connection_id: defaultConnection?.id || null,
        airtable_base_id: defaultConnection?.default_base_id || null,
        airtable_table_name: defaultConnection?.default_table_name || null,
        organization_id: contextFilter.organization_id
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload PDF');
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleStatus = (template) => {
    const newStatus = template.status === 'active' ? 'paused' : 'active';
    updateTemplateMutation.mutate({
      id: template.id,
      data: { status: newStatus }
    });
  };

  const handleDelete = (template) => {
    if (confirm(`Delete template "${template.name}"?`)) {
      deleteTemplateMutation.mutate(template.id);
    }
  };

  // Handle moving template to a different folder
  const handleMoveToFolder = useCallback((template, sectionId) => {
    updateTemplateMutation.mutate({
      id: template.id,
      data: { section_id: sectionId }
    });
    toast.success(sectionId ? 'Template moved to folder' : 'Template removed from folder');
  }, [updateTemplateMutation]);


  // Handle import from .airpdf file
  const handleImportComplete = useCallback(async ({ data, connectionId, mode }) => {
    try {
      if (mode === 'full') {
        // Decode and upload the PDF
        const pdfBlob = base64ToBlob(data.pdf, 'application/pdf');
        const pdfUrl = await fileStorage.uploadFile(pdfBlob, `${data.template.name}.pdf`);

        // Create new template
        const newTemplate = {
          name: data.template.name,
          fields: data.template.fields || [],
          guides: data.template.guides || { vertical: [], horizontal: [] },
          pdf_url: pdfUrl,
          airtable_connection_id: connectionId,
          airtable_base_id: data.template.airtable_base_id,
          airtable_table_name: data.template.airtable_table_name,
          trigger_field: data.template.trigger_field,
          trigger_value: data.template.trigger_value,
          output_field: data.template.output_field,
          default_font: data.template.default_font,
          default_font_size: data.template.default_font_size,
          default_alignment: data.template.default_alignment,
          default_bold: data.template.default_bold,
          default_italic: data.template.default_italic,
          default_underline: data.template.default_underline,
          section_id: selectedSection?.id || null,
          status: 'draft',
          organization_id: contextFilter.organization_id
        };

        await createTemplateMutation.mutateAsync(newTemplate);
        toast.success('Template imported successfully');
      } else if (mode === 'fields_only') {
        // For fields only, we'd need to select a target template first
        // For now, just show a message
        toast.info('Fields-only import requires selecting a target template (coming soon)');
      }
    } catch (error) {
      console.error('Import failed:', error);
      throw error;
    }
  }, [selectedSection, contextFilter, createTemplateMutation]);

  const filteredTemplates = templates.filter(t => {
    const matchesSection = !selectedSection || t.section_id === selectedSection.id;
    const matchesSearch = !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 min-h-screen">
          <SectionManager
            sections={sections}
            selectedSection={selectedSection}
            onSelectSection={setSelectedSection}
            onCreateSection={(data) => createSectionMutation.mutate(data)}
            onUpdateSection={(id, data) => updateSectionMutation.mutate({ id, data })}
            onDeleteSection={(id) => deleteSectionMutation.mutate(id)}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  PDF Templates
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {selectedSection ? selectedSection.name : 'All Templates'}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="pdf-upload"
                  disabled={isUploading}
                />
                <Button
                  variant="outline"
                  onClick={() => setIsImportOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Import
                </Button>
                <Button
                  onClick={() => document.getElementById('pdf-upload').click()}
                  className="bg-teal-600 hover:bg-teal-700"
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </div>

            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Templates Grid */}
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  No templates yet
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Upload your first PDF template to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    sections={flatSections}
                    onEdit={(t, openEditor) => {
                      const url = createPageUrl('TemplateEditor') + `?id=${t.id}`;
                      navigate(openEditor ? url + '&mode=editor' : url);
                    }}
                    onDelete={handleDelete}
                    onToggleStatus={handleToggleStatus}
                    onMoveToFolder={handleMoveToFolder}
                  />
                ))}

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Dialog */}
      <ImportTemplateDialog
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        connections={connections}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
