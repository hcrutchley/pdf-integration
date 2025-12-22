import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Database, FolderOpen, Activity, Plus, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '../components/services/database';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.templates.getAll()
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll()
  });

  const { data: generatedPDFs = [] } = useQuery({
    queryKey: ['generated-pdfs'],
    queryFn: () => db.generatedPDFs.getAll(10)
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => db.sections.getAll()
  });

  const activeTemplates = templates.filter(t => t.status === 'active').length;
  const totalGenerated = generatedPDFs.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            PDF Automation Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your PDF templates and Airtable integrations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Templates</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {templates.length}
                  </p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                  <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Active Templates</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {activeTemplates}
                  </p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Connections</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {connections.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Sections</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">
                    {sections.length}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-900 dark:text-slate-100">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to={createPageUrl('Templates')}>
                <Button className="w-full bg-teal-600 hover:bg-teal-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </Link>
              <Link to={createPageUrl('Connections')}>
                <Button variant="outline" className="w-full">
                  <Database className="h-4 w-4 mr-2" />
                  Manage Connections
                </Button>
              </Link>
              <Link to={createPageUrl('History')}>
                <Button variant="outline" className="w-full">
                  <Activity className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900 dark:text-slate-100">Recent PDFs Generated</CardTitle>
              <Link to={createPageUrl('History')}>
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {generatedPDFs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No PDFs generated yet</p>
                <p className="text-sm mt-2">Create a template to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {generatedPDFs.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {pdf.template_name || 'Unknown Template'}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {format(new Date(pdf.created_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${pdf.status === 'completed' || pdf.status === 'uploaded'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : pdf.status === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                        {pdf.status}
                      </span>
                      {pdf.pdf_url && (
                        <a
                          href={pdf.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:text-teal-700 dark:text-teal-400"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}