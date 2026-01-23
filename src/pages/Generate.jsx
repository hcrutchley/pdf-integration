import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, FileText, CheckCircle, AlertCircle, Loader2, Download, Upload, Search, Settings, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { db } from '../components/services/database';
import { airtableService } from '../components/services/airtableService';
import { pdfService } from '../components/services/pdfService';
import { fileStorage } from '../components/services/fileStorage';
import { useOrgContext } from '../components/context/OrgContext';
import { toast } from 'sonner';

export default function Generate() {
  const queryClient = useQueryClient();
  const { getContextFilter } = useOrgContext();
  const contextFilter = getContextFilter();

  // Template selection
  const [selectedTemplates, setSelectedTemplates] = useState([]);

  // Record selection
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Display field settings
  const [displayFields, setDisplayFields] = useState(['Application number', 'Name', 'Surname']);
  const [displayFieldsOpen, setDisplayFieldsOpen] = useState(false);
  const [newDisplayField, setNewDisplayField] = useState('');

  // Output options
  const [outputMode, setOutputMode] = useState('both'); // 'download', 'airtable', 'both'

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Queries
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.templates.getAll()
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll()
  });

  // Filter templates by context (personal/org)
  const filteredTemplates = templates.filter(t => {
    if (contextFilter.organization_id === null) {
      return !t.organization_id;
    }
    return t.organization_id === contextFilter.organization_id;
  });

  // Show templates that are enabled and have PDF and connection configured
  // Templates must be published (enabled=true) to show in Generate page
  const activeTemplates = filteredTemplates.filter(t =>
    t.enabled !== false && // Enabled by default, explicitly check for false
    (t.pdf_url || t.draft_pdf_url) && // Has a PDF (published or draft)
    t.airtable_connection_id &&
    t.airtable_base_id &&
    t.airtable_table_name
  );

  // Get the first selected template for connection info
  const primaryTemplate = useMemo(() => {
    if (selectedTemplates.length === 0) return null;
    return templates.find(t => t.id === selectedTemplates[0]);
  }, [selectedTemplates, templates]);

  const connection = useMemo(() => {
    if (!primaryTemplate) return null;
    return connections.find(c => c.id === primaryTemplate.airtable_connection_id);
  }, [primaryTemplate, connections]);

  // Load records when template is selected
  useEffect(() => {
    if (!primaryTemplate || !connection) {
      setRecords([]);
      return;
    }

    const loadRecords = async () => {
      setLoadingRecords(true);
      try {
        const fetchedRecords = await airtableService.getRecords(
          connection.api_key,
          primaryTemplate.airtable_base_id,
          primaryTemplate.airtable_table_name,
          { maxRecords: 100 }
        );
        setRecords(fetchedRecords);
      } catch (err) {
        console.error('Failed to load records:', err);
        toast.error('Failed to load Airtable records');
      } finally {
        setLoadingRecords(false);
      }
    };

    loadRecords();
  }, [primaryTemplate, connection]);

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const query = searchQuery.toLowerCase();
    return records.filter(record => {
      return displayFields.some(field => {
        const value = record.fields[field];
        return value && String(value).toLowerCase().includes(query);
      });
    });
  }, [records, searchQuery, displayFields]);

  // Template selection handlers
  const toggleTemplate = (templateId) => {
    setSelectedTemplates(prev =>
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const selectAllTemplates = () => {
    if (selectedTemplates.length === activeTemplates.length) {
      setSelectedTemplates([]);
    } else {
      setSelectedTemplates(activeTemplates.map(t => t.id));
    }
  };

  // Record selection handlers
  const toggleRecord = (recordId) => {
    setSelectedRecords(prev =>
      prev.includes(recordId)
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const selectAllRecords = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id));
    }
  };

  // Display field management
  const addDisplayField = () => {
    if (newDisplayField.trim() && !displayFields.includes(newDisplayField.trim())) {
      setDisplayFields([...displayFields, newDisplayField.trim()]);
      setNewDisplayField('');
      // Save to localStorage
      localStorage.setItem('generateDisplayFields', JSON.stringify([...displayFields, newDisplayField.trim()]));
    }
  };

  const removeDisplayField = (field) => {
    const updated = displayFields.filter(f => f !== field);
    setDisplayFields(updated);
    localStorage.setItem('generateDisplayFields', JSON.stringify(updated));
  };

  // Load display fields from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('generateDisplayFields');
    if (saved) {
      setDisplayFields(JSON.parse(saved));
    }
  }, []);

  // Generate PDFs
  const generatePDFForRecord = async (template, recordId, recordData) => {
    try {
      const conn = connections.find(c => c.id === template.airtable_connection_id);
      if (!conn) throw new Error('Connection not found');

      // Create generation record
      const generatedPDF = await db.generatedPDFs.create({
        template_id: template.id,
        template_name: template.name,
        airtable_record_id: recordId,
        status: 'generating',
        data_snapshot: recordData
      });

      // Generate PDF
      const pdfBlob = await pdfService.generatePDF(
        template.pdf_url,
        template.fields || [],
        recordData
      );

      // Upload PDF to storage
      const pdfFile = new File([pdfBlob], `${template.name}_${recordId}.pdf`, {
        type: 'application/pdf'
      });
      const pdfUrl = await fileStorage.uploadFile(pdfFile);

      // Update generation record
      await db.generatedPDFs.update(generatedPDF.id, {
        pdf_url: pdfUrl,
        status: 'completed'
      });

      // Upload to Airtable if requested
      if ((outputMode === 'airtable' || outputMode === 'both') && template.output_field) {
        await airtableService.uploadAttachment(
          conn.api_key,
          template.airtable_base_id,
          template.airtable_table_name,
          recordId,
          template.output_field,
          pdfUrl,
          `${template.name}_${recordId}.pdf`
        );

        await db.generatedPDFs.update(generatedPDF.id, {
          status: 'uploaded'
        });
      }

      return {
        success: true,
        recordId,
        templateName: template.name,
        pdfUrl,
        showDownload: outputMode === 'download' || outputMode === 'both'
      };
    } catch (error) {
      console.error('PDF generation failed:', error);
      return { success: false, recordId, templateName: template.name, error: error.message };
    }
  };

  const handleGenerate = async () => {
    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one template');
      return;
    }
    if (selectedRecords.length === 0) {
      toast.error('Please select at least one record');
      return;
    }

    setIsGenerating(true);
    setResults([]);

    try {
      for (const recordId of selectedRecords) {
        const record = records.find(r => r.id === recordId);
        if (!record) continue;

        for (const templateId of selectedTemplates) {
          const template = templates.find(t => t.id === templateId);
          if (!template) continue;

          const result = await generatePDFForRecord(template, recordId, record.fields);
          setResults(prev => [...prev, result]);
        }
      }

      queryClient.invalidateQueries(['generated-pdfs']);
      toast.success(`Generated ${selectedTemplates.length * selectedRecords.length} PDFs`);
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Generation failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyRecordId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Generate PDFs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Select templates and records to generate PDFs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Template Selection */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Templates
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={selectAllTemplates}>
                  {selectedTemplates.length === activeTemplates.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <CardDescription>
                {selectedTemplates.length} of {activeTemplates.length} selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              {activeTemplates.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No active templates</p>
              ) : (
                activeTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => toggleTemplate(template.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedTemplates.includes(template.id)
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                  >
                    <Checkbox checked={selectedTemplates.includes(template.id)} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {template.airtable_table_name || 'No table configured'}
                      </p>
                    </div>
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Right Column: Output Options */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Output Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={outputMode === 'download' ? 'default' : 'outline'}
                  onClick={() => setOutputMode('download')}
                  className="flex-col h-auto py-3"
                >
                  <Download className="h-5 w-5 mb-1" />
                  <span className="text-xs">Download Only</span>
                </Button>
                <Button
                  variant={outputMode === 'airtable' ? 'default' : 'outline'}
                  onClick={() => setOutputMode('airtable')}
                  className="flex-col h-auto py-3"
                >
                  <Upload className="h-5 w-5 mb-1" />
                  <span className="text-xs">Airtable Only</span>
                </Button>
                <Button
                  variant={outputMode === 'both' ? 'default' : 'outline'}
                  onClick={() => setOutputMode('both')}
                  className="flex-col h-auto py-3 bg-teal-600 hover:bg-teal-700"
                >
                  <div className="flex gap-1 mb-1">
                    <Download className="h-4 w-4" />
                    <Upload className="h-4 w-4" />
                  </div>
                  <span className="text-xs">Both</span>
                </Button>
              </div>

              {outputMode !== 'download' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  PDFs will be uploaded to the Output Field configured in each template
                </p>
              )}

              {/* Display Fields Settings */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setDisplayFieldsOpen(!displayFieldsOpen)}
                  className="flex items-center justify-between w-full text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Record Display Fields
                  </span>
                  {displayFieldsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {displayFieldsOpen && (
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {displayFields.map(field => (
                        <Badge key={field} variant="secondary" className="gap-1">
                          {field}
                          <button
                            onClick={() => removeDisplayField(field)}
                            className="ml-1 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newDisplayField}
                        onChange={(e) => setNewDisplayField(e.target.value)}
                        placeholder="Add field name"
                        className="h-8 text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && addDisplayField()}
                      />
                      <Button size="sm" variant="outline" onClick={addDisplayField}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Record Selection */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Select Records
                </CardTitle>
                <CardDescription>
                  {selectedRecords.length} of {filteredRecords.length} selected
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search records..."
                    className="pl-9 w-64 h-9"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={selectAllRecords}>
                  {selectedRecords.length === filteredRecords.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!primaryTemplate ? (
              <p className="text-center py-8 text-slate-500">Select a template first to load records</p>
            ) : loadingRecords ? (
              <div className="flex items-center justify-center py-8 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                <span className="text-slate-500">Loading records...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <p className="text-center py-8 text-slate-500">No records found</p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredRecords.map(record => (
                  <div
                    key={record.id}
                    onClick={() => toggleRecord(record.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedRecords.includes(record.id)
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                  >
                    <Checkbox checked={selectedRecords.includes(record.id)} />
                    <div className="flex-1 min-w-0 grid grid-cols-3 gap-4">
                      {displayFields.slice(0, 3).map(field => (
                        <div key={field} className="min-w-0">
                          <p className="text-xs text-slate-500 truncate">{field}</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {record.fields[field] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyRecordId(record.id);
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                      title="Copy Record ID"
                    >
                      {copiedId === record.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || selectedTemplates.length === 0 || selectedRecords.length === 0}
          className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating {results.length} / {selectedTemplates.length * selectedRecords.length}...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Generate {selectedTemplates.length * selectedRecords.length} PDFs
            </>
          )}
        </Button>

        {/* Results */}
        {results.length > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Generation Results
              </CardTitle>
              {results.filter(r => r.success && r.pdfUrl).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Download all successful PDFs
                    const successfulResults = results.filter(r => r.success && r.pdfUrl);
                    successfulResults.forEach((result, index) => {
                      // Stagger downloads to avoid browser blocking
                      setTimeout(() => {
                        const link = document.createElement('a');
                        link.href = result.pdfUrl;
                        link.download = `${result.templateName}_${result.recordId}.pdf`;
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }, index * 300);
                    });
                    toast.success(`Downloading ${successfulResults.length} PDFs...`);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download All ({results.filter(r => r.success && r.pdfUrl).length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${result.success
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {result.templateName}
                        </p>
                        <p className="text-xs text-slate-500">{result.recordId}</p>
                        {result.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                        )}
                      </div>
                    </div>
                    {result.success && result.showDownload && result.pdfUrl && (
                      <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-slate-500">Total</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{results.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-green-600">Success</p>
                  <p className="font-bold text-green-900 dark:text-green-100">
                    {results.filter(r => r.success).length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-red-600">Failed</p>
                  <p className="font-bold text-red-900 dark:text-red-100">
                    {results.filter(r => !r.success).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}