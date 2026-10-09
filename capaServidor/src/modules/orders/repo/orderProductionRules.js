

export function normalizeProcessName(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

export function isLanyardProduct(value) {
  return normalizeProcessName(value).includes("lanyard");
}

export function isPackagingSubprocess(process) {
  return normalizeProcessName(process?.Estado_Subprocesos?.nombre_estado).includes("empaquet");
}

export function stripLanyardProgressObservation(value) {
  return String(value ?? "")
    .replace(/Avance Lanyard:\s*\d+%\s*(?:\(\d+\/\d+ producidos\))?/gi, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}
