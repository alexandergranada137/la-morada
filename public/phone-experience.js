(() => {
  const phone=matchMedia('(max-width:760px)');
  const home=document.querySelector('.home-page main');
  if(home){
    const intro=document.createElement('section');intro.className='phone-home-intro';intro.setAttribute('aria-label','Bienvenido a La Morada');
    intro.innerHTML='<figure><img src="assets/club-alegra-actualizado.webp" width="960" height="720" alt="Piscina y terraza proyectadas del Club Alegra" fetchpriority="high"><figcaption>Club Alegra · Imagen referencial</figcaption></figure><div class="phone-home-copy"><p class="phone-home-location">Uchumayo, Arequipa</p><h1>Un lugar para<br>imaginar tu vida.</h1><p>Descubre los lotes de La Morada, junto al entorno del valle. Elige tu ubicación y conoce el proyecto en persona.</p><a class="phone-home-primary" href="/recorrido">Explorar los lotes</a><a class="phone-home-visit" href="/contacto">Coordinar una visita</a><p class="phone-home-offer">Hasta <strong>US$ 6,000 de descuento</strong><span>Solo al contado. Consulta las condiciones de tu lote.</span></p></div>';
    home.prepend(intro);
  }
  const main=document.querySelector('.explorer');
  const scene=document.querySelector('.scene-panel');
  const filter=document.querySelector('.filter-disclosure');
  const info=document.querySelector('#lotInfo');
  const currency=document.querySelector('.currency-switch');
  const root=document.createElement('section');root.className='phone-explorer';root.setAttribute('aria-label','Explorador móvil de lotes');
  root.innerHTML='<header class="phone-explorer-heading"><div><h1>Elige tu lote</h1><p>Uchumayo · Arequipa</p></div><button type="button" class="phone-search">Buscar lote</button></header><section class="phone-lot-summary" aria-label="Lote seleccionado" aria-live="polite" hidden><div><p data-phone-lot></p><strong data-phone-price></strong><small data-phone-area></small></div><div class="phone-lot-actions"><a data-phone-quote>Cotizar</a><button type="button" class="phone-selected">Ver más</button></div></section>';
  const places=[];let lastLot='',active=false,initialized=false;
  function sheet(title,id){
    const dialog=document.createElement('dialog');dialog.className='phone-sheet';dialog.id=id;
    const heading=document.createElement('header'),label=document.createElement('h2'),close=document.createElement('button');
    label.id=id+'Title';label.textContent=title;dialog.setAttribute('aria-labelledby',label.id);
    close.type='button';close.textContent='Cerrar';close.onclick=()=>dialog.close();heading.append(label,close);dialog.append(heading);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.addEventListener('close',()=>document.body.classList.toggle('phone-sheet-open',Boolean(document.querySelector('.phone-sheet[open]'))));
    document.body.append(dialog);return dialog;
  }
  let searchSheet,lotSheet;
  function open(dialog){if(dialog.open)return;for(const sheet of [searchSheet,lotSheet])if(sheet?.open)sheet.close();dialog.showModal();document.body.classList.add('phone-sheet-open');}
  function move(node,parent){const placeholder=document.createComment('Desktop position');node.before(placeholder);places.push({node,placeholder});parent.append(node);}
  function layout(){
    document.body.classList.toggle('phone-experience',phone.matches);
    if(!main||!scene||!filter||!info||!currency)return;
    if(phone.matches&&!active){
      active=true;main.prepend(root);
      searchSheet=sheet('Buscar tu lote','phoneSearch');lotSheet=sheet('Tu lote','phoneLot');
      move(scene,root);move(filter,searchSheet);move(currency,lotSheet);move(info,lotSheet);
      filter.open=true;
      root.querySelector('.phone-search').onclick=()=>{filter.open=true;open(searchSheet);};
      root.querySelector('.phone-selected').onclick=()=>open(lotSheet);
      lotSheet.addEventListener('click',event=>{if(event.target.closest('button')?.textContent.includes('cerca'))lotSheet.close();});
      window.dispatchEvent(new Event('resize'));
      if(!initialized){
        const choosePlan=()=>{if(active&&document.querySelector('#loading')?.hidden){document.querySelector('#topView')?.click();initialized=true;return true;}return false;};
        if(!choosePlan()){const observer=new MutationObserver(()=>{if(choosePlan())observer.disconnect();});observer.observe(document.querySelector('#scene'),{attributes:true,attributeFilter:['data-loading']});}
      }
      selected();
    }else if(!phone.matches&&active){
      active=false;for(const item of places.splice(0)){item.placeholder.replaceWith(item.node);}
      document.querySelector('.panel-heading')?.after(filter);
      searchSheet.close();lotSheet.close();searchSheet.remove();lotSheet.remove();root.remove();
      document.body.classList.remove('phone-sheet-open');window.dispatchEvent(new Event('resize'));
    }
  }
  function selected(){
    if(!active)return;
    const lot=document.querySelector('#lotList')?.value;
    const selected=document.querySelector('.explorer-panel.has-selection');
    const summary=root.querySelector('.phone-lot-summary');summary.hidden=!selected;
    if(selected){
      summary.querySelector('[data-phone-lot]').textContent=info.querySelector('h2')?.textContent||'Lote seleccionado';
      summary.querySelector('[data-phone-price]').textContent=info.querySelector('.lot-price')?.textContent||info.querySelector('.lot-status')?.textContent||'';
      summary.querySelector('[data-phone-area]').textContent=info.querySelector('.lot-facts')?.textContent||'';
      const source=info.querySelector('a.primary'),quote=summary.querySelector('[data-phone-quote]');
      quote.hidden=!source;if(source){quote.href=source.href;quote.textContent=source.href.includes('cotizacion')?'Cotizar':'Consultar';}
      if(lot&&lot!==lastLot){lastLot=lot;if(searchSheet.open)searchSheet.close();}
    }
  }
  if(info)new MutationObserver(selected).observe(info,{childList:true,subtree:true});
  scene?.addEventListener('pointerdown',()=>{lastLot='';},{passive:true});
  phone.addEventListener('change',layout);layout();
})();
