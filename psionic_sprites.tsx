import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
  DKPSY:'#220033',DPPUR:'#330044',DKPUR:'#441166',MDPUR:'#9944bb',
  BRPUR:'#bb66dd',LTPUR:'#dd88ff',PLPUR:'#ee99ff',WHLAV:'#f5ccff',
  PINK:'#ff44aa',LTPNK:'#ff77cc',PAPNK:'#ffaadd',DKPNK:'#aa2277',DPNK:'#661144',
  CYAN:'#88ddff',LTCYN:'#bbf0ff',DKCYN:'#447799',
  MIND:'#bb66dd',MIND2:'#9944bb',MIND3:'#7733aa',
  WHITE:'#ffffff',GRAY:'#665577',DKGRAY:'#332244',
  VOID:'#110022',SHAD:'#1a0033',
  GOLD:'#ffcc00',DKGLD:'#aa8800',LTGLD:'#ffee88',
  SKIN:'#e8c8a0',DKSKIN:'#c4a47a',LTSKIN:'#f0dcc0',
  ROBE:'#ddddcc',DKROBE:'#aaaaaa',LTROBE:'#f0f0e8',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

function tBase(p:any,b:any,topY:number,w:number,glow:number){
  const cx=16;
  // Crystalline brain/neural structure base
  for(let i=0;i<10;i++){
    const cw=w-6+Math.floor(i*0.8),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.BRPUR:i<5?C.MDPUR:i<8?C.DKPUR:C.DPPUR);
  }
  b(cx-Math.floor((w-6)/2),topY,w-6,1,C.LTPUR);
  // Neural network pattern / third eye
  p(cx,topY+2,glow>1?C.WHITE:C.PINK);p(cx-1,topY+3,glow>1?C.LTPNK:C.PINK);
  p(cx+1,topY+3,glow>1?C.LTPNK:C.PINK);p(cx,topY+4,glow>0?C.PINK:C.DKPNK);
  // Neural veins on base
  p(cx-3,topY+4,C.MIND3);p(cx+3,topY+4,C.MIND3);
  p(cx-4,topY+6,glow>0?C.MIND2:C.MIND3);p(cx+4,topY+6,glow>0?C.MIND2:C.MIND3);
  // Purple energy veins pulsing
  p(cx-2,topY+5,glow>1?C.PLPUR:C.BRPUR);p(cx+2,topY+5,glow>1?C.PLPUR:C.BRPUR);
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.DKPSY);
  if(glow>0){p(cx-5,topY+3,C.DPNK);p(cx+5,topY+3,C.DPNK);}
}

function tTendril(p:any,x1:number,y1:number,x2:number,y2:number,col:string,bright:boolean){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*2)*1.5);
    p(xx,yy,bright&&i%2===0?C.PLPUR:col);
  }
}

function tNeuralVein(p:any,x1:number,y1:number,x2:number,y2:number,col:string,bright:boolean){
  const dy=y2-y1,dx=x2-x1,steps=Math.max(Math.abs(dx),Math.abs(dy));
  for(let i=0;i<=steps;i++){
    const t=i/Math.max(1,steps);
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*3)*1.2);
    const yy=Math.round(y1+dy*t+Math.cos(t*Math.PI*2)*0.8);
    p(xx,yy,bright&&i%3===0?C.PLPUR:col);
  }
}

function tSpire(p:any,b:any,x:number,y:number,h:number,w:number,c1:string,c2:string,ct:string){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.85)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// ===== TOWER LEVEL CONFIGS =====
// Each tower: [name, maxLevel]
// Probe:5, Mesmer:4, Terror:4, Mind Spike:3, Overmind:4
const T_LEVELS=[5,4,4,3,4];
const T_MAX_LEVEL=5;
const T_STATES_PER_LEVEL=4; // idle, charge, fire, cooldown
const T_TOTAL_ROWS=T_MAX_LEVEL*T_STATES_PER_LEVEL; // 20

