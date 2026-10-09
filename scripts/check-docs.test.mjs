import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { checkDocumentation } from './check-docs.mjs';

function repository(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'itecsa-docs-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    const file = join(root, name);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

test('resolves relative links, repo-root paths, directory indexes and code assets', (t) => {
  const root = repository(t, {
    'README.md': '[Guía](docs/README.md)\n[Raíz](/src/app.js)\n[Carpeta](docs/)\n',
    'docs/README.md': '[Volver](../README.md#inicio)\n[Fuente](../src/app.js?view=raw#L2)',
    'src/app.js': '',
  });
  assert.deepEqual(checkDocumentation(root), { checkedFiles: 2, errors: [] });
});

test('reports each missing destination with its source line', (t) => {
  const root = repository(t, { 'docs/README.md': '# Inicio\n\n[Roto](missing.md)\n![Imagen](missing.png)\n' });
  assert.deepEqual(checkDocumentation(root).errors, [
    { file: 'docs/README.md', line: 3, target: 'missing.md', message: 'Destino local inexistente' },
    { file: 'docs/README.md', line: 4, target: 'missing.png', message: 'Destino local inexistente' },
  ]);
});

test('handles full, collapsed, shortcut and image references with normalized IDs', (t) => {
  const root = repository(t, {
    'README.md': '[Texto][Guía Local]\n[Guía local][]\n[GUÍA LOCAL]\n![Imagen][foto]\n[Dos puntos][guía:local]\n\n[guía   local]: docs/README.md "Título"\n[foto]: image.png\n[guía:local]: docs/README.md\n',
    'docs/README.md': '# Guía',
    'image.png': '',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('reports broken and undefined references at their use, leaves ordinary brackets alone', (t) => {
  const root = repository(t, {
    'README.md': '[Roto][ref]\n[Sin definición][ausente]\n[texto ordinario]\n\n[ref]: missing.md\n',
  });
  assert.deepEqual(checkDocumentation(root).errors.map(({ line, target }) => ({ line, target })), [
    { line: 1, target: 'missing.md' },
    { line: 2, target: '[ausente]' },
  ]);
});

test('supports spaces, escaped parentheses, nested parentheses and optional titles', (t) => {
  const root = repository(t, {
    'README.md': '[Uno](<docs/Guía local.md>)\n[Dos](docs/Gu%C3%ADa%20local.md "Título")\n[Tres](docs/nombre(1).md)\n[Cuatro](docs/nombre\\(1\\).md)\n[Referencia][guía]\n\n[guía]: <docs/Guía local.md>\n',
    'docs/Guía local.md': '',
    'docs/nombre(1).md': '',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('ignores external schemes, protocol-relative URLs and heading fragments', (t) => {
  const root = repository(t, {
    'README.md': '[Web](https://invalid.example/missing)\n[Mail](mailto:team@example.test)\n[Tab](codex://review)\n[Imagen](data:image/png;base64,abc)\n[URL](//invalid.example/file)\n[Sección](#no-verificada)\n[Query](?view=raw)\n',
  });
  assert.deepEqual(checkDocumentation(root).errors, []);
});

test('ignores code blocks and inline examples, preserving subsequent line diagnostics', (t) => {
  const root = repository(t, {
    'README.md': '```md\n[Roto](example.md)\n```\n~~~~\n~~~\n[Otro](example2.md)\n~~~~\n\n    [Código](example3.md)\n\n`[Inline](example4.md)`\n<!-- [Comentario](example5.md) -->\n[Real](missing.md)\n',
  });
  assert.deepEqual(checkDocumentation(root).errors.map(({ line, target }) => ({ line, target })), [
    { line: 13, target: 'missing.md' },
  ]);
});

test('ignores escaped link-like text but validates nested link labels', (t) => {
  const root = repository(t, { 'README.md': '\\[Ejemplo](missing.md)\n[Etiqueta [anidada]](missing2.md)\n' });
  assert.deepEqual(checkDocumentation(root).errors.map(({ line, target }) => ({ line, target })), [
    { line: 2, target: 'missing2.md' },
  ]);
});

test('preserves historical report references but checks current banners and archive indexes', (t) => {
  const root = repository(t, {
    'docs/README.md': '[Archivo](archivo/README.md)',
    'docs/archivo/README.md': '[Informe](auditorias/report.md)\n[Roto](missing.md)',
    'docs/archivo/auditorias/README.md': '[Índice](../README.md)',
    'docs/archivo/auditorias/report.md': '> [Vigente](../../README.md)\n> [Roto](../../missing.md)\n\n[Referencia histórica](old-code.js)',
    'docs/archivo/implementaciones/report.md': '> [Vigente](../../README.md)\n\n[Referencia histórica](removed.md)',
  });
  assert.deepEqual(checkDocumentation(root).errors.map(({ file, target }) => ({ file, target })), [
    { file: 'docs/archivo/auditorias/report.md', target: '../../missing.md' },
    { file: 'docs/archivo/README.md', target: 'missing.md' },
  ]);
});

test('does not inspect dependency, build or internal-agent directories', (t) => {
  const root = repository(t, {
    'README.md': '# Proyecto',
    'node_modules/pkg/README.md': '[Roto](missing.md)',
    'dist/README.md': '[Roto](missing.md)',
    '.git/README.md': '[Roto](missing.md)',
    '.agents/README.md': '[Roto](missing.md)',
    '.github/README.md': '[Roto](missing.md)',
  });
  assert.equal(checkDocumentation(root).checkedFiles, 2);
  assert.equal(checkDocumentation(root).errors[0].file, '.github/README.md');
});

test('CLI succeeds for valid docs and exits nonzero for a broken destination', (t) => {
  const root = repository(t, { 'README.md': '[Destino](target.md)', 'target.md': '# Destino' });
  mkdirSync(join(root, 'scripts'));
  const script = join(root, 'scripts/check-docs.mjs');
  copyFileSync(new URL('./check-docs.mjs', import.meta.url), script);
  const valid = spawnSync(process.execPath, [script], { encoding: 'utf8', cwd: tmpdir() });
  assert.ifError(valid.error);
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /enlaces locales válidos/);
  rmSync(join(root, 'target.md'));
  const invalid = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.ifError(invalid.error);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /README\.md:1: Destino local inexistente: target\.md/);
});
