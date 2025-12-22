// Auth client for the PDF Integration app
// Handles login, signup, logout, and session management

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const base44 = {
  auth: {
    // Get stored token
    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },

    // Get stored user
    getUser() {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    },

    // Store auth data
    setAuth(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    // Clear auth data and all user-specific preferences
    clearAuth() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Clear org context to prevent data leakage between accounts
      localStorage.removeItem('defaultContext');
      localStorage.removeItem('defaultOrgId');
    },

    // Check if user is authenticated
    isAuthenticated() {
      return !!this.getToken();
    },

    // Login with username/password
    async login(username, password) {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      this.setAuth(data.token, data.user);
      return data.user;
    },

    // Signup with username/email/password
    async signup(username, email, password) {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Signup failed');
      }

      const data = await res.json();
      this.setAuth(data.token, data.user);
      return data.user;
    },

    // Logout
    async logout() {
      const token = this.getToken();
      if (token) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
        } catch (e) {
          // Ignore logout errors
        }
      }
      this.clearAuth();
    },

    // Get current user from server (validates session)
    async me() {
      const token = this.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        this.clearAuth();
        throw new Error('Session expired');
      }

      const user = await res.json();
      // Update stored user data
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    },
  },

  // Stub for entities (not used anymore, db service calls API directly)
  entities: new Proxy({}, {
    get: () => ({
      create: async () => { throw new Error('Use db service instead'); },
      list: async () => { throw new Error('Use db service instead'); },
      filter: async () => { throw new Error('Use db service instead'); },
      update: async () => { throw new Error('Use db service instead'); },
      delete: async () => { throw new Error('Use db service instead'); },
    }),
  }),

  // Stub for integrations
  integrations: {
    Core: {
      async UploadFile({ file }) {
        const url = URL.createObjectURL(file);
        return { file_url: url };
      },
      async InvokeLLM() {
        return { fields: [] };
      },
      async ExtractDataFromUploadedFile() {
        return {};
      },
    },
  },
};
