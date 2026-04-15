// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTES =====

// Base/pedestal palette — used exclusively by tBase() and tendril shared helper
export const C_base={
  BRPUR:'#6644cc',CRIM:'#cc2255',DEPUR:'#2a1155',DKPNK:'#881144',DKPUR:'#1a0033',
  LTPNK:'#ff77bb',MDPUR:'#442288',PINK:'#ff4488',SHAD:'#0f0019',VOID:'#08000f',
};

// Tower body palette — used by individual tower draw functions
export const C_tower={
  VOID:'#08000f',SHAD:'#0f0019',DKPUR:'#1a0033',DEPUR:'#2a1155',
  MDPUR:'#442288',BRPUR:'#6644cc',LTPUR:'#8866ee',PLPUR:'#aa99dd',
  PINK:'#ff4488',LTPNK:'#ff77bb',PAPNK:'#ffaadd',CRIM:'#cc2255',DKPNK:'#881144',DPNK:'#55112a',
  CYAN:'#00ffcc',DKCYN:'#009977',LTCYN:'#66ffe6',PLCYN:'#aaffee',
  GOLD:'#ffcc00',DKGLD:'#aa8800',LTGLD:'#ffee88',
  WHITE:'#ffffff',GRAY:'#554466',DKGRAY:'#2a1a3a',
};

// Projectile palette — used by projectile draw functions
export const C_proj={
  VOID:'#08000f',SHAD:'#0f0019',DKPUR:'#1a0033',DEPUR:'#2a1155',
  PINK:'#ff4488',LTPNK:'#ff77bb',CRIM:'#cc2255',DKPNK:'#881144',DPNK:'#55112a',
  CYAN:'#00ffcc',DKCYN:'#009977',LTCYN:'#66ffe6',
  GOLD:'#ffcc00',DKGLD:'#aa8800',LTGLD:'#ffee88',
  WHITE:'#ffffff',
};

// Unified palette (backward compat — union of all three)
export const C={
  VOID:'#08000f',SHAD:'#0f0019',DKPUR:'#1a0033',DEPUR:'#2a1155',
  MDPUR:'#442288',BRPUR:'#6644cc',LTPUR:'#8866ee',PLPUR:'#aa99dd',
  PINK:'#ff4488',LTPNK:'#ff77bb',PAPNK:'#ffaadd',CRIM:'#cc2255',DKPNK:'#881144',DPNK:'#55112a',
  CYAN:'#00ffcc',DKCYN:'#009977',LTCYN:'#66ffe6',PLCYN:'#aaffee',
  GOLD:'#ffcc00',DKGLD:'#aa8800',LTGLD:'#ffee88',
  WHITE:'#ffffff',GRAY:'#554466',DKGRAY:'#2a1a3a',
};

// ===== DRAWING HELPERS =====
const mk=(c,o,gw,gh,ps)=>{
  const p=(x,y,cl)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x,y,w,h,cl)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

function tBase(p,b,topY,w,glow){
  const B=C_base,cx=16;
  for(let i=0;i<10;i++){
    const cw=w-6+Math.floor(i*0.8),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?B.MDPUR:i<5?B.DEPUR:i<8?B.DKPUR:B.SHAD);
  }
  b(cx-Math.floor((w-6)/2),topY,w-6,1,B.BRPUR);
  p(cx-3,topY+3,glow>1?B.LTPNK:B.PINK);p(cx-2,topY+4,glow>1?B.LTPNK:B.PINK);
  p(cx-2,topY+5,glow>0?B.PINK:B.CRIM);p(cx-3,topY+6,B.DKPNK);
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,B.VOID);
  if(glow>0){p(cx-4,topY+2,B.DKPNK);p(cx+2,topY+3,B.DKPNK);}
}

function tTendril(p,x1,y1,x2,y2,col,bright){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*2)*1.5);
    p(xx,yy,bright&&i%2===0?C_base.LTPNK:col);
  }
}

function tSpire(p,b,x,y,h,w,c1,c2,ct){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.85)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// ===== TOWERS (5 cols × 24 rows at 64×64) =====
// 6 upgrade levels × 4 anim states (idle/charge/fire/cooldown) per level
// Tower level counts: Gambler=4, Spike=6, Siphon=6, Rift=3, Oblivion=1
const T_LEVELS=[4,6,6,3,1];
const T_MAX_LVL=6;
const T_ROWS_PER_LVL=4;
const T_ROWS=T_MAX_LVL*T_ROWS_PER_LVL; // 24 rows total

// Per-tower base parameters: [topY, baseWidth at level 1, width growth cap]
const baseYs=[22,23,23,-1,24]; // -1 = Rift (no tBase call)
const baseWidths=[20,22,20,-1,18]; // base widths at level 1
const baseGrowths=[3,3,3,0,0]; // max width growth from leveling

export function drawBase(ctx,col,row){
  if(col<0||col>=5||baseYs[col]<0)return; // skip Rift
  const{p,b}=mk(ctx,[col*T_CELL,row*T_CELL],T_G,T_G,T_PX);
  const level=Math.floor(row/T_ROWS_PER_LVL)+1;
  const glow=level>=3?2:level>=2?1:0;
  const bw=baseWidths[col]+Math.min(level-1,baseGrowths[col])*1;
  tBase(p,b,baseYs[col],bw,glow);
}

