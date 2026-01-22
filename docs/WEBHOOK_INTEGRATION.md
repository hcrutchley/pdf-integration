# PDFit Webhook Integration Guide

Generate PDFs via webhook from Airtable automations using user-specific webhook URLs.

## Creating a Webhook

1. Go to **Settings** in PDFit
2. Scroll to the **Webhooks** section
3. Enter a name (e.g., "ReadyFund Production")
4. Click **Create**
5. Copy both the **URL** and **Secret key**

Each webhook has:
- **Unique URL** with an unguessable token
- **Secret key** that must be sent as a header

---

## Endpoint & Authentication

```
POST https://your-app.pages.dev/api/webhook/wh_<token>
Content-Type: application/json
X-Webhook-Secret: sk_<your-secret-key>
```

Both the unique URL **and** the secret key are required for authentication.

---

## Request Body

```json
{
  "template_name": "Personal Info",
  "record_id": "recXXXXXXXX"
}
```

---

## Airtable Script Example

```javascript
// Airtable Automation - PDF Generation
// Trigger: When record is created
// Input: recordId = Record ID

let config = input.config();
let recordId = config.recordId;

// Your webhook credentials from PDFit Settings
const WEBHOOK_URL = 'https://your-app.pages.dev/api/webhook/wh_YOUR_TOKEN';
const WEBHOOK_SECRET = 'sk_YOUR_SECRET_KEY';

let table = base.getTable('Customer Applications');
let record = await table.selectRecordAsync(recordId);

let applicantType = record.getCellValueAsString('Applicant Type');
let purpose = record.getCellValueAsString('Purpose');

let templates = [];
if (applicantType === 'Individual' || applicantType === 'Care-of') {
    templates.push('Personal Info');
}
if (purpose === 'Crisis Shield') {
    templates.push('Weekly Sales');
}

for (let templateName of templates) {
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

## Security

- **Double authentication**: Both unique URL token + secret key required
- **User-scoped**: Webhooks only access templates owned by same user/org
- **Trackable**: Usage count and last-used timestamp
- **Controllable**: Enable/disable webhooks anytime

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Invalid webhook secret" | Check `X-Webhook-Secret` header matches |
| "Webhook not found" | Verify URL is correct |
| "Webhook is disabled" | Enable in Settings |
| "Template not found" | Check template name (case-sensitive) |
