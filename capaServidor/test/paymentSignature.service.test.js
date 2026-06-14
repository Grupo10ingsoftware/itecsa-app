import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { PDFDocument } from "pdf-lib";

import PaymentSignatureService from "../src/modules/documents/service/paymentSignature.service.js";

const CURRENT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(CURRENT_DIRECTORY, "../..");
const TEST_SALES_NOTE_PATH = path.resolve(PROJECT_ROOT, "data", "NVS", "Pedido99.pdf");
const TEST_SIGNATURE_PATH = path.resolve(PROJECT_ROOT, "data", "Firmas", "firma-test-pago.xml");
const TEST_SIGNED_PATH = path.resolve(
  PROJECT_ROOT,
  "data",
  "NVS",
  "Firmadas",
  "Pedido99-firmado.pdf",
);
const TEST_SALES_NOTE_STORED_PATH = "itecsa-app\\data\\NVS\\Pedido99.pdf";
const TEST_SIGNATURE_STORED_PATH = "itecsa-app\\data\\Firmas\\firma-test-pago.xml";

afterEach(async () => {
  await fs.rm(TEST_SALES_NOTE_PATH, { force: true });
  await fs.rm(TEST_SIGNATURE_PATH, { force: true });
  await fs.rm(TEST_SIGNED_PATH, { force: true });
});

async function writeTestFiles() {
  await fs.rm(TEST_SIGNED_PATH, { force: true });

  const pdfDoc = await PDFDocument.create();
  pdfDoc.addPage([612, 792]);
  const bytes = await pdfDoc.save();

  await fs.mkdir(path.dirname(TEST_SALES_NOTE_PATH), { recursive: true });
  await fs.mkdir(path.dirname(TEST_SIGNATURE_PATH), { recursive: true });
  await fs.writeFile(TEST_SALES_NOTE_PATH, bytes);
  await fs.writeFile(TEST_SIGNATURE_PATH, "<Signature>test</Signature>");
}

function createPrismaMock({
  existingPaymentSignature = false,
  signatureStoredPath = TEST_SIGNATURE_STORED_PATH,
} = {}) {
  const state = {
    firmaDocumento: existingPaymentSignature
      ? [
          {
            id_firma_documento: 7,
            hash_firma: "hash-anterior",
            fecha_firma: new Date("2026-06-13T00:00:00.000Z"),
            id_usuario: 10,
            id_documento: 99,
            Firma_Pago: { id_firma_documento: 7 },
          },
        ]
      : [],
    firmaPago: existingPaymentSignature
      ? [{ id_firma_documento: 7 }]
      : [],
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
              Firma_Documento: state.firmaDocumento,
            },
          ],
        };
      },
    },
    usuario: {
      async findUnique() {
        return {
          id_usuario: 10,
          ruta_firma: signatureStoredPath,
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
      async update({ where, data }) {
        const index = state.firmaDocumento.findIndex(
          (signature) =>
            signature.id_firma_documento === where.id_firma_documento,
        );

        state.firmaDocumento[index] = {
          ...state.firmaDocumento[index],
          ...data,
        };

        return state.firmaDocumento[index];
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
  const originalBytes = await fs.readFile(TEST_SALES_NOTE_PATH);
  const prisma = createPrismaMock();
  const service = new PaymentSignatureService({ prisma });

  const signature = await service.signPaymentDocument(99, 10);
  const signedBytes = await fs.readFile(TEST_SALES_NOTE_PATH);

  assert.equal(signature.id_firma_documento, 1);
  assert.equal(prisma.state.firmaDocumento.length, 1);
  assert.equal(prisma.state.firmaDocumento[0].id_documento, 99);
  assert.equal(prisma.state.firmaDocumento[0].id_usuario, 10);
  assert.match(prisma.state.firmaDocumento[0].hash_firma, /^[a-f0-9]{64}$/);
  assert.deepEqual(prisma.state.firmaPago, [{ id_firma_documento: 1 }]);
  assert.equal(prisma.state.notaVenta.firmado, 1);
  assert.notEqual(Buffer.compare(originalBytes, signedBytes), 0);
  await assert.rejects(
    () => fs.stat(TEST_SIGNED_PATH),
    { code: "ENOENT" },
  );
});

test("repara PDF vigente si ya existe Firma_Pago sin duplicar registros", async () => {
  await writeTestFiles();
  const originalBytes = await fs.readFile(TEST_SALES_NOTE_PATH);
  const prisma = createPrismaMock({ existingPaymentSignature: true });
  const service = new PaymentSignatureService({ prisma });

  const signature = await service.signPaymentDocument(99, 10);
  const signedBytes = await fs.readFile(TEST_SALES_NOTE_PATH);

  assert.equal(signature.id_firma_documento, 7);
  assert.equal(prisma.state.firmaDocumento.length, 1);
  assert.equal(prisma.state.firmaPago.length, 1);
  assert.notEqual(prisma.state.firmaDocumento[0].hash_firma, "hash-anterior");
  assert.notEqual(Buffer.compare(originalBytes, signedBytes), 0);
});

test("preview firmado no sobrescribe el PDF vigente ni crea firma", async () => {
  await writeTestFiles();
  const originalBytes = await fs.readFile(TEST_SALES_NOTE_PATH);
  const prisma = createPrismaMock();
  const service = new PaymentSignatureService({ prisma });

  const previewBytes = await service.previewSignedPaymentDocument(99, 10);
  const currentBytes = await fs.readFile(TEST_SALES_NOTE_PATH);

  assert.ok(previewBytes.length > 0);
  assert.equal(Buffer.compare(originalBytes, currentBytes), 0);
  assert.equal(prisma.state.firmaDocumento.length, 0);
  assert.equal(prisma.state.firmaPago.length, 0);
  assert.equal(prisma.state.notaVenta.firmado, 0);
});

test("genera PDF firmado adjuntando evidencia CMS y PDF", async () => {
  const variants = [
    {
      path: path.resolve(PROJECT_ROOT, "data", "Firmas", "firma-test-pago.cms"),
      storedPath: "itecsa-app\\data\\Firmas\\firma-test-pago.cms",
      bytes: Buffer.from("cms-test"),
    },
    {
      path: path.resolve(PROJECT_ROOT, "data", "Firmas", "firma-test-pago.pdf"),
      storedPath: "itecsa-app\\data\\Firmas\\firma-test-pago.pdf",
      bytes: await PDFDocument.create().then(async (pdfDoc) => {
        pdfDoc.addPage([100, 100]);
        return Buffer.from(await pdfDoc.save());
      }),
    },
  ];

  for (const variant of variants) {
    await writeTestFiles();
    await fs.writeFile(variant.path, variant.bytes);

    try {
      const originalBytes = await fs.readFile(TEST_SALES_NOTE_PATH);
      const prisma = createPrismaMock({ signatureStoredPath: variant.storedPath });
      const service = new PaymentSignatureService({ prisma });

      const signature = await service.signPaymentDocument(99, 10);
      const signedBytes = await fs.readFile(TEST_SALES_NOTE_PATH);

      assert.equal(signature.id_firma_documento, 1);
      assert.equal(prisma.state.firmaDocumento.length, 1);
      assert.equal(prisma.state.notaVenta.firmado, 1);
      assert.notEqual(Buffer.compare(originalBytes, signedBytes), 0);
    } finally {
      await fs.rm(variant.path, { force: true });
    }
  }
});
