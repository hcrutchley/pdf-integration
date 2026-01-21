import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // Refs for render queue management
  const renderTaskRef = useRef(null);
  const pendingRenderRef = useRef(null);
  const renderTimeoutRef = useRef(null);
  const lastScaleRef = useRef(scale);

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

  // Debounced render function to prevent rapid render calls
  const scheduleRender = useCallback((targetPage, targetScale) => {
    // Store the pending render params
    pendingRenderRef.current = { page: targetPage, scale: targetScale };

    // Clear any existing debounce timer
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    // Debounce: wait for rapid changes to settle
    const debounceMs = Math.abs(targetScale - lastScaleRef.current) > 0.01 ? 50 : 0;

    renderTimeoutRef.current = setTimeout(() => {
      executePendingRender();
    }, debounceMs);
  }, []);

  // Execute the pending render
  const executePendingRender = useCallback(async () => {
    const pending = pendingRenderRef.current;
    if (!pending || !pdfDoc) return;

    const { page: targetPage, scale: targetScale } = pending;
    pendingRenderRef.current = null;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      renderTaskRef.current = null;
    }

    try {
      setLoading(true);
      const pdfPage = await pdfDoc.getPage(targetPage);

      const viewport = pdfPage.getViewport({ scale: targetScale });
      const canvas = canvasRef.current;

      if (!canvas) return;

      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Store the render task so we can cancel it if needed
      const renderTask = pdfPage.render({
        canvasContext: context,
        viewport: viewport
      });
      renderTaskRef.current = renderTask;

      await renderTask.promise;

      // Update last successful scale
      lastScaleRef.current = targetScale;
      renderTaskRef.current = null;

      setLoading(false);
      if (onLoad) {
        onLoad({ width: viewport.width, height: viewport.height });
      }
    } catch (err) {
      // Ignore cancellation errors - they're expected during rapid changes
      if (err.name === 'RenderingCancelledException') {
        return;
      }

      // Handle worker being destroyed - schedule a retry
      if (err.message?.includes('worker is being destroyed')) {
        console.warn('PDF worker busy, retrying render...');
        setTimeout(() => {
          pendingRenderRef.current = pending;
          executePendingRender();
        }, 100);
        return;
      }

      console.error('PDF rendering error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [pdfDoc, onLoad]);

  // Effect 2: Render Page (When Doc, Page, or Scale changes)
  useEffect(() => {
    if (!pdfDoc) return;

    scheduleRender(page, scale);

    return () => {
      // Cleanup: cancel pending timeout
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      // Cancel in-progress render
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [pdfDoc, page, scale, scheduleRender]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

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
