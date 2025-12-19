import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      return { success: true };
    } else {
      try {
        const data = await res.json();
        return { success: false, error: data.error || 'Login failed' };
      } catch {
        return { success: false, error: 'Login failed' };
      }
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  const updateProfile = async (data) => {
    const res = await fetch('/api/auth/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (res.ok) {
      // Refresh user data if username changed
      if (data.newUsername) {
        setUser(prev => ({ ...prev, username: data.newUsername }));
      }
      return { success: true };
    } else {
      const error = await res.text(); // Could be JSON error object
      return { success: false, error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile, checkUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
