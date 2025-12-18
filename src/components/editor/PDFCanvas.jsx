import React, { useEffect, useRef, useState } from 'react';
// Use the legacy build of pdf.js which works with classic workers
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Point the workerSrc to the official pdf.js CDN classic worker.
// This avoids the dynamic import issues seen with the modern build.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function PDFCanvas({ pdfUrl, page = 1, scale = 1, onLoad, onLoadSuccess }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        
        if (cancelled) return;
        
        if (onLoadSuccess) {
          onLoadSuccess(pdf);
        }

        const pdfPage = await pdf.getPage(page);
        
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