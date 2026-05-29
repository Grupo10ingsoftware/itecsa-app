import sampleSalesNotePdfUrl from './documents/notv-42852.pdf'
import sampleSignedSalesNotePdfUrl from './documents/notv-42852-firmada-demo.pdf'

export const MOCK_SIGNATURE_NOTE = 'Firma digital demo aplicada'

export const MOCK_SALES_NOTE_DOCUMENT = {
  fileName: 'NOTV 42852.pdf',
  filePath: sampleSalesNotePdfUrl,
}

export const MOCK_SIGNED_SALES_NOTE_DOCUMENT = {
  fileName: 'NOTV 42852 - firma digital demo.pdf',
  filePath: sampleSignedSalesNotePdfUrl,
  signatureNote: MOCK_SIGNATURE_NOTE,
}
