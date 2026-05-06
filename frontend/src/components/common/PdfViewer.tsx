interface PdfViewerProps {
  url: string;
}

const PdfViewer = ({ url }: PdfViewerProps) => {
  return (
    <iframe
      src={url}
      title="PDF preview"
      className="w-100 rounded bg-white border"
      style={{ minHeight: '300px', border: 0 }}
    />
  );
};

export default PdfViewer;
