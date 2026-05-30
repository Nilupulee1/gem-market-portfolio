import { useState, useEffect, useRef } from 'react';
import { Download, ExternalLink, FileText, Loader } from 'lucide-react';
import '../../styles/gemdetails.css';

interface PdfViewerProps {
  url: string;
  fileName?: string;
}

/**
 * PDF viewer that:
 * - Fetches the PDF once into a blob URL so the browser never triggers a temp-file download
 * - Previews via <iframe> (no download side-effect, unlike <object>)
 * - "Open" button opens the same blob URL in a new tab (no download)
 * - "Download" button saves the file with the correct filename
 */
const PdfViewer = ({ url, fileName = 'certificate.pdf' }: PdfViewerProps) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const blobRef = useRef<string | null>(null);

  // Fetch once → create a stable blob URL for both iframe and open/download
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = window.URL.createObjectURL(blob);
        blobRef.current = objectUrl;
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      // Revoke blob on unmount / url change to free memory
      if (blobRef.current) {
        window.URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [url]);

  // Open in new tab — writes an HTML wrapper page so the browser renders the
  // PDF inline rather than downloading a temp file.
  // Opening a raw blob URL (type application/pdf) triggers a download in
  // Chrome/Edge; wrapping it in an <iframe> inside a data: HTML page forces
  // the browser to display it instead.
  const handleOpen = () => {
    const src = blobUrl ?? url;
    const html = `<!DOCTYPE html>
<html style="margin:0;padding:0;height:100%">
<head><title>${fileName}</title></head>
<body style="margin:0;padding:0;height:100%">
  <iframe src="${src}" style="width:100%;height:100%;border:none" title="${fileName}"></iframe>
</body>
</html>`;
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(html);
      newTab.document.close();
    }
  };

  // Download with correct filename
  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Re-use cached blob URL if available, otherwise re-fetch
      let downloadUrl = blobUrl;
      let tempCreated = false;

      if (!downloadUrl) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const blob = await response.blob();
        downloadUrl = window.URL.createObjectURL(blob);
        tempCreated = true;
      }

      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      if (tempCreated) {
        window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl!), 1000);
      }
    } catch (err) {
      console.error('Download failed:', err);
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="gd-pdf-viewer">
      <div className="gd-pdf-toolbar">
        <div className="gd-pdf-toolbar-left">
          <FileText size={14} />
          <span>Certificate Document</span>
        </div>
        <div className="gd-pdf-toolbar-right">
          <button
            type="button"
            className="gd-pdf-open-btn"
            onClick={handleOpen}
            disabled={loading}
          >
            <ExternalLink size={12} /> Open
          </button>
          <button
            type="button"
            className="gd-pdf-download-btn"
            onClick={handleDownload}
            disabled={downloading || loading}
          >
            <Download size={12} /> {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="gd-pdf-loading">
          <Loader size={20} className="gd-pdf-spinner" />
          <span>Loading certificate…</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="gd-pdf-fallback">
          <FileText size={32} />
          <p>Could not load certificate preview</p>
          <button
            type="button"
            className="gd-pdf-download-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      )}

      {/* iframe preview — no temp file side-effect unlike <object> */}
      {!loading && !error && blobUrl && (
        <iframe
          src={blobUrl}
          className="gd-pdf-object"
          title="Certificate preview"
          // Explicitly disable download prompt in supported browsers
          sandbox="allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
};

export default PdfViewer;