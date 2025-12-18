import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, FileText, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db } from '../components/services/database';
import { airtableService } from '../components/services/airtableService';
import { pdfService } from '../components/services/pdfService';
import { fileStorage } from '../components/services/fileStorage';

export default function Generate() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [recordIds, setRecordIds] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.templates.getAll()
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll()
  });

  const activeTemplates = templates.filter(t => t.status === 'active');

  const generatePDFForRecord = async (template, recordId) => {
    try {
      // Get connection
      const connection = connections.find(c => c.id === template.airtable_connection_id);
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Fetch record from Airtable
      const record = await airtableService.getRecord(
        connection.api_key,
        template.airtable_base_id,
        template.airtable_table_name,
        recordId
      );

      // Create generation record
      const generatedPDF = await db.generatedPDFs.create({
        template_id: template.id,
        template_name: template.name,
        airtable_record_id: recordId,
        status: 'generating',
        data_snapshot: record.fields
      });

      // Generate PDF (simplified - would use pdf-lib in production)
      const pdfBlob = await pdfService.generatePDF(
        template.pdf_url,
        template.fields || [],
        record.fields
      );

      // Upload PDF
      const pdfFile = new File([pdfBlob], `${template.name}_${recordId}.pdf`, {
        type: 'application/pdf'
      });
      const pdfUrl = await fileStorage.uploadFile(pdfFile);

      // Update generation record
      await db.generatedPDFs.update(generatedPDF.id, {
        pdf_url: pdfUrl,
        status: 'completed'
      });

      // Upload to Airtable if output field is configured
      if (template.output_field) {
        await airtableService.uploadAttachment(
          connection.api_key,
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

      return { success: true, recordId, pdfUrl };
    } catch (error) {
      console.error('PDF generation failed:', error);
      return { success: false, recordId, error: error.message };
    }
  };

  const handleBatchGenerate = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    const connection = connections.find(c => c.id === template.airtable_connection_id);
    if (!connection) {
      alert('Template connection not found');
      return;
    }

    setIsGenerating(true);
    setResults([]);

    try {
      let records = [];

      if (recordIds.trim()) {
        // Process specific record IDs
        const ids = recordIds.split(',').map(id => id.trim()).filter(Boolean);
        
        for (const recordId of ids) {
          const result = await generatePDFForRecord(template, recordId);
          setResults(prev => [...prev, result]);
        }
      } else {
        // Fetch records from Airtable with optional sorting
        const sortOptions = sortField ? {
          sort: [{ field: sortField, direction: sortDirection }]
        } : {};

        records = await airtableService.getRecords(
          connection.api_key,
          template.airtable_base_id,
          template.airtable_table_name,
          {
            ...sortOptions,
            maxRecords: 50
          }
        );

        // Filter by trigger if configured
        if (template.trigger_field && template.trigger_value) {
          records = records.filter(r =>
            r.fields[template.trigger_field] === template.trigger_value
          );
        }

        // Generate PDFs for each record
        for (const record of records) {
          const result = await generatePDFForRecord(template, record.id);
          setResults(prev => [...prev, result]);
        }
      }

      queryClient.invalidateQueries(['generated-pdfs']);
    } catch (error) {
      console.error('Batch generation failed:', error);
      alert('Batch generation failed: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Generate PDFs
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manually trigger PDF generation for specific records or batches
          </p>
        </div>

        {/* Configuration */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">
              Generation Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Record IDs (optional)</Label>
              <Input
                placeholder="rec123, rec456, rec789 (comma-separated)"
                value={recordIds}
                onChange={(e) => setRecordIds(e.target.value)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Leave empty to process all records matching trigger conditions
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sort By Field (optional)</Label>
                <Input
                  placeholder="Created Time"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                />
              </div>
              <div>
                <Label>Sort Direction</Label>
                <Select value={sortDirection} onValueChange={setSortDirection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleBatchGenerate}
              disabled={isGenerating || !selectedTemplate}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Generate PDFs
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        {results.length > 0 && (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-900 dark:text-slate-100">
                Generation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      result.success
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
                          {result.recordId}
                        </p>
                        {result.error && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                    {result.success && result.pdfUrl && (
                      <a
                        href={result.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">Total:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {results.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-green-600 dark:text-green-400">Success:</span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    {results.filter(r => r.success).length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-red-600 dark:text-red-400">Failed:</span>
                  <span className="font-medium text-red-900 dark:text-red-100">
                    {results.filter(r => !r.success).length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}