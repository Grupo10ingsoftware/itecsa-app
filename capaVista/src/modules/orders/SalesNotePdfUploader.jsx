/**
 * @param {File|null} pdfFile — archivo PDF seleccionado por el usuario
 */
export default function SalesNotePdfUploader({ pdfFile }) {
  // Genera una URL de objeto para lo visualización del PDF en el iframe
  const fileUrl = pdfFile ? URL.createObjectURL(pdfFile) : null

  if (!pdfFile) {
    return (
      <div className="card border">
        <div className="card-body text-center text-muted py-5">
          <i className="bi bi-file-earmark-pdf fs-2 d-block mb-2" />
          <p className="mb-0 small">Sin archivo PDF cargado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card border">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <span className="fw-semibold small">
          <i className="bi bi-file-earmark-pdf me-1" />
          Vista previa — {pdfFile.name}
        </span>
        <span className="badge bg-secondary small">
          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
        </span>
      </div>
      <div style={{ height: '360px', overflow: 'hidden' }}>
        <iframe
          src={fileUrl}
          title="Vista previa Nota de Venta PDF"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  )
}
