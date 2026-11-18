const filterButtons=[...document.querySelectorAll('[data-community-filter]')];
function setCommunityFilter(kind,updateUrl=false){
 if(!['all','news','owner'].includes(kind))kind='all';
 for(const button of filterButtons)button.setAttribute('aria-pressed',String(button.dataset.communityFilter===kind));
 for(const section of document.querySelectorAll('[data-publication-kind]'))section.hidden=kind!=='all'&&section.dataset.publicationKind!==kind;
 if(updateUrl){const url=new URL(location.href);if(kind==='all')url.searchParams.delete('seccion');else url.searchParams.set('seccion',kind);history.pushState(null,'',url);}
}
if(filterButtons.length){setCommunityFilter(new URLSearchParams(location.search).get('seccion'));for(const button of filterButtons)button.addEventListener('click',()=>setCommunityFilter(button.dataset.communityFilter,true));window.addEventListener('popstate',()=>setCommunityFilter(new URLSearchParams(location.search).get('seccion')));}