export function drawTowers(ctx){
  const fns=[
    // Gambler (4 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      // lv: 1-6 upgrade level, s: 0-3 anim state
      const glow=s===1?1:s===2?2:0;
      const bw=20+Math.min(lv-1,3)*1; // base widens slightly
      tBase(p,b,22,bw,glow);
      const fy=s===1?3:s===2?2:4,dx=12;
      // Diamond - grows with level
      const dsz=8+Math.min(lv-1,3)*1; // diamond height grows
      for(let i=0;i<dsz;i++){const hw=i<dsz/2?Math.floor(i*(lv>2?1.2:1))+1:dsz-i;b(dx+4-hw,fy+i,hw*2,1,s===2||lv>=4?C.LTPNK:C.CRIM);}
      for(let i=1;i<dsz-1;i++){const hw=i<dsz/2?Math.floor(i*(lv>2?1.1:0.9)):dsz-1-i;b(dx+4-hw+1,fy+i,Math.max(1,hw*2-2),1,s===2||lv>=3?C.PAPNK:C.PINK);}
      // Center gems
      p(15,fy+3,C.WHITE);p(17,fy+5,C.WHITE);p(16,fy+4,s>=1||lv>=2?C.LTGLD:C.GOLD);
      p(15,fy+4,C.WHITE);p(16,fy+3,C.WHITE);
      if(lv>=3){p(14,fy+4,C.LTGLD);p(18,fy+4,C.LTGLD);}
      if(lv>=4){p(15,fy+2,C.WHITE);p(17,fy+6,C.WHITE);}
      // Tendrils - more at higher levels
      tTendril(p,14,fy+dsz,13,22,s===2||lv>=3?C.LTPNK:C.PINK,s===2||lv>=4);
      tTendril(p,18,fy+dsz,19,22,s>=1||lv>=2?C.PINK:C.DKPNK,s===2||lv>=3);
      if(lv>=3){tTendril(p,12,fy+dsz-1,10,22,C.DKPNK,lv>=4);tTendril(p,20,fy+dsz-1,22,22,C.DKPNK,lv>=4);}
      // Sparkles - more with level
      const sp=[[8,3,C.GOLD],[23,5,C.GOLD],[6,8,C.LTGLD],[25,2,C.WHITE]];
      if(s>=1||lv>=2)sp.push([10,1,C.LTGLD],[22,7,C.GOLD],[4,6,C.WHITE],[27,4,C.LTGLD]);
      if(s===2||lv>=3){sp.push([5,1,C.WHITE],[26,1,C.WHITE]);b(12,fy-1,8,1,C.WHITE);b(14,fy-2,4,1,C.LTGLD);}
      if(lv>=4){sp.push([3,4,C.LTGLD],[28,3,C.LTGLD],[7,1,C.WHITE],[24,1,C.WHITE]);}
      sp.forEach(([x,y,cl])=>p(x,y,cl));
      p(11,24,s>=1||lv>=2?C.LTGLD:C.GOLD);p(20,24,s>=1||lv>=2?C.LTGLD:C.GOLD);
      if(lv>=3){p(9,24,C.GOLD);p(22,24,C.GOLD);}
      if(s===3){p(14,fy+2,C.DKPNK);p(18,fy+6,C.DKPNK);}
    },
    // Spike (6 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=22+Math.min(lv-1,3)*1;
      tBase(p,b,23,bw,s===1?1:s===2?2:0);
      const br=s>=1||lv>=2,fl=s===2||lv>=5;
      // Main spire - taller with level
      const mh=20+Math.min(lv-1,5)*1,mw=4+Math.floor((lv-1)/3);
      tSpire(p,b,14,Math.max(0,22-mh),mh,mw,C.DKCYN,fl?C.LTCYN:C.CYAN,fl?C.WHITE:C.LTCYN);
      // Side spires - taller and more numerous
      const sh1=15+Math.min(lv-1,4)*1,sh2=17+Math.min(lv-1,4)*1;
      tSpire(p,b,8,23-sh1,sh1,3,C.DKPNK,br?C.LTPNK:C.PINK,br?C.PAPNK:C.LTPNK);
      tSpire(p,b,20,23-sh2,sh2,3,C.DEPUR,br?C.LTPUR:C.BRPUR,br?C.PLPUR:C.LTPUR);
      tSpire(p,b,5,12,10+Math.min(lv-1,3),2,C.MDPUR,C.BRPUR,C.LTPUR);
      tSpire(p,b,24,9,13+Math.min(lv-1,3),2,C.DKCYN,fl?C.LTCYN:C.CYAN,fl?C.WHITE:C.LTCYN);
      // Extra spires at high levels
      if(lv>=3){tSpire(p,b,3,14,8,2,C.DKPNK,C.PINK,C.LTPNK);}
      if(lv>=4){tSpire(p,b,27,11,10,2,C.DEPUR,C.BRPUR,C.LTPUR);}
      if(lv>=5){tSpire(p,b,11,4,18,3,C.DKCYN,C.CYAN,C.LTCYN);}
      if(lv>=6){tSpire(p,b,19,3,19,3,C.DKPNK,C.LTPNK,C.PAPNK);}
      // Tip highlights
      if(br){p(12,5,C.WHITE);p(13,4,C.LTCYN);p(18,4,C.LTPNK);p(19,5,C.PINK);}
      if(lv>=3){p(10,6,C.WHITE);p(21,5,C.WHITE);}
      if(lv>=5){p(8,7,C.WHITE);p(23,6,C.WHITE);}
      if(fl){b(14,0,mw,2,C.WHITE);b(13,1,mw+2,1,C.LTCYN);for(let i=0;i<5+Math.min(lv-1,3);i++){p(5-i,8+i,C.CYAN);p(27+i,6+i,C.CYAN);}}
      p(9,21,br?C.LTCYN:C.CYAN);p(22,21,br?C.LTPNK:C.PINK);
      [[4,9,C.BRPUR],[27,7,C.CYAN],[3,15,C.DKCYN],[28,12,C.PINK]].forEach(([x,y,cl])=>p(x,y,cl));
      // Energy particles at high levels
      if(lv>=4)for(let i=0;i<lv-2;i++){const a=i*Math.PI/(lv-2||1);p(16+Math.round(Math.cos(a)*8),10+Math.round(Math.sin(a)*4),i%2?C.LTCYN:C.CYAN);}
      if(s===3){p(15,3,C.DKCYN);p(9,8,C.DKPNK);}
    },
    // Siphon (6 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=20+Math.min(lv-1,3)*1;
      tBase(p,b,23,bw,s===1?1:s===2?2:0);const br=s>=1||lv>=2;
      // Funnel - wider with level
      const fw=14+Math.min(lv-1,4)*1;
      for(let i=0;i<8;i++){const cw=Math.max(2,Math.round(fw-i*1.5));b(16-Math.floor(cw/2),4+i,cw,1,i<2?br?C.LTPUR:C.BRPUR:i<5?C.MDPUR:C.DEPUR);}
      b(16-Math.floor(fw/2),4,fw,1,br||lv>=2?C.PLPUR:C.LTPUR);b(16-Math.floor((fw-2)/2),3,fw-2,1,lv>=3?C.PLPUR:C.BRPUR);
      // Stem
      const stemW=2+Math.floor((lv-1)/3);
      b(16-Math.floor(stemW/2),12,stemW,6,C.DEPUR);b(16-Math.floor(stemW/2),12,Math.max(1,stemW-1),6,C.MDPUR);
      // Siphon streams - more with level
      const gc=br||lv>=2?C.LTGLD:C.GOLD,gc2=br||lv>=2?C.GOLD:C.DKGLD;
      const baseStreams=[[6,5],[7,6],[8,7],[9,8],[10,9],[25,4],[24,5],[23,6],[22,7],[21,8],[20,9]];
      const extraStreams=s===2||lv>=3?[[5,4],[26,3]]:[];
      const lvStreams=lv>=4?[[4,3],[27,2]]:[];
      const lv5Streams=lv>=5?[[3,2],[28,1]]:[];
      const lv6Streams=lv>=6?[[2,1],[29,0],[11,10],[20,10]]:[];
      const st=[...baseStreams,...extraStreams,...lvStreams,...lv5Streams,...lv6Streams];
      st.forEach(([x,y],i)=>p(x,y,i%2===0?gc:gc2));
      // Side sparkles
      if(s>=1||lv>=2)[[3,3,C.GOLD],[28,2,C.GOLD],[2,7,C.LTGLD],[29,6,C.LTGLD]].forEach(([x,y,cl])=>p(x,y,cl));
      if(s===2||lv>=4){[[1,5,C.LTGLD],[30,4,C.LTGLD]].forEach(([x,y,cl])=>p(x,y,cl));b(14,3,4,1,C.WHITE);}
      if(lv>=5){[[0,4,C.GOLD],[31,3,C.GOLD],[1,8,C.LTGLD],[30,7,C.LTGLD]].forEach(([x,y,cl])=>p(x,y,cl));}
      if(lv>=6){b(13,2,6,1,C.WHITE);[[0,6,C.WHITE],[31,5,C.WHITE]].forEach(([x,y,cl])=>p(x,y,cl));}
      // Bottom orb - larger with level
      const orbR=lv>=4?2:1;
      p(15,18,s===2||lv>=4?C.LTGLD:C.GOLD);p(16,19,C.DKGLD);p(15,20,s===2||lv>=3?C.LTGLD:C.GOLD);
      if(orbR>=2){p(14,18,C.GOLD);p(17,18,C.GOLD);p(14,20,C.GOLD);p(17,20,C.GOLD);}
      // Base plate - wider with level
      const bpw=8+Math.min(lv-1,4)*1;
      b(16-Math.floor(bpw/2),25,bpw,1,s>=1||lv>=2?C.GOLD:C.DKGLD);b(16-Math.floor((bpw-2)/2),24,bpw-2,1,s>=1||lv>=2?C.LTGLD:C.GOLD);b(16-Math.floor((bpw-4)/2),24,bpw-4,1,s===2||lv>=4?C.WHITE:C.LTGLD);
      tTendril(p,14,12,12,23,lv>=3?C.PINK:C.DKPNK,s===2||lv>=5);tTendril(p,18,12,20,23,lv>=3?C.PINK:C.DKPNK,s===2||lv>=5);
      if(lv>=4){tTendril(p,13,12,10,23,C.DKPNK,lv>=6);tTendril(p,19,12,22,23,C.DKPNK,lv>=6);}
    },
    // Rift (3 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1||lv>=2,fl=s===2||lv>=3;
      // Pillars - taller with level
      const ph=24+Math.min(lv-1,2)*2,pw=3+Math.floor((lv-1)/2);
      b(5,30-ph,pw,ph,C.DKPUR);b(6,30-ph,Math.max(1,pw-2),ph,C.DEPUR);b(5,30-ph,pw,1,C.MDPUR);p(5,30-ph,C.BRPUR);p(5+pw-1,30-ph,C.BRPUR);
      b(27-pw,30-ph,pw,ph,C.DKPUR);b(28-pw,30-ph,Math.max(1,pw-2),ph,C.DEPUR);b(27-pw,30-ph,pw,1,C.MDPUR);p(27-pw,30-ph,C.BRPUR);p(26,30-ph,C.BRPUR);
      b(4,29,24,2,C.SHAD);b(5,29,22,1,C.DKPUR);
      // Rift tear - wider with level
      const rw=(fl?5:br?4:3)+Math.min(lv-1,2);
      for(let y=5;y<26;y++){const w=rw+Math.floor(Math.sin((y-5)*0.3)*2);b(16-Math.floor(w/2),y,w,1,C.VOID);}
      for(let y=4;y<26;y++){const x=14+Math.round(Math.sin(y*0.4)*1.5);p(x,y,fl?C.LTCYN:C.CYAN);p(x-1,y,fl?C.CYAN:C.DKCYN);p(x+1,y,fl?C.CYAN:C.DKCYN);}
      for(let y=6;y<25;y+=2)p(15+(y%3===0?1:0),y,fl?C.PLCYN:C.WHITE);
      // Energy ring at high level
      if(fl){for(let i=0;i<8+Math.min(lv-1,2)*2;i++){const a=i*Math.PI/(4+Math.min(lv-1,2));p(16+Math.round(Math.cos(a)*6),15+Math.round(Math.sin(a)*6),C.LTCYN);}b(10,14,12,3,C.DKCYN);}
      if(lv>=3){for(let i=0;i<12;i++){const a=i*Math.PI/6;p(16+Math.round(Math.cos(a)*8),15+Math.round(Math.sin(a)*8),i%2?C.DKCYN:C.CYAN);}}
      // Rune marks on pillars
      const pe=br?C.LTPNK:C.PINK;
      p(6,10,pe);p(6,16,pe);p(6,22,br?C.PINK:C.CRIM);p(25,12,pe);p(25,18,pe);p(25,24,br?C.PINK:C.CRIM);
      if(lv>=2){p(6,8,pe);p(25,9,pe);p(6,13,C.PINK);p(25,15,C.PINK);}
      if(lv>=3){p(6,6,C.LTPNK);p(25,7,C.LTPNK);p(4,10,C.DKPNK);p(27,12,C.DKPNK);}
      p(8,4,C.PINK);p(9,3,C.PINK);p(22,4,C.PINK);p(21,3,C.PINK);
      if(br){p(14,1,C.WHITE);p(15,0,fl?C.PLCYN:C.LTCYN);p(16,1,C.CYAN);}
      if(lv>=2){p(13,0,C.CYAN);p(17,0,C.CYAN);}
      p(5,12,pe);p(26,15,pe);
      if(s===3)for(let y=8;y<24;y+=3)p(15,y,C.DKCYN);
    },
    // Oblivion (1 level - ultimate)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,24,18,s===1?1:s===2?2:0);const br=s>=1,fl=s===2;
      for(let y=0;y<12;y++){const hw=y<2?y+3:y>9?12-y:6;b(16-hw,3+y,hw*2,1,C.DKPUR);}
      for(let y=1;y<11;y++){const hw=y<2?y+1:y>8?10-y:4;b(16-hw,3+y,hw*2,1,C.VOID);}
      const ew=fl?14:br?13:12;
      b(16-Math.floor(ew/2),8,ew,3,C.SHAD);b(16-Math.floor(ew/2)+1,8,ew-2,3,fl?C.PINK:C.CRIM);
      const iw=fl?8:6;b(16-Math.floor(iw/2),8,iw,3,fl?C.LTPNK:C.PINK);b(16-Math.floor(iw/2)+1,8,iw-2,3,fl?C.PAPNK:C.LTPNK);
      b(15,9,2,1,C.WHITE);p(15,8,fl?C.WHITE:C.PAPNK);p(16,10,C.PAPNK);
      b(16-Math.floor(ew/2),7,ew,1,br?C.MDPUR:C.DEPUR);b(16-Math.floor(ew/2),11,ew,1,br?C.MDPUR:C.DEPUR);
      for(let y=0;y<12;y++){const hw=y<2?y+3:y>9?12-y:6;p(16-hw,3+y,br?C.BRPUR:C.MDPUR);p(16+hw-1,3+y,br?C.BRPUR:C.MDPUR);}
      if(fl)for(let i=0;i<12;i++){const a=i*Math.PI/6;p(16+Math.round(Math.cos(a)*9),9+Math.round(Math.sin(a)*6),i%2?C.LTPNK:C.PINK);}
      p(8,6,C.SHAD);p(23,7,C.SHAD);p(7,10,C.SHAD);p(24,11,C.SHAD);
      b(14,15,4,3,C.DEPUR);b(15,15,2,3,C.MDPUR);b(13,18,6,2,C.DKPUR);b(14,18,4,1,C.DEPUR);
      tTendril(p,13,20,11,24,C.DKPNK,fl);tTendril(p,19,20,21,24,C.DKPNK,fl);
      const gc=fl?C.LTGLD:br?C.GOLD:C.DKGLD;p(14,15,gc);p(17,16,fl?C.LTGLD:C.GOLD);p(15,21,gc);p(16,22,C.DKGLD);
      if(s===3){b(11,8,10,1,C.DEPUR);b(11,10,10,1,C.DEPUR);}
    },
  ];
  const cols=5,rows=T_ROWS; // 5 cols × 24 rows
  for(let col=0;col<cols;col++){
    const maxLv=T_LEVELS[col];
    for(let lv=1;lv<=T_MAX_LVL;lv++){
      const effectiveLv=Math.min(lv,maxLv); // clamp to tower's max level
      for(let s=0;s<4;s++){
        const row=(lv-1)*4+s;
        fns[col](ctx,[col*T_CELL,row*T_CELL],s,effectiveLv);
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (5×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

export function drawProjectiles(ctx){
  const fns=[
    // Coin
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){const w=[6,4,2][f];b(cx-Math.floor(w/2),cy-3,w,6,C.GOLD);if(w>2){b(cx-Math.floor(w/2)+1,cy-2,w-2,4,C.DKGLD);p(cx,cy-1,C.LTGLD);p(cx-1,cy,C.WHITE);}b(cx-Math.floor(w/2),cy-3,w,1,C.LTGLD);p(cx-4,cy-4,C.WHITE);p(cx+3,cy+3,f===1?C.WHITE:C.LTGLD);}
      else if(f===3){for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.GOLD:C.LTGLD);}p(cx,cy,C.WHITE);b(cx-1,cy-1,3,3,C.GOLD);p(cx,cy,C.WHITE);}
      else if(f===4){for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.DKGLD);p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.GOLD);}p(cx,cy,C.LTGLD);p(cx+1,cy-1,C.GOLD);p(cx-1,cy+1,C.GOLD);}
      else{[[3,5],[12,3],[5,11],[10,13],[7,2],[8,14],[2,8],[14,7]].forEach(([x,y],i)=>p(x,y,i%2?C.DKGLD:C.GOLD));p(cx,cy,C.DKGLD);}
    },
    // Shard
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){const ang=[-1,0,1][f];for(let i=0;i<10;i++){const w=i<2?1:i<8?2:1,sx=cx-Math.floor(w/2)+ang*(i<5?0:i<8?1:0);b(sx,cy-5+i,w,1,i<2?C.WHITE:i<4?C.LTCYN:i<7?C.CYAN:C.DKCYN);}p(cx-2,cy-2,C.DKCYN);p(cx+2,cy+2,C.DKCYN);}
      else if(f===3){for(let i=0;i<10;i++){const a=i*Math.PI/5;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.CYAN:C.LTCYN);}p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.CYAN);}
      else if(f===4){for(let i=0;i<12;i++){const a=i*Math.PI/6,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.LTCYN:C.DKCYN);}p(cx-1,cy,C.CYAN);p(cx+1,cy,C.CYAN);}
      else{[[4,4],[11,5],[6,12],[9,3],[3,8],[13,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DKCYN:C.CYAN));}
    },
    // Gold Orb
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){const r=[3,4,3][f];for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r){const d=Math.sqrt(x*x+y*y);p(cx+x,cy+y,d<1?C.WHITE:d<r*0.5?C.LTGLD:d<r*0.8?C.GOLD:C.DKGLD);}p(cx-r,cy,C.DEPUR);p(cx+r,cy,C.DEPUR);if(f>0){p(cx-4-f,cy+1,C.DKGLD);p(cx-3-f,cy-1,C.GOLD);}}
      else if(f===3){b(cx-2,cy-2,4,4,C.GOLD);b(cx-1,cy-1,2,2,C.LTGLD);for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.GOLD);p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.LTGLD);}p(cx,cy,C.WHITE);}
      else if(f===4){for(let i=0;i<8;i++){const a=i*Math.PI/4,r2=4+i%2;p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),C.DKGLD);}p(cx,cy,C.GOLD);p(cx-2,cy,C.DEPUR);p(cx+2,cy,C.DEPUR);}
      else{[[5,6],[10,5],[7,11],[3,8],[12,10]].forEach(([x,y],i)=>p(x,y,i%2?C.DKGLD:C.DEPUR));}
    },
    // Portal
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){const rot=f*2;for(let i=0;i<12;i++){const a=(i+rot)*Math.PI/6;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2===0?C.CYAN:C.DKCYN);}b(cx-1,cy-1,2,2,C.VOID);p(cx,cy,C.PINK);p(cx-5,cy,f===0?C.DKCYN:C.SHAD);p(cx+5,cy,f===1?C.DKCYN:C.SHAD);}
      else if(f===3){for(let r=5;r>0;r--)for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>3?C.DKCYN:r>1?C.CYAN:C.WHITE);}p(cx,cy,C.VOID);b(cx-1,cy-1,2,2,C.VOID);}
      else if(f===4){for(let r=3;r>0;r--)for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>2?C.SHAD:C.DKCYN);}p(cx,cy,C.VOID);p(cx-1,cy,C.DKCYN);p(cx+1,cy,C.DKCYN);}
      else{p(cx,cy,C.VOID);p(cx-1,cy,C.SHAD);p(cx+1,cy,C.SHAD);p(cx,cy-1,C.SHAD);p(cx,cy+1,C.SHAD);}
    },
    // Void Eye
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){const bob=[0,-1,1][f];b(cx-3,cy-2+bob,6,4,C.DKPUR);b(cx-2,cy-1+bob,4,2,C.VOID);b(cx-1,cy-1+bob,2,2,C.CRIM);p(cx,cy+bob,C.PINK);p(cx,cy-1+bob,C.LTPNK);p(cx-4,cy+bob,C.SHAD);p(cx-5,cy-1+bob,C.SHAD);p(cx+4,cy-1+bob,C.SHAD);}
      else if(f===3){b(cx-2,cy-1,4,2,C.CRIM);p(cx,cy,C.WHITE);for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.PINK:C.CRIM);p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DKPNK);}p(cx-1,cy,C.SHAD);p(cx+1,cy,C.SHAD);}
      else if(f===4){for(let i=0;i<8;i++){const a=i*Math.PI/4,r=3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DKPNK);}b(cx-1,cy-1,2,2,C.SHAD);p(cx,cy,C.CRIM);}
      else{p(cx,cy,C.SHAD);p(cx-1,cy-1,C.DPNK);p(cx+1,cy+1,C.DPNK);p(cx-2,cy,C.DKPUR);p(cx+2,cy,C.DKPUR);}
    },
  ];
  const cols=5,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

