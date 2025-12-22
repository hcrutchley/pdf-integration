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
      className="group hover:shadow-lg transition-all cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-300"
      onClick={() => onEdit(template, true)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-900/30">
              <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {template.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {template.fields?.length || 0} fields configured
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Updated {format(new Date(template.updated_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100"
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

        <div className="space-y-2">
          <Badge className={statusColors[template.status || 'draft']}>
            {template.status || 'draft'}
          </Badge>
          {template.airtable_table_name && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Table: {template.airtable_table_name}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          className="w-full"
          onClick={(e) => { e.stopPropagation(); onEdit(template); }}
        >
          <Edit2 className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </CardFooter>
    </Card>
  );
}
