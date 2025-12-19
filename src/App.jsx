import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './Layout';
import Dashboard from './pages/Dashboard';
import Templates from './pages/Templates';
import TemplateEditor from './pages/TemplateEditor';
import Connections from './pages/Connections';
import Generate from './pages/Generate';
import History from './pages/History';
import Organizations from './pages/Organizations';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Admin from './pages/Admin';
import AuthGuard from './components/auth/AuthGuard';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Layout currentPageName="Dashboard">
                  <Dashboard />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/templates"
            element={
              <AuthGuard>
                <Layout currentPageName="Templates">
                  <Templates />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/template-editor"
            element={
              <AuthGuard>
                <Layout currentPageName="TemplateEditor">
                  <TemplateEditor />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/connections"
            element={
              <AuthGuard>
                <Layout currentPageName="Connections">
                  <Connections />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/generate"
            element={
              <AuthGuard>
                <Layout currentPageName="Generate">
                  <Generate />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/history"
            element={
              <AuthGuard>
                <Layout currentPageName="History">
                  <History />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/organizations"
            element={
              <AuthGuard>
                <Layout currentPageName="Organizations">
                  <Organizations />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Layout currentPageName="Settings">
                  <Settings />
                </Layout>
              </AuthGuard>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <Layout currentPageName="Admin">
                  <Admin />
                </Layout>
              </AuthGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
