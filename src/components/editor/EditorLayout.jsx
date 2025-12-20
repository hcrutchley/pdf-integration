import React from 'react';
import { ArrowLeft, Save, Eye, Settings, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EditorLayout({
    templateName,
    activeTab,
    onTabChange,
    onSave,
    onPreview,
    isPreviewing,
    canPreview,
    isSaving,
    children
}) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Premium App Shell Header */}
            <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shadow-sm shrink-0 z-50">

                {/* Left: Navigation & Context */}
                <div className="flex items-center gap-4 w-1/4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        onClick={() => navigate(createPageUrl('Templates'))}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Template</span>
                        <h1 className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                            {templateName}
                        </h1>
                    </div>
                </div>

                {/* Center: Segmented Control */}
                <div className="flex-1 flex justify-center">
                    <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center shadow-inner">
                        <button
                            onClick={() => onTabChange('settings')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTab === 'settings'
                                    ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                        >
                            <Settings className="h-4 w-4" />
                            Settings
                        </button>
                        <button
                            onClick={() => onTabChange('design')}
                            className={cn(
                                "flex items-center gap-2 px-6 py-1.5 rounded-md text-sm font-medium transition-all",
                                activeTab === 'design'
                                    ? "bg-white dark:bg-slate-700 text-teal-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            )}
                        >
                            <PenTool className="h-4 w-4" />
                            Design
                        </button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-2 w-1/4">
                    <Button
                        variant="outline"
                        onClick={onPreview}
                        disabled={!canPreview || isPreviewing}
                        className="hidden sm:flex"
                        size="sm"
                    >
                        {isPreviewing ? 'Generating...' : (
                            <>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={onSave}
                        disabled={isSaving}
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
