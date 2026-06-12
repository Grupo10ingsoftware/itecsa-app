import { useState, useCallback } from 'react'
import { PRODUCT_TYPE_OPTIONS } from '@/config/productTypes'
import { formatDateTimeDDMMYYYY, formatRut } from '@/utils/formatters'
import SalesNoteForm from '../SalesNoteForm'

/**
 * orderForm — contenedor principal del formulario de creación de pedido.
 * Agrupa la sección de Nota de Venta, la vista previa de datos importados
 * desde el manager, el campo de comentarios y los botones de acción.
 *
 * RF19: Formulario de ingreso de NV con número y archivo PDF.
 * RF20: Autocompleta campos después de la búsqueda asociada al número de NV.
 * RF21: Registra fecha y hora de creación del pedido.
 * RF22: Identifica el producto como Lanyard o Tarjeta.
 * RF25: Permite adjuntar archivos de diseño.
 *
 * @param {Object}   props
 * @param {Object}   props.formData       — estado completo del formulario
 * @param {Function} props.onFieldChange  — callback genérico de cambio de campo
 * @param {Function} props.onSearchNv     — callback al buscar/exportar NV del manager
 * @param {Function} props.onConfirmOrder — callback al confirmar el pedido
 * @param {Object}   props.errors         — errores de validación
 * @param {boolean}  [props.disabled=false]
 */
