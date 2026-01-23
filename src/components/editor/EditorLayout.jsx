import React, { useState } from 'react';
import { ArrowLeft, Save, Eye, Settings, PenTool, Database, Zap, ChevronDown, ChevronRight, Download, Upload, Rocket, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EditorLayout({
    templateName,
    onSave,
    onPreview,
    onExport,
    onPublish,
    onDiscardDraft,
    isPreviewing,
    canPreview,
    isSaving,
    isExporting,
    isPublishing,
    hasUnpublishedChanges,
    publishedAt,
    children,
    // Settings drawer toggle
    onSettingsToggle,
    settingsOpen
}) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Premium App Shell Header */}
            <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm shrink-0 z-50">

                {/* Left: Navigation & Context */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 h-8 w-8"
                        onClick={() => navigate(createPageUrl('Templates'))}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Template</span>
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                                {templateName}
                            </h1>
                            {hasUnpublishedChanges && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                                    Draft
                                </Badge>
                            )}
                            {!hasUnpublishedChanges && publishedAt && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                                    Live
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center: Mode indicator */}
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <PenTool className="h-4 w-4 text-teal-500" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Design Mode</span>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onSettingsToggle}
                        className={cn(
                            "text-slate-500",
                            settingsOpen && "bg-slate-100 dark:bg-slate-800 text-teal-600"
                        )}
                    >
                        <Settings className="h-4 w-4 mr-1" />
                        Settings
                    </Button>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
                    <Button
                        variant="ghost"
                        onClick={onExport}
                        disabled={isExporting}
                        size="sm"
                        className="text-slate-500"
                    >
                        <Download className="h-4 w-4 mr-1" />
                        {isExporting ? 'Exporting...' : 'Export'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onPreview}
                        disabled={!canPreview || isPreviewing}
                        size="sm"
                    >
                        {isPreviewing ? 'Generating...' : (
                            <>
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={isSaving}
                        size="sm"
                        variant="outline"
                    >
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? 'Saving...' : 'Save Draft'}
                    </Button>

                    {/* Publish Button */}
                    <Button
                        onClick={onPublish}
                        disabled={isPublishing || !hasUnpublishedChanges}
                        size="sm"
                        className={cn(
                            "shadow-sm",
                            hasUnpublishedChanges
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-slate-200 text-slate-500"
                        )}
                    >
                        <Rocket className="h-4 w-4 mr-1" />
                        {isPublishing ? 'Publishing...' : 'Publish'}
                    </Button>
                </div>
            </header>

            {/* Draft Warning Banner */}
            {hasUnpublishedChanges && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <AlertCircle className="h-4 w-4" />
                        <span>You have unpublished changes. Click <strong>Publish</strong> to make them live.</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDiscardDraft}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    >
                        Discard Changes
                    </Button>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}

// Accordion Section Component for Settings Panel
export function AccordionSection({ title, icon: Icon, defaultOpen = false, children, badge }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-slate-400" />}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</span>
                    {badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4">
                    {children}
                </div>
            )}
        </div>
    );
}
