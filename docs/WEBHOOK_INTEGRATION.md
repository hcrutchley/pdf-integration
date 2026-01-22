# PDFit Webhook Integration Guide

Generate PDFs via webhook from Airtable automations using user-specific webhook URLs.

## Creating a Webhook

1. Go to **Settings** in PDFit
2. Scroll to the **Webhooks** section
3. Enter a name (e.g., "ReadyFund Production")
4. Click **Create**
5. Copy the unique webhook URL

Each webhook gets a unique, unguessable token that identifies and authenticates the request.

---

## Endpoint

Your webhook URL will look like:
```
https://your-app.pages.dev/api/webhook/wh_abc123...
```

## Request

```json
POST /api/webhook/wh_<token>
Content-Type: application/json

{
  "template_name": "Personal Info",
  "record_id": "recXXXXXXXX"
}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `template_name` | Yes | Template name as configured in PDFit |
| `record_id` | Yes | Airtable record ID to fill data from |

Everything else (field mappings, connection, base, table, output field) comes from your template configuration.

---

## Airtable Script Example

```javascript
// Airtable Automation - PDF Generation
// Trigger: When record is created
// Input: recordId = Record ID

let config = input.config();
let recordId = config.recordId;

// Your unique webhook URL from PDFit Settings
const WEBHOOK_URL = 'https://your-app.pages.dev/api/webhook/wh_YOUR_TOKEN';

let table = base.getTable('Customer Applications');
let record = await table.selectRecordAsync(recordId);

let applicantType = record.getCellValueAsString('Applicant Type');
let purpose = record.getCellValueAsString('Purpose');

// Determine which templates to generate
let templates = [];
if (applicantType === 'Individual' || applicantType === 'Care-of') {
    templates.push('Personal Info');
}
if (purpose === 'Crisis Shield') {
    templates.push('Weekly Sales');
}

// Generate each PDF
for (let templateName of templates) {
    console.log(`Generating: ${templateName}`);
    
    let response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            template_name: templateName,
            record_id: recordId
        })
    });
    
    let result = await response.json();
    console.log(`${templateName}: ${result.success ? '✓' : result.error}`);
}

output.set('status', 'complete');
```

---

## Response

### Success
```json
{
  "success": true,
  "pdf_url": "/api/files/generated/...",
  "template_name": "Personal Info",
  "record_id": "recXXX"
}
```

### Error
```json
{
  "success": false,
  "error": "Template not found"
}
```

---

## Prerequisites

Templates must be configured in PDFit with:
- PDF uploaded
- Field mappings set
- Airtable connection linked
- Base/table selected
- Output field configured

---

## Security

- Each webhook has a unique, unguessable token
- Webhooks can only access templates owned by the same user/organization
- Webhooks can be disabled/enabled at any time
- Usage is tracked (count and last used timestamp)

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Webhook not found" | Check the URL is correct, webhook exists |
| "Webhook is disabled" | Enable the webhook in Settings |
| "Template not found" | Verify template name matches exactly (case-sensitive) |
| "Connection not found" | Template needs Airtable connection configured |
