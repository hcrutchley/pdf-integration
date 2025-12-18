/**
 * AI SERVICE - Abstraction layer for AI operations
 * 
 * BASE44 DEPENDENCY: Uses base44 InvokeLLM integration
 * TO MAKE PORTABLE: Replace with OpenAI API, Anthropic API, or other LLM service
 */

import { base44 } from '@/api/base44Client';

export const aiService = {
  /**
   * Detect fillable fields in a PDF using AI
   * @param {string} pdfUrl - URL of the PDF file
   * @returns {Promise<Array>} Array of detected fields with positions
   */
  async detectPDFFields(pdfUrl) {
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this PDF form and identify all fillable fields (text input areas, checkboxes, signature fields, etc.).
      
For each field, provide:
- A descriptive label/name for the field
- The approximate position on the page (x, y coordinates as percentages of page width/height)
- The page number (starting at 1)
- Approximate width and height (as percentages)
- Field type (text, checkbox, signature, date, etc.)

Return a comprehensive list of ALL fields you can identify in the document.`,
      file_urls: [pdfUrl],
      response_json_schema: {
        type: "object",
        properties: {
          fields: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                x: { type: "number" },
                y: { type: "number" },
                page: { type: "number" },
                width: { type: "number" },
                height: { type: "number" },
                type: { type: "string" }
              }
            }
          }
        }
      }
    });

    return response.fields || [];
  },

  /**
   * Extract data from an uploaded file
   * @param {string} fileUrl - URL of the file
   * @param {object} jsonSchema - Expected JSON schema for extraction
   * @returns {Promise<object>} Extracted data
   */
  async extractDataFromFile(fileUrl, jsonSchema) {
    return await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: jsonSchema
    });
  }
};