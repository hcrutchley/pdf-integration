import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search, Download, ExternalLink, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '../components/services/database';
import { format } from 'date-fns';

export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('-created_date');

  const { data: generatedPDFs = [] } = useQuery({
    queryKey: ['generated-pdfs'],
    queryFn: () => db.generatedPDFs.getAll(100)
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.templates.getAll()
  });

  const filteredPDFs = generatedPDFs
    .filter((pdf) => {
      const matchesStatus = statusFilter === 'all' || pdf.status === statusFilter;
      const matchesSearch = !searchQuery ||
        pdf.template_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pdf.airtable_record_id?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === '-created_date') {
        return new Date(b.created_date) - new Date(a.created_date);
      }
      return new Date(a.created_date) - new Date(b.created_date);
    });

  const statusColors = {
    generating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    uploaded: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Generation History
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            View all generated PDFs and their status
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by template or record ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="generating">Generating</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="-created_date">Newest First</SelectItem>
                  <SelectItem value="created_date">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {filteredPDFs.length === 0 ? (
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-12 pb-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 dark:text-slate-400">
                No PDFs found
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPDFs.map((pdf) => (
              <Card
                key={pdf.id}
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/30">
                        <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {pdf.template_name || 'Unknown Template'}
                        </h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge className={statusColors[pdf.status]}>
                            {pdf.status}
                          </Badge>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            Record: {pdf.airtable_record_id}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          {format(new Date(pdf.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                        {pdf.error_message && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                            Error: {pdf.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pdf.pdf_url && (
                        <>
                          <a
                            href={pdf.pdf_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </a>
                          <a
                            href={pdf.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}