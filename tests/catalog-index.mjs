import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const seo={};new Function('exports',ts.transpile(fs.readFileSync('lib/seo.ts','utf8'),{module:ts.ModuleKind.CommonJS}))(seo);
const catalog={};new Function('exports','require',ts.transpile(fs.readFileSync('lib/catalog-index.ts','utf8'),{module:ts.ModuleKind.CommonJS}))(catalog,()=>seo);
const available={block:'A',lot:4,area:346.53,usd_cents:6330000,status:'available'};
const html=catalog.lotCatalogHtml([
  available,
  {...available,block:'B'}, {...available,block:'I'},
  {...available,lot:5,status:'sold'}, {...available,lot:6,status:'separated'},
  {...available,lot:7,area:NaN}, {...available,block:'<script>'},
  {...available,lot:8,usd_cents:null},
]);
assert.match(html,/2 lotes disponibles/);assert.equal((html.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g)||[]).length,2);
assert.ok(html.includes('346.53 m²')&&html.includes('US$ 63,300'));
assert.ok(html.includes('manzana=A&amp;lote=4&amp;moneda=USD'));
assert.match(html,/<th scope="row"><a href="\/cotizacion\?/);
assert.ok(html.includes('Consultar'));
assert.ok(!html.includes('<script>')&&!html.includes('B ·')&&!html.includes('I ·'));
assert.ok(!catalog.lotCatalogHtml([]).includes('<table>'));
assert.ok(!catalog.lotCatalogHtml([{...available,usd_cents:0}]).includes('US$ 0'));
console.log('PASS: crawlable visible lot prices, cents/area precision, safe links, no sold/reserved/blocked inventory and graceful missing-data fallback.');
