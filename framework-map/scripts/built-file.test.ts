import { describe, expect, it } from 'vitest';
import { checkBuiltFile } from './built-file.mjs';

const rules = { maxBytes: 1000, mustContain: ['graph-title'], mustNotContain: ['tuning-panel'] };

const page = (head: string, body = 'graph-title'): string =>
  `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

describe('checkBuiltFile', () => {
  it('passes a self-contained file', () => {
    const html = page(
      '<link rel="icon" href="data:,"><style>@font-face{src:url(data:font/woff2;base64,AAAA)}</style>' +
        '<script type="module">console.log(1)</script>',
    );
    expect(checkBuiltFile(html, rules)).toEqual([]);
  });

  it('reports a file over the size budget', () => {
    const faults = checkBuiltFile(page('', 'graph-title' + 'x'.repeat(1000)), rules);
    expect(faults).toHaveLength(1);
    expect(faults[0]).toMatch(/1000 bytes/);
  });

  it('reports a script loaded from another file', () => {
    const faults = checkBuiltFile(page('<script type="module" src="./main.js"></script>'), rules);
    expect(faults).toEqual([expect.stringContaining('./main.js')]);
  });

  it('reports a stylesheet loaded from another file', () => {
    const faults = checkBuiltFile(page('<link rel="stylesheet" href="./styles.css">'), rules);
    expect(faults).toEqual([expect.stringContaining('./styles.css')]);
  });

  it('reports a font or image that a style block loads from another file', () => {
    const faults = checkBuiltFile(page('<style>@font-face{src:url("./geist.woff2")}</style>'), rules);
    expect(faults).toEqual([expect.stringContaining('./geist.woff2')]);
  });

  it('reports an image loaded from another file', () => {
    const faults = checkBuiltFile(page('', 'graph-title <img src=" ./stack.png">'), rules);
    expect(faults).toEqual([expect.stringContaining('./stack.png')]);
  });

  it('reports a stylesheet imported by a style block', () => {
    const faults = checkBuiltFile(page('<style>@import "./more.css";</style>'), rules);
    expect(faults).toEqual([expect.stringContaining('./more.css')]);
  });

  it('accepts inline data whatever its letter case, and attributes that only end in src', () => {
    const html = page('<style>a{background:url(DATA:image/png;base64,AAAA)}</style>', 'graph-title <i data-src="x.png"></i>');
    expect(checkBuiltFile(html, rules)).toEqual([]);
  });

  it('reports text that must not be in the file', () => {
    const faults = checkBuiltFile(page('', 'graph-title tuning-panel'), rules);
    expect(faults).toEqual([expect.stringContaining('tuning-panel')]);
  });

  it('reports text that is missing from the file', () => {
    const faults = checkBuiltFile(page('', 'nothing'), rules);
    expect(faults).toEqual([expect.stringContaining('graph-title')]);
  });
});
