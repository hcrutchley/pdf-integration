{
  "name": "PDFTemplate",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Template name"
    },
    "section_id": {
      "type": "string",
      "description": "ID of the section this template belongs to"
    },
    "pdf_url": {
      "type": "string",
      "description": "URL of the uploaded PDF template"
    },
    "airtable_connection_id": {
      "type": "string",
      "description": "ID of the Airtable connection to use"
    },
    "airtable_base_id": {
      "type": "string",
      "description": "Airtable base ID"
    },
    "airtable_table_name": {
      "type": "string",
      "description": "Airtable table name"
    },
    "trigger_field": {
      "type": "string",
      "description": "Field to watch for triggering PDF generation"
    },
    "trigger_value": {
      "type": "string",
      "description": "Value that triggers PDF generation"
    },
    "output_field": {
      "type": "string",
      "description": "Airtable field to upload the generated PDF to"
    },
    "default_font": {
      "type": "string",
      "default": "Arial",
      "description": "Default font family"
    },
    "default_font_size": {
      "type": "number",
      "default": 12,
      "description": "Default font size in points"
    },
    "default_alignment": {
      "type": "string",
      "enum": [
        "left",
        "center",
        "right"
      ],
      "default": "left",
      "description": "Default text alignment"
    },
    "default_bold": {
      "type": "boolean",
      "default": false
    },
    "default_italic": {
      "type": "boolean",
      "default": false
    },
    "default_underline": {
      "type": "boolean",
      "default": false
    },
    "fields": {
      "type": "array",
      "description": "Detected and configured fields",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string"
          },
          "label": {
            "type": "string"
          },
          "x": {
            "type": "number",
            "description": "X position on PDF"
          },
          "y": {
            "type": "number",
            "description": "Y position on PDF"
          },
          "page": {
            "type": "number",
            "description": "Page number"
          },
          "width": {
            "type": "number"
          },
          "height": {
            "type": "number"
          },
          "airtable_field": {
            "type": "string",
            "description": "Mapped Airtable column name"
          },
          "font": {
            "type": "string"
          },
          "font_size": {
            "type": "number"
          },
          "alignment": {
            "type": "string"
          },
          "bold": {
            "type": "boolean"
          },
          "italic": {
            "type": "boolean"
          },
          "underline": {
            "type": "boolean"
          }
        }
      }
    },
    "guides": {
      "type": "object",
      "description": "Editor guides",
      "properties": {
        "vertical": {
          "type": "array",
          "items": {
            "type": "number"
          }
        },
        "horizontal": {
          "type": "array",
          "items": {
            "type": "number"
          }
        }
      }
    },
    "status": {
      "type": "string",
      "enum": [
        "draft",
        "active",
        "paused"
      ],
      "default": "draft"
    },
    "organization_id": {
      "type": "string",
      "description": "Organization ID if shared in an org, null for personal"
    }
  },
  "required": [
    "name"
  ]
}