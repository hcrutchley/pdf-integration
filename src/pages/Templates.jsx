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
import { exportBatch } from '../components/services/exportService';

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

  const createBatchTemplateMutation = useMutation({
    mutationFn: (data) => db.templates.create(data),
    onSuccess: () => {
      // No navigation for batch
      queryClient.invalidateQueries(['templates']);
    }
  });

  // ... (existing update/delete mutations)

  // Handle import from .airpdf file
  const handleImportComplete = useCallback(async ({ data, connectionId, mode }) => {
    try {
      if (mode === 'full') {
        // ... (existing full import logic)
      } else if (mode === 'batch') {
        const toastId = toast.loading(`Importing ${data.items.length} items...`);
        let successCount = 0;
        const sectionPathCache = new Map();

        // Find default connection for raw PDFs
        const defaultConnection = connections.find(c => c.is_default);

        // Helper to find or create sections
        const getOrCreateSection = async (pathArr) => {
          // ... (existing helper logic)
          if (!pathArr || pathArr.length === 0) return selectedSection?.id || null;

          let parentId = selectedSection?.id || null;
          let currentPath = '';

          for (const folderName of pathArr) {
            currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;

            if (sectionPathCache.has(currentPath)) {
              parentId = sectionPathCache.get(currentPath);
              continue;
            }

            // Check existing sections (closest match in current list)
            const existing = allSections.find(s =>
              s.name === folderName &&
              (s.parent_id || null) === (parentId || null) &&
              ((contextFilter.organization_id === null && !s.organization_id) || (s.organization_id === contextFilter.organization_id))
            );

            if (existing) {
              parentId = existing.id;
            } else {
              // Create new section
              const newSection = await createSectionMutation.mutateAsync({
                name: folderName,
                parent_id: parentId,
                organization_id: contextFilter.organization_id
              });
              parentId = newSection.id;
            }
            sectionPathCache.set(currentPath, parentId);
          }
          return parentId;
        };

        for (const item of data.items) {
          try {
            const targetSectionId = await getOrCreateSection(item.path);

            if (item.type === 'airpdf') {
              // Import airpdf
              const pdfBlob = base64ToBlob(item.data.pdf, 'application/pdf');
              const pdfUrl = await fileStorage.uploadFile(pdfBlob, `${item.data.template.name}.pdf`);

              const newTemplate = {
                ...item.data.template,
                pdf_url: pdfUrl,
                airtable_connection_id: connectionId || defaultConnection?.id || null, // Use selected or default
                section_id: targetSectionId,
                status: 'draft',
                organization_id: contextFilter.organization_id
              };
              await createBatchTemplateMutation.mutateAsync(newTemplate);
              successCount++;
            } else if (item.type === 'pdf') {
              // Import raw PDF
              const pdfBlob = base64ToBlob(item.data.base64, 'application/pdf');
              const pdfUrl = await fileStorage.uploadFile(pdfBlob, `${item.data.name}.pdf`);

              await createBatchTemplateMutation.mutateAsync({
                name: item.data.name,
                pdf_url: pdfUrl,
                fields: [],
                guides: { vertical: [], horizontal: [] },
                airtable_connection_id: connectionId || defaultConnection?.id || null, // Use selected or default
                airtable_base_id: defaultConnection?.default_base_id || null,
                airtable_table_name: defaultConnection?.default_table_name || null,
                section_id: targetSectionId,
                status: 'draft',
                organization_id: contextFilter.organization_id
              });
              successCount++;
            }
          } catch (err) {
            console.error(`Failed to import item ${item.name}:`, err);
          }
        }

        queryClient.invalidateQueries(['sections']);
        queryClient.invalidateQueries(['templates']);
        toast.success(`Imported ${successCount} templates`, { id: toastId });

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
            onExportSection={handleExportSection}
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
