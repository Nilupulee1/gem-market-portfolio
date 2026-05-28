import { useState } from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';
import '../../styles/gemdetails.css';

interface PdfViewerProps {
  url: string;
  fileName?: string;
}

/**
 * PDF viewer + download using the SAME download logic as admin PendingGems.
 * No { mode: 'cors' } option — plain fetch just like admin.
 */
const PdfViewer = ({ url, fileName = 'certificate.pdf' }: PdfViewerProps) => {
  const [downloading, setDownloading] = useState(false);

  // ── Identical to admin PendingGems.handleDownloadCertificate ──
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(url);                       // plain fetch — no extra options
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error('Download failed:', error);
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
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink size={12} /> Open
          </button>
          <button
            type="button"
            className="gd-pdf-download-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={12} /> {downloading ? 'Downloading…' : 'Download'}
          </button>
        </div>
      </div>

      <object data={url} type="application/pdf" className="gd-pdf-object">
        <div className="gd-pdf-fallback">
          <FileText size={32} />
          <p>PDF preview not available in your browser</p>
          <button
            type="button"
            className="gd-pdf-download-btn"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download size={14} /> Download PDF
          </button>
        </div>
      </object>
    </div>
  );
};

export default PdfViewer;
