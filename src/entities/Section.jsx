{
  "name": "Section",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Section name"
    },
    "parent_id": {
      "type": "string",
      "description": "Parent section ID for hierarchy, null for root"
    },
    "order": {
      "type": "number",
      "description": "Display order within parent",
      "default": 0
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