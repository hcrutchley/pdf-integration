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

### Test Mode (Draft Version)

Add `?test=true` to use draft/unpublished template version:
```
POST https://your-app.pages.dev/api/webhook/wh_<token>?test=true
```

---

## Request Body

```json
{
  "template_name": "Personal Info",
  "record_id": "recXXXXXXXX"
}
```

---

## Response

```json
{
  "success": true,
  "pdf_url": "https://your-app.pages.dev/api/files/...",
  "template_name": "Personal Info",
  "record_id": "recXXXXXXXX"
}
```

The webhook is **synchronous** - it waits for the PDF to be generated, uploaded to storage, and attached to Airtable before returning success.

---

## Airtable Scripting Extension Script

Use this in **Airtable Scripting Extension** to generate PDFs for selected records:

```javascript
// ============================================
// PDFit - Generate PDFs for Selected Records
// ============================================
// 
// SETUP:
// 1. Install the Scripting extension in your Airtable base
// 2. Paste this script
// 3. Update the WEBHOOK_URL, WEBHOOK_SECRET, TABLE_NAME, and TEMPLATES
// 4. Run the script - it will prompt you to select records

// =========== CONFIGURATION ===========
const WEBHOOK_URL = 'https://your-app.pages.dev/api/webhook/wh_YOUR_TOKEN';
const WEBHOOK_SECRET = 'sk_YOUR_SECRET_KEY';
const TABLE_NAME = 'Your Table Name';  // Your Airtable table name

// Templates to generate (all will be generated for each record)
const TEMPLATES = [
    'Personal Info',
    // 'Weekly Sales',  // Add more templates as needed
];
// =====================================

// Get the table
let table = base.getTable(TABLE_NAME);

// Let user select records
output.markdown('# PDFit PDF Generator');
output.markdown('Select records to generate PDFs for:');

let records = await input.recordsAsync('Select records', table);

if (records.length === 0) {
    output.markdown('⚠️ No records selected. Exiting.');
} else {
    output.markdown(`\n**Generating PDFs for ${records.length} record(s)...**\n`);
    
    let successCount = 0;
    let failCount = 0;
    let results = [];
    
    for (let i = 0; i < records.length; i++) {
        let record = records[i];
        let recordName = record.name || record.id;
        
        output.markdown(`\n### Record ${i + 1}/${records.length}: ${recordName}`);
        
        for (let templateName of TEMPLATES) {
            output.markdown(`  ⏳ Generating "${templateName}"...`);
            
            try {
                let response = await fetch(WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Webhook-Secret': WEBHOOK_SECRET
                    },
                    body: JSON.stringify({
                        template_name: templateName,
                        record_id: record.id
                    })
                });
                
                let result = await response.json();
                
                if (result.success) {
                    output.markdown(`  ✅ **${templateName}** - PDF generated and attached!`);
                    successCount++;
                    results.push({ record: recordName, template: templateName, success: true });
                } else {
                    output.markdown(`  ❌ **${templateName}** - Error: ${result.error}`);
                    failCount++;
                    results.push({ record: recordName, template: templateName, success: false, error: result.error });
                }
            } catch (error) {
                output.markdown(`  ❌ **${templateName}** - Request failed: ${error.message}`);
                failCount++;
                results.push({ record: recordName, template: templateName, success: false, error: error.message });
            }
        }
    }
    
    // Summary
    output.markdown('\n---\n## Summary');
    output.markdown(`- **Total PDFs:** ${successCount + failCount}`);
    output.markdown(`- **✅ Success:** ${successCount}`);
    output.markdown(`- **❌ Failed:** ${failCount}`);
    
    if (failCount > 0) {
        output.markdown('\n### Failed Items:');
        for (let r of results.filter(x => !x.success)) {
            output.markdown(`- ${r.record} → ${r.template}: ${r.error}`);
        }
    }
    
    output.markdown('\n**Done!** Check your records for the attached PDFs.');
}
```

---

## Airtable Automation Script (Trigger-Based)

Use this for **Airtable Automations** when a record is created/updated:

```javascript
// Airtable Automation - Generate PDF on Trigger
// Set up input variables:
//   - recordId: Record ID of the triggering record

let config = input.config();
let recordId = config.recordId;

const WEBHOOK_URL = 'https://your-app.pages.dev/api/webhook/wh_YOUR_TOKEN';
const WEBHOOK_SECRET = 'sk_YOUR_SECRET_KEY';

// Templates to generate
const templates = ['Personal Info'];

let allSuccess = true;
let errors = [];

for (let templateName of templates) {
    try {
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
        
        if (!result.success) {
            allSuccess = false;
            errors.push(`${templateName}: ${result.error}`);
        }
    } catch (error) {
        allSuccess = false;
        errors.push(`${templateName}: ${error.message}`);
    }
}

// Set output for subsequent automation steps
output.set('success', allSuccess);
output.set('errors', errors.join('; '));
```

**Input Configuration:**
- Add input variable `recordId` = "Triggering record ID"

**Output Variables:**
- `success` - Boolean indicating all PDFs generated successfully
- `errors` - Any error messages

---

## Conditional Template Selection

Generate different templates based on record fields:

```javascript
let config = input.config();
let recordId = config.recordId;
let applicantType = config.applicantType;  // Input from trigger
let purpose = config.purpose;              // Input from trigger

const WEBHOOK_URL = 'https://your-app.pages.dev/api/webhook/wh_YOUR_TOKEN';
const WEBHOOK_SECRET = 'sk_YOUR_SECRET_KEY';

// Determine which templates to generate
let templates = [];

if (applicantType === 'Individual' || applicantType === 'Care-of') {
    templates.push('Personal Info');
}

if (purpose === 'Crisis Shield') {
    templates.push('Weekly Sales');
    templates.push('Monthly Summary');
}

// Always generate these
templates.push('Application Summary');

// Generate each template
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
    console.log(`${templateName}: ${result.success ? '✅ Done' : '❌ ' + result.error}`);
}

output.set('status', 'complete');
output.set('templates_generated', templates.length);
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
| "Template has no PDF file" | Upload PDF to template first |
| Script timeout | Reduce number of templates/records per run |
