const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function plantSvg(completed, bonuses, name = '', bare = false) {
  const n = completed.length, leafy = bonuses.includes('observation'), broad = bonuses.includes('hidden'), fruit = bonuses.includes('color');
  const height = [25, 78, 118, 146][n], top = 236 - height;
  const leaves = n === 0 ? [[-15, top+8],[15, top+8]] : [[-34, top+55],[36,top+38],[-40,top+88],[35,top+100],...(leafy?[[-46,top+25],[48,top+70],[-43,top+113],[44,top+120]]:[])];
  const rx = broad ? 30 : 22;
  const leafMarkup = leaves.map(([x,y],i)=>`<ellipse cx="${160+x}" cy="${y}" rx="${rx}" ry="11" fill="${i%2?'#51b574':'#65c989'}" transform="rotate(${x<0?-24:24} ${160+x} ${y})"/>`).join('');
  const flower = n>=3 ? `<g><circle cx="160" cy="${top-6}" r="19" fill="#ffe278"/>${[0,60,120,180,240,300].map(a=>`<ellipse cx="160" cy="${top-29}" rx="10" ry="17" fill="#ffda77" transform="rotate(${a} 160 ${top-6})"/>`).join('')}<circle cx="160" cy="${top-6}" r="10" fill="#f7a746"/></g>` : n===2 ? `<ellipse cx="160" cy="${top-5}" rx="12" ry="17" fill="#f5b75c"/>` : '';
  const tomatoes = fruit ? `<circle cx="115" cy="${top+92}" r="17" fill="#ef6254"/><circle cx="209" cy="${top+79}" r="16" fill="#ef6254"/><path d="M110 ${top+77}l5 7 5-7 M204 ${top+65}l5 7 5-7" fill="#45834c"/>` : '';
  const bg = bare ? '' : `<rect width="320" height="320" rx="30" fill="#e9f6e7"/><circle cx="260" cy="65" r="28" fill="#ffe49b"/><path d="M0 262Q160 245 320 262V320H0" fill="#b9dfaa"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" role="img" aria-label="${esc(name || '우리 식물')}">${bg}<path d="M160 249Q${160+(n?12:0)} ${top+70} 160 ${top}" stroke="#3f9a62" stroke-width="${n?10:6}" fill="none" stroke-linecap="round"/>${leafMarkup}${flower}${tomatoes}<path d="M100 245h120l-12 60H112z" fill="#bd7853"/><path d="M98 244h124" stroke="#925738" stroke-width="10" stroke-linecap="round"/><text x="160" y="299" text-anchor="middle" font-size="15" fill="#fff" font-weight="bold">${esc(name)}</text></svg>`;
}
export function downloadPlant(completed, bonuses, name) {
  const svg = plantSvg(completed, bonuses, name), img = new Image();
  const blob = new Blob([svg],{type:'image/svg+xml;charset=utf-8'}), url = URL.createObjectURL(blob);
  img.onload = () => { const canvas=document.createElement('canvas'); canvas.width=960; canvas.height=960;
    canvas.getContext('2d').drawImage(img,0,0,960,960); URL.revokeObjectURL(url);
    canvas.toBlob(file => { if (!file) return; const a=document.createElement('a'); const fileUrl=URL.createObjectURL(file);
      a.href=fileUrl; a.download='스마트팜_우리식물.png'; a.click(); setTimeout(()=>URL.revokeObjectURL(fileUrl),1000); },'image/png'); };
  img.onerror=()=>URL.revokeObjectURL(url); img.src=url;
}
