import React from 'react';
import { FileText, Edit2, Trash2, Play, Pause, MoreVertical, FolderInput } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

import PDFCanvas from '../editor/PDFCanvas';

export default function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggleStatus,
  onMoveToFolder,
  sections = []
}) {
  const statusColors = {
    draft: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
  };

  return (
    <Card
      className="group hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-300 flex flex-col overflow-hidden"
      onClick={() => onEdit(template, true)}
    >
      {/* Thumbnail Preview */}
      <div className="relative w-full aspect-[1/1.2] bg-slate-100 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 overflow-hidden">
        {template.pdf_url ? (
          <div className="absolute inset-x-0 top-0 bottom-0 pointer-events-none">
            {/* Use a fixed scale that approximates thumbnail size. 
                 The container overflow-hidden will crop if needed, or we rely on CSS to fit.
                 pdf.js canvas doesn't auto-resize, so we use a reasonable static scale. */}
            <div className="w-full h-full flex justify-center bg-slate-100 dark:bg-slate-900">
              <PDFCanvas
                pdfUrl={template.pdf_url}
                scale={0.4}
                page={1}
              />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600" />
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />

        <div className="absolute top-3 right-3 flex gap-2">
          <Badge className={`${statusColors[template.status || 'draft']} shadow-sm`}>
            {template.status || 'draft'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 flex-1">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate text-lg">
              {template.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <FileText className="h-3 w-3" />
              {template.fields?.length || 0} fields
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Updated {format(new Date(template.updated_date), 'MMM d, yyyy')}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -mt-1 -mr-2 text-slate-400 hover:text-slate-600"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(template, true); }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Visual Editor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(template); }}>
                <Edit2 className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>

              {onMoveToFolder && sections.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger onClick={(e) => e.stopPropagation()}>
                      <FolderInput className="h-4 w-4 mr-2" />
                      Move to Folder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onMoveToFolder(template, null); }}
                        disabled={!template.section_id}
                      >
                        <span className="text-slate-500">No folder</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {sections.map(section => (
                        <DropdownMenuItem
                          key={section.id}
                          onClick={(e) => { e.stopPropagation(); onMoveToFolder(template, section.id); }}
                          disabled={template.section_id === section.id}
                        >
                          <span style={{ paddingLeft: `${(section.level || 0) * 12}px` }}>
                            {section.name}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus(template); }}>
                {template.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(template); }}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {template.airtable_table_name && (
          <div className="mt-3 text-xs bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 px-2 py-1 rounded inline-block truncate max-w-full">
            Table: {template.airtable_table_name}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          variant="outline"
          className="w-full text-xs h-8"
          onClick={(e) => { e.stopPropagation(); onEdit(template); }}
        >
          Configure
        </Button>
      </CardFooter>
    </Card>
  );
}
