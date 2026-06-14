import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRootDirectory = path.resolve(currentDirectory, "../../../..");
const projectRootDirectory = path.resolve(serverRootDirectory, "..");
const salesNotesDirectory = path.resolve(projectRootDirectory, "data", "NVS");

function isPdfFilename(filename) {
  return typeof filename === "string" && /^[^\\/]+\.pdf$/i.test(filename);
}

function resolvePdfPathInsideDirectory(directory, filename) {
  if (!isPdfFilename(filename)) {
    return null;
  }

  const safeFilename = path.basename(filename);
  const resolvedPath = path.resolve(directory, safeFilename);

  if (!resolvedPath.startsWith(`${directory}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

export class DocumentRepo {
  resolveSalesNotePdfPath(filename) {
    return resolvePdfPathInsideDirectory(salesNotesDirectory, filename);
  }
}

export function resolveSalesNotePdfPath(filename) {
  return new DocumentRepo().resolveSalesNotePdfPath(filename);
}

export default DocumentRepo;