// ===== TOWERS (5×20 at 64×64) =====
// Layout: 5 cols (towers) × 20 rows (5 levels × 4 states)
// Row mapping: level L, state S → row = (L-1)*4 + S
// States: 0=idle, 1=charge, 2=fire, 3=cooldown
function drawTowers(ctx:any){
  const fns=[
    // Probe — Floating psychic eye/orb, true damage, pulsing iris (5 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      // Level-scaled parameters
      const orbR=3+lv;              // orb radius: 4..8
      const irisR=1+lv*0.4;        // iris size grows
      const tendCount=Math.min(lv,4);// tendril pairs
      const baseW=14+lv*2;         // base width grows
      const glowInt=lv>=3?2:lv>=2?1:0;
      tBase(p,b,22,baseW,s===1?Math.min(glowInt+1,2):s===2?2:glowInt);
      const ey=fl?4:br?5:6,cx=16;
      // Floating orb body — grows with level
      for(let y=-orbR;y<=orbR;y++)for(let x=-orbR;x<=orbR;x++){
        const d=Math.sqrt(x*x+y*y);
        if(d<=orbR){
          const col=d<orbR*0.3?C.VOID:d<orbR*0.6?(br?C.DKPUR:C.DPPUR):C.MIND3;
          p(cx+x,ey+y,col);
        }
      }
      // Iris — grows brighter/larger with level
      for(let y=-Math.ceil(irisR);y<=Math.ceil(irisR);y++)for(let x=-Math.ceil(irisR*1.5);x<=Math.ceil(irisR*1.5);x++){
        const d=Math.sqrt(x*x*0.6+y*y);
        if(d<=irisR){
          p(cx+x,ey+y,d<irisR*0.35?C.WHITE:d<irisR*0.6?(fl?C.LTPNK:C.PINK):(fl?C.PINK:C.DKPNK));
        }
      }
      // Pupil
      p(cx,ey,fl?C.WHITE:C.LTPNK);
      if(lv>=2){p(cx-1,ey,fl?C.PAPNK:C.PINK);p(cx+1,ey,fl?C.PAPNK:C.PINK);}
      // Eyelid top/bottom
      const lidW=4+lv;
      b(cx-lidW,ey-orbR+1,lidW*2,1,br?C.LTPUR:C.BRPUR);b(cx-lidW,ey+orbR-1,lidW*2,1,br?C.LTPUR:C.BRPUR);
      // Secondary eyes at higher levels
      if(lv>=3){
        // Small side eyes
        p(cx-orbR+1,ey-2,C.PINK);p(cx-orbR+1,ey-1,C.DKPNK);
        p(cx+orbR-1,ey-2,C.PINK);p(cx+orbR-1,ey-1,C.DKPNK);
      }
      if(lv>=4){
        // Third eye above
        p(cx,ey-orbR+2,C.WHITE);p(cx-1,ey-orbR+2,C.PINK);p(cx+1,ey-orbR+2,C.PINK);
      }
      if(lv>=5){
        // Bottom eye + full ring of mini-eyes
        p(cx,ey+orbR-2,C.LTPNK);p(cx-1,ey+orbR-2,C.DKPNK);p(cx+1,ey+orbR-2,C.DKPNK);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;
          const ex=cx+Math.round(Math.cos(a)*(orbR+2)),eey=ey+Math.round(Math.sin(a)*(orbR+1));
          if(ex>=0&&ex<32&&eey>=0&&eey<32){p(ex,eey,C.PINK);p(ex,eey-1,C.DKPNK);}
        }
      }
      // Psychic glow particles — more at higher levels
      if(br){p(cx-orbR-2,ey-2,C.PLPUR);p(cx+orbR+2,ey-1,C.PLPUR);if(lv>=2)p(cx-orbR-1,ey+3,C.MIND2);}
      if(fl){
        const ring=6+lv;
        for(let i=0;i<4+lv*2;i++){const a=i*Math.PI/(2+lv);p(cx+Math.round(Math.cos(a)*ring),ey+Math.round(Math.sin(a)*(ring-1)),i%2?C.PLPUR:C.LTPUR);}
        p(cx,ey-orbR-1,C.WHITE);
      }
      // Neural tendrils to base — more at higher levels
      for(let t=0;t<tendCount;t++){
        const tx=3+t*2,sign=t%2===0?-1:1;
        tTendril(p,cx+sign*tx,ey+orbR,cx+sign*(tx+1),22,br?C.BRPUR:C.MIND2,fl);
      }
      if(s===3){p(cx-2,ey,C.MIND3);p(cx+2,ey,C.MIND3);p(cx,ey-2,C.DKPUR);}
    },
    // Mesmer — Hypnotic spiral/pattern tower, confuses targets (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      const baseW=16+lv*2;
      const glowInt=lv>=3?2:lv>=2?1:0;
      tBase(p,b,23,baseW,s===1?Math.min(glowInt+1,2):s===2?2:glowInt);
      const cx=16,cy=12;
      // Spiral body — radius and complexity grow with level
      const spiralR=4+lv;
      const innerR=Math.max(1,spiralR-4);
      for(let y=-spiralR;y<=spiralR;y++)for(let x=-spiralR;x<=spiralR;x++){
        const d=Math.sqrt(x*x+y*y);
        if(d<=spiralR&&d>innerR){
          const ang=Math.atan2(y,x)+d*0.8+(s===1?0.5:s===2?1.0:0)+lv*0.2;
          const stripe=Math.sin(ang*(2+lv*0.5))>0;
          p(cx+x,cy+y,stripe?(fl?C.PLPUR:C.LTPUR):(fl?C.MIND2:C.DKPUR));
        }
      }
      // Center eye/gem — grows with level
      const gemR=1+lv*0.5;
      for(let y=-Math.ceil(gemR);y<=Math.ceil(gemR);y++)for(let x=-Math.ceil(gemR);x<=Math.ceil(gemR);x++){
        const d=Math.sqrt(x*x+y*y);
        if(d<=gemR) p(cx+x,cy+y,d<gemR*0.4?C.WHITE:d<gemR*0.7?(fl?C.PAPNK:C.PINK):C.DKPNK);
      }
      // Additional confusion nodes at higher levels
      if(lv>=2){
        // Secondary spiral nodes
        const nodes=[[cx-spiralR+1,cy-2],[cx+spiralR-1,cy+2]];
        nodes.forEach(([nx,ny])=>{p(nx,ny,C.PINK);p(nx,ny-1,C.DKPNK);});
      }
      if(lv>=3){
        // Confusion spiral marks become full mini-spirals
        for(let i=0;i<4;i++){
          const a=i*Math.PI/2+0.4;
          const nr=spiralR+2;
          const nx=cx+Math.round(Math.cos(a)*nr),ny=cy+Math.round(Math.sin(a)*nr);
          if(nx>=1&&nx<31&&ny>=1&&ny<31){
            p(nx,ny,C.PLPUR);p(nx+1,ny,C.MIND2);p(nx,ny+1,C.LTPUR);
          }
        }
      }
      if(lv>=4){
        // Full confusion aura — outer dotted ring
        for(let i=0;i<20;i++){const a=i*Math.PI/10,r=spiralR+3;
          const px_=cx+Math.round(Math.cos(a)*r),py_=cy+Math.round(Math.sin(a)*r);
          if(px_>=0&&px_<32&&py_>=0&&py_<32)p(px_,py_,i%3===0?C.WHITE:i%2?C.PLPUR:C.LTPUR);
        }
      }
      // Hypnotic rings
      if(br){
        for(let i=0;i<8+lv*2;i++){const a=i*Math.PI/(4+lv),r=spiralR+2;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.PLPUR:C.LTPUR);}
      }
      if(fl){
        for(let i=0;i<12+lv*2;i++){const a=i*Math.PI/(6+lv),r=spiralR+3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.WHITE:C.PLPUR);}
        b(cx-1,cy-spiralR-1,2,1,C.WHLAV);
      }
      // Confusion spiral marks
      p(cx-spiralR-1,cy-3,C.MIND2);p(cx+spiralR+1,cy-2,C.MIND2);
      // Tendrils — more at higher levels
      const tendPairs=Math.min(lv,3);
      for(let t=0;t<tendPairs;t++){
        const off=3+t*2;
        tTendril(p,cx-off,cy+spiralR,cx-off-1,23,C.BRPUR,fl);
        tTendril(p,cx+off,cy+spiralR,cx+off+1,23,C.BRPUR,fl);
      }
      if(s===3){for(let i=0;i<4+lv;i++){const a=i*Math.PI/(2+lv*0.5);p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.MIND3);}}
    },
    // Terror — Menacing psychic presence, dark aura, fear eyes, slow field (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      const baseW=14+lv*2;
      const glowInt=lv>=3?2:lv>=2?1:0;
      tBase(p,b,24,baseW,s===1?Math.min(glowInt+1,2):s===2?2:glowInt);
      const cx=16,cy=11;
      // Dark aura body — radius grows with level
      const auraR=5+lv;
      for(let y=-auraR;y<=auraR+2;y++)for(let x=-auraR;x<=auraR;x++){
        const d=Math.sqrt(x*x+y*y*0.7);
        if(d<=auraR){
          const col=d<auraR*0.3?C.VOID:d<auraR*0.5?C.DKPSY:d<auraR*0.8?(fl?C.DPPUR:C.SHAD):C.SHAD;
          p(cx+x,cy+y,col);
        }
      }
      // Fear eyes — more eyes at higher levels
      const eyeY=cy-1;
      // Primary eyes always present
      b(cx-4,eyeY,3,2,C.DKPNK);p(cx-3,eyeY,fl?C.WHITE:C.PINK);p(cx-4,eyeY+1,C.DPNK);
      b(cx+2,eyeY,3,2,C.DKPNK);p(cx+3,eyeY,fl?C.WHITE:C.PINK);p(cx+2,eyeY+1,C.DPNK);
      if(lv>=2){
        // Angry brow marks intensify
        p(cx-5,eyeY-1,C.PINK);p(cx-3,eyeY-1,C.DKPNK);
        p(cx+5,eyeY-1,C.PINK);p(cx+3,eyeY-1,C.DKPNK);
      }
      if(lv>=3){
        // Third eye above — menacing
        b(cx-1,eyeY-3,3,2,C.DKPNK);p(cx,eyeY-3,fl?C.WHITE:C.PINK);
        // Eyes glow brighter
        p(cx-3,eyeY,C.WHITE);p(cx+3,eyeY,C.WHITE);
      }
      if(lv>=4){
        // Additional side eyes on the aura body
        p(cx-auraR+2,cy,C.PINK);p(cx-auraR+2,cy+1,C.DPNK);
        p(cx+auraR-2,cy,C.PINK);p(cx+auraR-2,cy+1,C.DPNK);
        // Fear wave rings always visible
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=auraR+2;const px_=cx+Math.round(Math.cos(a)*r),py_=cy+Math.round(Math.sin(a)*r);if(px_>=0&&px_<32&&py_>=0&&py_<32)p(px_,py_,C.DKPNK);}
      }
      // Mouth/grimace — wider at higher levels
      const mouthW=3+lv;
      b(cx-Math.floor(mouthW/2),cy+3,mouthW,1,C.DKPNK);p(cx-Math.floor(mouthW/2)-1,cy+2,C.DPNK);p(cx+Math.floor(mouthW/2),cy+2,C.DPNK);
      // Dark aura particles — more at higher levels
      if(br){
        const pts:number[][]=[[cx-auraR-1,cy-4],[cx+auraR+1,cy-3],[cx-auraR,cy+6],[cx+auraR,cy+7]];
        if(lv>=2){pts.push([cx-auraR+2,cy-auraR+1],[cx+auraR-2,cy-auraR+1]);}
        pts.forEach(([x,y])=>{if(x>=0&&x<32&&y>=0&&y<32)p(x,y,C.DPPUR);});
      }
      if(fl){
        for(let i=0;i<6+lv*2;i++){const a=i*Math.PI/(3+lv),r=auraR+2;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.DKPNK:C.DPPUR);}
        p(cx-3,eyeY,C.WHITE);p(cx+3,eyeY,C.WHITE);
      }
      // Slow field indicator — ground wisps, wider at higher levels
      const wispW=3+lv*2;
      for(let x=-wispW;x<=wispW;x++){if(Math.abs(x)%2===0){const wy=cy+auraR;if(wy<32)p(cx+x,wy,fl?C.MIND3:C.DPPUR);}}
      if(s===3){p(cx-3,eyeY,C.MIND3);p(cx+3,eyeY,C.MIND3);b(cx-2,cy+3,5,1,C.DPPUR);}
    },
    // Mind Spike — Sharp crystal/spear of mental energy, long range (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      const baseW=16+lv*2;
      const glowInt=lv>=2?2:lv>=1?1:0;
      tBase(p,b,23,baseW,s===1?Math.min(glowInt+1,2):s===2?2:glowInt);
      const cx=16;
      // Main crystal spear — taller and wider with level
      const mainH=15+lv*3,mainW=2+lv;
      tSpire(p,b,cx-Math.floor(mainW/2),Math.max(1,22-mainH),mainH,mainW,C.DKPUR,fl?C.PLPUR:C.LTPUR,fl?C.WHITE:C.WHLAV);
      // Secondary crystal shards — more and taller with level
      const secH=10+lv*3,secW=2+Math.floor(lv/2);
      tSpire(p,b,cx-8,Math.max(2,22-secH+2),secH,secW,C.MIND3,br?C.BRPUR:C.MIND2,br?C.LTPUR:C.BRPUR);
      tSpire(p,b,cx+4,Math.max(1,22-secH),secH+1,secW,C.DPPUR,br?C.MIND2:C.MIND3,br?C.BRPUR:C.MIND2);
      // Small flanking crystals
      if(lv>=1){
        tSpire(p,b,cx-12,11,11,2,C.MIND3,C.MIND2,C.BRPUR);
        tSpire(p,b,cx+8,9,13,2,C.DPPUR,fl?C.BRPUR:C.MIND2,fl?C.LTPUR:C.BRPUR);
      }
      if(lv>=2){
        // Additional outer crystal shards
        tSpire(p,b,2,13,9,2,C.DPPUR,C.MIND3,C.BRPUR);
        tSpire(p,b,27,11,11,2,C.MIND3,fl?C.LTPUR:C.MIND2,fl?C.PLPUR:C.BRPUR);
      }
      if(lv>=3){
        // Full crystal forest — tiny shards everywhere
        tSpire(p,b,0,16,6,2,C.DPPUR,C.MIND3,C.MIND2);
        tSpire(p,b,30,14,8,2,C.MIND3,C.MIND2,C.BRPUR);
        // Energy arc between main and secondary
        for(let i=0;i<5;i++){p(cx-4+i,3+i,C.PLPUR);p(cx+1+i,2+i,C.LTPUR);}
      }
      // Crystal tips glow — brighter at higher levels
      if(br){p(cx,Math.max(1,23-mainH),C.WHITE);p(cx+1,Math.max(0,22-mainH),C.PLPUR);if(lv>=2){p(cx-7,Math.max(3,24-secH),C.LTPUR);p(cx+5,Math.max(2,23-secH),C.PLPUR);}}
      if(fl){
        b(cx-1,Math.max(0,22-mainH),mainW+1,2,C.WHITE);b(cx-2,Math.max(1,23-mainH),mainW+3,1,C.PLPUR);
        // Energy discharge lines — more at higher levels
        for(let i=0;i<3+lv*2;i++){p(cx-6-i,6+i,C.LTPUR);p(cx+7+i,5+i,C.LTPUR);}
      }
      // Base energy connection
      p(cx-6,21,br?C.PLPUR:C.BRPUR);p(cx+6,21,br?C.PLPUR:C.MIND2);
      // Ambient particles — more at higher levels
      const particles:any[]=[[cx-12,8,C.MIND2],[cx+11,6,C.BRPUR]];
      if(lv>=2)particles.push([cx-13,14,C.MIND3],[cx+12,11,C.MIND2]);
      if(lv>=3)particles.push([1,10,C.BRPUR],[30,8,C.MIND2]);
      particles.forEach(([x,y,cl]:any)=>{if(x>=0&&x<32&&y>=0&&y<32)p(x,y,cl);});
      if(s===3){p(cx,Math.max(1,23-mainH),C.MIND3);p(cx-7,Math.max(3,24-secH),C.DPPUR);}
    },
    // Overmind (Ultimate) — Massive brain/neural network, tendrils everywhere, mass confusion (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      const baseW=12+lv*2;
      const glowInt=lv>=3?2:lv>=2?1:0;
      tBase(p,b,24,baseW,s===1?Math.min(glowInt+1,2):s===2?2:glowInt);
      const cx=16,cy=10;
      // Brain dome — radius grows with level
      const brainR=4+lv;
      const brainH=Math.round(brainR*0.85);
      for(let y=-brainR;y<=brainH;y++)for(let x=-brainR-1;x<=brainR+1;x++){
        const d=Math.sqrt(x*x*0.8+y*y);
        if(d<=brainR){
          // Brain fold pattern — more complex at higher levels
          const fold=Math.sin(x*(0.5+lv*0.15)+y*0.3)*Math.cos(y*(0.4+lv*0.15));
          const col=fold>0.3?(fl?C.PLPUR:C.LTPUR):fold>-0.2?(fl?C.BRPUR:C.MIND2):(fl?C.MIND2:C.DKPUR);
          p(cx+x,cy+y,col);
        }
      }
      // Brain outline
      for(let y=-brainR;y<=brainH;y++)for(let x=-brainR-1;x<=brainR+1;x++){
        const d=Math.sqrt(x*x*0.8+y*y);
        if(d<=brainR&&d>brainR-1) p(cx+x,cy+y,br?C.LTPUR:C.BRPUR);
      }
      // Central third eye — grows with level
      const eyeR=1+Math.floor(lv/2);
      b(cx-eyeR,cy-1,eyeR*2,eyeR+2,C.DKPSY);b(cx-1,cy,2,1,fl?C.WHITE:C.PINK);
      p(cx,cy,fl?C.WHITE:C.LTPNK);
      if(lv>=2){p(cx-1,cy-1,C.DKPNK);p(cx+1,cy-1,C.DKPNK);p(cx-eyeR,cy,C.PINK);p(cx+eyeR,cy,C.PINK);}
      // Additional eyes at higher levels
      if(lv>=3){
        // Side consciousness nodes
        p(cx-brainR+2,cy-1,C.PINK);p(cx-brainR+2,cy,C.DKPNK);
        p(cx+brainR-2,cy-1,C.PINK);p(cx+brainR-2,cy,C.DKPNK);
      }
      if(lv>=4){
        // Crown of eyes around brain top
        for(let i=0;i<5;i++){
          const a=-Math.PI*0.2+i*Math.PI*0.1;
          const ex=cx+Math.round(Math.cos(a)*(brainR-1)),eey=cy+Math.round(Math.sin(a)*(brainR-1));
          if(ex>=0&&ex<32&&eey>=0&&eey<32){p(ex,eey,C.WHITE);p(ex,eey+1,C.PINK);}
        }
      }
      // Neural tendrils spreading out — more tendrils at higher levels
      const tendCount=2+lv;
      for(let t=0;t<tendCount;t++){
        const spread=t/(tendCount-1||1);
        const tx1=cx-Math.round(brainR*0.8*(1-spread)),ty1=cy+brainH;
        const tx2=Math.round(2+spread*(28)),ty2=22+Math.round(spread*2);
        tNeuralVein(p,tx1,ty1,tx2,ty2,t<2?(br?C.BRPUR:C.MIND2):C.MIND3,fl);
      }
      // Center tendril always
      tNeuralVein(p,cx,cy+brainH,cx,24,br?C.MIND2:C.MIND3,fl);
      // Additional tendrils on fire — more dramatic at higher levels
      if(fl){
        tNeuralVein(p,cx-brainR,cy,0,12,C.PLPUR,true);
        tNeuralVein(p,cx+brainR,cy,31,12,C.PLPUR,true);
        if(lv>=3){
          tNeuralVein(p,cx-brainR+2,cy-brainR+1,2,2,C.LTPUR,true);
          tNeuralVein(p,cx+brainR-2,cy-brainR+1,29,2,C.LTPUR,true);
        }
        // Confusion pulse rings — more at higher levels
        for(let i=0;i<8+lv*2;i++){const a=i*Math.PI/(4+lv),r=brainR+4;
          const px_=cx+Math.round(Math.cos(a)*r),py_=cy+Math.round(Math.sin(a)*r);
          if(px_>=0&&px_<32&&py_>=0&&py_<32)p(px_,py_,i%2?C.PLPUR:C.LTPUR);
        }
      }
      // Brain stem — thicker at higher levels
      const stemW=2+Math.floor(lv/2);
      b(cx-stemW,cy+brainH,stemW*2,5,C.DKPUR);b(cx-1,cy+brainH,2,5,C.MIND3);
      // Pulsing glow — more particles at higher levels
      if(br){
        p(cx-brainR-2,cy-2,C.MIND2);p(cx+brainR+2,cy-1,C.MIND2);p(cx,cy-brainR-1,C.PLPUR);
        if(lv>=3){p(cx-brainR-3,cy+3,C.BRPUR);p(cx+brainR+3,cy+4,C.BRPUR);}
      }
      // Energy sparks at base
      p(cx-3,cy+brainH+5,fl?C.PLPUR:C.BRPUR);p(cx+3,cy+brainH+5,fl?C.PLPUR:C.BRPUR);
      if(s===3){b(cx-eyeR,cy,eyeR*2,1,C.MIND3);p(cx,cy-2,C.DKPUR);}
    },
  ];
  const cols=5,rows=T_TOTAL_ROWS;
  for(let col=0;col<cols;col++){
    const maxLv=T_LEVELS[col];
    for(let lv=1;lv<=maxLv;lv++){
      for(let state=0;state<T_STATES_PER_LEVEL;state++){
        const row=(lv-1)*T_STATES_PER_LEVEL+state;
        fns[col](ctx,[col*T_CELL,row*T_CELL],state,lv);
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (5×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:any){
  const fns=[
    // Probe: psychic eye beam → mind penetrate flash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Psychic eye beam traveling
        const bob=[0,-1,1][f];
        // Eye shape
        b(cx-3,cy-1+bob,6,2,C.DKPUR);b(cx-2,cy-1+bob,4,2,C.MIND2);
        b(cx-1,cy-1+bob,2,2,C.PINK);p(cx,cy+bob,C.WHITE);
        // Beam trail
        for(let i=1;i<5+f;i++) p(cx-5-i,cy+bob+(i%2?0:1),i%2?C.PLPUR:C.LTPUR);
        // Forward glow
        p(cx+4,cy+bob,f===2?C.PLPUR:C.LTPUR);p(cx+3,cy-1+bob,C.BRPUR);
      }
      else if(f===3){
        // Mind penetrate flash - expanding eye burst
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.PLPUR:C.LTPUR);}
        b(cx-2,cy-1,4,2,C.PINK);p(cx,cy,C.WHITE);b(cx-1,cy-1,2,1,C.PAPNK);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.BRPUR);}
      }
      else if(f===4){
        // Penetrate dissipate
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=5;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.MIND2:C.BRPUR);}
        p(cx,cy,C.LTPUR);p(cx-1,cy,C.MIND2);p(cx+1,cy,C.MIND2);
      }
      else{
        // Fade
        [[3,5],[12,4],[5,10],[10,12],[7,3],[8,13]].forEach(([x,y],i)=>p(x,y,i%2?C.MIND3:C.DKPUR));
        p(cx,cy,C.MIND3);
      }
    },
    // Mesmer: spiral hypno-rings → confusion burst
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Spiral hypno-rings traveling
        const rot=f*2.5;
        for(let i=0;i<10;i++){
          const a=(i+rot)*Math.PI/5;
          const r=3+Math.sin(i*0.5)*1;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2===0?C.PLPUR:C.MIND2);
        }
        // Center
        p(cx,cy,f===2?C.WHITE:C.LTPUR);p(cx-1,cy,C.BRPUR);p(cx+1,cy,C.BRPUR);
        // Trail swirl
        if(f>0){p(cx-4-f,cy+1,C.MIND3);p(cx-3-f,cy-1,C.MIND2);}
      }
      else if(f===3){
        // Confusion burst - spiral expanding
        for(let r=2;r<=6;r+=2)for(let i=0;i<8;i++){
          const a=i*Math.PI/4+r*0.3;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r<4?C.PLPUR:C.LTPUR);
        }
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.PINK);
        // Confusion spiral marks
        p(cx-3,cy-3,C.PAPNK);p(cx+3,cy-3,C.PAPNK);p(cx-3,cy+3,C.PAPNK);p(cx+3,cy+3,C.PAPNK);
      }
      else if(f===4){
        // Spiral dissipate
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=4+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.PLPUR:C.MIND3);}
        p(cx,cy,C.BRPUR);p(cx-1,cy+1,C.MIND2);p(cx+1,cy-1,C.MIND2);
      }
      else{
        [[4,5],[11,4],[6,11],[9,3],[3,9],[13,8]].forEach(([x,y],i)=>p(x,y,i%2?C.MIND3:C.DKPUR));
      }
    },
    // Terror: dark fear wave → terror explosion
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Dark fear wave - expanding dark arc
        const spread=[3,4,5][f];
        for(let i=-spread;i<=spread;i++){
          const x=cx+i,y=cy-Math.abs(i)*0.3+f;
          p(Math.round(x),Math.round(y),Math.abs(i)<2?C.DKPNK:C.DPPUR);
        }
        // Fear face hint
        p(cx-1,cy-1,C.PINK);p(cx+1,cy-1,C.PINK);p(cx,cy+1,C.DKPNK);
        // Dark trail
        for(let i=1;i<=f+1;i++) p(cx,cy+2+i,C.DPPUR);
      }
      else if(f===3){
        // Terror explosion - screaming face
        b(cx-3,cy-3,6,6,C.DPPUR);b(cx-2,cy-2,4,4,C.DKPSY);
        // Screaming eyes
        p(cx-2,cy-1,C.PINK);p(cx+1,cy-1,C.PINK);
        // Open mouth
        b(cx-1,cy+1,2,2,C.DKPNK);p(cx,cy+1,C.PINK);
        // Fear waves radiating
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=5;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.DPPUR:C.DKPNK);}
        for(let i=0;i<6;i++){const a=i*Math.PI/3,r=7;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.SHAD);}
      }
      else if(f===4){
        // Terror dissipate
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=4;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DPPUR);}
        p(cx,cy,C.DKPNK);p(cx-1,cy-1,C.DPNK);p(cx+1,cy+1,C.DPNK);
        b(cx-1,cy-1,2,2,C.SHAD);
      }
      else{
        p(cx,cy,C.SHAD);[[4,6],[11,5],[6,10],[10,4],[3,8],[13,7]].forEach(([x,y],i)=>p(x,y,i%2?C.DPPUR:C.SHAD));
      }
    },
    // Mind Spike: mental spear → psychic shatter
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Mental spear traveling
        const ang=[-1,0,1][f];
        for(let i=0;i<10;i++){
          const w=i<2?1:i<8?2:1;
          const sx=cx-Math.floor(w/2)+ang*(i<5?0:i<8?1:0);
          b(sx,cy-5+i,w,1,i<2?C.WHITE:i<4?C.PLPUR:i<7?C.LTPUR:C.BRPUR);
        }
        // Crystal facets
        p(cx-2,cy-1,C.MIND2);p(cx+2,cy+1,C.MIND2);
        // Tip glow
        p(cx,cy-5,C.WHLAV);
      }
      else if(f===3){
        // Psychic shatter - crystal explosion
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=5;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.LTPUR:C.PLPUR);
        }
        // Crystal fragments
        p(cx-2,cy-3,C.WHLAV);p(cx+3,cy-1,C.LTPUR);p(cx-1,cy+3,C.BRPUR);p(cx+2,cy+2,C.PLPUR);
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.LTPUR);
      }
      else if(f===4){
        // Shatter dissipate - fragments flying
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.PLPUR:C.MIND3);}
        p(cx-1,cy,C.BRPUR);p(cx+1,cy,C.BRPUR);
      }
      else{
        [[4,4],[11,5],[6,12],[9,3],[3,8],[13,9]].forEach(([x,y],i)=>p(x,y,i%2?C.MIND3:C.DKPUR));
      }
    },
    // Overmind: massive neural pulse → mind blast nova
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Neural pulse expanding
        const r=[3,4,5][f];
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.WHITE:i%2?C.PLPUR:C.LTPUR);
        }
        // Inner brain pattern
        b(cx-1,cy-1,2,2,C.MIND2);p(cx,cy,f>1?C.WHITE:C.PLPUR);
        // Neural tendrils
        if(f>0){for(let i=0;i<4;i++){const a=i*Math.PI/2;
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.BRPUR);
        }}
      }
      else if(f===3){
        // Mind blast nova - concentric rings
        for(let r=2;r<=6;r+=2)for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          const px=cx+Math.round(Math.cos(a)*r),py=cy+Math.round(Math.sin(a)*r);
          if(px>=0&&px<16&&py>=0&&py<16) p(px,py,r<4?C.WHITE:r<6?C.PLPUR:C.LTPUR);
        }
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.PAPNK);
        // Confusion sparks
        [[2,2],[13,3],[3,13],[12,12]].forEach(([x,y])=>p(x,y,C.PINK));
      }
      else if(f===4){
        // Nova dissipate - fading rings
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*7),C.MIND3);
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.BRPUR);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.MIND2);
        }
        p(cx,cy,C.BRPUR);
      }
      else{
        // Fade out
        [[3,4],[12,3],[5,12],[10,11],[7,2],[9,14],[2,7],[14,8]].forEach(([x,y],i)=>p(x,y,i%3===0?C.MIND3:i%2?C.DKPUR:C.MIND2));
        p(cx,cy,C.MIND3);
      }
    },
  ];
  const cols=5,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO: MONK (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx:any){
  // dir: 0=down,1=side,2=up | type: idle/walk/atk | frame: variant
  function drawChar(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,dash=false,meditate=false,flyKick=false,thousandFists=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Dash afterimage
    if(dash){
      for(let y=0;y<22;y++){const w=y<4?3:y<8?5:y<14?4:3,sx=cx-9-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,6+y,y%2?C.VOID:C.SHAD);}}
      for(let y=0;y<16;y++){const w=y<3?2:y<10?3:2,sx=cx-16-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,9+y,C.VOID);}}
      p(cx-8,10,C.MIND3);p(cx-12,13,C.DPPUR);
    }

    // Thousand fists blur effect
    if(thousandFists){
      // Multiple arm afterimages
      for(let af=0;af<4;af++){
        const ox=cx+3+af*2,oy=8+af*3;
        if(ox<30&&oy<50){p(ox,oy,C.PLPUR);p(ox+1,oy,C.LTPUR);p(ox,oy+1,C.BRPUR);}
        const ox2=cx-3-af*2,oy2=10+af*2;
        if(ox2>=0&&oy2<50){p(ox2,oy2,C.PLPUR);p(ox2-1,oy2,C.LTPUR);p(ox2,oy2+1,C.BRPUR);}
      }
      // Energy burst particles
      [[3,5],[26,8],[5,15],[27,12],[2,20],[29,18]].forEach(([mx,my])=>{
        p(mx,my,C.PINK);p(mx+1,my,C.LTPNK);
      });
    }

    // Meditation glow
    if(meditate){
      // Aura rings
      for(let i=0;i<16;i++){const a=i*Math.PI/8,r=10;
        const px_=cx+Math.round(Math.cos(a)*r),py_=30+Math.round(Math.sin(a)*r);
        if(px_>=0&&px_<32&&py_>=0&&py_<64)p(px_,py_,i%2?C.PLPUR:C.LTPUR);
      }
      for(let i=0;i<12;i++){const a=i*Math.PI/6,r=14;
        const px_=cx+Math.round(Math.cos(a)*r),py_=30+Math.round(Math.sin(a)*r);
        if(px_>=0&&px_<32&&py_>=0&&py_<64)p(px_,py_,i%3===0?C.WHLAV:C.BRPUR);
      }
      // Third eye glow
      p(cx,5,C.PINK);p(cx-1,4,C.LTPNK);p(cx+1,4,C.LTPNK);p(cx,3,C.WHITE);
    }

    const lean=dash?2:flyKick?3:atk&&atkFrame>0?1:0;
    const headY=dash?5:meditate?10:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx_=cx+lean;

    // ROBES (behind body)
    if(dir===2||dir===0){
      const cY=torY+4,sp=dash?3:meditate?0:flyKick?4:1;
      for(let i=0;i<14;i++){
        const w=5+Math.floor(i*0.4)+sp,sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(dash?2:0))*0.8);
        const cl=i<3?C.DKROBE:i<8?C.ROBE:i<11?C.DKROBE:C.DKGRAY;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Robe edge detail
      for(let i=0;i<10;i++){
        const w=5+Math.floor(i*0.4)+sp,sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(dash?2:0))*0.8);
        if(cY+i<62){p(sx_,cY+i,C.ROBE);if(sx_+w-1<32)p(sx_+w-1,cY+i,i%3===0?C.LTROBE:C.ROBE);}
      }
      // Bottom tatter
      const bY_=Math.min(cY+12,61);
      for(let x=-4;x<5;x++){const px_=bx_+x;if(px_>=0&&px_<32&&(px_+bY_)%3!==0)p(px_,bY_,C.DKGRAY);if(px_>=0&&px_<32&&(px_+bY_)%2===0&&bY_+1<63)p(px_,bY_+1,C.SHAD);}
    }

    // HEAD — Bald monk with third eye mark
    if(dir===0){
      // Down facing - bald head
      b(bx_-4,headY,8,6,C.SKIN);b(bx_-3,headY-1,6,1,C.SKIN);b(bx_-2,headY-2,4,1,C.SKIN);
      // Scalp highlight
      b(bx_-2,headY-1,4,1,C.LTSKIN);p(bx_-1,headY-2,C.LTSKIN);
      // Face shadow
      b(bx_-3,headY+4,6,2,C.DKSKIN);
      // Eyes
      p(bx_-2,headY+2,C.DKPSY);p(bx_+2,headY+2,C.DKPSY);
      // Third eye mark
      p(bx_,headY,C.PINK);p(bx_-1,headY+1,C.DKPNK);p(bx_+1,headY+1,C.DKPNK);
      if(meditate||thousandFists){p(bx_,headY,C.WHITE);p(bx_-1,headY,C.LTPNK);p(bx_+1,headY,C.LTPNK);}
      // Mouth
      p(bx_,headY+4,C.DKSKIN);
      // Ears
      p(bx_-4,headY+2,C.DKSKIN);p(bx_+4,headY+2,C.DKSKIN);
    } else if(dir===1){
      // Side profile
      b(bx_-3,headY,6,6,C.SKIN);b(bx_-2,headY-1,5,1,C.SKIN);b(bx_-1,headY-2,3,1,C.SKIN);
      // Profile highlight
      b(bx_-1,headY-1,3,1,C.LTSKIN);
      // Face shadow
      b(bx_-2,headY+4,4,2,C.DKSKIN);
      // Eye
      p(bx_+1,headY+2,C.DKPSY);p(bx_+2,headY+2,C.DKPSY);
      // Third eye (side)
      p(bx_,headY,C.PINK);
      if(meditate||thousandFists){p(bx_,headY,C.WHITE);}
      // Nose
      p(bx_+3,headY+3,C.DKSKIN);
      // Ear
      p(bx_-3,headY+2,C.DKSKIN);
    } else {
      // Up - back of head
      b(bx_-4,headY,8,6,C.SKIN);b(bx_-3,headY-1,6,1,C.SKIN);b(bx_-2,headY-2,4,1,C.SKIN);
      b(bx_-3,headY,6,5,C.DKSKIN);
      // Scalp top
      b(bx_-2,headY-1,4,1,C.LTSKIN);p(bx_-1,headY-2,C.LTSKIN);
      // Neck
      b(bx_-2,headY+5,4,1,C.DKSKIN);
    }

    // TORSO — simple robes
    b(bx_-3,torY,6,8,C.ROBE);b(bx_-2,torY,4,8,C.LTROBE);
    if(dir===0){
      // Robe front fold / sash
      p(bx_,torY+1,C.DKROBE);p(bx_,torY+2,C.DKROBE);p(bx_,torY+3,C.DKROBE);
      p(bx_,torY+4,C.DKROBE);p(bx_,torY+5,C.DKROBE);
      // Purple sash
      b(bx_-3,torY+6,6,2,C.MIND2);b(bx_-2,torY+6,4,1,C.BRPUR);p(bx_,torY+6,C.LTPUR);
    } else if(dir===1){
      p(bx_+1,torY+1,C.DKROBE);p(bx_+1,torY+3,C.DKROBE);p(bx_+1,torY+5,C.DKROBE);
      b(bx_-2,torY+6,4,2,C.MIND2);b(bx_-1,torY+6,2,1,C.BRPUR);
    } else {
      p(bx_-1,torY+1,C.DKROBE);p(bx_,torY+2,C.DKROBE);p(bx_+1,torY+1,C.DKROBE);
      b(bx_-3,torY+6,6,2,C.MIND2);b(bx_-2,torY+6,4,1,C.BRPUR);
    }

    // ARMS & PSYCHIC ENERGY HANDS
    if(atk){
      // Palm strike attacks with psychic energy bursts
      if(dir===0){
        if(atkFrame===0){
          // Wind up - arm pulled back
          b(bx_+3,torY-1,2,4,C.SKIN);b(bx_+3,torY-1,2,2,C.ROBE);
          // Psychic energy charging
          p(bx_+5,torY-2,C.PLPUR);p(bx_+6,torY-3,C.LTPUR);p(bx_+5,torY-4,C.WHITE);
          b(bx_-5,torY+2,2,4,C.ROBE);p(bx_-5,torY+5,C.SKIN);
        } else {
          // Palm strike forward - energy burst
          b(bx_+3,torY+2,3,2,C.SKIN);b(bx_+3,torY+1,2,2,C.ROBE);
          // Psychic energy palm burst
          for(let i=0;i<6;i++) p(bx_+6,torY+i-1,i===0?C.WHITE:i<3?C.PLPUR:C.LTPUR);
          for(let i=0;i<4;i++) p(bx_+7,torY+i,i<2?C.PLPUR:C.BRPUR);
          p(bx_+8,torY+1,C.WHLAV);p(bx_+8,torY+2,C.PLPUR);
          b(bx_-5,torY+2,2,4,C.ROBE);p(bx_-5,torY+5,C.SKIN);
        }
      } else if(dir===1){
        if(atkFrame===0){
          b(bx_+3,torY,3,2,C.ROBE);b(bx_+4,torY+2,2,2,C.SKIN);
          p(bx_+6,torY-1,C.PLPUR);p(bx_+7,torY-2,C.LTPUR);p(bx_+6,torY-3,C.WHITE);
        } else {
          b(bx_+3,torY+1,3,2,C.ROBE);b(bx_+5,torY+3,2,2,C.SKIN);
          for(let i=0;i<5;i++){const x_=bx_+7+Math.floor(i*0.3),y_=torY+2+i;if(x_<32&&y_<63)p(x_,y_,i===0?C.WHITE:i<3?C.PLPUR:C.LTPUR);}
          p(bx_+8,torY+3,C.WHLAV);
        }
      } else {
        if(atkFrame===0){b(bx_+3,torY-1,2,3,C.ROBE);p(bx_+4,torY-2,C.SKIN);p(bx_+5,torY-3,C.PLPUR);p(bx_+5,torY-4,C.WHITE);}
        else{b(bx_+3,torY+3,2,3,C.ROBE);p(bx_+4,torY+5,C.SKIN);for(let i=0;i<5;i++)p(bx_+5,torY+6+i,i<2?C.PLPUR:C.BRPUR);}
      }
    } else {
      // Idle/walk arms
      const aY=torY+1;
      if(dir===0){
        b(bx_-5,aY+armSwing,2,5,C.ROBE);p(bx_-5,aY+armSwing+4,C.SKIN);p(bx_-4,aY+armSwing+4,C.SKIN);
        b(bx_+3,aY-armSwing,2,5,C.ROBE);p(bx_+3,aY-armSwing+4,C.SKIN);p(bx_+4,aY-armSwing+4,C.SKIN);
        // Subtle psychic glow on hands
        if(meditate){p(bx_-5,aY+armSwing+5,C.PLPUR);p(bx_+4,aY-armSwing+5,C.PLPUR);}
      } else if(dir===1){
        b(bx_+3,aY-armSwing,2,5,C.ROBE);p(bx_+3,aY-armSwing+4,C.SKIN);p(bx_+4,aY-armSwing+4,C.SKIN);
        if(meditate){p(bx_+4,aY-armSwing+5,C.PLPUR);}
      } else {
        b(bx_-5,aY+armSwing,2,5,C.ROBE);p(bx_-5,aY+armSwing+4,C.SKIN);
        b(bx_+3,aY-armSwing,2,5,C.ROBE);p(bx_+4,aY-armSwing+4,C.SKIN);
      }
    }

    // LEGS
    const lh=10;
    if(flyKick){
      // Flying kick — legs extended
      b(bx_+2,legY-2,2,3,C.ROBE);b(bx_+4,legY-3,2,2,C.SKIN);
      b(bx_+6,legY-4,3,2,C.SKIN);p(bx_+8,legY-4,C.DKSKIN);// Extended foot
      b(bx_-3,legY,2,4,C.ROBE);p(bx_-3,legY+3,C.SKIN);// Trailing leg
      // Psychic energy trail on kick
      p(bx_+9,legY-5,C.PLPUR);p(bx_+10,legY-4,C.LTPUR);p(bx_+9,legY-3,C.BRPUR);
    } else if(meditate){
      // Cross-legged sitting
      b(bx_-4,legY,8,3,C.ROBE);b(bx_-3,legY+1,6,2,C.DKROBE);
      p(bx_-4,legY+2,C.SKIN);p(bx_+4,legY+2,C.SKIN);// Feet visible
      // Levitation gap
      p(bx_-2,legY+4,C.SHAD);p(bx_+2,legY+4,C.SHAD);
    } else {
      b(bx_-2+lOff,legY,2,lh,C.ROBE);p(bx_-1+lOff,legY,C.LTROBE);
      b(bx_+1+rOff,legY,2,lh,C.ROBE);p(bx_+2+rOff,legY,C.LTROBE);
      // Feet/sandals
      const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
      b(bx_-3+lOff,lfy,4,2,C.DKSKIN);b(bx_-3+lOff,lfy,3,1,C.SKIN);
      b(bx_+rOff,rfy,4,2,C.DKSKIN);b(bx_+1+rOff,rfy,3,1,C.SKIN);
      // Ground shadow
      if(!dash&&lfy+2<63){p(bx_-3+lOff,lfy+2,C.SHAD);p(bx_+3+rOff,rfy+2,C.SHAD);}
    }

    // Hurt flash
    if(hurt){p(bx_+4,headY+1,C.PINK);p(bx_+5,headY,C.LTPNK);p(bx_+6,headY+1,C.PINK);p(bx_+5,headY+2,C.LTPNK);}

    // Flying kick energy trail
    if(flyKick){
      for(let y=headY-2;y<legY+4;y+=3){p(bx_-7,y,C.BRPUR);p(bx_-8,y+1,C.MIND3);}
    }

    // Dash energy trail
    if(dash){
      for(let y=headY-2;y<legY+8;y+=3){p(bx_-7,y,C.MIND3);p(bx_+7,y+1,C.MIND3);}
    }
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities palmStrike1,palmStrike2,innerFocus1,innerFocus2,flyingKick1,flyingKick2,thousandFists1,thousandFists2
  // R4: hurt,death1,death2,portrait,x,x,x,x

  const frames:any[]=[];
  // Per-direction rows
  for(let dir=0;dir<3;dir++){
    frames.push([
      {dir,opts:{}},
      {dir,opts:{armSwing:1}},
      {dir,opts:{lOff:1,rOff:-1,armSwing:1}},
      {dir,opts:{lOff:-1,rOff:1,armSwing:-1}},
      {dir,opts:{lOff:2,rOff:0,armSwing:1}},
      {dir,opts:{lOff:0,rOff:2,armSwing:-1}},
      {dir,opts:{atk:true,atkFrame:0,lOff:1}},
      {dir,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},
    ]);
  }
  // Abilities
  frames.push([
    {dir:0,opts:{atk:true,atkFrame:0,lOff:1}},           // Palm strike wind-up
    {dir:0,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},   // Palm strike hit
    {dir:0,opts:{meditate:true}},                          // Inner focus 1
    {dir:0,opts:{meditate:true,armSwing:1}},               // Inner focus 2
    {dir:1,opts:{dash:true,flyKick:true,lOff:2,rOff:1}},  // Flying kick 1
    {dir:1,opts:{dash:true,flyKick:true,lOff:3,rOff:2}},  // Flying kick 2
    {dir:0,opts:{thousandFists:true,atk:true,atkFrame:0}}, // Thousand fists 1
    {dir:0,opts:{thousandFists:true,atk:true,atkFrame:1,armSwing:1}}, // Thousand fists 2
  ]);
  // States
  frames.push([
    {dir:0,opts:{hurt:true,lOff:-1,rOff:-1}},
    {dir:0,opts:{custom:'death1'}},
    {dir:0,opts:{custom:'death2'}},
    {dir:0,opts:{custom:'portrait'}},
    null,null,null,null,
  ]);

  const cols=8,rows=5;
  frames.forEach((row:any,ry:number)=>{
    row.forEach((frame:any,rx:number)=>{
      if(!frame)return;
      const o=[rx*H_CW,ry*H_CH];
      if(frame.opts.custom==='death1'){
        // Monk collapsed, spirit beginning to ascend
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Body on ground
        b(6,34,18,4,C.ROBE);b(7,35,16,2,C.DKROBE);b(6,34,18,1,C.LTROBE);
        // Head
        b(5,32,5,3,C.SKIN);b(5,32,5,1,C.LTSKIN);p(7,33,C.DKPSY);// Eye closed
        // Third eye still glowing
        p(6,31,C.PINK);p(7,31,C.LTPNK);
        // Arm
        b(23,34,4,2,C.SKIN);b(22,36,3,1,C.DKSKIN);
        // Legs
        b(8,38,14,3,C.ROBE);b(7,39,16,2,C.DKROBE);
        // Sash on ground
        b(12,37,6,1,C.MIND2);p(14,37,C.BRPUR);
        // Spirit ascending
        for(let y=20;y<30;y++){
          const w=y<24?2:1;const sx_=14-Math.floor(w/2)+Math.round(Math.sin(y*0.4)*1);
          for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32)p(px_,y,y%2?C.PLPUR:C.LTPUR);}
        }
        p(14,19,C.WHITE);p(13,20,C.PLPUR);p(15,20,C.PLPUR);
        // Ground shadow
        for(let x=5;x<25;x++){if(x%3!==0)p(x,41,C.SHAD);if(x%4===0)p(x,42,C.VOID);}
      } else if(frame.opts.custom==='death2'){
        // Spirit fully ascended, body faded
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Faded ground remains
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.SHAD);if(x%3===0)p(x,41,C.DKGRAY);}
        // Sash remnant
        p(14,40,C.MIND3);p(15,40,C.DKPUR);
        // Spirit particles ascending
        [[10,35],[14,30],[18,33],[12,26],[20,28],[8,31],[16,22],[22,24],[11,18],[15,14],[19,20],[13,10],[17,8],[12,6],[18,12],[10,16],[16,4],[14,2],[12,14],[18,16]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.PINK:i%4===0?C.PLPUR:i%3===0?C.LTPUR:i%2===0?C.BRPUR:C.MIND2);
        });
        // Third eye mark lingering
        p(14,41,C.PINK);p(15,41,C.DKPNK);
      } else if(frame.opts.custom==='portrait'){
        // Monk portrait — bald head, third eye, simple robes
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Background
        b(2,2,28,60,C.DKPSY);b(3,3,26,58,C.DPPUR);
        // Head — large bald head
        b(8,6,16,12,C.SKIN);b(9,5,14,1,C.SKIN);b(10,4,12,1,C.LTSKIN);b(11,3,10,1,C.LTSKIN);
        // Scalp highlight
        b(12,4,8,2,C.LTSKIN);b(13,3,6,1,C.WHITE);
        // Face details
        b(8,16,16,2,C.DKSKIN);// Chin shadow
        // Eyes — calm, focused
        b(10,11,3,2,C.DKPSY);b(11,11,1,2,C.PLPUR);// Left eye
        b(19,11,3,2,C.DKPSY);b(20,11,1,2,C.PLPUR);// Right eye
        // Eye highlights
        p(11,11,C.WHITE);p(20,11,C.WHITE);
        // Third eye mark — prominent
        b(14,7,4,3,C.DKPNK);b(15,7,2,2,C.PINK);p(16,7,C.WHITE);p(15,8,C.LTPNK);
        // Third eye glow aura
        p(13,6,C.DKPNK);p(18,6,C.DKPNK);p(14,5,C.DPNK);p(17,5,C.DPNK);
        // Nose
        p(15,13,C.DKSKIN);p(16,13,C.DKSKIN);
        // Mouth — serene
        b(14,15,4,1,C.DKSKIN);
        // Ears
        b(7,10,2,4,C.DKSKIN);b(23,10,2,4,C.DKSKIN);
        // Neck
        b(12,18,8,3,C.SKIN);b(13,18,6,2,C.DKSKIN);
        // Robes
        b(6,21,20,20,C.ROBE);b(7,22,18,18,C.LTROBE);
        // Robe fold
        p(15,22,C.DKROBE);p(15,24,C.DKROBE);p(15,26,C.DKROBE);p(15,28,C.DKROBE);p(15,30,C.DKROBE);
        // Purple sash across chest
        b(8,26,16,2,C.MIND2);b(9,26,14,1,C.BRPUR);b(11,26,10,1,C.LTPUR);
        p(15,26,C.PLPUR);// Sash knot
        // Robe shoulders
        b(5,21,3,5,C.DKROBE);b(24,21,3,5,C.DKROBE);
        // Psychic energy wisps around
        p(4,8,C.PLPUR);p(27,7,C.PLPUR);p(3,15,C.LTPUR);p(28,14,C.LTPUR);
        p(5,25,C.BRPUR);p(26,24,C.BRPUR);p(4,35,C.MIND2);p(27,33,C.MIND2);
        // Border
        b(2,2,28,1,C.BRPUR);b(2,61,28,1,C.BRPUR);b(2,2,1,60,C.BRPUR);b(29,2,1,60,C.BRPUR);
        p(3,3,C.PINK);p(28,3,C.PINK);p(3,60,C.PINK);p(28,60,C.PINK);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Probe','Mesmer','Terror','Mind Spike','Overmind'];
const T_STATE_NAMES=['Idle','Charge','Fire','Cooldown'];
const T_ROW_LABELS:string[]=[];
for(let lv=1;lv<=T_MAX_LEVEL;lv++)for(let si=0;si<T_STATES_PER_LEVEL;si++)T_ROW_LABELS.push(`L${lv} ${T_STATE_NAMES[si]}`);
const P_NAMES=['Psy Beam','Hypno Ring','Fear Wave','Mind Spear','Neural Pulse'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Palm 1','Palm 2','Focus 1','Focus 2','F.Kick 1','F.Kick 2','1000Fst 1','1000Fst 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=5*T_CELL;tc.height=T_TOTAL_ROWS*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+5*T_CELL*tS;tpv.height=T_TOTAL_ROWS*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#07050c';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<T_TOTAL_ROWS;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#bb66dd';tpc.font='bold 9px monospace';tpc.fillText(T_ROW_LABELS[r],3,by+T_CELL*tS/2+3);
      // Draw level separator line at start of each level group
      if(r%T_STATES_PER_LEVEL===0&&r>0){tpc.strokeStyle='#442266';tpc.beginPath();tpc.moveTo(0,by-3);tpc.lineTo(tpv.width,by-3);tpc.stroke();}
      for(let cc=0;cc<5;cc++){
        // Skip rows beyond this tower's max level
        const lv=Math.floor(r/T_STATES_PER_LEVEL)+1;
        if(lv>T_LEVELS[cc])continue;
        const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a1a2a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#aa88cc';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=5*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+5*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#07050c';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#bb66dd';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<5;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a1a2a';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#aa88cc';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH2=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH2)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#07050c';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH2)+5;hpc.fillStyle='#bb66dd';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a1a2a';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#aa88cc';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'psionic_towers_animated.png',
      info:{sz:'320×1280',cell:'64×64',loader:"this.load.spritesheet('psionic_towers','psionic_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'5 cols (towers) × 20 rows (5 levels × 4 states: idle/charge/fire/cooldown). Probe:5lv, Mesmer:4lv, Terror:4lv, Mind Spike:3lv, Overmind:4lv'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'psionic_projectiles_animated.png',
      info:{sz:'160×192',cell:'32×32',loader:"this.load.spritesheet('psionic_proj','psionic_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'5 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Monk',ref:hRef,pvRef:hPv,dl:'monk_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('monk','monk_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#07050c',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.PINK,margin:0,fontSize:15}}>PSIONIC FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.PINK,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#330055':'#111',color:tab===t.id?C.PINK:'#775599',border:`1px solid ${tab===t.id?'#6622aa':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {(['preview','actual'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a1a2a':'#111',color:view===v?C.LTPUR:'#556677',border:`1px solid ${view===v?'#334':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'85vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?5*P_CELL*3:5*T_CELL*2,border:'1px solid #1a1a2a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#665588',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#aa77dd'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#aa77dd'}}>Phaser:</b> <code style={{color:C.LTPUR}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#aa77dd'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
