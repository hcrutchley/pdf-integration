# AirPDF Webhook Integration Guide

This document explains how to set up Airtable automations to trigger PDF generation via webhook instead of polling.

## Overview

AirPDF supports two methods for triggering PDF generation:
1. **Polling** (Legacy) - AirPDF periodically checks Airtable for matching records
2. **Webhook** (Recommended) - Airtable sends a request to AirPDF when a trigger condition is met

Webhook is recommended because:
- Instant PDF generation (no polling delay)
- No unnecessary API calls
- More reliable and scalable

---

## Webhook Endpoint

```
POST https://your-airpdf-domain.pages.dev/api/generate
```

## Request Format

Send a POST request with the following JSON body:

```json
{
  "templateId": "template_xxx",
  "recordId": "recXXXXXXXX",
  "connectionId": "connection_xxx"
}
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `templateId` | Yes | The AirPDF template ID |
| `recordId` | Yes | The Airtable record ID to use for field values |
| `connectionId` | Yes | The AirPDF connection ID (for API key) |

---

## Setting Up Airtable Automation

### Step 1: Create an Automation

1. Open your Airtable base
2. Go to **Automations** tab
3. Click **Create automation**

### Step 2: Configure Trigger

1. Choose trigger type: **When record matches conditions**
2. Select your table
3. Add condition: `Status` equals `Approved` (or your trigger value)

### Step 3: Add Script Action

1. Add action: **Run a script**
2. Add input variables:
   - `recordId`: The record ID from the trigger
3. Paste this script:

```javascript
// AirPDF Webhook Script for Airtable

// Configuration - Update these values
const AIRPDF_ENDPOINT = 'https://your-domain.pages.dev/api/generate';
const TEMPLATE_ID = 'template_xxx'; // From AirPDF template settings
const CONNECTION_ID = 'connection_xxx'; // From AirPDF connections

// Get the record ID from trigger
const recordId = input.config().recordId;

// Make the webhook request
const response = await fetch(AIRPDF_ENDPOINT, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    templateId: TEMPLATE_ID,
    recordId: recordId,
    connectionId: CONNECTION_ID,
  }),
});

// Check response
if (!response.ok) {
  const error = await response.text();
  throw new Error(`AirPDF request failed: ${error}`);
}

const result = await response.json();
console.log('PDF generated:', result.pdfUrl);

// Output for next steps
output.set('pdfUrl', result.pdfUrl);
output.set('success', true);
```

### Step 4: Test and Activate

1. Test the automation with a sample record
2. Verify the PDF appears in the output field
3. Turn on the automation

---

## Finding Your IDs

### Template ID
1. Open the template in AirPDF editor
2. Look at the URL: `?id=template_xxx`
3. Or find it in the export file

### Connection ID
1. Go to AirPDF → Connections
2. Click on your connection
3. The ID is in the URL

---

## Troubleshooting

### "Template not found"
- Verify the templateId is correct
- Ensure the template is published/active

### "Connection not found"
- Verify the connectionId is correct
- Ensure the connection is still valid

### "Field mapping error"
- Check that Airtable field names match the mappings in your template
- Field names are case-sensitive

### Rate Limits
- Airtable automation scripts have a 30-second timeout
- PDF generation typically takes 5-15 seconds

---

## Response Format

### Success Response

```json
{
  "success": true,
  "pdfUrl": "https://r2.your-domain.com/generated/xxx.pdf",
  "recordId": "recXXXXXXXX"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message here"
}
```
