import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
  GOLD:'#ffcc44',LTGLD:'#ffee88',DKGLD:'#aa8822',DPGLD:'#664400',DKAMB:'#332200',
  RED:'#ff4444',DKRED:'#cc2222',LTRED:'#ff7766',PAPRED:'#ffaaaa',
  GRN:'#44ff44',DKGRN:'#22aa22',LTGRN:'#88ff88',PAPGRN:'#bbffbb',
  BLUE:'#4488ff',DKBLU:'#2255bb',LTBLU:'#77bbff',PAPBLU:'#aaddff',
  MAG:'#ff44ff',DKMAG:'#aa22aa',LTMAG:'#ff88ff',PAPMAG:'#ffbbff',
  WHITE:'#ffffff',CREAM:'#fff8dd',AMBER:'#cc9933',
  GRAY:'#888866',DKGRAY:'#444433',BG:'#1a1100',SHADOW:'#110800',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

// Resonating base with tuning fork prongs and sound wave rings
function tBase(p:any,b:any,topY:number,w:number,glow:number,tint?:string){
  const cx=16;
  // Platform
  for(let i=0;i<8;i++){
    const cw=w-4+Math.floor(i*0.6),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.GOLD:i<4?C.DKGLD:i<6?C.DPGLD:C.DKAMB);
  }
  b(cx-Math.floor((w-4)/2),topY,w-4,1,C.LTGLD);
  // Tuning fork prongs
  const fh=4;
  b(cx-3,topY-fh,1,fh,glow>1?C.LTGLD:C.GOLD);
  b(cx+2,topY-fh,1,fh,glow>1?C.LTGLD:C.GOLD);
  b(cx-2,topY-1,4,1,C.DKGLD);// crossbar
  // Resonance rings on base
  if(glow>0){
    const rc=tint||C.GOLD;
    p(cx-5,topY+2,rc);p(cx+4,topY+2,rc);
    p(cx-6,topY+3,rc);p(cx+5,topY+3,rc);
  }
  if(glow>1){
    const rc=tint||C.LTGLD;
    p(cx-7,topY+1,rc);p(cx+6,topY+1,rc);
    p(cx-8,topY+3,rc);p(cx+7,topY+3,rc);
  }
  // Base bottom edge
  b(cx-Math.floor((w-2)/2),topY+7,w-2,1,C.DKAMB);
}

// Draw a crystal spire
function tCrystal(p:any,b:any,x:number,y:number,h:number,w:number,c1:string,c2:string,ct:string){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.8)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// Draw concentric rings (aura emanation)
function tRings(p:any,cx:number,cy:number,r:number,col:string,col2:string,count:number){
  for(let ring=0;ring<count;ring++){
    const rad=r+ring*3;
    for(let i=0;i<rad*4;i++){
      const a=i*Math.PI*2/(rad*4);
      const px=cx+Math.round(Math.cos(a)*rad);
      const py=cy+Math.round(Math.sin(a)*(rad*0.6));
      if(i%2===0)p(px,py,ring%2===0?col:col2);
    }
  }
}

// Draw connecting beam lines
function tBeam(p:any,x1:number,y1:number,x2:number,y2:number,col:string,bright:string){
  const dx=x2-x1,dy=y2-y1;
  const steps=Math.max(Math.abs(dx),Math.abs(dy));
  for(let i=0;i<=steps;i++){
    const t=i/Math.max(1,steps);
    const xx=Math.round(x1+dx*t);
    const yy=Math.round(y1+dy*t);
    p(xx,yy,i%2===0?bright:col);
  }
}

