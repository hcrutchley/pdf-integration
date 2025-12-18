{
  "name": "PollingConfig",
  "type": "object",
  "properties": {
    "enabled": {
      "type": "boolean",
      "default": false,
      "description": "Whether polling is enabled"
    },
    "interval_minutes": {
      "type": "number",
      "default": 5,
      "description": "How often to poll in minutes"
    },
    "last_poll_time": {
      "type": "string",
      "format": "date-time",
      "description": "Last time polling was executed"
    }
  },
  "required": []
}