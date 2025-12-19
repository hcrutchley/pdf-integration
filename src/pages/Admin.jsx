import React from 'react';
import {
    Users,
    Settings,
    Shield,
    Activity,
    Database,
    FileText,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Admin() {


    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Admin Console
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            System overview and configuration
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline">
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Button>
                        <Button className="bg-slate-900 text-white hover:bg-slate-800">
                            <Shield className="w-4 h-4 mr-2" />
                            Security Audit
                        </Button>
                    </div>
                </div>

                {/* Stats Grid - Empty State */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700">
                                <Activity className="w-6 h-6 text-slate-500" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                            --
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Active stats pending
                        </p>
                    </div>
                </div>

                {/* System Health & Logs Placeholder */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Recent Activities
                                </h2>
                            </div>
                            <div className="p-12 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                                    <Activity className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">No recent activity</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                    System logs and user actions will appear here.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar / Configuration */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                                Quick Actions
                            </h2>
                            <div className="space-y-3">
                                <Button variant="outline" className="w-full justify-start">
                                    <Users className="w-4 h-4 mr-2" /> Manage Users
                                </Button>
                                <Button variant="outline" className="w-full justify-start">
                                    <Database className="w-4 h-4 mr-2" /> Database Maintenance
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
