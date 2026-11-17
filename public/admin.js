const state = { lots: [], dirty: new Map(), setup: false, page: 1 };
const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 2 }).format(n || 0);

const message = (id, text, kind = '') => {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className = 'form-message ' + kind;
};

async function api(body) {
  const r = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) {const error=new Error(data.message || 'No se pudo completar la operación.');error.mfaRequired=data.mfaRequired;throw error;}
  return data;
}

async function load() {
  if($('#dashboard').hidden)$('#adminLoading').hidden=false;
  $('#retryAdminLoad').hidden=true;
  try {
    const r = await fetch('/api/admin');
    const data = await r.json();
    if(!r.ok)throw new Error(data.message||'No se pudo cargar el panel.');
    $('#authSubmit').disabled=false;
    state.setup = data.passwordSet;
    if (!data.authenticated) {
      $('#dashboard').hidden = true;
      $('#authPanel').hidden = false;
      $('#authHelp').textContent = state.setup
        ? 'Ingresa tu contraseña de administrador para continuar.'
        : 'Crea una contraseña segura de al menos 12 caracteres para activar este panel.';
      $('#setupToken').closest('label').hidden=state.setup;$('#adminCode').closest('label').hidden=true;
      $('#authSubmit').innerHTML = state.setup ? 'Ingresar <span>→</span>' : 'Crear acceso <span>→</span>';
      return;
    }
    state.lots = data.catalog || [];
    $('#authPanel').hidden = true;
    $('#dashboard').hidden = false;
    updateKpis();
    render();
  } catch (err) {
    if($('#dashboard').hidden){$('#authPanel').hidden=false;$('#authSubmit').disabled=true;$('#retryAdminLoad').hidden=false;message('#authMessage',err.message,'error');}else message('#adminMessage',err.message,'error');
  }finally{$('#adminLoading').hidden=true;}
}

// Helper to get effective value for a lot (dirty edit takes precedence over database)
function rowValue(lot, key) {
  if (state.dirty.has(lot.id)) {
    const d = state.dirty.get(lot.id);
    if (d[key] !== undefined) return d[key];
  }
  const p = lot.price;
  if (!p) {
    if (key === 'status') return 'unknown';
    if (key === 'discount') return 0;
    return '';
  }
  if (key === 'usdPrice') return p.usd_cents == null ? '' : p.usd_cents / 100;
  if (key === 'price') return p.base_cents ? p.base_cents / 100 : '';
  if (key === 'area') return p.area ?? '';
  if (key === 'discount') return p.discount ?? 0;
  if (key === 'status') return p.status ?? 'available';
  return '';
}

function catalogDecimal(value) {
  const text = String(value ?? '').trim().replace(/[\s\u00a0\u202f]/g, '');
  if (text === '') return '';
  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(text)) return text.replaceAll(',', '');
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(text)) return text.replaceAll('.', '').replace(',', '.');
  if (/^(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(text)) return text.replace(',', '.');
  return 'NaN';
}

function validCatalogPrice(value) {
  const amount = Number(value);
  return /^\d*(?:\.\d{1,2})?$/.test(String(value)) && amount > 0 && Number.isSafeInteger(Math.round(amount * 100));
}

