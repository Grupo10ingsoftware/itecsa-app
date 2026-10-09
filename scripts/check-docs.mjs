import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ignoredDirectories = new Set([
  '.git', '.agents', '.codex', '.cache', '.venv', 'node_modules',
  'dist', 'build', 'coverage', 'target',
]);
const historicalReports = /^docs\/archivo\/(auditorias|implementaciones)\/(?!README\.md$)/i;
const blank = (text) => text.replace(/[^\r\n]/g, ' ');
const referenceId = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();

// Keep offsets and newlines intact so diagnostics refer to the original document.
function maskCode(markdown) {
  let fence;
  const fenced = markdown.split(/(?<=\n)/).map((line) => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)/);
    if (fence) {
      if (marker && marker[1][0] === fence[0] &&
          marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      return blank(line);
    }
    if (marker) {
      fence = marker[1];
      return blank(line);
    }
    if (/^( {4}|\t)/.test(line)) return blank(line);
    return line;
  }).join('');
  return fenced.replace(/<!--[^]*?-->|(`+)(?!`)[^]*?\1(?!`)/g, blank);
}

function closingBracket(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === '[') depth++;
    if (text[i] === ']' && --depth === 0) return i;
  }
  return -1;
}

function inlineDestination(text, start) {
  let i = start;
  while (/\s/.test(text[i] ?? '') && i < text.length) i++;
  if (text[i] === '<') {
    const end = text.indexOf('>', i + 1);
    if (end === -1) return null;
    return { target: text.slice(i + 1, end), end: end + 1 };
  }
  const beginning = i;
  let depth = 0;
  for (; i < text.length; i++) {
    if (text[i] === '\\') { i++; continue; }
    if (text[i] === '(') depth++;
    else if (text[i] === ')') {
      if (!depth) break;
      depth--;
    } else if (/\s/.test(text[i]) && !depth) break;
  }
  return { target: text.slice(beginning, i), end: i };
}

export function markdownLinks(markdown) {
  let content = maskCode(markdown);
  const definitions = new Map();
  content = content.replace(/^ {0,3}\[([^\]\n]+)\]:[^\n]*/gm, (definition, id) => {
    const destination = inlineDestination(definition, definition.indexOf(']:') + 2);
    if (destination && !definitions.has(referenceId(id))) {
      definitions.set(referenceId(id), destination.target);
    }
    return blank(definition);
  });
  const links = [];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\\') { i++; continue; }
    if (content[i] !== '[') continue;
    const endLabel = closingBracket(content, i);
    if (endLabel === -1) continue;
    const label = content.slice(i + 1, endLabel);
    let end = endLabel;
    let target;
    let missingReference;
    if (content[endLabel + 1] === '(') {
      const destination = inlineDestination(content, endLabel + 2);
      if (!destination) continue;
      const tail = content.slice(destination.end).match(/^\s*(?:(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\))\s*)?\)/);
      if (!tail) continue;
      target = destination.target;
      end = destination.end + tail[0].length - 1;
    } else if (content[endLabel + 1] === '[') {
      end = closingBracket(content, endLabel + 1);
      if (end === -1) continue;
      const id = referenceId(content.slice(endLabel + 2, end) || label);
      target = definitions.get(id);
      if (target === undefined) missingReference = id;
    } else {
      target = definitions.get(referenceId(label));
      if (target === undefined) { i = endLabel; continue; }
    }
    links.push({ target, missingReference, line: content.slice(0, i).split('\n').length });
    i = end;
  }
  return links;
}

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) return markdownFiles(path);
      return entry.isFile() && /\.mdx?$/i.test(entry.name) ? [path] : [];
    });
}

export function checkDocumentation(root) {
  const errors = [];
  const files = markdownFiles(root);
  for (const file of files) {
    const name = relative(root, file).replaceAll('\\', '/');
    const original = readFileSync(file, 'utf8');
    // Only the added context banner is current; the original report is evidence.
    const content = historicalReports.test(name) ? original.split(/\r?\n\s*\r?\n/)[0] : original;
    for (const link of markdownLinks(content)) {
      if (link.missingReference !== undefined) {
        errors.push({ file: name, line: link.line, target: `[${link.missingReference}]`, message: 'Referencia Markdown sin definición' });
        continue;
      }
      const target = link.target.replace(/\\([\\()[\]<> ])/g, '$1');
      if (!target || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(target)) continue;
      let pathname = target.split(/[?#]/, 1)[0];
      try { pathname = decodeURIComponent(pathname); } catch { /* Literal percent in a filename. */ }
      if (!pathname) continue;
      const destination = pathname.startsWith('/')
        ? resolve(root, `.${pathname}`)
        : resolve(dirname(file), pathname);
      if (!existsSync(destination)) {
        errors.push({ file: name, line: link.line, target: link.target, message: 'Destino local inexistente' });
      }
    }
  }
  return { checkedFiles: files.length, errors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = checkDocumentation(fileURLToPath(new URL('../', import.meta.url)));
    for (const error of result.errors) {
      console.error(`${error.file}:${error.line}: ${error.message}: ${error.target}`);
    }
    if (result.errors.length) {
      console.error(`Documentación: ${result.errors.length} error(es) en ${result.checkedFiles} archivo(s).`);
      process.exitCode = 1;
    } else console.log(`Documentación: enlaces locales válidos en ${result.checkedFiles} archivo(s).`);
  } catch (error) {
    console.error(`No se pudo comprobar la documentación: ${error.message}`);
    process.exitCode = 1;
  }
}
