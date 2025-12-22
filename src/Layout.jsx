import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  Shield,
  LogOut,
  User
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { ThemeProvider } from './components/theme/ThemeProvider';
import ThemeToggle from './components/common/ThemeToggle';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from './components/services/database';
import { Toaster, toast } from 'sonner';
import { OrgProvider, useOrgContext } from './components/context/OrgContext';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';


const ContextSwitcher = () => {
  const { contextType, selectedOrg, organizations, switchContext } = useOrgContext();

  return (
    <div className="space-y-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-9 px-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
                {contextType === 'personal' ? (
                  <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <span className="font-medium text-sm truncate max-w-[120px]">
                {contextType === 'personal' ? 'Personal' : 'Organization'}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px]">
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
            <Button variant="ghost" className="w-full justify-between h-8 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="truncate pl-8 text-slate-500">{selectedOrg?.name || 'Select Org'}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
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
    // { name: 'Admin Panel', icon: Shield, path: '/admin' }, // Hidden until admin features added
    { name: 'Settings', icon: Settings, path: createPageUrl('Settings') },
  ];


  return (
    <nav className="space-y-0.5">
      {navItems.map((item) => {
        const isActive = currentPageName === item.name || (item.name === 'Admin Panel' && currentPageName === 'Admin');
        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${isActive
              ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:translate-x-1'
              }`}
          >
            <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
            <span className="font-medium text-sm">{item.name}</span>
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

const UserMenu = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = base44.auth.getUser();

  const handleLogout = async () => {
    await base44.auth.logout();
    queryClient.clear();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <div className="p-3 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-3 px-1">
        <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center ring-2 ring-white dark:ring-slate-800 shadow-sm">
          <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {user?.name || user?.username || 'User'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {user?.email || ''}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleLogout}
        className="w-full justify-center gap-2 h-8 text-xs hover:bg-white dark:hover:bg-slate-800"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign Out
      </Button>
    </div>
  );
};

function LayoutContent({ children, currentPageName }) {
  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      {/* Sidebar - Compact & Glassmorphic */}
      <div className="w-60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-800/60 flex flex-col shadow-[1px_0_20px_0_rgba(0,0,0,0.05)] z-20">
        {/* Logo/Brand */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-3 px-1">
            <div className="p-1.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg shadow-lg shadow-teal-500/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                PDF Auto
              </h1>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                Integration
              </p>
            </div>
          </div>
        </div>

        {/* Context Switcher */}
        <div className="p-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <ContextSwitcher />
        </div>

        {/* Navigation */}
        <div className="flex-1 p-3 overflow-y-auto custom-scrollbar">
          <Navigation currentPageName={currentPageName} />
        </div>

        {/* Polling Indicator */}
        <div className="px-3 pb-2">
          <PollingIndicator />
        </div>

        {/* Theme Toggle */}
        <div className="px-3 py-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Appearance</span>
            <ThemeToggle />
          </div>
        </div>

        {/* User Info & Logout */}
        <UserMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative bg-slate-50 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        <div className="relative">
          {children}
        </div>
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