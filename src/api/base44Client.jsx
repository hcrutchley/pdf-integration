// Temporary stub for Base44 client so the app can run without Base44.
// Replace this with real API calls (Cloudflare Workers, etc.) later.

export const base44 = {
  // Very naive in-memory store per entity for local dev
  _store: {},

  get entities() {
    return new Proxy(
      {},
      {
        get: (_target, entityName) => {
          if (!this._store[entityName]) {
            this._store[entityName] = [];
          }
          const collection = this._store[entityName];

          return {
            async create(data) {
              const id = crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now()) + Math.random().toString(16).slice(2);
              const record = {
                id,
                ...data,
                created_date: new Date().toISOString(),
              };
              collection.push(record);
              return record;
            },
            async list(sortBy = '-created_date', limit = 100) {
              const sorted = [...collection].sort((a, b) => {
                const field = sortBy.replace(/^-/, '');
                const dir = sortBy.startsWith('-') ? -1 : 1;
                return a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0;
              });
              return sorted.slice(0, limit);
            },
            async filter(query, sortBy = '-created_date', limit = 100) {
              const filtered = collection.filter((item) =>
                Object.entries(query).every(([key, value]) => item[key] === value)
              );
              const sorted = [...filtered].sort((a, b) => {
                const field = sortBy.replace(/^-/, '');
                const dir = sortBy.startsWith('-') ? -1 : 1;
                return a[field] > b[field] ? dir : a[field] < b[field] ? -dir : 0;
              });
              return sorted.slice(0, limit);
            },
            async update(id, data) {
              const idx = collection.findIndex((item) => item.id === id);
              if (idx === -1) return null;
              collection[idx] = { ...collection[idx], ...data };
              return collection[idx];
            },
            async delete(id) {
              const idx = collection.findIndex((item) => item.id === id);
              if (idx === -1) return;
              collection.splice(idx, 1);
            },
            async bulkCreate(dataArray) {
              const created = [];
              for (const data of dataArray) {
                created.push(await this.create(data));
              }
              return created;
            },
          };
        },
      }
    );
  },

  auth: {
    async me() {
      // Fake user for local development
      return {
        id: 'demo-user',
        email: 'demo@example.com',
        name: 'Demo User',
      };
    },
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        // For now, just create a blob URL for preview.
        const url = URL.createObjectURL(file);
        return { file_url: url };
      },
      async InvokeLLM() {
        // No-op AI: return no detected fields
        return { fields: [] };
      },
      async ExtractDataFromUploadedFile() {
        return {};
      },
    },
  },
};


