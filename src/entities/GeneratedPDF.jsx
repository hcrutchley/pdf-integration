{
  "name": "GeneratedPDF",
  "type": "object",
  "properties": {
    "template_id": {
      "type": "string",
      "description": "ID of the PDF template used"
    },
    "template_name": {
      "type": "string",
      "description": "Name of the template (cached)"
    },
    "airtable_record_id": {
      "type": "string",
      "description": "Airtable record ID this was generated for"
    },
    "pdf_url": {
      "type": "string",
      "description": "URL of the generated PDF"
    },
    "status": {
      "type": "string",
      "enum": [
        "generating",
        "completed",
        "failed",
        "uploaded"
      ],
      "default": "generating"
    },
    "error_message": {
      "type": "string",
      "description": "Error details if failed"
    },
    "data_snapshot": {
      "type": "object",
      "description": "Snapshot of the data used to generate the PDF"
    }
  },
  "required": [
    "template_id",
    "airtable_record_id"
  ]
}