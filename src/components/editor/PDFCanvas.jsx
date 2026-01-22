import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Create a single shared worker instance once at module load.
if (!pdfjsLib.GlobalWorkerOptions.workerPort) {
  pdfjsLib.GlobalWorkerOptions.workerPort = new PdfJsWorker();
}

export default function PDFCanvas({ pdfUrl, page = 1, scale = 1, onLoad, onLoadSuccess }) {
  const canvasRef = useRef(null);
  const [documentLoading, setDocumentLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep PDF document in a ref so render effect can access it
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);
  const isMountedRef = useRef(true);
  const lastRenderParamsRef = useRef({ page: null, scale: null });

  // Effect 1: Load PDF Document (ONLY when URL changes)
  useEffect(() => {
    let loadingTask = null;
    isMountedRef.current = true;
    pdfDocRef.current = null;

    const loadDocument = async () => {
      if (!pdfUrl) return;

      try {
        setDocumentLoading(true);
        setError(null);

        // URL rewriting for R2 proxy
        let effectiveUrl = pdfUrl;
        try {
          const u = new URL(pdfUrl, window.location.origin);
          if (u.hostname.endsWith(".r2.dev")) {
            const key = u.pathname.replace(/^\//, "");
            effectiveUrl = `/api/files/${encodeURIComponent(key)}`;
          }
        } catch (_) { }

        loadingTask = pdfjsLib.getDocument(effectiveUrl);
        const pdf = await loadingTask.promise;

        if (!isMountedRef.current) return;

        pdfDocRef.current = pdf;
        setDocumentLoading(false);

        if (onLoadSuccess) {
          onLoadSuccess(pdf);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.error('PDF document load error:', err);
        setError(err.message);
        setDocumentLoading(false);
      }
    };

    loadDocument();

    return () => {
      isMountedRef.current = false;
      // Don't destroy loadingTask - it destroys the shared worker
    };
  }, [pdfUrl]); // ONLY re-run when URL changes

  // Render function - can be called imperatively
  const renderPage = useCallback(async (targetPage, targetScale) => {
    const pdfDoc = pdfDocRef.current;
    const canvas = canvasRef.current;

    if (!pdfDoc || !canvas || !isMountedRef.current) return;

    // Skip if same params as last successful render
    if (lastRenderParamsRef.current.page === targetPage &&
      lastRenderParamsRef.current.scale === targetScale) {
      return;
    }

    // Cancel any previous render
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (_) { }
      renderTaskRef.current = null;
    }

    try {
      const pdfPage = await pdfDoc.getPage(targetPage);
      if (!isMountedRef.current) return;

      const viewport = pdfPage.getViewport({ scale: targetScale });
      const context = canvas.getContext('2d');

      // Update canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render the page
      const renderTask = pdfPage.render({
        canvasContext: context,
        viewport: viewport
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      if (!isMountedRef.current) return;

      // Mark successful render
      lastRenderParamsRef.current = { page: targetPage, scale: targetScale };
      renderTaskRef.current = null;

      if (onLoad) {
        onLoad({ width: viewport.width, height: viewport.height });
      }
    } catch (err) {
      if (err.name === 'RenderingCancelledException') return;
      if (!isMountedRef.current) return;
      console.error('PDF render error:', err);
    }
  }, [onLoad]);

  // Effect 2: Render when page/scale changes (AFTER document is loaded)
  useEffect(() => {
    if (documentLoading || !pdfDocRef.current) return;

    // Debounce rapid scale changes
    const timeoutId = setTimeout(() => {
      renderPage(page, scale);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) { }
      }
    };
  }, [page, scale, documentLoading, renderPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) { }
      }
    };
  }, []);

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

  // Only show loading state when loading a NEW document, not during re-renders
  if (documentLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <div className="text-slate-500 dark:text-slate-400">Loading PDF...</div>
      </div>
    );
  }

  // Canvas is always visible - no blanking during zoom/pan
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
