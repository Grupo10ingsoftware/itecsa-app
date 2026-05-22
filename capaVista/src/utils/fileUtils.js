export async function downloadNVPDF(nvNumber) {
  const safeNvNumber = String(nvNumber ?? 'nota-venta').replace(/[^a-zA-Z0-9_-]/g, '_')
  const content = [
    'Nota de venta simulada',
    `Numero: ${nvNumber}`,
    '',
    'Archivo generado solo para evidencia visual del frontend inicial.',
    'La descarga real del PDF debe quedar en backend/integracion.',
  ].join('\n')
  const blob = new Blob([content], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${safeNvNumber}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
