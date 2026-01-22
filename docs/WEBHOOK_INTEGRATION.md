# PDFit Webhook Integration Guide

Generate PDFs via webhook from Airtable automations.

## Endpoint

```
POST https://your-app.pages.dev/api/webhook/generate-pdf
```

## Authentication

Add header:
```
X-Webhook-Secret: your-secret-here
```

Set the secret in Cloudflare Dashboard → Settings → Environment Variables → `WEBHOOK_SECRET`

## Request

```json
{
  "template_name": "Personal Info",
  "record_id": "recXXXXXXXX"
}
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `template_name` | Yes | Template name as configured in PDFit |
| `record_id` | Yes | Airtable record ID to fill data from |

The webhook looks up everything else from the template config:
- Field mappings
- Airtable connection/API key
- Base and table
- Output attachment field

---

## Airtable Script

```javascript
// Airtable Automation - PDF Generation Trigger
// Trigger: When record is created
// Input: recordId = Record ID

let config = input.config();
let recordId = config.recordId;

const WEBHOOK_URL = 'https://your-app.pages.dev/api/webhook/generate-pdf';
const WEBHOOK_SECRET = 'your-secret-here';

let table = base.getTable('Customer Applications');
let record = await table.selectRecordAsync(recordId);

let applicantType = record.getCellValueAsString('Applicant Type');
let purpose = record.getCellValueAsString('Purpose');

// Determine which PDFs to generate
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
        headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': WEBHOOK_SECRET
        },
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

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Invalid webhook secret" | Check `X-Webhook-Secret` header matches `WEBHOOK_SECRET` env var |
| "Template not found" | Verify template name matches exactly (case-sensitive) |
| "Connection not found" | Template needs Airtable connection configured |
| "PDF template file not found" | Re-upload PDF in template editor |
