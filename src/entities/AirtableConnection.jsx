{
  "name": "AirtableConnection",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Connection name"
    },
    "api_key": {
      "type": "string",
      "description": "Airtable Personal Access Token"
    },
    "status": {
      "type": "string",
      "enum": [
        "active",
        "inactive"
      ],
      "default": "active"
    },
    "is_default": {
      "type": "boolean",
      "default": false,
      "description": "Use as default connection for new templates"
    },
    "default_base_id": {
      "type": "string",
      "description": "Default Airtable base ID"
    },
    "default_table_name": {
      "type": "string",
      "description": "Default Airtable table name"
    },
    "organization_id": {
      "type": "string",
      "description": "Organization ID if shared in an org, null for personal"
    }
  },
  "required": [
    "name",
    "api_key"
  ]
}