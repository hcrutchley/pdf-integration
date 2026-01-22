import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * PDF GENERATION SERVICE - Handles PDF creation and field filling
 */

export const pdfService = {
  /**
   * Generate a PDF with filled fields
   * @param {string} templateUrl - URL of the template PDF
   * @param {Array} fields - Array of field configurations
   * @param {object} data - Data to fill into the fields
   * @returns {Promise<Blob>} Generated PDF as a Blob
   */
  async generatePDF(templateUrl, fields, data) {
    try {
      // Fetch and load the original PDF
      const response = await fetch(templateUrl);
      const arrayBuffer = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Load fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const courier = await pdfDoc.embedFont(StandardFonts.Courier);

      const pages = pdfDoc.getPages();

      // Draw each field on the PDF
      for (const field of fields) {
        const pageIndex = (field.page || 1) - 1;
        if (pageIndex >= pages.length) continue;

        const page = pages[pageIndex];
        const { height: pageHeight } = page.getSize();

        // Get field value - handle special values first
        let value;
        if (field.special_value) {
          if (field.special_value === 'today') {
            value = new Date().toLocaleDateString();
          } else if (field.special_value === 'yesterday') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            value = yesterday.toLocaleDateString();
          } else if (field.special_value === 'tomorrow') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            value = tomorrow.toLocaleDateString();
          } else if (field.special_value === 'custom') {
            value = field.custom_text || '';
          }
        } else if (field.airtable_field && data[field.airtable_field]) {
          value = data[field.airtable_field];
          if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
        } else {
          continue; // Skip fields without data or special value
        }

        value = String(value || '');

        // Select font based on style
        let font = helveticaFont;
        if (field.font === 'Times') {
          if (field.bold && field.italic) font = timesItalic;
          else if (field.bold) font = timesBold;
          else if (field.italic) font = timesItalic;
          else font = timesFont;
        } else if (field.font === 'Courier') {
          font = courier;
        } else {
          if (field.bold && field.italic) font = helveticaBoldOblique;
          else if (field.bold) font = helveticaBold;
          else if (field.italic) font = helveticaOblique;
          else font = helveticaFont;
        }

        const fontSize = field.font_size || 12;

        // Padding constants for consistent spacing
        const PADDING_X = 3; // Horizontal padding from edges
        const PADDING_Y = 2; // Vertical padding from edges

        // Field dimensions
        const fieldX = field.x || 0;
        const fieldY = field.y || 0;
        const fieldWidth = field.width || 100;
        const fieldHeight = field.height || fontSize + PADDING_Y * 2;

        // Calculate text width for alignment
        const textWidth = font.widthOfTextAtSize(value, fontSize);
        const textHeight = fontSize; // Approximate text height

        // Calculate horizontal position based on alignment
        let textX;
        if (field.alignment === 'center') {
          textX = fieldX + (fieldWidth / 2) - (textWidth / 2);
        } else if (field.alignment === 'right') {
          textX = fieldX + fieldWidth - textWidth - PADDING_X;
        } else {
          // Left alignment (default)
          textX = fieldX + PADDING_X;
        }

        // Calculate vertical position
        // PDF coordinates: Y=0 is at bottom, increases upward
        // Canvas coordinates: Y=0 is at top, increases downward
        // We want text vertically centered in the field box
        const fieldBottom = pageHeight - fieldY - fieldHeight;
        const textY = fieldBottom + (fieldHeight / 2) - (textHeight / 2) + PADDING_Y;

        // Draw the text
        page.drawText(value, {
          x: textX,
          y: textY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      // Save the PDF
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  },

  /**
   * Convert PDF to images for preview
   * @param {string} pdfUrl - URL of the PDF
   * @returns {Promise<Array<string>>} Array of data URLs for each page
   */
  async pdfToImages(pdfUrl) {
    // This would use PDF.js or similar library
    // For now, return empty array as placeholder
    return [];
  },

  /**
   * Get PDF page count
   */
  async getPageCount(pdfUrl) {
    // Use PDF.js to get page count
    return 1; // Placeholder
  }
};