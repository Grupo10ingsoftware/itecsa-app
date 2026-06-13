import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { PDFDocument } from "pdf-lib";

import PaymentSignatureService, {
  buildStoredSignedSalesNotePath,
} from "../src/modules/documents/service/paymentSignature.service.js";

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CURRENT_DIRECTORY, "../..");
const TEST_SALES_NOTE_PATH = path.resolve(PROJECT_ROOT, "data", "NVS", "Pedido99.pdf");
const TEST_SIGNATURE_PATH = path.resolve(PROJECT_ROOT, "data", "Firmas", "firma-test-pago.png");
const TEST_SIGNED_PATH = path.resolve(
  PROJECT_ROOT,
  "data",
  "NVS",
  "Firmadas",
  "Pedido99-firmado.pdf",
);
const TEST_SALES_NOTE_STORED_PATH = "itecsa-app\\data\\NVS\\Pedido99.pdf";
const TEST_SIGNATURE_STORED_PATH = "itecsa-app\\data\\Firmas\\firma-test-pago.png";
const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l4oL1wAAAABJRU5ErkJggg==",
  "base64",
);

afterEach(async () => {
  await fs.rm(TEST_SALES_NOTE_PATH, { force: true });
  await fs.rm(TEST_SIGNATURE_PATH, { force: true });
  await fs.rm(TEST_SIGNED_PATH, { force: true });
});

async function writeTestFiles() {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([612, 792]);
  const bytes = await pdfDoc.save();

  await fs.mkdir(path.dirname(TEST_SALES_NOTE_PATH), { recursive: true });
  await fs.mkdir(path.dirname(TEST_SIGNATURE_PATH), { recursive: true });
  await fs.writeFile(TEST_SALES_NOTE_PATH, bytes);
  await fs.writeFile(TEST_SIGNATURE_PATH, ONE_PIXEL_PNG);
}

function createPrismaMock() {
  const state = {
    firmaDocumento: [],
    firmaPago: [],
    notaVenta: {
      id_documento: 99,
      firmado: 0,
      numero_nota_venta: "Pedido99",
    },
  };

  return {
    state,
    pedidos: {
      async findUnique() {
        return {
          Documento: [
            {
              id_documento: 99,
              ruta_pdf: TEST_SALES_NOTE_STORED_PATH,
              Nota_Venta: state.notaVenta,
              Firma_Documento: [],
            },
          ],
        };
      },
    },
    usuario: {
      async findUnique() {
        return {
          id_usuario: 10,
          ruta_firma: TEST_SIGNATURE_STORED_PATH,
        };
      },
    },
    firma_Documento: {
      async aggregate() {
        return { _max: { id_firma_documento: 0 } };
      },
      async create({ data }) {
        state.firmaDocumento.push(data);
        return data;
      },
    },
    firma_Pago: {
      async create({ data }) {
        state.firmaPago.push(data);
        return data;
      },
    },
    nota_Venta: {
      async update({ data }) {
        state.notaVenta = { ...state.notaVenta, ...data };
        return state.notaVenta;
      },
    },
  };
}

test("genera PDF firmado y registra Firma_Documento/Firma_Pago", async () => {
  await writeTestFiles();
  const prisma = createPrismaMock();
  const service = new PaymentSignatureService({ prisma });

  const signature = await service.signPaymentDocument(99, 10);
  const signedFile = await fs.stat(TEST_SIGNED_PATH);

  assert.equal(signature.id_firma_documento, 1);
  assert.equal(prisma.state.firmaDocumento.length, 1);
  assert.equal(prisma.state.firmaDocumento[0].id_documento, 99);
  assert.equal(prisma.state.firmaDocumento[0].id_usuario, 10);
  assert.match(prisma.state.firmaDocumento[0].hash_firma, /^[a-f0-9]{64}$/);
  assert.deepEqual(prisma.state.firmaPago, [{ id_firma_documento: 1 }]);
  assert.equal(prisma.state.notaVenta.firmado, 1);
  assert.equal(
    buildStoredSignedSalesNotePath(TEST_SALES_NOTE_STORED_PATH),
    "itecsa-app\\data\\NVS\\Firmadas\\Pedido99-firmado.pdf",
  );
  assert.ok(signedFile.size > 0);
});
