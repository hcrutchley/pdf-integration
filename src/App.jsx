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
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout currentPageName="Dashboard">
                <Dashboard />
              </Layout>
            }
          />
          <Route
            path="/templates"
            element={
              <Layout currentPageName="Templates">
                <Templates />
              </Layout>
            }
          />
          <Route
            path="/template-editor"
            element={
              <Layout currentPageName="TemplateEditor">
                <TemplateEditor />
              </Layout>
            }
          />
          <Route
            path="/connections"
            element={
              <Layout currentPageName="Connections">
                <Connections />
              </Layout>
            }
          />
          <Route
            path="/generate"
            element={
              <Layout currentPageName="Generate">
                <Generate />
              </Layout>
            }
          />
          <Route
            path="/history"
            element={
              <Layout currentPageName="History">
                <History />
              </Layout>
            }
          />
          <Route
            path="/organizations"
            element={
              <Layout currentPageName="Organizations">
                <Organizations />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout currentPageName="Settings">
                <Settings />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