export function drawHero(ctx){
  // dir: 0=down,1=side,2=up | type: idle/walk/atk | frame: variant
  function drawChar(c,o,dir,opts={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,dash=false,evade=false,exec=false,ult=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Dash afterimage
    if(dash){
      for(let y=0;y<22;y++){const w=y<4?3:y<8?5:y<14?4:3,sx=cx-9-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,6+y,y%2?C.VOID:C.SHAD);}}
      for(let y=0;y<16;y++){const w=y<3?2:y<10?3:2,sx=cx-16-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,9+y,C.VOID);}}
      p(cx-8,10,C.DKPNK);p(cx-12,13,C.DPNK);
    }

    // Ult marks
    if(ult){
      [[3,2],[26,5],[1,18],[29,15],[5,32],[27,30],[2,45],[28,42],[8,1],[24,3],[4,38],[28,36]].forEach(([mx,my])=>{
        p(mx,my,C.PINK);p(mx+1,my+1,C.CRIM);p(mx-1,my+1,C.CRIM);p(mx,my+2,C.PINK);
      });
    }

    const lean=dash?2:evade?-1:atk&&atkFrame>0?1:0;
    const headY=dash?5:evade?8:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx_=cx+lean;

    // CLOAK (behind body for down/side, main visual for up)
    if(dir===2||dir===0){
      const cY=torY+2, sp=dash?3:ult?2:evade?2:1;
      for(let i=0;i<18;i++){
        const w=6+Math.floor(i*0.5)+sp, sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(dash?2:0))*0.8);
        const cl=i<4?C.DKPUR:i<10?C.DEPUR:i<14?C.DKPUR:C.SHAD;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // edge highlights
      for(let i=0;i<14;i++){
        const w=6+Math.floor(i*0.5)+sp, sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(dash?2:0))*0.8);
        if(cY+i<62){p(sx_,cY+i,C.MDPUR);if(sx_+w-1<32)p(sx_+w-1,cY+i,i%3===0?C.MDPUR:C.DEPUR);}
      }
      // bottom tatter
      const bY_=Math.min(cY+16,61);
      for(let x=-6;x<7;x++){const px_=bx_+x;if(px_>=0&&px_<32&&(px_+bY_)%3!==0)p(px_,bY_,C.SHAD);if(px_>=0&&px_<32&&(px_+bY_)%2===0&&bY_+1<63)p(px_,bY_+1,C.VOID);}
    }

    // HOOD
    if(dir===0){
      // Down - front of hood
      b(bx_-4,headY,8,2,C.DKPUR);b(bx_-5,headY+2,10,3,C.DKPUR);
      b(bx_-4,headY+1,8,1,C.DEPUR);b(bx_-3,headY-1,6,1,C.DEPUR);b(bx_-2,headY-2,4,1,C.MDPUR);
      p(bx_-1,headY-3,C.MDPUR);p(bx_,headY-3,C.BRPUR);
      // Hood drape
      b(bx_+5,headY+3,2,3,C.DKPUR);p(bx_+6,headY+2,C.DKPUR);p(bx_+7,headY+4,C.SHAD);
      // Inner void
      b(bx_-3,headY+2,6,3,C.VOID);b(bx_-4,headY+3,8,2,C.VOID);
      // Eyes
      const eg=exec||ult;
      p(bx_-2,headY+3,eg?C.LTPNK:C.PINK);p(bx_-1,headY+3,eg?C.WHITE:C.LTPNK);
      p(bx_+1,headY+3,eg?C.LTPNK:C.PINK);p(bx_+2,headY+3,eg?C.WHITE:C.LTPNK);
      p(bx_-2,headY+4,C.DPNK);p(bx_+2,headY+4,C.DPNK);
      b(bx_-4,headY,8,1,C.MDPUR);p(bx_-5,headY+2,C.MDPUR);
    } else if(dir===1){
      // Side - profile hood
      b(bx_-3,headY,6,2,C.DKPUR);b(bx_-4,headY+2,8,3,C.DKPUR);
      b(bx_-3,headY+1,5,1,C.DEPUR);b(bx_-2,headY-1,4,1,C.DEPUR);b(bx_-1,headY-2,3,1,C.MDPUR);
      p(bx_,headY-3,C.BRPUR);
      b(bx_+4,headY+3,2,3,C.DKPUR);p(bx_+5,headY+2,C.DKPUR);
      b(bx_-3,headY+2,5,3,C.VOID);
      // One eye visible
      const eg=exec||ult;
      p(bx_+1,headY+3,eg?C.LTPNK:C.PINK);p(bx_+2,headY+3,eg?C.WHITE:C.LTPNK);
      p(bx_+1,headY+4,C.DPNK);
      b(bx_-3,headY,6,1,C.MDPUR);
    } else {
      // Up - back of hood
      b(bx_-4,headY,8,5,C.DKPUR);b(bx_-3,headY,6,4,C.DEPUR);
      b(bx_-3,headY-1,6,1,C.DEPUR);b(bx_-2,headY-2,4,1,C.MDPUR);
      p(bx_-1,headY-3,C.MDPUR);p(bx_,headY-3,C.BRPUR);
      b(bx_+4,headY+3,2,3,C.DKPUR);p(bx_+5,headY+2,C.DKPUR);
      b(bx_-4,headY,8,1,C.MDPUR);
      // Hood back detail
      p(bx_-1,headY+1,C.MDPUR);p(bx_,headY+2,C.MDPUR);p(bx_+1,headY+1,C.MDPUR);
    }

    // SCARF (only visible from down and side)
    if(dir!==2){
      const sY=torY-1;
      b(bx_-5,sY,3,1,C.PINK);b(bx_-5,sY+1,2,1,C.PINK);p(bx_-6,sY+1,C.LTPNK);
      const trail=dash?7:4;
      for(let i=0;i<trail;i++){const tx=bx_-6-i+(dash?0:0),ty=sY+1+i;if(ty<63&&tx>=0)p(tx,ty,i<trail-1?C.PINK:C.CRIM);if(i>0&&ty<63&&tx+1<32)p(tx+1,ty,C.DKPNK);}
    }

    // TORSO
    b(bx_-3,torY,6,8,C.DKPUR);b(bx_-2,torY,4,8,C.DEPUR);
    if(dir===0){
      // chest wrap
      p(bx_-2,torY+1,C.MDPUR);p(bx_-1,torY+2,C.MDPUR);p(bx_,torY+3,C.MDPUR);p(bx_+1,torY+2,C.MDPUR);p(bx_+2,torY+1,C.MDPUR);
    } else if(dir===1){
      p(bx_,torY+1,C.MDPUR);p(bx_+1,torY+2,C.MDPUR);p(bx_,torY+3,C.MDPUR);
    } else {
      p(bx_-1,torY+1,C.MDPUR);p(bx_,torY+2,C.MDPUR);p(bx_+1,torY+1,C.MDPUR);
    }
    // Belt
    b(bx_-3,torY+7,6,1,C.GRAY);b(bx_-2,torY+7,4,1,C.DKGRAY);p(bx_,torY+7,C.PINK);
    if(exec){p(bx_-4,torY+1,C.CRIM);p(bx_+4,torY+1,C.CRIM);p(bx_-4,torY+6,C.PINK);p(bx_+4,torY+6,C.PINK);}

    // ARMS & BLADE
    if(atk){
      if(dir===0){
        // slash down
        if(atkFrame===0){b(bx_+3,torY-2,2,3,C.DKPUR);for(let i=0;i<10;i++)p(bx_+5,torY-3-i,i===0?C.WHITE:i<3?C.LTCYN:C.CYAN);b(bx_+4,torY,3,1,C.GRAY);p(bx_+5,torY,C.PINK);}
        else{b(bx_+3,torY+2,2,3,C.DKPUR);for(let i=0;i<10;i++)p(bx_+5,torY+6+i,i===0?C.WHITE:i<3?C.LTCYN:C.CYAN);b(bx_+4,torY+5,3,1,C.GRAY);p(bx_+5,torY+5,C.PINK);for(let i=0;i<6;i++)p(bx_+4+i,torY+2+Math.floor(i*0.6),C.DKCYN);}
        b(bx_-5,torY+2,2,4,C.DKPUR);
      } else if(dir===1){
        if(atkFrame===0){b(bx_+3,torY-1,3,2,C.DKPUR);for(let i=0;i<10;i++)p(bx_+6,torY-2-i,i===0?C.WHITE:i<3?C.LTCYN:C.CYAN);b(bx_+5,torY+1,3,1,C.GRAY);p(bx_+6,torY+1,C.PINK);}
        else{b(bx_+3,torY+1,3,2,C.DKPUR);for(let i=0;i<10;i++){const x_=bx_+6+Math.floor(i*0.3),y_=torY+4+i;if(x_<32&&y_<63)p(x_,y_,i===0?C.WHITE:i<3?C.LTCYN:C.CYAN);}b(bx_+5,torY+3,3,1,C.GRAY);p(bx_+6,torY+3,C.PINK);}
      } else {
        if(atkFrame===0){b(bx_+3,torY-2,2,3,C.DKPUR);for(let i=0;i<8;i++)p(bx_+5,torY-3-i,i===0?C.WHITE:i<2?C.LTCYN:C.CYAN);b(bx_+4,torY,2,1,C.GRAY);}
        else{b(bx_+3,torY+3,2,3,C.DKPUR);for(let i=0;i<8;i++)p(bx_+5,torY+7+i,i<2?C.LTCYN:C.CYAN);b(bx_+4,torY+6,2,1,C.GRAY);}
      }
    } else {
      // idle/walk arms
      const aY=torY+1;
      if(dir===0){
        b(bx_-5,aY+armSwing,2,5,C.DKPUR);p(bx_-5,aY+armSwing,C.DEPUR);
        b(bx_+3,aY-armSwing,2,5,C.DKPUR);p(bx_+4,aY-armSwing,C.DEPUR);
        // blade at side
        for(let i=0;i<7;i++)p(bx_+5,aY-armSwing+2+i,i===0?C.LTCYN:i<3?C.CYAN:C.DKCYN);
      } else if(dir===1){
        b(bx_+3,aY-armSwing,2,5,C.DKPUR);p(bx_+4,aY-armSwing,C.DEPUR);
        for(let i=0;i<7;i++)p(bx_+5,aY-armSwing+2+i,i===0?C.LTCYN:i<3?C.CYAN:C.DKCYN);
      } else {
        b(bx_-5,aY+armSwing,2,5,C.DKPUR);p(bx_-5,aY+armSwing,C.DEPUR);
        b(bx_+3,aY-armSwing,2,5,C.DKPUR);p(bx_+4,aY-armSwing,C.DEPUR);
      }
    }

    // LEGS
    const lh=10;
    b(bx_-2+lOff,legY,2,lh,C.DKPUR);p(bx_-1+lOff,legY,C.DEPUR);
    b(bx_+1+rOff,legY,2,lh,C.DKPUR);p(bx_+2+rOff,legY,C.DEPUR);
    // knee guards
    b(bx_-2+lOff,legY+Math.floor(lh*0.5),2,1,C.GRAY);
    b(bx_+1+rOff,legY+Math.floor(lh*0.5),2,1,C.GRAY);
    // boots
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-3+lOff,lfy,4,2,C.DEPUR);b(bx_-3+lOff,lfy,3,1,C.MDPUR);
    b(bx_+rOff,rfy,4,2,C.DEPUR);b(bx_+1+rOff,rfy,3,1,C.MDPUR);
    // ground wisps
    if(!dash&&lfy+2<63){p(bx_-3+lOff,lfy+2,C.SHAD);p(bx_+3+rOff,rfy+2,C.SHAD);}

    // hurt flash
    if(hurt){p(bx_+4,headY+1,C.CRIM);p(bx_+5,headY,C.PINK);p(bx_+6,headY+1,C.CRIM);p(bx_+5,headY+2,C.PINK);}

    // Evade phase lines
    if(evade)for(let y=headY-2;y<legY+8;y+=3){p(bx_-7,y,C.DEPUR);p(bx_+7,y+1,C.DEPUR);}

    // exec ground marker
    if(exec){b(bx_-6,55,14,2,C.CRIM);b(bx_-5,54,12,1,C.DKPNK);b(bx_-4,57,10,1,C.DPNK);}
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities dash1,dash2,evade1,evade2,exec1,exec2,ult1,ult2
  // R4: hurt,death1,death2,portrait,x,x,x,x

  const frames=[];
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
  // Abilities (all down-facing)
  frames.push([
    {dir:1,opts:{dash:true,lOff:2,rOff:1}},
    {dir:1,opts:{dash:true,lOff:3,rOff:2}},
    {dir:0,opts:{evade:true,lOff:-1,rOff:-1}},
    {dir:0,opts:{evade:true,lOff:1,rOff:1,armSwing:1}},
    {dir:0,opts:{exec:true,atk:true,atkFrame:0,lOff:1}},
    {dir:0,opts:{exec:true,atk:true,atkFrame:1,lOff:2,rOff:-1}},
    {dir:0,opts:{ult:true}},
    {dir:0,opts:{ult:true,lOff:1,rOff:-1,armSwing:1}},
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
  frames.forEach((row,ry)=>{
    row.forEach((frame,rx)=>{
      if(!frame)return;
      const o=[rx*H_CW,ry*H_CH];
      if(frame.opts.custom==='death1'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        b(6,30,5,4,C.DKPUR);b(7,31,3,2,C.DEPUR);b(6,30,5,1,C.MDPUR);p(8,32,C.PINK);p(9,32,C.DKPNK);
        b(10,32,10,4,C.DKPUR);b(11,32,8,3,C.DEPUR);b(4,33,3,2,C.PINK);b(3,34,2,1,C.CRIM);p(2,35,C.DKPNK);
        b(20,34,6,2,C.DKPUR);b(22,36,4,2,C.DKPUR);b(24,29,1,6,C.DKCYN);p(24,28,C.CYAN);
        b(8,36,14,3,C.DKPUR);b(7,37,16,2,C.SHAD);
        for(let x=6;x<24;x++){if(x%3!==0)p(x,39,C.SHAD);if(x%4===0)p(x,40,C.VOID);}
        [[8,26,C.DEPUR],[14,24,C.SHAD],[20,27,C.DKPUR],[11,22,C.SHAD],[17,25,C.DEPUR]].forEach(([x,y,cl])=>p(x,y,cl));
      } else if(frame.opts.custom==='death2'){
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.SHAD);if(x%3===0)p(x,41,C.DKPUR);}
        p(22,36,C.DKCYN);p(22,35,C.CYAN);p(22,41,C.DKCYN);p(7,40,C.PINK);p(8,41,C.CRIM);p(6,41,C.DKPNK);
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.PINK:i%4===0?C.BRPUR:i%3===0?C.DEPUR:i%2===0?C.DKPUR:C.SHAD);
        });
        p(14,42,C.PINK);p(15,42,C.DKPNK);
      } else if(frame.opts.custom==='portrait'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        b(2,2,28,60,C.VOID);b(3,3,26,58,C.SHAD);
        b(6,6,20,8,C.DKPUR);b(7,7,18,6,C.DEPUR);b(6,6,20,2,C.MDPUR);b(7,5,18,2,C.DEPUR);b(8,4,16,2,C.MDPUR);b(10,3,12,1,C.BRPUR);
        p(26,8,C.DKPUR);p(27,9,C.SHAD);p(28,10,C.SHAD);p(27,10,C.DKPUR);
        b(8,10,16,10,C.VOID);b(9,11,14,8,C.VOID);
        b(9,14,5,3,C.DKPNK);b(10,14,3,2,C.PINK);b(11,14,1,2,C.LTPNK);p(11,14,C.WHITE);
        b(18,14,5,3,C.DKPNK);b(19,14,3,2,C.PINK);b(20,14,1,2,C.LTPNK);p(20,14,C.WHITE);
        p(8,16,C.DKPNK);p(7,17,C.DPNK);p(23,16,C.DKPNK);p(24,17,C.DPNK);
        b(12,19,8,1,C.DKPUR);
        b(7,21,18,6,C.PINK);b(8,22,16,4,C.LTPNK);b(9,23,14,2,C.PAPNK);
        b(10,22,2,4,C.PINK);b(18,22,2,4,C.PINK);b(14,22,1,4,C.PINK);
        b(4,20,4,6,C.DKPUR);b(5,20,2,5,C.DEPUR);b(24,20,4,6,C.DKPUR);b(25,20,2,5,C.DEPUR);
        b(8,27,16,14,C.DKPUR);b(9,27,14,12,C.DEPUR);
        p(10,29,C.MDPUR);p(12,30,C.MDPUR);p(14,31,C.MDPUR);p(16,30,C.MDPUR);p(18,29,C.MDPUR);
        b(24,28,2,10,C.GRAY);p(25,27,C.CYAN);p(24,26,C.DKCYN);
        b(2,2,28,1,C.MDPUR);b(2,61,28,1,C.MDPUR);b(2,2,1,60,C.MDPUR);b(29,2,1,60,C.MDPUR);
        p(3,3,C.PINK);p(28,3,C.PINK);p(3,60,C.PINK);p(28,60,C.PINK);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Gambler','Spike','Siphon','Rift','Oblivion'];
const T_STATES_BASE=['Idle','Charge','Fire','Cooldown'];
const T_STATES=[];for(let lv=1;lv<=T_MAX_LVL;lv++)T_STATES_BASE.forEach(s=>T_STATES.push(`L${lv} ${s}`));
const P_NAMES=['Coin','Shard','Gold Orb','Portal','Void Eye'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Dash 1','Dash 2','Evade 1','Evade 2','Exec 1','Exec 2','Ult 1','Ult 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef(),tPv=useRef(),pRef=useRef(),pPv=useRef(),hRef=useRef(),hPv=useRef();
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current;tc.width=5*T_CELL;tc.height=T_ROWS*T_CELL;
    const tCtx=tc.getContext('2d');tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current;const tS=2,tLW=66,tLH=13;
    tpv.width=tLW+5*T_CELL*tS;tpv.height=T_ROWS*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d');tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#07050c';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<T_ROWS;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#6644aa';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<5;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a1a2a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#887799';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current;pc_.width=5*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d');pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current;const pS=3;
    ppv.width=tLW+5*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d');ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#07050c';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#6644aa';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<5;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a1a2a';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#887799';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d');hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d');hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#07050c';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#6644aa';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a1a2a';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#887799';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref,name)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'void_towers_animated.png',
      info:{sz:'320×1536',cell:'64×64',loader:"this.load.spritesheet('void_towers','void_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'5 cols (towers) × 24 rows (6 levels × 4 states: idle/charge/fire/cooldown). Gambler=4lvl, Spike=6, Siphon=6, Rift=3, Oblivion=1'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'void_projectiles_animated.png',
      info:{sz:'160×192',cell:'32×32',loader:"this.load.spritesheet('void_proj','void_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'5 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Shadow',ref:hRef,pvRef:hPv,dl:'shadow_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('shadow','shadow_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab);

  return(
    <div style={{background:'#07050c',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.PINK,margin:0,fontSize:15}}>VOID FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.PINK,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#2a1155':'#111',color:tab===t.id?C.PINK:'#665588',border:`1px solid ${tab===t.id?'#4422aa':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {['preview','actual'].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a1a2a':'#111',color:view===v?C.CYAN:'#445566',border:`1px solid ${view===v?'#334':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Void ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref} data-label={`Void ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?5*P_CELL*3:5*T_CELL*2,border:'1px solid #1a1a2a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#554477',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#8866bb'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#8866bb'}}>Phaser:</b> <code style={{color:C.CYAN}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#8866bb'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
