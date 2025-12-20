import React, { useState } from 'react';
import { ArrowLeft, Save, Eye, Settings, PenTool, Database, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EditorLayout({
    templateName,
    onSave,
    onPreview,
    isPreviewing,
    canPreview,
    isSaving,
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
                        <h1 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                            {templateName}
                        </h1>
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
                        className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                    >
                        <Save className="h-4 w-4 mr-1" />
                        {isSaving ? 'Saving...' : 'Save'}
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
