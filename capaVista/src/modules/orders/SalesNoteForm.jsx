import { useState, useCallback } from 'react'
import TextInput from '@/shared/components/forms/TextInput'
import FileInput from '@/shared/components/forms/FileInput'
import SalesNotePdfUploader from './SalesNotePdfUploader'

/**
 * SalesNoteForm — formulario específico del ingreso de Nota de Venta.
 * Contiene los campos requeridos por RF19: código de NV y carga de archivo PDF.
 * Incluye botón de búsqueda que dispara la consulta al manager (por definir).
 *
 * RF19: Formulario que solicita Número de Nota de Venta y archivo PDF.
 * RF20: Búsqueda asociada al número de NV para autocompletar campos.
 * RF25: Permite adjuntar archivos de diseño (PDF).
 *
 * @param {Object}   props
 * @param {string}   props.nvCode          — código de Nota de Venta ingresado
 * @param {(v:string)=>void} props.onNvCodeChange — callback al cambiar el código NV
 * @param {File|null} props.pdfFile          — archivo PDF de NV adjunto
 * @param {(f:File|null)=>void} props.onPdfFileChange — callback al cambiar el archivo PDF
 * @param {File|null} [props.designFile]       — archivo de diseño adjunto (RF25)
 * @param {(f:File|null)=>void} props.onDesignFileChange — callback adjuntar diseño
 * @param {()=>void} props.onSearchNv      — callback al pulsar el botón de búsqueda / exportar
 * @param {string}   [props.errorNvCode]   — mensaje de error para el campo código NV
 * @param {string}   [props.errorPdf]      — mensaje de error para el campo PDF
 * @param {boolean}  [props.disabled=false]
 */
export default function SalesNoteForm({
  nvCode,
  onNvCodeChange,
  pdfFile,
  onPdfFileChange,
  designFile,
  onDesignFileChange,
  onSearchNv,
  errorNvCode,
  errorPdf,
  disabled = false,
}) {
  const [showPdfPreview, setShowPdfPreview] = useState(false)

  const handleShowPreview = useCallback(() => {
    if (pdfFile) setShowPdfPreview((p) => !p)
  }, [pdfFile])

  return (
    <div className="card border mb-4">
      <div className="card-header bg-light">
        <h5 className="card-title mb-0">
          <i className="bi bi-file-earmark-text me-2" />
          Datos de Nota de Venta
        </h5>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {/* Campo: Código de Nota de Venta */}
          <div className="col-md-6">
            <TextInput
              label="Código de Nota de Venta"
              name="nvCode"
              id="nvCode"
              value={nvCode}
              onChange={(e) => onNvCodeChange(e.target.value)}
              placeholder="Ingrese el código de NV (ej. NV-2024-0014)"
              disabled={disabled}
              error={errorNvCode}
            />
          </div>

          {/* Botón: Búsqueda / Exportar info del manager */}
          <div className="col-md-6 d-flex align-items-end">
            <button
              className="btn btn-primary w-100"
              type="button"
              onClick={onSearchNv}
              disabled={disabled || !nvCode.trim()}
              title="Buscar información de la Nota de Venta en el sistema manager"
            >
              <i className="bi bi-search me-2" />
              Buscar / Exportar información
            </button>
          </div>

          {/* Campo: Adjuntar PDF de Nota de Venta */}
          <div className="col-12">
            <FileInput
              label="Archivo PDF — Nota de Venta"
              file={pdfFile}
              onFileChange={onPdfFileChange}
              accept="application/pdf"
              maxSizeMB={10}
              error={errorPdf}
              disabled={disabled}
            />
          </div>

          {/* Botón adjuntar PDF — mostrar vista previa */}
          {pdfFile && (
            <div className="col-12">
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={handleShowPreview}
              >
                <i className={`bi ${showPdfPreview ? 'bi-eye-slash' : 'bi-eye'} me-1`} />
                {showPdfPreview ? 'Ocultar vista previa' : 'Ver vista previa del PDF'}
              </button>
            </div>
          )}

          {/* Vista previa del PDF de la Nota de Venta */}
          {showPdfPreview && pdfFile && (
            <div className="col-12">
              <SalesNotePdfUploader pdfFile={pdfFile} disabled={disabled} />
            </div>
          )}

          {/* Separador / título archivos de diseño (RF25) */}
          <div className="col-12">
            <hr />
            <h6 className="text-secondary mb-3">
              <i className="bi bi-palette me-2" />
              Archivos de Diseño <span className="badge bg-secondary ms-1">Opcional</span>
            </h6>
          </div>

          {/* adjuntar PDF de diseño (RF25) */}
          <div className="col-12 d-md-8">
            <FileInput
              label="Adjuntar archivo de diseño PDF"
              file={designFile}
              onFileChange={onDesignFileChange}
              accept="application/pdf"
              maxSizeMB={10}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
