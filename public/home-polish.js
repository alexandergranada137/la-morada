(() => {
  const home=document.querySelector('.home-page main');if(!home)return;
  const projectCopy=document.querySelector('.project-details-copy');
  function disclosure(title,nodes){
    const details=document.createElement('details');details.className='home-reading';
    const summary=document.createElement('summary');summary.textContent=title;details.append(summary,...nodes);return details;
  }
  const facts=document.querySelector('.project-facts');
  if(facts)projectCopy.append(disclosure('Ubicación y condiciones de compra',[facts]));
  const infrastructure=[...document.querySelectorAll('.project-infrastructure')];
  if(infrastructure.length)document.querySelector('#detalles').append(disclosure('Avances, documentación y servicios',infrastructure));
  const gallery=document.querySelector('#miradas .section-heading');
  if(gallery){const heading=gallery.querySelector('h2');if(heading)heading.textContent='Mira La Morada.';const text=gallery.querySelector('p');if(text)text.textContent='El terreno actual y el proyecto previsto.';}
  const spaces=document.querySelector('#espacios .section-heading>p');if(spaces)spaces.textContent='Parque actual y espacios proyectados.';
  const community=document.createElement('section');community.className='home-community home-section';community.id='comunidad';
  community.innerHTML='<header><h2>La vida en La Morada.</h2><a href="/comunidad">Ver todo</a></header><div class="home-community-entries"><a href="/comunidad?seccion=news#publicaciones"><img src="assets/video/dron-parque-640.webp" width="640" height="360" alt="Vista actual del parque del proyecto" loading="lazy"><div><h3>Novedades</h3><p>Avances y próximos encuentros.</p><span>Ver novedades ↗</span></div></a><a href="/comunidad?seccion=owner#publicaciones"><div class="owner-entry-art" aria-hidden="true"><svg viewBox="0 0 80 80" fill="none" stroke="currentColor" stroke-width="2"><circle cx="30" cy="26" r="10"/><path d="M10 66V55a20 20 0 0 1 40 0v11M53 17a10 10 0 0 1 0 20m8 8a18 18 0 0 1 10 16v5"/></svg></div><div><h3>Propietarios</h3><p>Fotografías y momentos compartidos.</p><span>Ver propietarios ↗</span></div></a></div>';
  function position(){document.querySelector('#espacios')?.after(community);}
  position();matchMedia('(max-width:760px)').addEventListener('change',position);
  // CMS titles and text are untrusted; never interpolate them into HTML.
  async function refreshLatest(){
    try{
      const response=await fetch('/api/contenido?latest=1',{cache:'no-store'});if(!response.ok)return;
      const data=await response.json();if(!Array.isArray(data.items))return;
      for(const [index,kind] of ['news','owner'].entries()){
        const item=data.items.filter(item=>item.kind===kind).sort((a,b)=>Date.parse(b.created)-Date.parse(a.created))[0];if(!item)continue;
        const card=community.querySelectorAll('.home-community-entries>a')[index];
        const copy=card.querySelector('div:last-child');
        copy.querySelector('p').textContent=item.title;
        if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(item.image||'')){
          const image=document.createElement('img');image.src=item.image;image.alt=item.title;image.loading='lazy';image.width=800;image.height=600;
          card.firstElementChild.replaceWith(image);
        }
        card.href='/comunidad?seccion='+kind+'#publicacion-'+encodeURIComponent(item.id);
      }
    }catch{/* Keep useful category links and placeholders if the CMS is unavailable. */}
  }
  refreshLatest();window.addEventListener('morada:retry',refreshLatest);
})();
