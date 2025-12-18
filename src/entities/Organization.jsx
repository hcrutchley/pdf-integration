{
  "name": "Organization",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Organization name"
    },
    "owner_email": {
      "type": "string",
      "description": "Email of the organization owner"
    },
    "join_code": {
      "type": "string",
      "description": "Unique code for joining the organization"
    },
    "member_emails": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of member emails"
    }
  },
  "required": [
    "name",
    "owner_email",
    "join_code"
  ]
}