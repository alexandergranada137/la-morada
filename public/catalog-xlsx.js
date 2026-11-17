/* Read the first sheet of an Excel workbook using the catalogue headers. */
function readCatalogWorkbook(buffer) {
  let total = 0;
  const files = fflate.unzipSync(new Uint8Array(buffer), {
    filter({ name, originalSize }) {
      if (!/^xl\/(?:workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(name)) return false;
      total += originalSize;
      if (total > 8 * 1024 * 1024) throw new Error('El libro de Excel contiene demasiados datos.');
      return true;
    }
  });
  function xml(path) {
    if (!files[path]) throw new Error('No se pudo leer la hoja de Excel.');
    const doc = new DOMParser().parseFromString(fflate.strFromU8(files[path]), 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('El libro de Excel contiene datos inválidos.');
    return doc;
  }
  const sheet = xml('xl/workbook.xml').getElementsByTagNameNS('*', 'sheet')[0];
  const sheetId = sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet?.getAttribute('r:id');
  const relation = [...xml('xl/_rels/workbook.xml.rels').getElementsByTagNameNS('*', 'Relationship')]
    .find(item => item.getAttribute('Id') === sheetId && item.getAttribute('Type')?.endsWith('/worksheet'));
  const target = relation?.getAttribute('Target') || '';
  const path = target.startsWith('/') ? target.slice(1) : 'xl/' + target;
  const strings = files['xl/sharedStrings.xml'] ? [...xml('xl/sharedStrings.xml').getElementsByTagNameNS('*', 'si')].map(readText) : [];
  function readText(node) {
    return [...node.getElementsByTagNameNS('*', 't')].map(part => part.textContent).join('');
  }
  return [...xml(path).getElementsByTagNameNS('*', 'row')].map(row => {
    const cells = [];
    for (const cell of row.getElementsByTagNameNS('*', 'c')) {
      const col = cell.getAttribute('r')?.match(/^[A-Z]{1,3}/)?.[0];
      if (!col) continue;
      const index = [...col].reduce((n, letter) => n * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      const type = cell.getAttribute('t');
      const value = cell.getElementsByTagNameNS('*', 'v')[0]?.textContent ?? '';
      cells[index] = type === 's' && value !== '' ? strings[Number(value)] ?? '' : type === 'inlineStr' ? readText(cell) : value;
    }
    while (cells.length && !cells.at(-1)) cells.pop();
    return Array.from(cells, value => value ?? '');
  });
}
