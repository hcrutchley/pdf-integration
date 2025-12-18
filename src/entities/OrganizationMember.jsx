{
  "name": "OrganizationMember",
  "type": "object",
  "properties": {
    "organization_id": {
      "type": "string",
      "description": "ID of the organization"
    },
    "user_email": {
      "type": "string",
      "description": "Email of the member"
    },
    "role": {
      "type": "string",
      "enum": [
        "owner",
        "member"
      ],
      "default": "member",
      "description": "Role within the organization"
    }
  },
  "required": [
    "organization_id",
    "user_email"
  ]
}