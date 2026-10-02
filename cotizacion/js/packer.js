export function guillotinePack(piezas, sheetW, sheetH, kerf){
  const remaining = piezas.slice().sort((a,b) => (b.w*b.h) - (a.w*a.h));
  const bins = [];
  function place(bin, piece){
    let bestScore = Infinity, bestRect = null, bestRot = false, bestIdx = -1;
    bin.freeRects.forEach((fr, idx) => {
      if(piece.w <= fr.w + 1e-6 && piece.h <= fr.h + 1e-6){
        const score = fr.w*fr.h - piece.w*piece.h;
        if(score < bestScore){ bestScore = score; bestRect = fr; bestRot = false; bestIdx = idx; }
      }
      if(piece.h <= fr.w + 1e-6 && piece.w <= fr.h + 1e-6){
        const score = fr.w*fr.h - piece.w*piece.h;
        if(score < bestScore){ bestScore = score; bestRect = fr; bestRot = true; bestIdx = idx; }
      }
    });
    if(!bestRect) return false;
    const w = bestRot ? piece.h : piece.w;
    const h = bestRot ? piece.w : piece.h;
    const fr = bestRect;
    bin.placements.push({x:fr.x, y:fr.y, w, h, rot:bestRot, label:piece.label});
    bin.freeRects.splice(bestIdx, 1);
    const rightW = fr.w - w - kerf;
    const bottomH = fr.h - h - kerf;
    if(rightW > 1e-6 && bottomH > 1e-6){
      if(w*bottomH > h*rightW){
        bin.freeRects.push({x:fr.x, y:fr.y+h+kerf, w:fr.w, h:bottomH});
        bin.freeRects.push({x:fr.x+w+kerf, y:fr.y, w:rightW, h:h});
      } else {
        bin.freeRects.push({x:fr.x+w+kerf, y:fr.y, w:rightW, h:fr.h});
        bin.freeRects.push({x:fr.x, y:fr.y+h+kerf, w:w, h:bottomH});
      }
    } else if(rightW > 1e-6){
      bin.freeRects.push({x:fr.x+w+kerf, y:fr.y, w:rightW, h:fr.h});
    } else if(bottomH > 1e-6){
      bin.freeRects.push({x:fr.x, y:fr.y+h+kerf, w:fr.w, h:bottomH});
    }
    return true;
  }
  remaining.forEach(piece => {
    let placed = false;
    for(const bin of bins){ if(place(bin, piece)){ placed = true; break; } }
    if(!placed){
      const bin = { freeRects:[{x:0,y:0,w:sheetW,h:sheetH}], placements:[] };
      if(place(bin, piece)) bins.push(bin);
      else { bin.placements.push({x:0, y:0, w:Math.min(piece.w,sheetW), h:Math.min(piece.h,sheetH), rot:false, label:piece.label + ' ⚠ NO CABE'}); bins.push(bin); }
    }
  });
  return bins;
}

export function renderSheetSVG(bin, sheetW, sheetH){
  const maxPx = 420;
  const scale = maxPx / Math.max(sheetW, sheetH);
  const w = sheetW*scale, h = sheetH*scale;
  let rects = '';
  bin.placements.forEach((p, i) => {
    const err = /NO CABE/.test(p.label);
    const fill = err ? '#F7E6DC' : (i % 2 === 0 ? '#EEE3D3' : '#E7EFE5');
    const stroke = err ? '#B5542A' : '#A8703F';
    rects += `<rect x="${p.x*scale}" y="${p.y*scale}" width="${p.w*scale}" height="${p.h*scale}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
    if(p.w*scale > 26 && p.h*scale > 14){
      rects += `<text x="${p.x*scale + p.w*scale/2}" y="${p.y*scale + p.h*scale/2}" font-size="9" text-anchor="middle" dominant-baseline="middle" fill="#2A2420">${Math.round(p.w)}x${Math.round(p.h)}</text>`;
    }
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${w}" height="${h}" fill="#FFFDF9" stroke="#2A2420" stroke-width="1.5"/>${rects}</svg>`;
}
