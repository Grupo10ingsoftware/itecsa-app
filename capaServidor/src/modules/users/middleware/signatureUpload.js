import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../../../..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const signaturesDirectory = path.resolve(projectRootDirectory, "data/Firmas");
const projectDirectoryName = path.basename(projectRootDirectory);

const ALLOWED_SIGNATURE_TYPES = new Map([
    [".pdf", new Set(["application/pdf"])],
    [".xml", new Set(["application/xml", "text/xml"])],
    [
        ".cms",
        new Set([
            "application/cms",
            "application/pkcs7-mime",
            "application/pkcs7-signature",
            "application/octet-stream",
        ]),
    ],
    [
        ".p7s",
        new Set([
            "application/cms",
            "application/pkcs7-mime",
            "application/pkcs7-signature",
            "application/octet-stream",
        ]),
    ],
    [
        ".p7m",
        new Set([
            "application/cms",
            "application/pkcs7-mime",
            "application/pkcs7-signature",
            "application/octet-stream",
        ]),
    ],
]);

function getSafeExtension(file) {
    return path.extname(file.originalname).toLowerCase();
}

function buildStoredSignaturePath(filename) {
    return path.join(projectDirectoryName, "data", "Firmas", filename);
}

function ensureSignaturesDirectory() {
    fs.mkdirSync(signaturesDirectory, { recursive: true });
}

function signatureFileFilter(req, file, callback) {
    const extension = getSafeExtension(file);
    const expectedMimeTypes = ALLOWED_SIGNATURE_TYPES.get(extension);

    if (!expectedMimeTypes || !expectedMimeTypes.has(file.mimetype)) {
        return callback(
            new Error(
                "La firma electronica debe ser XML, CMS o PDF.",
            ),
        );
    }

    return callback(null, true);
}

const signatureStorage = multer.diskStorage({
    destination(req, file, callback) {
        ensureSignaturesDirectory();
        callback(null, signaturesDirectory);
    },
    filename(req, file, callback) {
        const extension = getSafeExtension(file);
        callback(null, `firma-${Date.now()}-${randomUUID()}${extension}`);
    },
});

const upload = multer({
    storage: signatureStorage,
    fileFilter: signatureFileFilter,
    limits: {
        files: 1,
        fileSize: 10 * 1024 * 1024,
    },
});

export function deleteSignatureFile(filePath) {
    if (!filePath) {
        return;
    }

    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(signaturesDirectory)) {
        return;
    }

    fs.rmSync(resolvedPath, { force: true });
}

export function uploadSignatureFile(req, res, next) {
    upload.single("firmaElectronica")(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message:
                    error instanceof multer.MulterError
                        ? "La firma electronica no es valida."
                        : error.message,
            });
        }

        if (req.file) {
            req.signatureFile = {
                ...req.file,
                storedPath: buildStoredSignaturePath(req.file.filename),
            };
        }

        return next();
    });
}
