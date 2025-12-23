import React, { useEffect, useRef, useState } from 'react';
// Use the standard pdf.js build and provide an explicit Worker via Vite.
import * as pdfjsLib from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Attach a worker instance so pdf.js never tries to dynamically import from a CDN.
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfJsWorker();

export default function PDFCanvas({ pdfUrl, page = 1, scale = 1, onLoad, onLoadSuccess }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pdfDoc, setPdfDoc] = useState(null);

  // Effect 1: Load PDF Document (Only when URL changes)
  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        setPdfDoc(null);

        // For older templates that still store a direct R2 public URL,
        // rewrite it to our same-origin proxy to avoid CORS issues.
        let effectiveUrl = pdfUrl;
        try {
          const u = new URL(pdfUrl, window.location.origin);
          if (u.hostname.endsWith(".r2.dev")) {
            // u.pathname already starts with "/uploads/..."
            const key = u.pathname.replace(/^\//, "");
            effectiveUrl = `/api/files/${encodeURIComponent(key)}`;
          }
        } catch (_) {
          // If pdfUrl is not a valid URL, just use it as-is.
        }

        loadingTask = pdfjsLib.getDocument(effectiveUrl);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setPdfDoc(pdf);
        if (onLoadSuccess) {
          onLoadSuccess(pdf);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF loading error:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    };

    if (pdfUrl) {
      loadPDF();
    }

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => { });
      }
    };
  }, [pdfUrl]);

  // Effect 2: Render Page (When Doc, Page, or Scale changes)
  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      if (!pdfDoc) return;

      try {
        setLoading(true);
        const pdfPage = await pdfDoc.getPage(page);

        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;

        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await pdfPage.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        if (cancelled) return;

        setLoading(false);
        if (onLoad) {
          onLoad({ width: viewport.width, height: viewport.height });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF rendering error:', err);
          setError(err.message);
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, page, scale]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-red-500 mb-2">Failed to load PDF</p>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <div className="text-slate-500">Loading PDF...</div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: loading ? 'none' : 'block' }}
      />
    </>
  );
}