export default function OrderForm({
  formData,
  onFieldChange,
  onSearchNv,
  onConfirmOrder,
  errors,
  disabled = false,
}) {
  const [showPreview, setShowPreview] = useState(false)

  const togglePreview = useCallback(() => {
    setShowPreview((prev) => !prev)
  }, [])

  const hasPreviewData =
    formData.companyName || formData.rut || formData.productDescription

  return (
    <div className="card border">
      <div className="card-header bg-light">
        <h5 className="card-title mb-0">
          <i className="bi bi-receipt me-2" />
          Registro de Pedido . Nota de Venta
        </h5>
      </div>
      <div className="card-body">
        {/* ── Sección 1: Datos de Nota de Venta ── */}
        <SalesNoteForm
          nvCode={formData.nvCode}
          onNvCodeChange={(val) => onFieldChange('nvCode', val)}
          pdfFile={formData.pdfFile}
          onPdfFileChange={(val) => onFieldChange('pdfFile', val)}
          designFile={formData.designFile}
          onDesignFileChange={(val) => onFieldChange('designFile', val)}
          onSearchNv={onSearchNv}
          errorNvCode={errors.nvCode}
          errorPdf={errors.pdfFile}
          disabled={disabled}
        />

        {/* ── Datos de Fabricación ── */}
        <div className="card border mb-4">
          <div className="card-header bg-light d-flex justify-content-between align-items-center">
            <h6 className="card-title mb-0">
              <i className="bi bi-gear me-2" />
              Datos de Fabricación
            </h6>
            {hasPreviewData && (
              <button
                className={`btn btn-sm ${showPreview ? 'btn-secondary' : 'btn-outline-secondary'}`}
                type="button"
                onClick={togglePreview}
              >
                <i className={`bi ${showPreview ? 'bi-eye-slash' : 'bi-eye'} me-1`} />
                {showPreview ? 'Ocultar' : 'Ver vista previa'}
              </button>
            )}
          </div>
          <div className="card-body">
            {/* Datos autocompletados desde el manager (RF20) — solo lectura */}
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label text-secondary">Razón Social</label>
                <input
                  type="text"
                  className={`form-control ${!formData.companyName ? 'is-invalid' : ''}`}
                  value={formData.companyName || ''}
                  readOnly
                  placeholder="Se completará automáticamente al buscar la NV"
                />
                {!formData.companyName && (
                  <div className="invalid-feedback d-block">
                    Campo obligatorio . buscar la NV primero
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label text-secondary">RUT Cliente</label>
                <input
                  type="text"
                  className={`form-control ${!formData.rut ? 'is-invalid' : ''}`}
                  value={formData.rut || ''}
                  readOnly
                  placeholder="Se completará automáticamente al buscar la NV"
                />
                {!formData.rut && (
                  <div className="invalid-feedback d-block">
                    Campo obligatorio — buscar la NV primero
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <label className="form-label text-secondary">Descripción de Producto</label>
                <input
                  type="text"
                  className={`form-control ${!formData.productDescription ? 'is-invalid' : ''}`}
                  value={formData.productDescription || ''}
                  readOnly
                  placeholder="Se completará automáticamente al buscar la NV"
                />
                {!formData.productDescription && (
                  <div className="invalid-feedback d-block">
                    Campo obligatorio — buscar la NV primero
                  </div>
                )}
              </div>

              <div className="col-md-3">
                <label className="form-label text-secondary">Cantidad</label>
                <input
                  type="number"
                  className={`form-control ${errors.quantity ? 'is-invalid' : ''}`}
                  name="quantity"
                  value={formData.quantity || ''}
                  onChange={(e) => onFieldChange('quantity', e.target.value)}
                  placeholder="Ej. 200"
                  min="1"
                />
                {errors.quantity && (
                  <div className="invalid-feedback d-block">{errors.quantity}</div>
                )}
              </div>

              <div className="col-md-3">
                <label className="form-label text-secondary">Tipo de Producto</label>
                <select
                  className={`form-select ${errors.productType ? 'is-invalid' : ''}`}
                  name="productType"
                  value={formData.productType || ''}
                  onChange={(e) => onFieldChange('productType', e.target.value)}
                >
                  <option value="">Seleccione…</option>
                  {PRODUCT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.productType && (
                  <div className="invalid-feedback d-block">{errors.productType}</div>
                )}
                <small className="text-muted">
                  Identifica el producto como Lanyard o Tarjeta
                </small>
              </div>

              <div className="col-12">
                <label className="form-label text-secondary">Datos para Fabricación</label>
                <textarea
                  className={`form-control ${errors.manufacturingData ? 'is-invalid' : ''}`}
                  name="manufacturingData"
                  rows={2}
                  value={formData.manufacturingData || ''}
                  onChange={(e) => onFieldChange('manufacturingData', e.target.value)}
                  placeholder="Especificaciones de fabricación, materiales, colores…"
                />
                {errors.manufacturingData && (
                  <div className="invalid-feedback d-block">{errors.manufacturingData}</div>
                )}
              </div>
            </div>

            {/* ── Vista previa detallada ── */}
            {showPreview && hasPreviewData && (
              <div className="mt-4 p-3 bg-light border rounded">
                <h6 className="fw-semibold mb-3">
                  <i className="bi bi-binoculars me-2" />
                  Vista previa de datos importados desde el manager
                </h6>
                <div className="row g-2 small">
                  <div className="col-md-6">
                    <strong>Razón Social:</strong>
                    <br />
                    <span className="text-muted">{formData.companyName}</span>
                  </div>
                  <div className="col-md-6">
                    <strong>RUT Cliente:</strong>
                    <br />
                    <span className="text-muted">{formatRut(formData.rut)}</span>
                  </div>
                  <div className="col-md-12">
                    <strong>Descripción de Producto:</strong>
                    <br />
                    <span className="text-muted">{formData.productDescription}</span>
                  </div>
                  <div className="col-md-6">
                    <strong>Cantidad:</strong>
                    <br />
                    <span className="text-muted">{formData.quantity}</span>
                  </div>
                  <div className="col-md-6">
                    <strong>Tipo de Producto:</strong>
                    <br />
                    <span className="text-muted">{formData.productType}</span>
                  </div>
                  <div className="col-12">
                    <strong>Datos para Fabricación:</strong>
                    <br />
                    <span className="text-muted">{formData.manufacturingData}</span>
                  </div>
                  <div className="col-12">
                    <strong>NV PDF adjunto:</strong>
                    <br />
                    <span className="text-muted">
                      {formData.pdfFile ? formData.pdfFile.name : 'Sin archivo'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Campo de Comentario ── */}
        <div className="mb-4">
          <label className="form-label text-secondary">Comentario del pedido</label>
          <textarea
            className="form-control"
            name="comments"
            rows={3}
            value={formData.comments || ''}
            onChange={(e) => onFieldChange('comments', e.target.value)}
            placeholder="Ingrese comentarios sobre el pedido, observaciones o instrucciones especiales…"
          />
        </div>

        {/* ── Botones de acción ── */}
        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
          <div className="d-flex flex-wrap gap-2">
            {/* Botón: Confirmar pedido */}
            <button
              className="btn btn-success"
              type="button"
              onClick={onConfirmOrder}
              disabled={disabled || !formData.nvCode.trim()}
              title="Registrar el pedido con los datos ingresados"
            >
              <i className="bi bi-check-circle me-2" />
              Confirmar Pedido
            </button>
          </div>

          <small className="text-muted">
            <i className="bi bi-info-circle me-1" />
            Fecha actual: {formatDateTimeDDMMYYYY(new Date())}
          </small>
        </div>
      </div>
    </div>
  )
}
