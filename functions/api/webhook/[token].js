// functions/api/webhook/[token].js
// User-specific webhook endpoint for PDF generation
// URL: /api/webhook/wh_<unique-token>
// Body: { template_name: "Personal Info", record_id: "recXXX" }

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function onRequestPost(context) {
    const { env, request, params } = context;
    const token = params.token;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    };

    // ========== 1. VALIDATE WEBHOOK TOKEN ==========
    if (!token || !token.startsWith('wh_')) {
        return Response.json(
            { success: false, error: 'Invalid webhook URL' },
            { status: 401, headers: corsHeaders }
        );
    }

    // Find webhook by token
    const { results: webhooks } = await env.DB.prepare(`
    SELECT id, data FROM entities 
    WHERE entity_name = 'Webhook' 
    AND json_extract(data, '$.token') = ?
  `).bind(token).all();

    if (!webhooks.length) {
        return Response.json(
            { success: false, error: 'Webhook not found or expired' },
            { status: 401, headers: corsHeaders }
        );
    }

    const webhook = JSON.parse(webhooks[0].data);
    webhook.id = webhooks[0].id;

    // ========== 2. VALIDATE SECRET KEY ==========
    const providedSecret = request.headers.get('X-Webhook-Secret');
    if (webhook.secret_key && webhook.secret_key !== providedSecret) {
        return Response.json(
            { success: false, error: 'Invalid webhook secret' },
            { status: 401, headers: corsHeaders }
        );
    }

    // Check if webhook is enabled
    if (webhook.enabled === false) {
        return Response.json(
            { success: false, error: 'Webhook is disabled' },
            { status: 403, headers: corsHeaders }
        );
    }

    console.log(`[Webhook] Authenticated: ${webhook.name} (user: ${webhook.user_id})`);

    try {
        const body = await request.json();
        const { template_name, record_id } = body;

        if (!template_name || !record_id) {
            return Response.json(
                { success: false, error: 'Missing template_name or record_id' },
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`[Webhook] Generating PDF: template="${template_name}", record="${record_id}"`);

        // ========== 2. FIND TEMPLATE BY NAME (scoped to user/org) ==========
        let templateQuery = `
      SELECT id, data FROM entities 
      WHERE entity_name = 'PDFTemplate' 
      AND json_extract(data, '$.name') = ?
      AND (json_extract(data, '$.user_id') = ?`;

        const bindings = [template_name, webhook.user_id];

        if (webhook.organization_id) {
            templateQuery += ` OR json_extract(data, '$.organization_id') = ?`;
            bindings.push(webhook.organization_id);
        }
        templateQuery += `)`;

        const { results: templates } = await env.DB.prepare(templateQuery).bind(...bindings).all();

        if (!templates.length) {
            return Response.json(
                { success: false, error: `Template "${template_name}" not found` },
                { status: 404, headers: corsHeaders }
            );
        }

        const template = JSON.parse(templates[0].data);
        template.id = templates[0].id;

        console.log(`[Webhook] Found template: ${template.name}`);

        // Validate required config
        if (!template.pdf_url) {
            return Response.json(
                { success: false, error: 'Template has no PDF file configured' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (!template.airtable_connection_id) {
            return Response.json(
                { success: false, error: 'Template has no Airtable connection configured' },
                { status: 400, headers: corsHeaders }
            );
        }

        if (!template.airtable_base_id || !template.airtable_table_name) {
            return Response.json(
                { success: false, error: 'Template has no Airtable base/table configured' },
                { status: 400, headers: corsHeaders }
            );
        }

        // ========== 3. GET AIRTABLE CONNECTION ==========
        const { results: connections } = await env.DB.prepare(`
      SELECT data FROM entities 
      WHERE id = ? AND entity_name = 'AirtableConnection'
    `).bind(template.airtable_connection_id).all();

        if (!connections.length) {
            return Response.json(
                { success: false, error: 'Airtable connection not found' },
                { status: 404, headers: corsHeaders }
            );
        }

        const connection = JSON.parse(connections[0].data);
        const apiKey = connection.api_key;

        if (!apiKey) {
            return Response.json(
                { success: false, error: 'Airtable API key not found' },
                { status: 400, headers: corsHeaders }
            );
        }

        // ========== 4. FETCH RECORD FROM AIRTABLE ==========
        const airtableUrl = `https://api.airtable.com/v0/${template.airtable_base_id}/${encodeURIComponent(template.airtable_table_name)}/${record_id}`;

        const recordResponse = await fetch(airtableUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (!recordResponse.ok) {
            const errorText = await recordResponse.text();
            console.error(`[Webhook] Airtable error: ${errorText}`);
            return Response.json(
                { success: false, error: `Failed to fetch Airtable record: ${recordResponse.status}` },
                { status: 400, headers: corsHeaders }
            );
        }

        const record = await recordResponse.json();
        const recordData = record.fields;

        console.log(`[Webhook] Fetched record with ${Object.keys(recordData).length} fields`);

        // ========== 5. FETCH PDF TEMPLATE FROM R2 ==========
        let r2Key = template.pdf_url;
        if (r2Key.startsWith('/api/files/')) {
            r2Key = decodeURIComponent(r2Key.replace('/api/files/', ''));
        }

        const pdfObject = await env.FILES.get(r2Key);
        if (!pdfObject) {
            return Response.json(
                { success: false, error: 'PDF template file not found in storage' },
                { status: 404, headers: corsHeaders }
            );
        }

        const pdfBytes = await pdfObject.arrayBuffer();
        console.log(`[Webhook] Loaded PDF template: ${r2Key} (${pdfBytes.byteLength} bytes)`);

        // ========== 6. GENERATE PDF WITH PDF-LIB ==========
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        const helveticaBoldOblique = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
        const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
        const courier = await pdfDoc.embedFont(StandardFonts.Courier);

        const pages = pdfDoc.getPages();
        const fields = template.fields || [];

        console.log(`[Webhook] Processing ${fields.length} fields`);

        for (const field of fields) {
            const pageIndex = (field.page || 1) - 1;
            if (pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { height: pageHeight } = page.getSize();

            let value;
            if (field.special_value) {
                if (field.special_value === 'today') {
                    value = new Date().toLocaleDateString();
                } else if (field.special_value === 'yesterday') {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    value = yesterday.toLocaleDateString();
                } else if (field.special_value === 'tomorrow') {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    value = tomorrow.toLocaleDateString();
                } else if (field.special_value === 'custom') {
                    value = field.custom_text || '';
                }
            } else if (field.airtable_field && recordData[field.airtable_field] !== undefined) {
                value = recordData[field.airtable_field];
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
            } else {
                continue;
            }

            value = String(value || '');
            if (!value) continue;

            let font = helveticaFont;
            if (field.font === 'Times') {
                if (field.bold && field.italic) font = timesItalic;
                else if (field.bold) font = timesBold;
                else if (field.italic) font = timesItalic;
                else font = timesFont;
            } else if (field.font === 'Courier') {
                font = courier;
            } else {
                if (field.bold && field.italic) font = helveticaBoldOblique;
                else if (field.bold) font = helveticaBold;
                else if (field.italic) font = helveticaOblique;
                else font = helveticaFont;
            }

            const fontSize = field.font_size || 12;

            // Helper function to wrap text into lines that fit within maxWidth
            const wrapText = (text, maxWidth) => {
                const words = text.split(' ');
                const lines = [];
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

                    if (testWidth <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        if (currentLine) lines.push(currentLine);
                        currentLine = word;
                    }
                }
                if (currentLine) lines.push(currentLine);
                return lines;
            };

            // Helper function to truncate text with ellipsis
            const truncateText = (text, maxWidth) => {
                const ellipsis = '...';
                const ellipsisWidth = font.widthOfTextAtSize(ellipsis, fontSize);

                if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
                    return text;
                }

                let truncated = text;
                while (truncated.length > 0 && font.widthOfTextAtSize(truncated + ellipsis, fontSize) > maxWidth) {
                    truncated = truncated.slice(0, -1);
                }
                return truncated + ellipsis;
            };

            // Padding constants for consistent spacing
            const PADDING_X = 3;
            const PADDING_Y = 2;
            const LINE_HEIGHT = fontSize * 1.2;

            // Field dimensions
            const fieldX = field.x || 0;
            const fieldY = field.y || 0;
            const fieldWidth = field.width || 100;
            const fieldHeight = field.height || fontSize + PADDING_Y * 2;

            // Available width for text
            const availableWidth = fieldWidth - (PADDING_X * 2);

            // Calculate how many lines can fit
            const maxLines = Math.floor((fieldHeight - PADDING_Y * 2) / LINE_HEIGHT);

            // Determine if we should wrap or truncate
            let linesToDraw = [];

            if (maxLines >= 2) {
                // Multi-line field - wrap text
                const wrappedLines = wrapText(value, availableWidth);

                if (wrappedLines.length <= maxLines) {
                    linesToDraw = wrappedLines;
                } else {
                    // Too many lines - truncate last
                    linesToDraw = wrappedLines.slice(0, maxLines);
                    if (wrappedLines.length > maxLines) {
                        linesToDraw[maxLines - 1] = truncateText(linesToDraw[maxLines - 1], availableWidth);
                    }
                }
            } else {
                // Single line - truncate if needed
                linesToDraw = [truncateText(value, availableWidth)];
            }

            // Calculate starting Y position
            const fieldBottom = pageHeight - fieldY - fieldHeight;
            let startY = fieldBottom + fieldHeight - PADDING_Y - fontSize;
            if (linesToDraw.length === 1) {
                // Single line - center vertically
                startY = fieldBottom + (fieldHeight / 2) - (fontSize / 2) + PADDING_Y;
            }

            // Draw each line
            for (let i = 0; i < linesToDraw.length; i++) {
                const line = linesToDraw[i];
                const lineY = startY - (i * LINE_HEIGHT);

                const lineWidth = font.widthOfTextAtSize(line, fontSize);
                let textX;
                if (field.alignment === 'center') {
                    textX = fieldX + (fieldWidth / 2) - (lineWidth / 2);
                } else if (field.alignment === 'right') {
                    textX = fieldX + fieldWidth - lineWidth - PADDING_X;
                } else {
                    textX = fieldX + PADDING_X;
                }

                page.drawText(line, {
                    x: textX,
                    y: lineY,
                    size: fontSize,
                    font: font,
                    color: rgb(0, 0, 0),
                });
            }
        }

        const generatedPdfBytes = await pdfDoc.save();
        console.log(`[Webhook] Generated PDF: ${generatedPdfBytes.byteLength} bytes`);

        // ========== 7. UPLOAD TO R2 ==========
        const outputKey = `generated/${Date.now()}-${template.name.replace(/\s+/g, '_')}-${record_id}.pdf`;

        await env.FILES.put(outputKey, generatedPdfBytes, {
            httpMetadata: { contentType: 'application/pdf' },
        });

        const pdfUrl = `${new URL(request.url).origin}/api/files/${encodeURIComponent(outputKey)}`;
        console.log(`[Webhook] Uploaded: ${outputKey}`);

        // ========== 8. ATTACH TO AIRTABLE ==========
        if (template.output_field) {
            const updateUrl = `https://api.airtable.com/v0/${template.airtable_base_id}/${encodeURIComponent(template.airtable_table_name)}/${record_id}`;

            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        [template.output_field]: [{ url: pdfUrl, filename: `${template.name}_${record_id}.pdf` }]
                    }
                })
            });

            if (!updateResponse.ok) {
                console.error(`[Webhook] Failed to attach PDF to Airtable`);
                return Response.json(
                    { success: true, pdf_url: pdfUrl, warning: 'PDF generated but failed to attach to Airtable' },
                    { status: 200, headers: corsHeaders }
                );
            }

            console.log(`[Webhook] Attached to field: ${template.output_field}`);
        }

        // ========== 9. LOG GENERATION ==========
        const generatedPdfId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
            "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
        ).bind(
            generatedPdfId,
            'GeneratedPDF',
            JSON.stringify({
                template_id: template.id,
                template_name: template.name,
                airtable_record_id: record_id,
                status: 'completed',
                pdf_url: pdfUrl,
                webhook_id: webhook.id,
                user_id: webhook.user_id
            }),
            now,
            now
        ).run();

        // Update webhook usage count
        await env.DB.prepare(
            `UPDATE entities SET data = json_set(data, '$.usage_count', COALESCE(json_extract(data, '$.usage_count'), 0) + 1, '$.last_used', ?), updated_date = ? WHERE id = ?`
        ).bind(now, now, webhook.id).run();

        console.log(`[Webhook] Success!`);

        return Response.json(
            { success: true, pdf_url: pdfUrl, template_name: template.name, record_id },
            { status: 200, headers: corsHeaders }
        );

    } catch (error) {
        console.error('[Webhook] Error:', error);
        return Response.json(
            { success: false, error: error.message },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
