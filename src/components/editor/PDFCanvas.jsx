import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PDFCanvas({ pdfUrl, page = 1, scale = 1, onLoad, onLoadSuccess }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const loadingTaskRef = useRef(null);
  const renderTaskRef = useRef(null);
  const pageRef = useRef(null);
  const retriedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        if (renderTaskRef.current) {
          try { renderTaskRef.current.cancel(); } catch (_) {}
          renderTaskRef.current = null;
        }
        if (loadingTaskRef.current) {
          try { await loadingTaskRef.current.destroy(); } catch (_) {}
          loadingTaskRef.current = null;
        }

        let effectiveUrl = pdfUrl;
        try {
          const u = new URL(pdfUrl, window.location.origin);
          if (u.hostname.endsWith(".r2.dev")) {
            const key = u.pathname.replace(/^\//, "");
            effectiveUrl = `/api/files/${encodeURIComponent(key)}`;
          }
        } catch (_) {
        }

        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

        const task = pdfjsLib.getDocument({ url: effectiveUrl });
        loadingTaskRef.current = task;
        const pdf = await task.promise;
        
        if (cancelled) return;
        
        if (onLoadSuccess) {
          onLoadSuccess(pdf);
        }

        const pdfPage = await pdf.getPage(page);
        pageRef.current = pdfPage;
        
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        
        if (!canvas) return;

        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = pdfPage.render({
          canvasContext: context,
          viewport: viewport
        });
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (cancelled) return;

        setLoading(false);
        if (onLoad) {
          onLoad({ width: viewport.width, height: viewport.height });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('PDF loading error:', err);
          if (!retriedRef.current && String(err?.message || '').toLowerCase().includes('worker was terminated')) {
            retriedRef.current = true;
            try {
              pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            } catch (_) {}
            setTimeout(() => {
              if (!cancelled && pdfUrl) {
                loadPDF();
              }
            }, 0);
            return;
          }
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
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch (_) {}
        renderTaskRef.current = null;
      }
      if (pageRef.current) {
        try { pageRef.current.cleanup(); } catch (_) {}
        pageRef.current = null;
      }
      if (loadingTaskRef.current) {
        const t = loadingTaskRef.current;
        loadingTaskRef.current = null;
        Promise.resolve().then(async () => {
          try { await t.destroy(); } catch (_) {}
        });
      }
    };
  }, [pdfUrl, page, scale]);

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
