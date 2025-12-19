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
    const stats = [
        { label: 'Total Users', value: '1,234', icon: Users, change: '+12%', color: 'bg-blue-500' },
        { label: 'Active Templates', value: '56', icon: FileText, change: '+3', color: 'bg-green-500' },
        { label: 'System Load', value: '24%', icon: Activity, change: '-2%', color: 'bg-orange-500' },
        { label: 'Storage Used', value: '45.2 GB', icon: Database, change: '+1.5 GB', color: 'bg-purple-500' }
    ];

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

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <div key={index} className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10 dark:bg-opacity-20`}>
                                        <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                                    </div>
                                    <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {stat.change}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {stat.value}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {stat.label}
                                </p>
                            </div>
                        );
                    })}
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
                                <Button variant="ghost" size="sm">View All</Button>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-4">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                                System backup completed
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                2 hours ago • Automated
                                            </p>
                                        </div>
                                    </div>
                                ))}
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
                                <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50">
                                    <AlertTriangle className="w-4 h-4 mr-2" /> System Reset
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