// ===== TOWERS (7×4 at 64×64) =====
function drawTowers(ctx:any){
  const fns=[
    // 0: Resonator — basic gold crystal with sound waves
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,18,s===1?1:s===2?2:0);
      // Main crystal
      tCrystal(p,b,13,4,17,6,C.DKGLD,s>=1?C.LTGLD:C.GOLD,s===2?C.WHITE:C.LTGLD);
      // Crystal facets
      p(15,6,C.WHITE);p(16,8,C.CREAM);p(14,10,s>=1?C.WHITE:C.CREAM);
      // Sound wave arcs emanating
      if(s>=1){
        for(let i=0;i<6;i++){const a=-Math.PI/3+i*Math.PI/15;p(20+Math.round(Math.cos(a)*3),12+Math.round(Math.sin(a)*3),C.LTGLD);}
        for(let i=0;i<6;i++){const a=Math.PI+Math.PI/3-i*Math.PI/15;p(11-Math.round(Math.cos(a)*3),12-Math.round(Math.sin(a)*3),C.LTGLD);}
      }
      if(s===2){
        // Bright sound blast
        for(let i=0;i<8;i++){const a=-Math.PI/3+i*Math.PI/20;p(22+Math.round(Math.cos(a)*5),12+Math.round(Math.sin(a)*5),C.WHITE);}
        for(let i=0;i<8;i++){const a=-Math.PI/3+i*Math.PI/20;p(9-Math.round(Math.cos(a)*5),12-Math.round(Math.sin(a)*5),C.WHITE);}
        b(14,3,4,1,C.WHITE);
      }
      // Base glow dots
      p(10,24,s>=1?C.LTGLD:C.GOLD);p(21,24,s>=1?C.LTGLD:C.GOLD);
      if(s===3){p(14,6,C.DPGLD);p(17,8,C.DPGLD);}
    },
    // 1: Amplifier — red-tinted crystal, damage aura
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,18,s===1?1:s===2?2:0,C.RED);
      const br=s>=1,fl=s===2;
      // Main crystal — red tinted
      tCrystal(p,b,13,5,16,6,C.DKRED,br?C.LTRED:C.RED,fl?C.WHITE:C.LTRED);
      // Side crystals
      tCrystal(p,b,8,10,10,3,C.DKRED,C.RED,C.LTRED);
      tCrystal(p,b,21,9,11,3,C.DKRED,C.RED,C.LTRED);
      // Crystal highlights
      p(15,7,C.WHITE);p(16,9,fl?C.WHITE:C.PAPRED);p(10,12,C.LTRED);p(22,11,C.LTRED);
      // Red aura rings
      if(br){
        tRings(p,16,14,7,C.RED,C.DKRED,1);
      }
      if(fl){
        tRings(p,16,14,7,C.LTRED,C.RED,2);
        p(16,2,C.WHITE);p(15,3,C.LTRED);p(17,3,C.LTRED);
      }
      p(10,24,br?C.LTRED:C.RED);p(21,24,br?C.LTRED:C.RED);
      if(s===3){p(14,7,C.DKRED);p(17,9,C.DKRED);b(13,14,6,1,C.DKRED);}
    },
    // 2: Quickener — green-tinted crystal, fire rate aura
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,18,s===1?1:s===2?2:0,C.GRN);
      const br=s>=1,fl=s===2;
      // Main crystal — green tint
      tCrystal(p,b,13,4,17,6,C.DKGRN,br?C.LTGRN:C.GRN,fl?C.WHITE:C.LTGRN);
      // Speed lines (vertical streaks)
      for(let i=0;i<3;i++){
        const sx=9+i*7;
        for(let y=6;y<18;y+=2)p(sx,y,fl?C.LTGRN:br?C.GRN:C.DKGRN);
      }
      // Crystal highlights
      p(15,6,C.WHITE);p(16,8,fl?C.WHITE:C.PAPGRN);
      // Green aura rings
      if(br){
        tRings(p,16,14,7,C.GRN,C.DKGRN,1);
      }
      if(fl){
        tRings(p,16,14,7,C.LTGRN,C.GRN,2);
        // Extra speed particles
        p(6,8,C.LTGRN);p(25,7,C.LTGRN);p(4,12,C.GRN);p(27,11,C.GRN);
      }
      p(10,24,br?C.LTGRN:C.GRN);p(21,24,br?C.LTGRN:C.GRN);
      if(s===3){p(14,6,C.DKGRN);p(17,8,C.DKGRN);}
    },
    // 3: Reach — blue-tinted crystal, range aura
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,18,s===1?1:s===2?2:0,C.BLUE);
      const br=s>=1,fl=s===2;
      // Main crystal — blue tint, tall and thin
      tCrystal(p,b,14,2,19,4,C.DKBLU,br?C.LTBLU:C.BLUE,fl?C.WHITE:C.LTBLU);
      // Extended antenna crystals (reach theme)
      tCrystal(p,b,7,8,12,3,C.DKBLU,C.BLUE,C.LTBLU);
      tCrystal(p,b,22,7,13,3,C.DKBLU,C.BLUE,C.LTBLU);
      // Crystal highlights
      p(15,5,C.WHITE);p(16,7,fl?C.WHITE:C.PAPBLU);p(9,11,C.LTBLU);p(23,10,C.LTBLU);
      // Blue range rings (larger radius)
      if(br){
        tRings(p,16,14,8,C.BLUE,C.DKBLU,1);
      }
      if(fl){
        tRings(p,16,14,8,C.LTBLU,C.BLUE,2);
        p(2,10,C.LTBLU);p(29,9,C.LTBLU);p(3,16,C.BLUE);p(28,15,C.BLUE);
      }
      p(10,24,br?C.LTBLU:C.BLUE);p(21,24,br?C.LTBLU:C.BLUE);
      if(s===3){p(15,4,C.DKBLU);p(16,6,C.DKBLU);}
    },
    // 4: Critical Mass — magenta crystal, crit aura
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,18,s===1?1:s===2?2:0,C.MAG);
      const br=s>=1,fl=s===2;
      // Main crystal — magenta, angular/sharp
      tCrystal(p,b,12,4,17,8,C.DKMAG,br?C.LTMAG:C.MAG,fl?C.WHITE:C.LTMAG);
      // Sharp shard fragments floating
      p(7,8,fl?C.LTMAG:C.MAG);p(8,7,C.DKMAG);
      p(24,7,fl?C.LTMAG:C.MAG);p(23,8,C.DKMAG);
      p(6,14,br?C.MAG:C.DKMAG);p(25,13,br?C.MAG:C.DKMAG);
      // Crystal highlights — crit sparkle
      p(15,6,C.WHITE);p(16,8,fl?C.WHITE:C.PAPMAG);p(14,10,C.LTMAG);
      // Star burst pattern (crit)
      if(br){
        p(16,3,C.LTMAG);p(12,6,C.MAG);p(20,6,C.MAG);p(10,10,C.MAG);p(22,10,C.MAG);
      }
      if(fl){
        // Big crit burst
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(16+Math.round(Math.cos(a)*8),12+Math.round(Math.sin(a)*8),i%2?C.LTMAG:C.WHITE);}
        for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8;p(16+Math.round(Math.cos(a)*6),12+Math.round(Math.sin(a)*6),C.MAG);}
        p(16,1,C.WHITE);b(15,2,2,1,C.LTMAG);
      }
      // Magenta aura rings
      if(br)tRings(p,16,14,7,C.MAG,C.DKMAG,1);
      p(10,24,br?C.LTMAG:C.MAG);p(21,24,br?C.LTMAG:C.MAG);
      if(s===3){p(14,6,C.DKMAG);p(17,8,C.DKMAG);p(16,3,C.DKMAG);}
    },
    // 5: Conduit — multi-colored crystal hub with connecting beam lines
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Central hub crystal — gold
      tCrystal(p,b,13,6,14,6,C.DKGLD,br?C.LTGLD:C.GOLD,fl?C.WHITE:C.LTGLD);
      // Node crystals at cardinal points (4 colors)
      tCrystal(p,b,5,10,8,3,C.DKRED,C.RED,C.LTRED);// left red
      tCrystal(p,b,24,9,9,3,C.DKGRN,C.GRN,C.LTGRN);// right green
      tCrystal(p,b,14,1,6,4,C.DKBLU,C.BLUE,C.LTBLU);// top blue
      tCrystal(p,b,14,17,5,4,C.DKMAG,C.MAG,C.LTMAG);// bottom magenta
      // Connection beams from hub to nodes
      if(br){
        tBeam(p,13,12,7,13,C.DKRED,C.RED);
        tBeam(p,19,12,25,12,C.DKGRN,C.GRN);
        tBeam(p,16,8,16,4,C.DKBLU,C.BLUE);
        tBeam(p,16,16,16,19,C.DKMAG,C.MAG);
      }
      if(fl){
        // Bright beam flash
        tBeam(p,13,12,6,13,C.RED,C.LTRED);
        tBeam(p,19,12,26,12,C.GRN,C.LTGRN);
        tBeam(p,16,8,16,3,C.BLUE,C.LTBLU);
        tBeam(p,16,16,16,20,C.MAG,C.LTMAG);
        // Hub flash
        p(16,10,C.WHITE);p(15,11,C.WHITE);
      }
      // Hub highlights
      p(15,8,C.WHITE);p(16,10,fl?C.WHITE:C.CREAM);
      // Node glow dots
      p(6,11,br?C.LTRED:C.RED);p(25,10,br?C.LTGRN:C.GRN);
      p(15,2,br?C.LTBLU:C.BLUE);p(15,18,br?C.LTMAG:C.MAG);
      if(s===3){p(15,8,C.DPGLD);p(16,10,C.DPGLD);}
    },
    // 6: Crescendo (Ultimate) — massive orchestral formation, all 4 aura colors swirling
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,23,24,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Central massive crystal
      tCrystal(p,b,11,2,20,10,C.DKGLD,br?C.LTGLD:C.GOLD,fl?C.WHITE:C.LTGLD);
      // Flanking crystals
      tCrystal(p,b,4,7,14,4,C.DKRED,br?C.LTRED:C.RED,fl?C.WHITE:C.LTRED);
      tCrystal(p,b,24,6,15,4,C.DKGRN,br?C.LTGRN:C.GRN,fl?C.WHITE:C.LTGRN);
      tCrystal(p,b,7,10,10,3,C.DKBLU,br?C.LTBLU:C.BLUE,C.LTBLU);
      tCrystal(p,b,22,9,11,3,C.DKMAG,br?C.LTMAG:C.MAG,C.LTMAG);
      // Central crystal facets
      p(15,4,C.WHITE);p(16,6,C.CREAM);p(14,8,fl?C.WHITE:C.CREAM);p(17,10,C.LTGLD);
      // Swirling aura — all 4 colors in orbiting pattern
      const colors=[C.RED,C.GRN,C.BLUE,C.MAG];
      const litColors=[C.LTRED,C.LTGRN,C.LTBLU,C.LTMAG];
      if(br){
        for(let i=0;i<4;i++){
          const a=i*Math.PI/2+(s===1?0.3:s===2?0.8:0);
          const rx=16+Math.round(Math.cos(a)*9);
          const ry=12+Math.round(Math.sin(a)*7);
          p(rx,ry,fl?litColors[i]:colors[i]);
          p(rx+1,ry,fl?litColors[i]:colors[i]);
        }
      }
      if(fl){
        // Grand finale — massive ring of all colors
        for(let i=0;i<24;i++){
          const a=i*Math.PI/12;
          const rx=16+Math.round(Math.cos(a)*11);
          const ry=12+Math.round(Math.sin(a)*9);
          p(rx,ry,litColors[i%4]);
        }
        // Inner ring
        for(let i=0;i<16;i++){
          const a=i*Math.PI/8;
          const rx=16+Math.round(Math.cos(a)*6);
          const ry=12+Math.round(Math.sin(a)*5);
          p(rx,ry,colors[i%4]);
        }
        b(14,1,4,1,C.WHITE);b(15,0,2,1,C.LTGLD);
      }
      // Base highlights
      p(8,25,br?C.LTGLD:C.GOLD);p(23,25,br?C.LTGLD:C.GOLD);
      p(5,25,br?C.RED:C.DKRED);p(26,25,br?C.GRN:C.DKGRN);
      if(s===3){
        p(15,4,C.DPGLD);p(16,6,C.DPGLD);
        for(let i=0;i<4;i++)p(12+i*2,14,C.DKGLD);
      }
    },
  ];
  const cols=7,rows=4;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*T_CELL,row*T_CELL],row);
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (7×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:any){
  const fns=[
    // 0: Resonator — golden sound wave → gold burst
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Sound wave arcs traveling
        const spread=[3,4,5][f];
        for(let i=0;i<8;i++){const a=-Math.PI/3+i*Math.PI/12;p(cx+Math.round(Math.cos(a)*spread),cy+Math.round(Math.sin(a)*spread),i%2?C.GOLD:C.LTGLD);}
        for(let i=0;i<6;i++){const a=-Math.PI/3+i*Math.PI/12;p(cx+Math.round(Math.cos(a)*(spread-2)),cy+Math.round(Math.sin(a)*(spread-2)),C.DKGLD);}
        p(cx,cy,C.WHITE);p(cx-1,cy,C.LTGLD);
      } else if(f===3){
        // Gold burst
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.GOLD:C.LTGLD);}
        b(cx-1,cy-1,2,2,C.GOLD);p(cx,cy,C.WHITE);
      } else if(f===4){
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKGLD);p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.GOLD);}
        p(cx,cy,C.LTGLD);
      } else {
        [[4,5],[12,4],[6,11],[9,3],[3,8],[13,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DKGLD:C.GOLD));
      }
    },
    // 1: Amplifier — red power wave → red damage flash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const w=[3,4,5][f];
        // Red power wave — expanding arc
        for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/10;p(cx+Math.round(Math.cos(a)*w),cy+Math.round(Math.sin(a)*w),i%2?C.RED:C.LTRED);}
        b(cx-1,cy-1,2,2,C.RED);p(cx,cy,f>0?C.LTRED:C.RED);
      } else if(f===3){
        // Red damage flash
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.RED);p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.LTRED);}
        b(cx-1,cy-1,3,3,C.RED);p(cx,cy,C.WHITE);p(cx+1,cy,C.PAPRED);
      } else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.DKRED);}
        p(cx,cy,C.RED);p(cx-1,cy,C.DKRED);p(cx+1,cy,C.DKRED);
      } else {
        [[3,6],[11,4],[7,12],[10,2],[4,9],[12,10]].forEach(([x,y],i)=>p(x,y,i%2?C.DKRED:C.RED));
      }
    },
    // 2: Quickener — green speed pulse → green flash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Speed pulse — elongated horizontal
        const len=[4,6,8][f];
        for(let i=0;i<len;i++){p(cx-Math.floor(len/2)+i,cy,i%2?C.GRN:C.LTGRN);p(cx-Math.floor(len/2)+i,cy-1,C.DKGRN);p(cx-Math.floor(len/2)+i,cy+1,C.DKGRN);}
        p(cx+Math.floor(len/2),cy,C.WHITE);
        // Speed trail
        if(f>0)for(let i=1;i<3;i++)p(cx-Math.floor(len/2)-i,cy,C.DKGRN);
      } else if(f===3){
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.GRN);p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.LTGRN);}
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.GRN);
      } else if(f===4){
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKGRN);p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.GRN);}
        p(cx,cy,C.LTGRN);
      } else {
        [[5,5],[10,6],[4,10],[12,3],[7,12],[11,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DKGRN:C.GRN));
      }
    },
    // 3: Reach — blue range ring → blue expand
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Expanding ring
        const r=[3,4,5][f];
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.BLUE:C.LTBLU);}
        p(cx,cy,C.LTBLU);if(r>3)p(cx,cy,C.WHITE);
      } else if(f===3){
        // Blue expand burst
        for(let r=2;r<=5;r++)for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>3?C.DKBLU:r>2?C.BLUE:C.LTBLU);}
        p(cx,cy,C.WHITE);
      } else if(f===4){
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.DKBLU);p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.BLUE);}
        p(cx,cy,C.BLUE);
      } else {
        [[3,5],[12,3],[5,11],[10,13],[7,2],[8,14]].forEach(([x,y],i)=>p(x,y,i%2?C.DKBLU:C.BLUE));
      }
    },
    // 4: Critical Mass — magenta crit spark → magenta explosion
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Crit spark — sharp star
        const sz=[2,3,4][f];
        p(cx,cy-sz,C.LTMAG);p(cx,cy+sz,C.LTMAG);p(cx-sz,cy,C.LTMAG);p(cx+sz,cy,C.LTMAG);
        // Diagonal spokes
        const d=Math.max(1,sz-1);
        p(cx-d,cy-d,C.MAG);p(cx+d,cy-d,C.MAG);p(cx-d,cy+d,C.MAG);p(cx+d,cy+d,C.MAG);
        p(cx,cy,C.WHITE);
        if(f>0){p(cx-1,cy,C.LTMAG);p(cx+1,cy,C.LTMAG);p(cx,cy-1,C.LTMAG);p(cx,cy+1,C.LTMAG);}
      } else if(f===3){
        // Magenta explosion
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%3===0?C.WHITE:i%2?C.MAG:C.LTMAG);}
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.LTMAG);}
        b(cx-1,cy-1,2,2,C.MAG);p(cx,cy,C.WHITE);
      } else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5;p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.DKMAG);p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.MAG);}
        p(cx,cy,C.LTMAG);
      } else {
        [[4,4],[11,5],[6,12],[9,3],[3,9],[13,8]].forEach(([x,y],i)=>p(x,y,i%2?C.DKMAG:C.MAG));
      }
    },
    // 5: Conduit — multi-color beam → beam scatter
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      const cols=[C.RED,C.GRN,C.BLUE,C.MAG];
      const lcols=[C.LTRED,C.LTGRN,C.LTBLU,C.LTMAG];
      if(f<3){
        // Multi-color beam traveling
        const len=[3,5,7][f];
        for(let i=0;i<len;i++){
          const ci=i%4;
          p(cx-Math.floor(len/2)+i,cy,cols[ci]);
          p(cx-Math.floor(len/2)+i,cy-1,lcols[ci]);
        }
        p(cx+Math.floor(len/2),cy,C.WHITE);p(cx,cy,C.GOLD);
      } else if(f===3){
        // Beam scatter — 4 beams shooting outward
        for(let d=0;d<4;d++){
          const a=d*Math.PI/2+Math.PI/4;
          for(let i=1;i<5;i++){p(cx+Math.round(Math.cos(a)*i),cy+Math.round(Math.sin(a)*i),i<3?lcols[d]:cols[d]);}
        }
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.GOLD);
      } else if(f===4){
        // Scatter fade
        for(let d=0;d<4;d++){
          const a=d*Math.PI/2+Math.PI/4;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),cols[d]);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),cols[d]);
        }
        p(cx,cy,C.DKGLD);
      } else {
        [[4,4,C.RED],[12,4,C.GRN],[4,12,C.BLUE],[12,12,C.MAG]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
        p(cx,cy,C.DKGLD);
      }
    },
    // 6: Crescendo — golden symphony blast (all colors) → massive harmonic nova
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      const cols=[C.RED,C.GRN,C.BLUE,C.MAG];
      const lcols=[C.LTRED,C.LTGRN,C.LTBLU,C.LTMAG];
      if(f<3){
        // Grand blast — expanding multi-color ring with gold core
        const r=[3,4,5][f];
        for(let i=0;i<16;i++){const a=i*Math.PI/8;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),cols[i%4]);}
        if(r>3)for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*(r-2)),cy+Math.round(Math.sin(a)*(r-2)),C.GOLD);}
        b(cx-1,cy-1,2,2,C.GOLD);p(cx,cy,C.WHITE);
      } else if(f===3){
        // Massive harmonic nova — all colors exploding
        for(let i=0;i<24;i++){const a=i*Math.PI/12;p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),lcols[i%4]);}
        for(let i=0;i<16;i++){const a=i*Math.PI/8;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),cols[i%4]);}
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.LTGLD);}
        p(cx,cy,C.WHITE);p(cx-1,cy,C.GOLD);p(cx+1,cy,C.GOLD);p(cx,cy-1,C.GOLD);p(cx,cy+1,C.GOLD);
      } else if(f===4){
        for(let i=0;i<16;i++){const a=i*Math.PI/8;const r2=5+i%2;p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),cols[i%4]);}
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DKGLD);}
        p(cx,cy,C.GOLD);
      } else {
        // Fading remnants
        [[3,3,C.RED],[12,4,C.GRN],[4,12,C.BLUE],[11,11,C.MAG],[7,2,C.DKGLD],[9,13,C.DKGLD]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
        p(cx,cy,C.DKGLD);
      }
    },
  ];
  const cols=7,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx:any){
  // Ranger hero — agile archer with golden bow, light leather armor, green hood/cloak
  function drawChar(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,dash=false,leap=false,storm=false,frost=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Dash afterimage (disengage backward)
    if(dash){
      for(let y=0;y<20;y++){const w=y<4?2:y<8?4:y<14?3:2,sx=cx-9-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,8+y,y%2?C.SHADOW:C.DKAMB);}}
      for(let y=0;y<14;y++){const w=y<3?1:y<10?2:1,sx=cx-15-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,11+y,C.SHADOW);}}
      p(cx-8,12,C.DKGLD);p(cx-12,15,C.DPGLD);
    }

    // Storm arrows raining
    if(storm){
      [[4,3],[8,1],[22,5],[26,2],[12,4],[18,2],[30,6],[2,6],[15,0],[20,3]].forEach(([ax,ay],i)=>{
        const len=4;for(let j=0;j<len;j++){
          const yy=ay+j;if(yy<64)p(ax,yy,j===0?C.WHITE:j<2?C.LTGLD:C.GOLD);
        }
        if(ay+len<64)p(ax,ay+len,C.DKGLD);
      });
    }

    const lean=dash?-2:leap?-1:atk&&atkFrame>0?1:0;
    const headY=dash?9:leap?5:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx_=cx+lean;

    // CLOAK (behind body — green ranger cloak)
    if(dir===2||dir===0){
      const cY=torY+1,sp=dash?3:storm?2:leap?2:1;
      for(let i=0;i<16;i++){
        const w=5+Math.floor(i*0.4)+sp,sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(dash?2:0))*0.7);
        const cl=i<3?'#336633':i<8?'#2a5528':i<12?'#224422':C.DKAMB;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Cloak edge highlights
      for(let i=0;i<12;i++){
        const w=5+Math.floor(i*0.4)+sp,sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(dash?2:0))*0.7);
        if(cY+i<62){p(sx_,cY+i,'#447744');if(sx_+w-1<32)p(sx_+w-1,cY+i,i%3===0?'#447744':'#2a5528');}
      }
      // Bottom tatter
      const bY_=Math.min(cY+14,61);
      for(let x=-5;x<6;x++){const px_=bx_+x;if(px_>=0&&px_<32&&(px_+bY_)%3!==0)p(px_,bY_,C.DKAMB);if(px_>=0&&px_<32&&(px_+bY_)%2===0&&bY_+1<63)p(px_,bY_+1,C.SHADOW);}
    }

    // HOOD (green hood)
    if(dir===0){
      // Down — front of hood
      b(bx_-4,headY,8,2,'#336633');b(bx_-5,headY+2,10,3,'#2a5528');
      b(bx_-4,headY+1,8,1,'#447744');b(bx_-3,headY-1,6,1,'#447744');b(bx_-2,headY-2,4,1,'#559955');
      p(bx_-1,headY-3,'#559955');p(bx_,headY-3,'#66aa66');
      // Hood drape
      b(bx_+5,headY+3,2,2,'#2a5528');p(bx_+6,headY+2,'#2a5528');
      // Face shadow
      b(bx_-3,headY+2,6,3,'#cc9977');b(bx_-4,headY+3,8,2,'#bb8866');
      // Eyes
      const eg=storm;
      p(bx_-2,headY+3,eg?C.LTGLD:'#553322');p(bx_-1,headY+3,eg?C.WHITE:'#664433');
      p(bx_+1,headY+3,eg?C.LTGLD:'#553322');p(bx_+2,headY+3,eg?C.WHITE:'#664433');
      p(bx_,headY+4,'#aa7755');// nose
      b(bx_-4,headY,8,1,'#447744');p(bx_-5,headY+2,'#447744');
    } else if(dir===1){
      // Side — profile hood
      b(bx_-3,headY,6,2,'#336633');b(bx_-4,headY+2,8,3,'#2a5528');
      b(bx_-3,headY+1,5,1,'#447744');b(bx_-2,headY-1,4,1,'#447744');b(bx_-1,headY-2,3,1,'#559955');
      p(bx_,headY-3,'#66aa66');
      b(bx_+4,headY+3,2,2,'#2a5528');
      // Face
      b(bx_-2,headY+2,5,3,'#cc9977');
      // One eye
      const eg=storm;
      p(bx_+1,headY+3,eg?C.LTGLD:'#553322');p(bx_+2,headY+3,eg?C.WHITE:'#664433');
      p(bx_+2,headY+4,'#aa7755');
      b(bx_-3,headY,6,1,'#447744');
    } else {
      // Up — back of hood
      b(bx_-4,headY,8,5,'#2a5528');b(bx_-3,headY,6,4,'#336633');
      b(bx_-3,headY-1,6,1,'#447744');b(bx_-2,headY-2,4,1,'#559955');
      p(bx_-1,headY-3,'#559955');p(bx_,headY-3,'#66aa66');
      b(bx_+4,headY+3,2,2,'#2a5528');
      b(bx_-4,headY,8,1,'#447744');
      p(bx_-1,headY+1,'#447744');p(bx_,headY+2,'#447744');p(bx_+1,headY+1,'#447744');
    }

    // TORSO — light leather armor
    b(bx_-3,torY,6,8,'#886644');b(bx_-2,torY,4,8,'#997755');
    if(dir===0){
      // Chest leather detail
      p(bx_-2,torY+1,'#aa8866');p(bx_-1,torY+2,'#aa8866');p(bx_,torY+3,'#aa8866');p(bx_+1,torY+2,'#aa8866');p(bx_+2,torY+1,'#aa8866');
      // Quiver strap diagonal
      p(bx_-2,torY,'#775533');p(bx_-1,torY+1,'#775533');p(bx_,torY+2,'#775533');p(bx_+1,torY+3,'#775533');
    } else if(dir===1){
      p(bx_,torY+1,'#aa8866');p(bx_+1,torY+2,'#aa8866');p(bx_,torY+3,'#aa8866');
      // Quiver visible on back
      b(bx_-4,torY-1,2,8,'#664422');p(bx_-4,torY-2,C.DKGLD);p(bx_-3,torY-2,C.GOLD);// arrow tips
    } else {
      p(bx_-1,torY+1,'#aa8866');p(bx_,torY+2,'#aa8866');p(bx_+1,torY+1,'#aa8866');
      // Quiver on back
      b(bx_+1,torY-1,2,8,'#664422');b(bx_+2,torY-1,1,8,'#553311');
      p(bx_+1,torY-2,C.DKGLD);p(bx_+2,torY-2,C.GOLD);p(bx_+1,torY-3,C.LTGLD);// arrow tips
    }
    // Belt
    b(bx_-3,torY+7,6,1,'#664422');b(bx_-2,torY+7,4,1,'#553311');p(bx_,torY+7,C.GOLD);

    if(storm){p(bx_-4,torY+1,C.GOLD);p(bx_+4,torY+1,C.GOLD);p(bx_-4,torY+6,C.LTGLD);p(bx_+4,torY+6,C.LTGLD);}

    // ARMS & BOW
    if(atk){
      const bowCol=C.GOLD,strCol=C.LTGLD;
      if(dir===0){
        // Draw bow forward
        if(atkFrame===0){
          // Pulling back
          b(bx_+3,torY,2,4,'#886644');// arm
          // Bow
          for(let i=0;i<8;i++)p(bx_+6,torY-2+i,i===0||i===7?C.DKGLD:bowCol);
          // String
          for(let i=0;i<6;i++)p(bx_+5,torY-1+i,strCol);
          p(bx_+5,torY+2,C.WHITE);// hand
          b(bx_-5,torY+2,2,4,'#886644');// off arm
        } else {
          // Released — arrow flying with golden trail
          b(bx_+3,torY+1,2,4,'#886644');
          for(let i=0;i<8;i++)p(bx_+6,torY-2+i,i===0||i===7?C.DKGLD:bowCol);
          for(let i=0;i<6;i++)p(bx_+5,torY-1+i,strCol);
          // Arrow + golden trail
          for(let i=0;i<10;i++)p(bx_+8+i,torY+2,i===0?C.WHITE:i<3?C.LTGLD:i<6?C.GOLD:C.DKGLD);
          p(bx_+8,torY+1,C.DKGLD);p(bx_+8,torY+3,C.DKGLD);// arrowhead
          b(bx_-5,torY+2,2,4,'#886644');
        }
      } else if(dir===1){
        if(atkFrame===0){
          b(bx_+3,torY,3,2,'#886644');
          for(let i=0;i<8;i++)p(bx_+7,torY-3+i,i===0||i===7?C.DKGLD:bowCol);
          for(let i=0;i<6;i++)p(bx_+6,torY-2+i,strCol);
          p(bx_+6,torY+1,C.WHITE);
        } else {
          b(bx_+3,torY+1,3,2,'#886644');
          for(let i=0;i<8;i++)p(bx_+7,torY-3+i,i===0||i===7?C.DKGLD:bowCol);
          for(let i=0;i<6;i++)p(bx_+6,torY-2+i,strCol);
          for(let i=0;i<8;i++){const x_=bx_+9+i;if(x_<32)p(x_,torY,i===0?C.WHITE:i<3?C.LTGLD:C.GOLD);}
          p(bx_+9,torY-1,C.DKGLD);p(bx_+9,torY+1,C.DKGLD);
        }
      } else {
        if(atkFrame===0){
          b(bx_+3,torY-1,2,3,'#886644');
          for(let i=0;i<8;i++)p(bx_+5,torY-4-i,i===0?C.WHITE:i<3?C.LTGLD:bowCol);
          b(bx_+4,torY,2,1,'#664422');
        } else {
          b(bx_+3,torY+1,2,3,'#886644');
          for(let i=0;i<8;i++)p(bx_+5,torY-4-i,i<2?C.LTGLD:bowCol);
          b(bx_+4,torY,2,1,'#664422');
          // Arrow going up
          for(let i=0;i<8;i++){const y_=torY-5-i;if(y_>=0)p(bx_+5,y_,i===0?C.WHITE:i<3?C.LTGLD:C.GOLD);}
        }
      }
    } else {
      // Idle/walk arms
      const aY=torY+1;
      if(dir===0){
        b(bx_-5,aY+armSwing,2,5,'#886644');p(bx_-5,aY+armSwing,'#997755');
        b(bx_+3,aY-armSwing,2,5,'#886644');p(bx_+4,aY-armSwing,'#997755');
        // Bow at side
        for(let i=0;i<6;i++)p(bx_+5,aY-armSwing+1+i,i===0||i===5?C.DKGLD:C.GOLD);
      } else if(dir===1){
        b(bx_+3,aY-armSwing,2,5,'#886644');p(bx_+4,aY-armSwing,'#997755');
        for(let i=0;i<6;i++)p(bx_+5,aY-armSwing+1+i,i===0||i===5?C.DKGLD:C.GOLD);
      } else {
        b(bx_-5,aY+armSwing,2,5,'#886644');p(bx_-5,aY+armSwing,'#997755');
        b(bx_+3,aY-armSwing,2,5,'#886644');p(bx_+4,aY-armSwing,'#997755');
      }
    }

    // Frost arrow effect on arm
    if(frost&&atk){
      const fy=torY+(atkFrame===0?-2:2);
      p(bx_+7,fy,'#aaddff');p(bx_+8,fy-1,'#77bbff');p(bx_+8,fy+1,'#77bbff');
      p(bx_+9,fy,'#ffffff');p(bx_+6,fy,'#4488cc');
    }

    // LEGS — light leather pants + boots
    const lh=10;
    b(bx_-2+lOff,legY,2,lh,'#775533');p(bx_-1+lOff,legY,'#886644');
    b(bx_+1+rOff,legY,2,lh,'#775533');p(bx_+2+rOff,legY,'#886644');
    // Knee guards
    b(bx_-2+lOff,legY+Math.floor(lh*0.5),2,1,'#664422');
    b(bx_+1+rOff,legY+Math.floor(lh*0.5),2,1,'#664422');
    // Boots
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-3+lOff,lfy,4,2,'#553311');b(bx_-3+lOff,lfy,3,1,'#664422');
    b(bx_+rOff,rfy,4,2,'#553311');b(bx_+1+rOff,rfy,3,1,'#664422');
    // Ground shadow
    if(!dash&&!leap&&lfy+2<63){p(bx_-3+lOff,lfy+2,C.SHADOW);p(bx_+3+rOff,rfy+2,C.SHADOW);}

    // Hurt flash
    if(hurt){p(bx_+4,headY+1,C.RED);p(bx_+5,headY,C.LTRED);p(bx_+6,headY+1,C.RED);p(bx_+5,headY+2,C.LTRED);}

    // Leap motion lines
    if(leap)for(let y=headY-2;y<legY+8;y+=3){p(bx_-7,y,'#447744');p(bx_+7,y+1,'#447744');}

    // Storm ground glow
    if(storm){b(bx_-6,55,14,2,C.GOLD);b(bx_-5,54,12,1,C.DKGLD);b(bx_-4,57,10,1,C.DPGLD);}
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities powershot1,powershot2,frost1,frost2,disengage1,disengage2,arrowstorm1,arrowstorm2
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
    {dir:1,opts:{atk:true,atkFrame:0,lOff:1}},// power shot charge
    {dir:1,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},// power shot release
    {dir:1,opts:{atk:true,atkFrame:0,frost:true,lOff:1}},// frost arrow charge
    {dir:1,opts:{atk:true,atkFrame:1,frost:true,lOff:2,rOff:-1}},// frost arrow release
    {dir:1,opts:{dash:true,lOff:2,rOff:1}},// disengage 1
    {dir:1,opts:{dash:true,lOff:3,rOff:2}},// disengage 2
    {dir:0,opts:{storm:true}},// arrow storm 1
    {dir:0,opts:{storm:true,lOff:1,rOff:-1,armSwing:1}},// arrow storm 2
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
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Collapsed ranger — lying on side
        b(6,30,5,4,'#2a5528');b(7,31,3,2,'#336633');b(6,30,5,1,'#447744');// hood
        p(8,32,'#cc9977');p(9,32,'#aa7755');// face
        b(10,32,10,4,'#886644');b(11,32,8,3,'#997755');// torso
        b(4,33,3,2,'#336633');b(3,34,2,1,'#2a5528');p(2,35,C.DKAMB);// cloak trailing
        // Bow on ground
        b(20,34,6,1,C.GOLD);b(20,33,1,3,C.DKGLD);b(26,33,1,3,C.DKGLD);
        p(23,33,C.LTGLD);// string
        // Legs
        b(8,36,14,3,'#775533');b(7,37,16,2,C.SHADOW);
        for(let x=6;x<24;x++){if(x%3!==0)p(x,39,C.SHADOW);if(x%4===0)p(x,40,C.SHADOW);}
        // Scattered arrows
        [[8,26,C.DKGLD],[14,24,C.GOLD],[20,27,C.LTGLD],[11,22,C.GOLD],[17,25,C.DKGLD]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
      } else if(frame.opts.custom==='death2'){
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Fading — just remnants
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.SHADOW);if(x%3===0)p(x,41,C.DKAMB);}
        // Bow remains
        p(22,36,C.DKGLD);p(22,35,C.GOLD);p(22,41,C.DKGLD);
        // Cloak scraps
        p(7,40,'#2a5528');p(8,41,'#224422');p(6,41,C.DKAMB);
        // Scattered particles
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.GOLD:i%4===0?'#447744':i%3===0?'#886644':i%2===0?C.DKAMB:C.SHADOW);
        });
        p(14,42,C.GOLD);p(15,42,C.DKGLD);
      } else if(frame.opts.custom==='portrait'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Portrait frame — ranger face close-up
        b(2,2,28,60,C.SHADOW);b(3,3,26,58,C.DKAMB);
        // Hood
        b(6,6,20,8,'#2a5528');b(7,7,18,6,'#336633');b(6,6,20,2,'#447744');b(7,5,18,2,'#336633');b(8,4,16,2,'#447744');b(10,3,12,1,'#559955');
        p(26,8,'#2a5528');p(27,9,C.DKAMB);p(28,10,C.DKAMB);p(27,10,'#2a5528');
        // Face
        b(8,10,16,10,'#cc9977');b(9,11,14,8,'#ddaa88');
        // Eyes — warm brown
        b(9,14,5,3,'#553322');b(10,14,3,2,'#664433');b(11,14,1,2,'#886655');p(11,14,C.WHITE);
        b(18,14,5,3,'#553322');b(19,14,3,2,'#664433');b(20,14,1,2,'#886655');p(20,14,C.WHITE);
        p(8,16,'#aa7755');p(7,17,'#997755');p(23,16,'#aa7755');p(24,17,'#997755');
        // Mouth
        b(12,19,8,1,'#aa7755');
        // Scarf/collar — gold
        b(7,21,18,6,C.GOLD);b(8,22,16,4,C.LTGLD);b(9,23,14,2,C.CREAM);
        b(10,22,2,4,C.DKGLD);b(18,22,2,4,C.DKGLD);b(14,22,1,4,C.DKGLD);
        // Shoulders — leather
        b(4,20,4,6,'#886644');b(5,20,2,5,'#997755');b(24,20,4,6,'#886644');b(25,20,2,5,'#997755');
        // Torso
        b(8,27,16,14,'#886644');b(9,27,14,12,'#997755');
        p(10,29,'#aa8866');p(12,30,'#aa8866');p(14,31,'#aa8866');p(16,30,'#aa8866');p(18,29,'#aa8866');
        // Bow on shoulder
        b(24,28,2,10,C.GOLD);p(25,27,C.LTGLD);p(24,26,C.DKGLD);
        // Frame border
        b(2,2,28,1,'#447744');b(2,61,28,1,'#447744');b(2,2,1,60,'#447744');b(29,2,1,60,'#447744');
        p(3,3,C.GOLD);p(28,3,C.GOLD);p(3,60,C.GOLD);p(28,60,C.GOLD);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Resonator','Amplifier','Quickener','Reach','Critical Mass','Conduit','Crescendo'];
const T_STATES=['Idle','Charge','Fire','Cooldown'];
const P_NAMES=['Resonator','Amplifier','Quickener','Reach','Crit Mass','Conduit','Crescendo'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['PwrShot 1','PwrShot 2','Frost 1','Frost 2','Diseng 1','Diseng 2','Storm 1','Storm 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=7*T_CELL;tc.height=4*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=66,tLH=13;
    tpv.width=tLW+7*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0d0800';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#aa8822';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<7;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#2a1a00';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#ccaa44';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=7*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+7*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#0d0800';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#aa8822';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<7;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#2a1a00';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#ccaa44';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#0d0800';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#aa8822';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#2a1a00';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#ccaa44';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'harmonic_towers_animated.png',
      info:{sz:'448×256',cell:'64×64',loader:"this.load.spritesheet('harmonic_towers','harmonic_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'7 cols (towers) × 4 rows (idle, charge, fire, cooldown)'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'harmonic_projectiles_animated.png',
      info:{sz:'224×192',cell:'32×32',loader:"this.load.spritesheet('harmonic_proj','harmonic_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'7 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Ranger',ref:hRef,pvRef:hPv,dl:'ranger_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('ranger','ranger_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#0d0800',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.GOLD,margin:0,fontSize:15}}>HARMONIC FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.GOLD,color:'#332200',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#332200':'#111',color:tab===t.id?C.GOLD:'#886644',border:`1px solid ${tab===t.id?'#664400':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {(['preview','actual'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a1a00':'#111',color:view===v?C.LTGLD:'#665544',border:`1px solid ${view===v?'#443300':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?7*P_CELL*3:7*T_CELL*2,border:'1px solid #2a1a00'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#886644',fontSize:9,marginTop:10,maxWidth:700}}>
        <p style={{margin:'2px 0'}}><b style={{color:C.AMBER}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:C.AMBER}}>Phaser:</b> <code style={{color:C.LTGLD}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:C.AMBER}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
