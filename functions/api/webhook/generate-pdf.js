// functions/api/webhook/generate-pdf.js
// Webhook endpoint for generating PDFs from Airtable automation
// POST /api/webhook/generate-pdf
// Header: X-Webhook-Secret
// Body: { template_name: "Personal Info", record_id: "recXXX" }

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function onRequestPost(context) {
    const { env, request } = context;

    // CORS headers for preflight
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
    };

    // ========== WEBHOOK SECRET VALIDATION ==========
    const webhookSecret = request.headers.get('X-Webhook-Secret');
    if (!webhookSecret || webhookSecret !== env.WEBHOOK_SECRET) {
        return Response.json(
            { success: false, error: 'Invalid webhook secret' },
            { status: 401, headers: corsHeaders }
        );
    }

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

        // ========== 1. FIND TEMPLATE BY NAME ==========
        const { results: templates } = await env.DB.prepare(`
      SELECT id, data FROM entities 
      WHERE entity_name = 'PDFTemplate' 
      AND json_extract(data, '$.name') = ?
    `).bind(template_name).all();

        if (!templates.length) {
            return Response.json(
                { success: false, error: `Template "${template_name}" not found` },
                { status: 404, headers: corsHeaders }
            );
        }

        const template = JSON.parse(templates[0].data);
        template.id = templates[0].id;

        console.log(`[Webhook] Found template: ${template.name}`);

        // Validate template has required config
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

        // ========== 2. GET AIRTABLE CONNECTION ==========
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
                { success: false, error: 'Airtable API key not found in connection' },
                { status: 400, headers: corsHeaders }
            );
        }

        console.log(`[Webhook] Using connection for base: ${template.airtable_base_id}`);

        // ========== 3. FETCH RECORD FROM AIRTABLE ==========
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

        // ========== 4. FETCH PDF TEMPLATE FROM R2 ==========
        // pdf_url is like "/api/files/uploads%2F1234-template.pdf"
        // We need to extract the R2 key
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

        // ========== 5. GENERATE PDF WITH PDF-LIB ==========
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Load fonts
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

        console.log(`[Webhook] Processing ${fields.length} fields across ${pages.length} pages`);

        // Draw each field on the PDF
        for (const field of fields) {
            const pageIndex = (field.page || 1) - 1;
            if (pageIndex >= pages.length) continue;

            const page = pages[pageIndex];
            const { height: pageHeight } = page.getSize();

            // Get field value - handle special values first
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
                continue; // Skip fields without data or special value
            }

            value = String(value || '');
            if (!value) continue;

            // Select font based on style
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

            // Convert coordinates (canvas to PDF coordinates)
            // PDF coordinates start from bottom-left
            const x = field.x || 0;
            const y = pageHeight - (field.y || 0) - fontSize;

            // Handle text alignment
            let textX = x;
            if (field.alignment === 'center') {
                const textWidth = font.widthOfTextAtSize(value, fontSize);
                textX = x + (field.width || 0) / 2 - textWidth / 2;
            } else if (field.alignment === 'right') {
                const textWidth = font.widthOfTextAtSize(value, fontSize);
                textX = x + (field.width || 0) - textWidth;
            }

            // Draw the text
            page.drawText(value, {
                x: textX,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
            });
        }

        // Save the generated PDF
        const generatedPdfBytes = await pdfDoc.save();
        console.log(`[Webhook] Generated PDF: ${generatedPdfBytes.byteLength} bytes`);

        // ========== 6. UPLOAD GENERATED PDF TO R2 ==========
        const outputKey = `generated/${Date.now()}-${template.name.replace(/\s+/g, '_')}-${record_id}.pdf`;

        await env.FILES.put(outputKey, generatedPdfBytes, {
            httpMetadata: {
                contentType: 'application/pdf',
            },
        });

        // Build the public URL for the generated PDF
        const pdfUrl = `${new URL(request.url).origin}/api/files/${encodeURIComponent(outputKey)}`;
        console.log(`[Webhook] Uploaded to R2: ${outputKey}`);

        // ========== 7. ATTACH PDF TO AIRTABLE RECORD ==========
        if (template.output_field) {
            const updateUrl = `https://api.airtable.com/v0/${template.airtable_base_id}/${encodeURIComponent(template.airtable_table_name)}/${record_id}`;

            const attachmentPayload = {
                fields: {
                    [template.output_field]: [
                        {
                            url: pdfUrl,
                            filename: `${template.name}_${record_id}.pdf`
                        }
                    ]
                }
            };

            const updateResponse = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(attachmentPayload)
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error(`[Webhook] Failed to attach PDF to Airtable: ${errorText}`);
                // Don't fail the whole request - PDF was still generated
                return Response.json(
                    {
                        success: true,
                        pdf_url: pdfUrl,
                        warning: 'PDF generated but failed to attach to Airtable'
                    },
                    { status: 200, headers: corsHeaders }
                );
            }

            console.log(`[Webhook] Attached PDF to field: ${template.output_field}`);
        }

        // ========== 8. LOG GENERATION IN D1 ==========
        const generatedPdfId = crypto.randomUUID();
        const now = new Date().toISOString();
        const generatedPdfData = {
            template_id: template.id,
            template_name: template.name,
            airtable_record_id: record_id,
            status: 'completed',
            pdf_url: pdfUrl,
            data_snapshot: recordData
        };

        await env.DB.prepare(
            "INSERT INTO entities (id, entity_name, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)"
        ).bind(generatedPdfId, 'GeneratedPDF', JSON.stringify(generatedPdfData), now, now).run();

        console.log(`[Webhook] Success! PDF generated and attached.`);

        return Response.json(
            {
                success: true,
                pdf_url: pdfUrl,
                template_name: template.name,
                record_id: record_id
            },
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

// Handle OPTIONS for CORS preflight
export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret',
        },
    });
}
