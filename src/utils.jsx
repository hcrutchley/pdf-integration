// Simple route helper used across the app
// Maps logical page names to URL paths for React Router

const routes = {
  Dashboard: '/',
  Templates: '/templates',
  TemplateEditor: '/template-editor',
  Connections: '/connections',
  Generate: '/generate',
  History: '/history',
  Organizations: '/organizations',
  Settings: '/settings',
};

export function createPageUrl(name) {
  return routes[name] || '/';
}


