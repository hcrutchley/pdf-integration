import React, { useEffect, useRef, useState } from 'react';
// Use the standard pdf.js build and provide an explicit Worker via Vite.
import * as pdfjsLib from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Create a single shared worker instance once at module load.
// This worker is reused by all PDFCanvas instances.
if (!pdfjsLib.GlobalWorkerOptions.workerPort) {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfJsWorker();
}

export default function PDFCanvas({ pdfUrl, page = 1, scale = 1, onLoad, onLoadSuccess }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep refs for cleanup and cancellation
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const isMountedRef = useRef(true);

  // Effect: Load and render PDF
  useEffect(() => {
    let loadingTask = null;
    isMountedRef.current = true;

    const loadAndRender = async () => {
      if (!pdfUrl) return;

      try {
        setLoading(true);
        setError(null);

        // URL rewriting for R2 proxy
        let effectiveUrl = pdfUrl;
        try {
          const u = new URL(pdfUrl, window.location.origin);
          if (u.hostname.endsWith(".r2.dev")) {
            const key = u.pathname.replace(/^\//, "");
            effectiveUrl = `/api/files/${encodeURIComponent(key)}`;
          }
        } catch (_) {
          // If pdfUrl is not a valid URL, use as-is
        }

        // Load PDF document
        loadingTask = pdfjsLib.getDocument(effectiveUrl);
        const pdf = await loadingTask.promise;

        if (!isMountedRef.current) return;

        pdfDocRef.current = pdf;

        if (onLoadSuccess) {
          onLoadSuccess(pdf);
        }

        // Get the page
        const pdfPage = await pdf.getPage(page);

        if (!isMountedRef.current) return;

        // Get viewport
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;

        if (!canvas || !isMountedRef.current) return;

        // Set canvas dimensions
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Cancel any previous render
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (_) { }
        }

        // Render the page
        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport: viewport
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;

        if (!isMountedRef.current) return;

        renderTaskRef.current = null;
        setLoading(false);

        if (onLoad) {
          onLoad({ width: viewport.width, height: viewport.height });
        }

      } catch (err) {
        // Ignore RenderingCancelledException - expected during rapid changes
        if (err.name === 'RenderingCancelledException') {
          return;
        }

        if (!isMountedRef.current) return;

        console.error('PDF error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadAndRender();

    // Cleanup function
    return () => {
      isMountedRef.current = false;

      // Cancel any in-progress render
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) { }
        renderTaskRef.current = null;
      }

      // Note: We do NOT destroy loadingTask here because it would
      // destroy the shared global worker used by other PDFCanvas instances
    };
  }, [pdfUrl, page, scale, onLoad, onLoadSuccess]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <div className="text-center p-4">
          <p className="text-red-500 mb-2">Failed to load PDF</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
          <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
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
