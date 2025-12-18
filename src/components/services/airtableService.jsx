/**
 * AIRTABLE SERVICE - Pure Airtable API integration
 * 
 * NO BASE44 DEPENDENCY - This uses standard Airtable REST API
 * Completely portable to any JavaScript environment
 */

export const airtableService = {
  /**
   * Get all bases accessible with the API key
   */
  async getBases(apiKey) {
    const response = await fetch('https://api.airtable.com/v0/meta/bases', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    return data.bases || [];
  },

  /**
   * Get schema for a specific base
   */
  async getBaseSchema(apiKey, baseId) {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch base schema: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.tables || [];
  },

  /**
   * Get records from a table
   */
  async getRecords(apiKey, baseId, tableName, options = {}) {
    const { filterByFormula, sort, maxRecords = 100, view } = options;
    
    const params = new URLSearchParams();
    if (filterByFormula) params.append('filterByFormula', filterByFormula);
    if (maxRecords) params.append('maxRecords', maxRecords.toString());
    if (view) params.append('view', view);
    if (sort) {
      sort.forEach((s, i) => {
        params.append(`sort[${i}][field]`, s.field);
        params.append(`sort[${i}][direction]`, s.direction || 'asc');
      });
    }
    
    const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?${params}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch records: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.records || [];
  },

  /**
   * Get a single record by ID
   */
  async getRecord(apiKey, baseId, tableName, recordId) {
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch record: ${response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * Update a record
   */
  async updateRecord(apiKey, baseId, tableName, recordId, fields) {
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to update record: ${response.statusText}`);
    }
    
    return await response.json();
  },

  /**
   * Upload attachment to Airtable
   */
  async uploadAttachment(apiKey, baseId, tableName, recordId, attachmentField, fileUrl, filename) {
    const fields = {
      [attachmentField]: [
        {
          url: fileUrl,
          filename: filename
        }
      ]
    };
    
    return await this.updateRecord(apiKey, baseId, tableName, recordId, fields);
  },

  /**
   * Test connection validity
   */
  async testConnection(apiKey) {
    try {
      await this.getBases(apiKey);
      return { valid: true, error: null };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
};