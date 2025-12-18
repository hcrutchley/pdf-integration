import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { db } from '../services/database';

const OrgContext = createContext();

export function OrgProvider({ children }) {
  const [user, setUser] = useState(null);
  const [contextType, setContextType] = useState('personal'); // 'personal' or 'organization'
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Load saved preferences
        const savedContext = localStorage.getItem('defaultContext');
        const savedOrgId = localStorage.getItem('defaultOrgId');
        
        if (savedContext) {
          setContextType(savedContext);
        }
        
        // Load organizations
        const orgs = await db.organizations.getAll();
        const userOrgs = orgs.filter(org => 
          org.owner_email === currentUser.email || 
          org.member_emails?.includes(currentUser.email)
        );
        setOrganizations(userOrgs);
        
        // Set selected org if context is organization
        if (savedContext === 'organization' && savedOrgId && userOrgs.length > 0) {
          const org = userOrgs.find(o => o.id === savedOrgId);
          setSelectedOrg(org || userOrgs[0]);
        } else if (savedContext === 'organization' && userOrgs.length > 0) {
          setSelectedOrg(userOrgs[0]);
        }
      } catch (error) {
        console.error('Failed to load user/orgs:', error);
      }
    };
    
    loadUser();
  }, []);

  const switchContext = (type, orgId = null) => {
    setContextType(type);
    if (type === 'organization' && orgId) {
      const org = organizations.find(o => o.id === orgId);
      setSelectedOrg(org);
    } else if (type === 'personal') {
      setSelectedOrg(null);
    }
  };

  const getContextFilter = () => {
    if (contextType === 'organization' && selectedOrg) {
      return { organization_id: selectedOrg.id };
    }
    return { organization_id: null };
  };

  const value = {
    user,
    contextType,
    selectedOrg,
    organizations,
    switchContext,
    getContextFilter
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrgContext must be used within OrgProvider');
  }
  return context;
}