function decimalInput(value) {
  return String(value ?? '').replace(/[&"<>]/g, char => ({'&':'&amp;','"':'&quot;','<':'&lt;','>':'&gt;'})[char]);
}

function normalized(lot) {
  const rawPrice = rowValue(lot, 'price');
  const rawArea = rowValue(lot, 'area');
  const rawDiscount = rowValue(lot, 'discount');
  const rawStatus = rowValue(lot, 'status');

  return {
    id: lot.id,
    block: lot.block,
    lot: lot.lot,
    area: Number(catalogDecimal(rawArea)),
    price: catalogDecimal(rawPrice),
    discount: 0,
    usdPrice: catalogDecimal(rowValue(lot,'usdPrice')),
    confirmSoldReversal: state.dirty.get(lot.id)?.confirmSoldReversal === true,
    status: rawStatus || 'available'
  };
}

function change(lot, key, value) {
  const current = state.dirty.get(lot.id) || {};
  if (key === 'status' && lot.price?.status === 'sold' && value !== 'sold') { if (!confirm('Este lote está vendido. ¿Confirmas expresamente su reapertura?')) { render(); return; } current.confirmSoldReversal = true; }
  if (key === 'price' || key === 'area' || key === 'discount' || key === 'usdPrice') {
    current[key] = key === 'discount' ? Number(value) : value;
  } else {
    current[key] = value;
  }
  state.dirty.set(lot.id, current);
  updateCount();
  updateKpis();
}

function updateCount() {
  const count = state.dirty.size;
  const countEl = $('#changeCount');
  const discardBtn = $('#discardChanges');
  if (countEl) {
    countEl.textContent = count ? `${count} lote${count === 1 ? '' : 's'} con cambios pendientes` : 'Sin cambios pendientes';
  }
  if (discardBtn) {
    discardBtn.style.display = count ? 'inline-block' : 'none';
  }
}

function updateKpis() {
  let total = state.lots.length;
  let avail = 0;
  let sep = 0;
  let sold = 0;
  let totalVal = 0;

  state.lots.forEach(l => {
    if(['B','I'].includes(l.block))return;
    const st = rowValue(l, 'status');
    const pr = Number(catalogDecimal(rowValue(l, 'price'))) || 0;
    const ds = Number(rowValue(l, 'discount')) || 0;
    const final = pr * (1 - ds / 100);

    if (st === 'available') {
      avail++;
      if (final > 0) totalVal += final;
    } else if (st === 'separated') {
      sep++;
    } else if (st === 'sold') {
      sold++;
    }
  });

  if ($('#kpiTotal')) $('#kpiTotal').textContent = total;
  if ($('#kpiAvailable')) $('#kpiAvailable').textContent = avail;
  if ($('#kpiSeparated')) $('#kpiSeparated').textContent = sep;
  if ($('#kpiSold')) $('#kpiSold').textContent = sold;
  if ($('#kpiValue')) $('#kpiValue').textContent = money(totalVal);
}

function getFilteredLots() {
  const query = ($('#lotSearch')?.value || '').trim().toLowerCase();
  const block = $('#blockFilter')?.value || '';
  const status = $('#statusFilter')?.value || '';

  return state.lots.filter(l => {
    if (['B','I'].includes(l.block)) return false;
    const s = rowValue(l, 'status');
    const matchQuery = !query || l.id.toLowerCase().includes(query) || (`manzana ${l.block}`).toLowerCase().includes(query);
    const matchBlock = !block || l.block === block;
    const matchStatus = !status || s === status;
    return matchQuery && matchBlock && matchStatus;
  });
}

function render() {
  const filtered = getFilteredLots();
  const pages=Math.max(1,Math.ceil(filtered.length/20));state.page=Math.min(state.page,pages);
  const list=filtered.slice((state.page-1)*20,state.page*20);
  $('#pageStatus').textContent=`Página ${state.page} de ${pages} · ${filtered.length} lotes`;
  $('#previousPage').disabled=state.page<=1;$('#nextPage').disabled=state.page>=pages;
  const tbody = $('#lotRows');
  if (!tbody) return;

  tbody.innerHTML = list.map(l => {
    const isDirty = state.dirty.has(l.id);
    const area = rowValue(l, 'area');
    const base = Number(catalogDecimal(rowValue(l, 'price'))) || 0;
    const discount = Number(rowValue(l, 'discount')) || 0;
    const final = base * (1 - discount / 100);
    const status = rowValue(l, 'status');

    return `
      <tr data-id="${l.id}" class="${isDirty ? 'row-dirty' : ''}">
        <td>
          <div class="lot-cell">
            <strong>${l.id}</strong>
            <small>Manzana ${l.block} · Lote ${l.lot}</small>
            ${isDirty ? '<span class="dirty-badge">Modificado</span>' : ''}
          </div>
        </td>
        <td>
          <input aria-label="Área de ${l.id}" data-key="area" type="text" inputmode="decimal" value="${decimalInput(area)}" placeholder="m²">
        </td>
        <td>
          <input aria-label="Precio en soles de ${l.id}" data-key="price" type="text" inputmode="decimal" value="${decimalInput(rowValue(l, 'price'))}" placeholder="S/">
        </td>
        <td>
          <input aria-label="Precio en dólares de ${l.id}" data-key="usdPrice" type="text" inputmode="decimal" value="${decimalInput(rowValue(l, 'usdPrice'))}" placeholder="Sin publicar">
        </td>
        <td>
          <select aria-label="Estado de ${l.id}" data-key="status" class="status-select status-${status}">
            <option value="unknown" ${status === 'unknown' ? 'selected' : ''}>Sin publicar</option>
            <option value="available" ${status === 'available' ? 'selected' : ''}>🟢 Disponible</option>
            <option value="separated" ${status === 'separated' ? 'selected' : ''}>🟡 Separado</option>
            <option value="sold" ${status === 'sold' ? 'selected' : ''}>🔴 Vendido</option>
          </select>
        </td>
        <td>
          <a href="cotizacion.html?manzana=${l.block}&lote=${l.lot}" target="_blank" class="preview-link" title="Ver cotización de este lote">↗ Ver</a>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="6" class="empty-row">No se encontraron lotes que coincidan con la búsqueda.</td></tr>';

  // Attach input listeners
  tbody.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', e => {
      const tr = e.target.closest('tr');
      if (!tr) return;
      const id = tr.dataset.id;
      const lot = state.lots.find(x => x.id === id);
      if (!lot) return;
      change(lot, e.target.dataset.key, e.target.value);

      // Instantly update final price cell without full re-render
      const base = Number(catalogDecimal(rowValue(lot, 'price'))) || 0;
      const discount = Number(rowValue(lot, 'discount')) || 0;
      const final = base * (1 - discount / 100);
      const finalCell = tr.querySelector('.final-price-cell');
      if (finalCell) {
        finalCell.innerHTML = `<strong>${base > 0 ? money(final) : '<span class="pending-tag">Sin precio</span>'}</strong>` +
          (discount > 0 && base > 0 ? `<del>${money(base)}</del>` : '');
      }
      tr.classList.add('row-dirty');
      if (!tr.querySelector('.dirty-badge')) {
        tr.querySelector('.lot-cell')?.insertAdjacentHTML('beforeend', '<span class="dirty-badge">Modificado</span>');
      }
    });
  });
}

// Bulk Actions
function initBulkActions() {
  const applyDiscountBtn = $('#applyBulkDiscount');
  if (applyDiscountBtn) {
    applyDiscountBtn.onclick = () => {
      const val = Number($('#bulkDiscountInput')?.value);
      if (isNaN(val) || val < 0 || val > 100) {
        alert('Por favor ingresa un porcentaje de descuento válido (entre 0 y 100).');
        return;
      }
      const list = getFilteredLots();
      if (!list.length) return;
      list.forEach(l => change(l, 'discount', val));
      message('#adminMessage', `Se aplicó ${val}% de descuento a ${list.length} lotes visibles.`, 'success');
      render();
    };
  }

  const applyStatusBtn = $('#applyBulkStatus');
  if (applyStatusBtn) {
    applyStatusBtn.onclick = () => {
      const status = $('#bulkStatusSelect')?.value;
      if (!status) {
        alert('Selecciona un estado para aplicar.');
        return;
      }
      const list = getFilteredLots();
      if (!list.length) return;
      list.forEach(l => change(l, 'status', status));
      message('#adminMessage', `Se asignó el estado "${status}" a ${list.length} lotes visibles.`, 'success');
      render();
    };
  }

  const discardBtn = $('#discardChanges');
  if (discardBtn) {
    discardBtn.onclick = () => {
      if (confirm('¿Deseas descartar todas las modificaciones pendientes sin guardar?')) {
        state.dirty.clear();
        updateCount();
        updateKpis();
        render();
        message('#adminMessage', 'Modificaciones descartadas.', 'success');
      }
    };
  }
}

// Event Bindings
$('#authForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  message('#authMessage', 'Validando credenciales...');
  try {
    await api({
      action: state.setup ? 'login' : 'setup',
      setupToken: $('#setupToken')?.value,
      password: $('#adminPassword').value,code:$('#adminCode')?.value.trim()
    });
    $('#adminPassword').value = '';$('#adminCode').value='';
    message('#authMessage', '');
    await load();
  } catch (err) {
    message('#authMessage', err.message, 'error');if(err.mfaRequired){$('#adminCode').closest('label').hidden=false;$('#adminCode').focus();}
  }
});

['#lotSearch', '#blockFilter', '#statusFilter'].forEach(s => {
  $(s)?.addEventListener('input', () => {state.page=1;render();});
});

$('#logout')?.addEventListener('click', async () => {
  await api({ action: 'logout' });
  state.dirty.clear();
  await load();
});

let csvIds=[],saving=false,csvPending=new Map(),csvErrors=[];
function csvButtons(){ $("#applyCsv").disabled=saving||!csvIds.length;$("#forceCsv").disabled=saving||!csvIds.length;$("#discardCsv").disabled=saving||(!csvIds.length&&!csvErrors.length); }
async function saveChanges(ids=[...state.dirty.keys()],fromCsv=false,importRows=null){
  if(saving)return;
  const rows = importRows || ids.filter(id=>state.dirty.has(id)).map(id => normalized(state.lots.find(l => l.id === id))).filter(Boolean);
  if (!rows.length) {
    message('#adminMessage', 'No hay cambios pendientes por guardar.', 'error');
    return;
  }
  try {
    if (rows.some(row => !Number.isFinite(row.area) || row.area <= 0 || !validCatalogPrice(row.price) || (row.usdPrice !== '' && !validCatalogPrice(row.usdPrice)))) throw new Error('Revisa el área y los precios: usa coma o punto decimal y hasta dos decimales para los precios.');
    saving=true;$('#saveLots').disabled=true;csvButtons();
    message('#adminMessage', 'Guardando cambios en la base de datos...');
    const result = await api({ action: 'save', rows });
    message('#adminMessage', `✅ ¡Listo! ${result.saved} lote${result.saved === 1 ? '' : 's'} actualizado${result.saved === 1 ? '' : 's'} y publicado${result.saved === 1 ? '' : 's'}.`, 'success');
    ids.forEach(id=>state.dirty.delete(id));
    if(!fromCsv)csvIds=csvIds.filter(id=>csvPending.has(id));
    if(fromCsv){message('#csvMessage',`${result.saved} lotes del archivo guardados y publicados. ${csvErrors.length} filas omitidas; consulta el detalle.`, 'success');csvIds=[];csvPending.clear();csvButtons();}
    updateCount();
    await load();
  } catch (err) {
    message('#adminMessage', err.message, 'error');if(fromCsv)message('#csvMessage',err.message,'error');
  } finally {saving=false;$('#saveLots').disabled=false;csvButtons();}
}
$('#saveLots')?.addEventListener('click',()=>saveChanges());
async function applyCsv(mode){
 if(saving||!csvIds.length)return;
 if(mode==='force'&&csvErrors.length){message('#csvMessage','No se aplicó ningún cambio: corrige las '+csvErrors.length+' filas con errores o elige Aplicar solo lo válido.','error');return;}
 const rows=csvIds.map(id=>{const lot=state.lots.find(l=>l.id===id),row=csvPending.get(id);return {id,block:lot.block,lot:lot.lot,...row,confirmSoldReversal:false};});
 await saveChanges([...csvIds],true,rows);
}
$('#applyCsv')?.addEventListener('click',()=>applyCsv('partial'));
$('#forceCsv')?.addEventListener('click',()=>applyCsv('force'));
$('#discardCsv')?.addEventListener('click',()=>{if(saving)return;csvIds=[];csvPending.clear();csvErrors=[];$('#csvErrors').hidden=true;$('#csvErrorList').replaceChildren();csvButtons();message('#csvMessage','Archivo descartado. No se modificó la base de datos.');});

$('#downloadTemplate')?.addEventListener('click', () => {
  const sample = state.lots.filter(l=>!['B','I'].includes(l.block)).map(l => {
    const area = rowValue(l, 'area');
    const price = rowValue(l, 'price');
    const discount = rowValue(l, 'discount');
    const status = rowValue(l, 'status');
    return `${l.id},${area},${price},${rowValue(l,'usdPrice')},${status}`;
  });
  const blob = new Blob([['id,area,precio,precio_usd,estado', ...sample].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `la-morada-catalogo-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#csvUpload')?.addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  csvIds=[];csvPending.clear();csvErrors=[];$('#csvErrors').hidden=true;$('#csvErrorList').replaceChildren();csvButtons();message('#csvMessage','Leyendo '+file.name+'…');
  try {
    if(file.size>2*1024*1024)throw new Error('El archivo supera 2 MB. Usa un archivo de hasta 200 lotes.');
    const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer);
    const excel = /\.xlsx$/i.test(file.name);
    const encoding = bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8';
    const records = excel ? readCatalogWorkbook(buffer) : parseCsv(new TextDecoder(encoding).decode(buffer));
    if(records.length<2)throw new Error('El archivo debe contener encabezados y al menos un lote.');
    const aliases={lote:'id',area:'area',price:'precio',usdprice:'precio_usd',status:'estado'};
    const heads=records.shift().map(s=>{const name=s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');return aliases[name]||name;});
    if(new Set(heads).size!==heads.length)throw new Error('Hay encabezados duplicados. Usa una sola columna por campo.');
    if(!heads.includes('id')||!heads.includes('precio')||!heads.includes('precio_usd')||!heads.includes('area')||!heads.includes('estado'))throw new Error('Usa la plantilla con id, area, precio, precio_usd y estado.');
    const get = (cells, ...keys) => {
      const i = heads.findIndex(h => keys.includes(h));
      return i < 0 ? '' : (cells[i] ?? '').trim();
    };

    let valid = 0;
    const pending=new Map();
    const idsInFile=new Map();for(const cells of records){const id=get(cells,'id').toUpperCase().replace(/^([A-K])-0?(\d{1,2})$/,(_,block,num)=>block+'-'+num.padStart(2,'0'));idsInFile.set(id,(idsInFile.get(id)||0)+1);}
    records.forEach((cells,index) => {
      try {
      if(cells.every(c=>!c.trim()))return;
      if(cells.length>heads.length || (!excel && cells.length!==heads.length))throw new Error('Hay una fila con columnas incompletas. No se importó el archivo.');
      const id = get(cells, 'id', 'lote').toUpperCase().replace(/^([A-K])-0?(\d{1,2})$/,(_,block,num)=>block+'-'+num.padStart(2,'0'));
      const lot = state.lots.find(x => x.id === id);
      if (!lot) throw new Error('Lote no reconocido: '+id);
      if(['B','I'].includes(lot.block))throw new Error('El archivo incluye una manzana fuera de venta: '+id);
      if(idsInFile.get(id)>1)throw new Error('Lote duplicado: '+id);

      const area = catalogDecimal(get(cells, 'area'));
      const priceText = get(cells, 'precio');
      const usdText = get(cells, 'precio_usd');
      const rawStatus = get(cells, 'estado').toLowerCase();
      const status=({disponible:'available',disponibles:'available',separado:'separated',separados:'separated',reservado:'separated',vendido:'sold',vendidos:'sold'})[rawStatus]||rawStatus;

      if(!area && !priceText && !usdText && (!rawStatus || rawStatus==='unknown'))return;
      if(!['available','separated','sold'].includes(status))throw new Error('Estado inválido en '+id);
      if(lot.price?.status==='sold' && status!=='sold')throw new Error('Reabre expresamente el lote vendido desde el panel: '+id);
      const areaOnly = status==='sold' && lot.price?.status==='sold' && !priceText && !usdText;
      const price = catalogDecimal(areaOnly ? lot.price.base_cents/100 : priceText);
      const usd = catalogDecimal(areaOnly ? rowValue(lot,'usdPrice') : usdText);
      if(!Number.isFinite(Number(area)) || Number(area)<=0 || Number(area)>1000000)throw new Error('Área inválida en '+id);
      if(!validCatalogPrice(price))throw new Error('Ingresa un precio en soles válido en '+id);
      if(usd && !validCatalogPrice(usd))throw new Error('Precio en dólares inválido en '+id);
      pending.set(id, {
        area: area ? Number(area) : '',
        price: price ? Number(price) : '',
        discount: 0,
        usdPrice: usd || '',
        status
      });
      valid++;
      }catch(error){csvErrors.push({line:index+2,message:error.message});}
    });

    if(valid>200)throw new Error('El archivo supera 200 lotes.');
    csvPending=pending;
    const errorList=$('#csvErrorList');errorList.replaceChildren();for(const error of csvErrors){const li=document.createElement('li');li.textContent=`Fila ${error.line}: ${error.message}`;errorList.append(li);}$('#csvErrors').hidden=!csvErrors.length;
    csvIds=[...pending.keys()];state.page=1;csvButtons();
    message('#csvMessage',`${file.name}: ${valid} lotes válidos y ${csvErrors.length} filas con errores. Elige cómo aplicar el archivo. Aún no se ha modificado la base de datos.`, 'success');
    message('#adminMessage', `${valid} filas válidas listas. Usa las opciones de aplicación junto al archivo.`, 'success');
    updateCount();
    updateKpis();
    render();
  } catch (err) {
    const detail='No se pudo importar: '+(err?.message||'Error de formato');message('#adminMessage',detail,'error');message('#csvMessage',detail,'error');
  } finally {
    e.target.value='';
  }
});

initBulkActions();
load();

function parseCsv(input){
 const text=input.replace(/^\uFEFF/,'').replace(/^sep=([^\r\n]+)\r?\n/i,'');
 const first=text.split(/\r?\n/)[0];let quoted=false;const counts={',':0,';':0,'\t':0};
 for(const char of first){if(char==='"')quoted=!quoted;else if(!quoted&&char in counts)counts[char]++;}
 const delimiter=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
 const rows=[];let row=[],cell='';quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('El CSV contiene comillas sin cerrar.');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}

window.addEventListener('beforeunload',event=>{if(state.dirty.size||csvPending.size){event.preventDefault();event.returnValue='';}});

$('#previousPage').onclick=()=>{state.page=Math.max(1,state.page-1);render();};$('#nextPage').onclick=()=>{state.page++;render();};

window.addEventListener('morada:session-expired',()=>{state.lots=[];state.dirty.clear();csvPending.clear();csvIds=[];$('#lotRows')?.replaceChildren();$('#dashboard').hidden=true;$('#authPanel').hidden=false;$('#authForm').reset();message('#authMessage','Tu sesión se cerró. Ingresa nuevamente para continuar.');});

$('#retryAdminLoad').onclick=()=>load();window.addEventListener('morada:retry',()=>{if(!state.dirty.size)load();});
