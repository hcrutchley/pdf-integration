// Template Export/Import Service
// Handles packaging templates with PDFs for cross-environment sharing

/**
 * Export a template with its PDF as a .airpdf file
 * @param {Object} template - Template object from database
 * @param {string} pdfUrl - URL to the PDF file
 * @returns {Promise<void>} Downloads the .airpdf file
 */
export async function exportTemplate(template, pdfUrl) {
    try {
        // Fetch the PDF
        const pdfResponse = await fetch(pdfUrl);
        if (!pdfResponse.ok) throw new Error('Failed to fetch PDF');

        const pdfBlob = await pdfResponse.blob();
        const base64Pdf = await blobToBase64(pdfBlob);

        // Package the data
        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            template: {
                name: template.name,
                fields: template.fields || [],
                guides: template.guides || { vertical: [], horizontal: [] },
                // Airtable connection info (for remapping)
                airtable_base_id: template.airtable_base_id,
                airtable_table_name: template.airtable_table_name,
                // Automation settings
                trigger_field: template.trigger_field,
                trigger_value: template.trigger_value,
                output_field: template.output_field,
                // Default styles
                default_font: template.default_font,
                default_font_size: template.default_font_size,
                default_alignment: template.default_alignment,
                default_bold: template.default_bold,
                default_italic: template.default_italic,
                default_underline: template.default_underline,
            },
            pdf: base64Pdf
        };

        // Create and download the file
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${sanitizeFilename(template.name)}.airpdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
}

/**
 * Parse an uploaded .airpdf file
 * @param {File} file - The uploaded .airpdf file
 * @returns {Promise<Object>} Parsed export data
 */
export async function parseImportFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                // Validate structure
                if (!data.version || !data.template || !data.pdf) {
                    throw new Error('Invalid .airpdf file format');
                }

                resolve(data);
            } catch (error) {
                reject(new Error('Failed to parse file: ' + error.message));
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Import template - Full mode (creates new template with PDF)
 * @param {Object} exportData - Parsed export data
 * @param {string} connectionId - New connection ID to map to
 * @param {Function} uploadPdfFn - Async function to upload PDF and return URL
 * @returns {Promise<Object>} New template data ready for database
 */
export async function importTemplateFull(exportData, connectionId, uploadPdfFn) {
    try {
        // Decode PDF from base64
        const pdfBlob = base64ToBlob(exportData.pdf, 'application/pdf');

        // Upload PDF to storage
        const pdfUrl = await uploadPdfFn(pdfBlob);

        // Create new template object
        const newTemplate = {
            ...exportData.template,
            id: `template_${Date.now()}`,
            airtable_connection_id: connectionId,
            pdf_url: pdfUrl,
            status: 'draft', // Start as draft
            created_date: new Date().toISOString(),
        };

        return newTemplate;
    } catch (error) {
        console.error('Full import failed:', error);
        throw error;
    }
}

/**
 * Import template - Fields only mode (updates existing template)
 * @param {Object} exportData - Parsed export data
 * @param {Object} existingTemplate - Existing template to update
 * @returns {Object} Updated template data
 */
export function importTemplateFieldsOnly(exportData, existingTemplate) {
    return {
        ...existingTemplate,
        fields: exportData.template.fields,
        guides: exportData.template.guides,
        default_font: exportData.template.default_font,
        default_font_size: exportData.template.default_font_size,
        default_alignment: exportData.template.default_alignment,
        default_bold: exportData.template.default_bold,
        default_italic: exportData.template.default_italic,
        default_underline: exportData.template.default_underline,
    };
}

/**
 * Import template - Update PDF mode (replaces PDF only)
 * @param {Object} exportData - Parsed export data
 * @param {Object} existingTemplate - Existing template to update
 * @param {Function} uploadPdfFn - Async function to upload PDF and return URL
 * @returns {Promise<Object>} Updated template data
 */
export async function importTemplatePdfUpdate(exportData, existingTemplate, uploadPdfFn) {
    try {
        // Decode and upload new PDF
        const pdfBlob = base64ToBlob(exportData.pdf, 'application/pdf');
        const pdfUrl = await uploadPdfFn(pdfBlob);

        return {
            ...existingTemplate,
            pdf_url: pdfUrl,
        };
    } catch (error) {
        console.error('PDF update failed:', error);
        throw error;
    }
}

// Helper functions
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result.split(',')[1]; // Remove data:mime;base64, prefix
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}
