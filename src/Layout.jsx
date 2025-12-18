import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Database, 
  History, 
  Settings, 
  Play,
  FileStack,
  Users,
  Building2,
  ChevronDown
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { ThemeProvider } from './components/theme/ThemeProvider';
import ThemeToggle from './components/common/ThemeToggle';
import { useQuery } from '@tanstack/react-query';
import { db } from './components/services/database';
import { Toaster } from 'sonner';
import { OrgProvider, useOrgContext } from './components/context/OrgContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ContextSwitcher = () => {
  const { contextType, selectedOrg, organizations, switchContext } = useOrgContext();

  return (
    <div className="space-y-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              {contextType === 'personal' ? (
                <Users className="h-4 w-4" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <span className="font-medium">
                {contextType === 'personal' ? 'Personal' : 'Organization'}
              </span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[232px]">
          <DropdownMenuItem onClick={() => switchContext('personal')}>
            <Users className="h-4 w-4 mr-2" />
            Personal
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchContext('organization', organizations[0]?.id)}>
            <Building2 className="h-4 w-4 mr-2" />
            Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {contextType === 'organization' && organizations.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between text-sm">
              <span className="truncate">{selectedOrg?.name || 'Select Org'}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[232px]">
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchContext('organization', org.id)}
              >
                {org.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};

const Navigation = ({ currentPageName }) => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: createPageUrl('Dashboard') },
    { name: 'Templates', icon: FileStack, path: createPageUrl('Templates') },
    { name: 'Generate', icon: Play, path: createPageUrl('Generate') },
    { name: 'Connections', icon: Database, path: createPageUrl('Connections') },
    { name: 'Organizations', icon: Users, path: createPageUrl('Organizations') },
    { name: 'History', icon: History, path: createPageUrl('History') },
    { name: 'Settings', icon: Settings, path: createPageUrl('Settings') },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const isActive = currentPageName === item.name;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-teal-600 text-white'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
};

const PollingIndicator = () => {
  const { data: pollingConfig } = useQuery({
    queryKey: ['polling-config'],
    queryFn: () => db.pollingConfig.get(),
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.templates.getAll(),
    enabled: pollingConfig?.enabled
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: () => db.connections.getAll(),
    enabled: pollingConfig?.enabled
  });

  // Polling logic
  useEffect(() => {
    if (!pollingConfig?.enabled) return;

    const interval = setInterval(async () => {
      console.log('Polling for new records...');
      
      const activeTemplates = templates.filter(t => 
        t.status === 'active' &&
        t.airtable_connection_id &&
        t.trigger_field &&
        t.trigger_value
      );

      // Update last poll time
      await db.pollingConfig.createOrUpdate({
        ...pollingConfig,
        last_poll_time: new Date().toISOString()
      });

      // TODO: Check each template for new records and generate PDFs
      // This would involve fetching from Airtable and generating PDFs
      // Implementation left as a TODO since it requires the full generation logic
      
    }, (pollingConfig.interval_minutes || 5) * 60 * 1000);

    return () => clearInterval(interval);
  }, [pollingConfig, templates, connections]);

  if (!pollingConfig?.enabled) return null;

  return (
    <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-sm font-medium text-green-900 dark:text-green-100">
          Auto-polling active
        </span>
      </div>
      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
        Checking every {pollingConfig.interval_minutes} min
      </p>
    </div>
  );
};

function LayoutContent({ children, currentPageName }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-600 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                PDF Automation
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Airtable Integration
              </p>
            </div>
          </div>
        </div>

        {/* Context Switcher */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <ContextSwitcher />
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          <Navigation currentPageName={currentPageName} />
        </div>

          {/* Polling Indicator */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <PollingIndicator />
          </div>

          {/* Theme Toggle */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <ThemeProvider>
      <OrgProvider>
        <Toaster position="top-right" />
        <LayoutContent currentPageName={currentPageName}>
          {children}
        </LayoutContent>
      </OrgProvider>
    </ThemeProvider>
  );
}