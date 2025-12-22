/**
 * DATABASE SERVICE - now calls your own API instead of Base44.
 */

import { apiRequest } from "@/api/client";

export const db = {
  // Generic CRUD operations
  async create(entityName, data) {
    return apiRequest(`/api/entities/${entityName}`, {
      method: "POST",
      body: data,
    });
  },

  async get(entityName, id) {
    return apiRequest(`/api/entities/${entityName}?id=${encodeURIComponent(id)}`);
  },

  async list(entityName, sortBy = "-created_date", limit = 100) {
    const params = new URLSearchParams();
    params.set("sort", sortBy);
    params.set("limit", String(limit));
    return apiRequest(`/api/entities/${entityName}?${params.toString()}`);
  },

  async filter(entityName, query, sortBy = "-created_date", limit = 100) {
    const params = new URLSearchParams();
    params.set("sort", sortBy);
    params.set("limit", String(limit));
    params.set("where", JSON.stringify(query));
    return apiRequest(`/api/entities/${entityName}?${params.toString()}`);
  },

  async update(entityName, id, data) {
    return apiRequest(
      `/api/entities/${entityName}?id=${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: data,
      }
    );
  },

  async delete(entityName, id) {
    return apiRequest(
      `/api/entities/${entityName}?id=${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      }
    );
  },

  async bulkCreate(entityName, dataArray) {
    return apiRequest(`/api/entities/${entityName}?bulk=1`, {
      method: "POST",
      body: { items: dataArray },
    });
  },

  // Entity-specific helpers (same API as before)
  templates: {
    async getAll() {
      return await db.list("PDFTemplate", "-updated_date");
    },
    async get(id) {
      return await db.get("PDFTemplate", id);
    },
    async getBySection(sectionId) {
      return await db.filter("PDFTemplate", { section_id: sectionId });
    },
    async create(data) {
      return await db.create("PDFTemplate", data);
    },
    async update(id, data) {
      return await db.update("PDFTemplate", id, data);
    },
    async delete(id) {
      return await db.delete("PDFTemplate", id);
    },
  },

  connections: {
    async getAll() {
      return await db.list("AirtableConnection", "-created_date");
    },
    async create(data) {
      return await db.create("AirtableConnection", data);
    },
    async update(id, data) {
      return await db.update("AirtableConnection", id, data);
    },
    async delete(id) {
      return await db.delete("AirtableConnection", id);
    },
  },

  sections: {
    async getAll() {
      return await db.list("Section", "order");
    },
    async create(data) {
      return await db.create("Section", data);
    },
    async update(id, data) {
      return await db.update("Section", id, data);
    },
    async delete(id) {
      return await db.delete("Section", id);
    },
  },

  generatedPDFs: {
    async getAll(limit = 50) {
      return await db.list("GeneratedPDF", "-created_date", limit);
    },
    async getByTemplate(templateId) {
      return await db.filter(
        "GeneratedPDF",
        { template_id: templateId },
        "-created_date"
      );
    },
    async create(data) {
      return await db.create("GeneratedPDF", data);
    },
    async update(id, data) {
      return await db.update("GeneratedPDF", id, data);
    },
  },

  pollingConfig: {
    async get() {
      const configs = await db.list("PollingConfig", "-created_date", 1);
      return configs[0] || null;
    },
    async createOrUpdate(data) {
      const existing = await this.get();
      if (existing) {
        return await db.update("PollingConfig", existing.id, data);
      }
      return await db.create("PollingConfig", data);
    },
  },

  organizations: {
    async getAll() {
      return await db.list("Organization", "-created_date");
    },
    async create(data) {
      return await db.create("Organization", data);
    },
    async update(id, data) {
      return await db.update("Organization", id, data);
    },
    async delete(id) {
      return await db.delete("Organization", id);
    },
    async join(code) {
      return apiRequest("/api/organizations/join", {
        method: "POST",
        body: { code },
      });
    },
  },
};
