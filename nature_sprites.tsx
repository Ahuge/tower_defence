// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTES =====

// Base/pedestal palette — used exclusively by tBaseLv() and vine shared helper
export const C_base={
  BARK:'#664422',DKBARK:'#3a2211',DKFOR:'#113311',DKMOSS:'#2a4422',DKVINE:'#226633',
  GREEN:'#33aa44',LTBARK:'#885533',LTGRN:'#66dd77',LTMOSS:'#88aa66',LTVINE:'#55cc66',
  MDGRN:'#226633',MOSS:'#446633',PLBARK:'#aa7744',STUMP:'#4a3318',VINE:'#339944',
};

// Tower body palette — used by individual tower draw functions
export const C_tower={
  DKFOR:'#113311',FOREST:'#1a4422',MDGRN:'#226633',GREEN:'#33aa44',LTGRN:'#66dd77',PALGRN:'#aaffbb',
  BARK:'#664422',LTBARK:'#885533',PLBARK:'#aa7744',DKBARK:'#3a2211',STUMP:'#4a3318',
  AMBER:'#ffaa44',DKAMB:'#cc7722',LTAMB:'#ffcc88',GOLD:'#ffcc00',
  PINK:'#ee55aa',LTPNK:'#ff88cc',MAGENTA:'#cc2288',DKPNK:'#882255',
  BLOOD:'#cc2222',LTBLOOD:'#ee4444',DKBLOOD:'#661111',BONE:'#f0e8d0',
  MOSS:'#446633',DKMOSS:'#2a4422',LTMOSS:'#88aa66',
  THORN:'#558833',DKTHRN:'#334422',LTTHRN:'#88cc55',
  SPORE:'#88cc44',DKSPOR:'#668833',LTSPOR:'#bbee77',TOXIC:'#aaee33',
  VINE:'#339944',DKVINE:'#226633',LTVINE:'#55cc66',
  WHITE:'#ffffff',GRAY:'#556644',DKGRAY:'#2a3322',
  VOID:'#0a1108',SHAD:'#0f1a0c',
};

// Projectile palette — used by projectile draw functions
export const C_proj={
  DKFOR:'#113311',MDGRN:'#226633',GREEN:'#33aa44',LTGRN:'#66dd77',
  BARK:'#664422',LTBARK:'#885533',PLBARK:'#aa7744',DKBARK:'#3a2211',STUMP:'#4a3318',
  AMBER:'#ffaa44',DKAMB:'#cc7722',LTAMB:'#ffcc88',
  PINK:'#ee55aa',LTPNK:'#ff88cc',MAGENTA:'#cc2288',DKPNK:'#882255',
  BLOOD:'#cc2222',LTBLOOD:'#ee4444',DKBLOOD:'#661111',BONE:'#f0e8d0',
  THORN:'#558833',DKTHRN:'#334422',LTTHRN:'#88cc55',
  SPORE:'#88cc44',DKSPOR:'#668833',LTSPOR:'#bbee77',TOXIC:'#aaee33',
  VINE:'#339944',DKVINE:'#226633',LTVINE:'#55cc66',
  WHITE:'#ffffff',
};

// Unified palette (backward compat — union of all three)
export const C={
  DKFOR:'#113311',FOREST:'#1a4422',MDGRN:'#226633',GREEN:'#33aa44',LTGRN:'#66dd77',PALGRN:'#aaffbb',
  BARK:'#664422',LTBARK:'#885533',PLBARK:'#aa7744',DKBARK:'#3a2211',STUMP:'#4a3318',
  AMBER:'#ffaa44',DKAMB:'#cc7722',LTAMB:'#ffcc88',GOLD:'#ffcc00',
  PINK:'#ee55aa',LTPNK:'#ff88cc',MAGENTA:'#cc2288',DKPNK:'#882255',
  BLOOD:'#cc2222',LTBLOOD:'#ee4444',DKBLOOD:'#661111',BONE:'#f0e8d0',
  MOSS:'#446633',DKMOSS:'#2a4422',LTMOSS:'#88aa66',
  THORN:'#558833',DKTHRN:'#334422',LTTHRN:'#88cc55',
  SPORE:'#88cc44',DKSPOR:'#668833',LTSPOR:'#bbee77',TOXIC:'#aaee33',
  VINE:'#339944',DKVINE:'#226633',LTVINE:'#55cc66',
  WHITE:'#ffffff',GRAY:'#556644',DKGRAY:'#2a3322',
  VOID:'#0a1108',SHAD:'#0f1a0c',
};

// ===== DRAWING HELPERS =====
const mk=(c,o,gw,gh,ps)=>{
  const p=(x,y,cl)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x,y,w,h,cl)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

// Legacy tBase kept for compatibility (used nowhere after refactor)
// Replaced by tBaseLv which accepts level parameter

function tVine(p,x1,y1,x2,y2,col,bright){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*2)*1.5);
    p(xx,yy,bright&&i%2===0?C_base.LTGRN:col);
  }
}

function tStalk(p,b,x,y,h,w,c1,c2,ct){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.6)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// ===== TOWER LEVEL COUNTS =====
// 9-tower Nature layout (Thorn removed; Razor Bramble branch added
// at col 8). Order mirrors SpriteManager's factionTowers call.
//   0: Bramble (5 lv)  1: Root (2 lv)        2: Thornweaver (3 lv)
//   3: Blossom (3 lv)  4: Spore (3 lv)       5: Sunroot (3 lv)
//   6: Vine (3 lv)     7: Elder Treant (1 lv) 8: Razor Bramble (3 lv)
// Razor Bramble is the divergent-upgrade DPS branch of Bramble.
// Not in `Factions.nature.towerIds` (not a starter) but has its
// own art column so the skin editor can paint it independently.
const T_LEVELS=[5,2,3,3,3,3,3,1,3];
const T_MAX_LV=6;
const T_ROWS_PER_LVL=4;
const T_ROWS=T_MAX_LV*T_ROWS_PER_LVL; // 24 rows total (max levels × 4 states)

// ===== LEVEL-SCALED BASE =====
// lv: 1-6, grows root mass, moss, glow
function tBaseLv(p,b,topY,w,glow,lv){
  const B=C_base,cx=16;
  const rootH=Math.min(10,6+lv);
  const bw=w-6+Math.floor(lv*0.8);
  for(let i=0;i<rootH;i++){
    const cw=bw+Math.round(Math.sin(i*0.7)*1.2*Math.min(lv/3,1));
    const sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?B.LTBARK:i<4?B.BARK:i<7?B.DKBARK:B.STUMP);
  }
  b(cx-Math.floor(bw/2),topY,bw,1,B.PLBARK);
  // Spiral vine whorl — more prominent at high level
  if(lv>=2){
    p(cx-3,topY+3,glow>1?B.LTGRN:B.GREEN);p(cx-2,topY+4,glow>1?B.LTGRN:B.GREEN);
    p(cx-2,topY+5,glow>0?B.GREEN:B.MDGRN);p(cx-3,topY+6,B.DKFOR);
    p(cx-1,topY+3,glow>1?B.LTVINE:B.VINE);p(cx,topY+4,glow>0?B.VINE:B.DKVINE);
  }
  // Moss — grows with level
  if(lv>=1)b(cx-Math.floor((bw-2)/2),topY+Math.min(rootH-1,9),bw-2,1,B.DKMOSS);
  if(lv>=3&&glow>0){p(cx-4,topY+2,B.MOSS);p(cx+2,topY+3,B.MOSS);}
  if(lv>=4){p(cx-5,topY+2,B.LTMOSS);p(cx+3,topY+2,B.LTMOSS);}
  // Root tendrils — more at high level
  if(lv>=2){p(cx-5,topY+rootH-2,B.DKBARK);p(cx+4,topY+rootH-2,B.DKBARK);}
  if(lv>=3){p(cx-6,topY+rootH-1,B.STUMP);p(cx+5,topY+rootH-1,B.STUMP);}
  if(lv>=5){p(cx-7,topY+rootH-1,B.DKBARK);p(cx+6,topY+rootH-1,B.DKBARK);p(cx-6,topY+rootH-2,B.BARK);}
  // Nature energy glow at max levels
  if(lv>=6){p(cx-4,topY+1,B.LTGRN);p(cx+3,topY+1,B.LTGRN);p(cx,topY+rootH,B.GREEN);}
}

// Per-tower base parameters (indexed by column in the 9-tower layout)
// Order: Bramble, Root, Thornweaver, Blossom, Spore, Sunroot, Vine, Elder, Razor
const baseYs=[22,23,23,22,23,22,22,-1,22]; // -1 = Elder Treant (custom base)
const baseWidths=[20,22,20,20,20,20,20,-1,18]; // Razor slightly narrower so blades read

export function drawBase(ctx,col,row){
  if(col<0||col>=9||baseYs[col]<0)return; // skip Elder Treant
  const{p,b}=mk(ctx,[col*T_CELL,row*T_CELL],T_G,T_G,T_PX);
  const level=Math.floor(row/T_ROWS_PER_LVL)+1;
  const glow=level>=3?2:level>=2?1:0;
  tBaseLv(p,b,baseYs[col],baseWidths[col],glow,level);
}

// ===== TOWERS (9 cols × 24 rows at 64×64) — per-level sprites =====
export function drawTowers(ctx){
  const fns=[
    // 1. Bramble Hedge — Low wide thorn-thicket that pricks
    //    constantly. Replaces the old Thorn tower; carries the
    //    5-level scaling slot now that Thorn is gone. Densely
    //    detailed foliage: clustered leaves, branch silhouettes,
    //    dappled highlights, berries at max level. (5 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,22,20,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      // Hedge body — grows taller + wider each level
      const hh=6+lv*2,ht=22-hh;
      const hw=Math.min(24,16+Math.min(lv,3)*2),xL=16-Math.floor(hw/2);
      // ---- Base silhouette (dark forest outline) ----
      b(xL,ht,hw,hh,C.FOREST);
      // Rounded bottom corners
      p(xL,ht+hh-1,C.DKFOR);p(xL+hw-1,ht+hh-1,C.DKFOR);
      // ---- Branch / twig silhouettes poking through ----
      // Vertical dark strands suggest woody structure inside the
      // foliage mass. Positioned deterministically so the shapes
      // are stable across all frames/states.
      for(let i=0;i<Math.max(3,lv+2);i++){
        const bx=xL+2+((i*5+lv)%(hw-3));
        const by=ht+1+((i*3)%(hh-3));
        const blen=Math.min(hh-2,3+((i*2)%3));
        for(let y=0;y<blen;y++)p(bx,by+y,C.DKFOR);
      }
      // ---- Mid-green leafy body over the silhouette ----
      // Dappled fill: lots of short horizontal runs of MDGRN with
      // GREEN and LTGRN scattered through for bramble texture.
      for(let y=ht+1;y<ht+hh-1;y++){
        for(let x=xL+1;x<xL+hw-1;x++){
          // Checker-ish fill — skip deterministic cells to leave
          // the darker silhouette visible underneath.
          const n=(x*7+y*13+lv)%11;
          if(n<8)p(x,y,C.MDGRN);
          else if(n===8)p(x,y,C.DKMOSS);
          else if(n===9)p(x,y,C.GREEN);
          else p(x,y,C.LTMOSS);
        }
      }
      // ---- Clustered leaf shapes ----
      // Small 2×2 leaf clusters scattered through the hedge —
      // brighter green, each with a light highlight pixel.
      const leafCount=Math.min(8,3+lv);
      for(let i=0;i<leafCount;i++){
        const lx=xL+1+((i*7+lv*2)%(hw-3));
        const ly=ht+1+((i*5+lv)%(hh-3));
        p(lx,ly,C.GREEN);p(lx+1,ly,C.GREEN);
        p(lx,ly+1,C.MDGRN);p(lx+1,ly+1,C.LTGRN);
      }
      // ---- Top ridge highlight ----
      // Bright curve along the top hints at sun catching the hedge.
      for(let x=xL+2;x<xL+hw-2;x++){
        const wave=Math.round(Math.sin((x-xL)*0.7)*0.6);
        p(x,ht+wave,C.GREEN);
        if((x-xL)%3===0)p(x,ht+wave,C.LTGRN);
        if((x-xL)%5===0)p(x,ht+wave+1,C.PALGRN);
      }
      // ---- Thorn tips bursting out the top ----
      const tn=3+lv;
      for(let i=0;i<tn;i++){
        const tx=xL+2+((i*3)%(hw-4));
        p(tx,ht-1,C.THORN);
        p(tx,ht-2,i%2===0?C.DKTHRN:C.THORN);
        if(fl){p(tx,ht-3,C.LTTHRN);p(tx+1,ht-2,C.GREEN);}
      }
      // ---- Side thorns + protruding leaves at higher levels ----
      if(lv>=2){
        // Left-side leaf fringe
        p(xL-1,ht+2,C.GREEN);p(xL-1,ht+4,C.MDGRN);
        p(xL+hw,ht+3,C.GREEN);p(xL+hw,ht+5,C.MDGRN);
      }
      if(lv>=3){
        p(xL-1,ht+2,C.THORN);p(xL+hw,ht+2,C.THORN);
        p(xL-1,ht+5,C.THORN);p(xL+hw,ht+5,C.THORN);
        // Small branch poking out
        p(xL-2,ht+3,C.DKBARK);p(xL+hw+1,ht+4,C.DKBARK);
      }
      if(lv>=4){
        // Scattered bright tip leaves hinting at new growth
        p(xL+2,ht+2,C.LTGRN);p(xL+hw-3,ht+hh-3,C.LTGRN);
        p(xL+Math.floor(hw/2),ht+Math.floor(hh/2),C.PALGRN);
      }
      if(lv>=5){
        p(xL-1,ht+hh-2,C.THORN);p(xL+hw,ht+hh-2,C.THORN);
        // Red berries — the mature hedge in autumn-kissed bloom
        p(xL+3,ht+3,C.PINK);p(xL+hw-4,ht+4,C.PINK);p(16,ht+2,C.PINK);
        p(xL+5,ht+5,C.MAGENTA);p(xL+hw-6,ht+3,C.MAGENTA);
        p(xL+3,ht+3,C.LTPNK); // berry highlight
      }
      // ---- Charge: pulsing green glow deep inside ----
      if(s===1){
        const gcx=16,gcy=ht+Math.floor(hh/2);
        p(gcx,gcy,C.LTGRN);p(gcx-1,gcy,C.PALGRN);p(gcx+1,gcy,C.PALGRN);
        p(gcx,gcy-1,C.PALGRN);p(gcx,gcy+1,C.PALGRN);
      }
      // ---- Fire: launched thorn-spike from the crown ----
      if(fl){
        p(16,ht-2,C.THORN);p(16,ht-3,C.LTTHRN);p(16,ht-4,C.WHITE);
        p(15,ht-2,C.LTGRN);p(17,ht-2,C.LTGRN);
        p(15,ht-3,C.GREEN);p(17,ht-3,C.GREEN);
      }
      // ---- Cooldown: top dims, berries drop ----
      if(s===3){
        b(xL+2,ht+1,hw-4,2,C.DKFOR);
        if(lv>=3)p(xL+Math.floor(hw/2),ht+hh,C.DKPNK);
      }
    },
    // 2. Root — Twisted root mass (4 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,23,22,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      // Central root mass — wider and taller at higher levels
      const massW=Math.min(12,6+lv*2);
      const massTop=Math.max(6,10-lv);
      for(let y=massTop;y<22;y++){
        const w=Math.max(3,Math.round(massW+Math.sin((y-massTop)*0.4)*3));
        const sx=16-Math.floor(w/2)+Math.round(Math.sin(y*0.6)*1);
        b(sx,y,w,1,y<massTop+4?C.BARK:y<massTop+10?C.DKBARK:C.STUMP);
      }
      // Inner texture — more detail at higher levels
      const texCount=Math.min(12,6+lv*2);
      for(let i=0;i<texCount;i++){
        const y=massTop+2+Math.floor(i*(22-massTop-4)/texCount);
        const x=15+Math.round(Math.sin(y*0.5)*1.5);
        p(x,y,i%2===0?C.PLBARK:C.LTBARK);
        if(lv>=3)p(x+1,y,C.LTBARK);
      }
      // Bark patterns at high levels
      if(lv>=3){for(let y=massTop;y<22;y+=2){p(16-Math.floor(massW/2),y,C.DKBARK);p(16+Math.floor(massW/2)-1,y+1,C.BARK);}}
      // Tendrils reaching outward — more and longer at higher levels
      const reach=fl?4+lv:br?2+lv:lv;
      tVine(p,12,14,12-reach,10,C.BARK,fl);
      tVine(p,20,14,20+reach,10,C.BARK,fl);
      if(lv>=2){tVine(p,14,20,14-reach,23,C.DKBARK,fl);tVine(p,18,20,18+reach,23,C.DKBARK,fl);}
      if(lv>=3){tVine(p,13,16,13-Math.floor(reach*0.7),12,C.BARK,fl);tVine(p,19,16,19+Math.floor(reach*0.7),12,C.BARK,fl);}
      if(lv>=4){tVine(p,11,18,11-reach,22,C.DKBARK,fl);tVine(p,21,18,21+reach,22,C.DKBARK,fl);}
      // Top root knot — larger at higher levels
      const knotW=2+lv;
      b(16-Math.floor(knotW/2),massTop-2,knotW,3,C.BARK);b(16-Math.floor((knotW-2)/2),massTop-2,Math.max(2,knotW-2),2,C.LTBARK);p(16-Math.floor(knotW/2),massTop-2,C.PLBARK);
      if(lv>=3){p(16-Math.floor(knotW/2)-1,massTop-1,C.BARK);p(16+Math.ceil(knotW/2),massTop-1,C.BARK);}
      if(lv>=4){b(16-Math.floor(knotW/2),massTop-3,knotW,1,C.PLBARK);}
      // Fire state: tendrils burst out
      if(fl){
        const burstN=2+lv;
        for(let i=0;i<burstN;i++){p(5-i,8+i*2,C.LTBARK);p(27+i,9+i*2,C.LTBARK);}
        p(5-burstN,7,C.PLBARK);p(27+burstN,8,C.PLBARK);
      }
      // Moss highlights — more at higher levels
      p(13,12,C.MOSS);
      if(lv>=2){p(19,15,C.LTMOSS);p(11,18,br?C.LTMOSS:C.MOSS);}
      if(lv>=3){p(10,14,C.MOSS);p(21,17,C.LTMOSS);}
      if(lv>=4){p(9,16,C.LTMOSS);p(22,13,C.MOSS);p(12,20,C.MOSS);}
      if(s===3){b(14,massTop+2,4,2,C.DKBARK);p(15,massTop+4,C.STUMP);}
    },
    // 3. Grove Viper — Coiled snake dock icon. The animated
    //    slither+strike sprite lives on `viper_mobile.png`; this
    //    is the tower-bar thumbnail. Discrete per-level jumps:
    //      L1 hatchling — slim juvenile snake coiled once, small
    //                    triangular head, pale eye, no markings
    //      L2 adult viper — thicker body with diamond-back pattern,
    //                    tongue flicking out, amber eye, visible
    //                    venom fangs
    //      L3 ancient viper — massive coil, bold diamond pattern
    //                    with red accents, slit pupil, venom drool,
    //                    extended cobra-style hood
    //    (3 levels — maxLevel=3 in T_LEVELS for this column)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,23,20,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      const cx=16;

      // Per-level discrete jumps. The snake is a big coiled
      // silhouette — wider than tall like a stacked rope.
      const COIL_W=[0,18,22,26][lv];   // total coil width
      const BODY_TH=[0,3,4,5][lv];     // body thickness (pixels per coil band)
      const COILS=[0,2,3,3][lv];       // number of visible coil loops
      const HEAD_W=[0,5,7,8][lv];      // triangular head width
      const HEAD_H=[0,4,5,6][lv];
      const FANGS=lv>=2;
      const HOOD=lv>=3;
      const DIAMOND=lv>=2;
      const VENOM_DROOL=lv>=3;

      // Palette per level — earthy greens trending dark
      const SCALE_LT=[C.LTGRN,C.THORN,C.MDGRN][lv-1];
      const SCALE_MD=[C.MDGRN,C.DKVINE,C.FOREST][lv-1];
      const SCALE_DK=[C.FOREST,C.DKFOR,C.DKFOR][lv-1];
      const BELLY=[C.PALGRN,C.LTGRN,C.LTMOSS][lv-1];
      const EYE_COL=lv===1?C.AMBER:lv===2?C.GOLD:C.LTAMB;
      const PUPIL=C.DKFOR;
      const TONGUE_COL=fl?C.LTPNK:C.PINK;
      const DIAMOND_DK=C.DKFOR;
      const DIAMOND_LT=lv===3?C.PINK:C.GOLD;

      // ==== COILED BODY (stacked bands of coil, wider than tall) ====
      // Each coil is a horizontal band with alternating offset so
      // the snake reads as a rope spiraling down on itself. Base
      // sits on the pedestal.
      const baseY=22;                  // base of coil (on pedestal)
      const coilStartY=baseY-COILS*BODY_TH;
      const abx=cx-Math.floor(COIL_W/2);

      for(let k=0;k<COILS;k++){
        const y0=coilStartY+k*BODY_TH;
        // Offset alternating coils slightly for an S shape read
        const xOff=(k%2===0)?0:1;
        const w=COIL_W-xOff*2;
        const x=abx+xOff;
        // Outer dark outline
        b(x,y0,w,BODY_TH,SCALE_DK);
        // Mid fill
        b(x+1,y0+1,w-2,Math.max(1,BODY_TH-2),SCALE_MD);
        // Top highlight row (lighter scales)
        b(x+2,y0+1,w-4,1,SCALE_LT);
        // Belly band (lighter under-scale on the bottom row of each coil)
        if(BODY_TH>=3)b(x+1,y0+BODY_TH-1,w-2,1,BELLY);
        // Round the coil ends (cap both sides)
        p(x,y0,C.DKFOR);
        p(x+w-1,y0,C.DKFOR);
        p(x,y0+BODY_TH-1,C.DKFOR);
        p(x+w-1,y0+BODY_TH-1,C.DKFOR);

        // ==== DIAMOND-BACK PATTERN (L2+) ====
        if(DIAMOND&&BODY_TH>=3){
          const diamondCount=Math.floor((w-4)/4);
          for(let d=0;d<diamondCount;d++){
            const dx=x+2+d*4+(k%2);
            const dy=y0+Math.floor(BODY_TH/2);
            // Diamond shape (centre darker, outer edges lighter)
            p(dx,dy,DIAMOND_DK);
            p(dx+1,dy,DIAMOND_DK);
            p(dx,dy-1,DIAMOND_LT);
            p(dx+1,dy-1,DIAMOND_LT);
            if(lv>=3){
              p(dx,dy+1,DIAMOND_LT);
              p(dx+1,dy+1,DIAMOND_LT);
            }
          }
        }

        // Scale texture — tiny dot pattern
        if(k===0||k===COILS-1){
          for(let sx=x+3;sx<x+w-3;sx+=3){
            p(sx,y0+1,SCALE_DK);
          }
        }
      }

      // ==== HEAD (triangular, rising up off the top coil) ====
      // Head is raised like a cobra-ready pose — rising up and
      // slightly to the right so you see the eye in profile.
      const headBaseY=coilStartY-1;
      const headX=cx-1;                // head centred near middle
      const headTop=headBaseY-HEAD_H;
      // Triangular head — narrows to a point at the top, wider at base
      for(let y=0;y<HEAD_H;y++){
        const ratio=y/HEAD_H;
        const w=Math.max(2,Math.floor(HEAD_W*(1-ratio*0.4)));
        const xs=headX-Math.floor(w/2)+1;
        b(xs,headTop+y,w,1,SCALE_MD);
        // Outline
        p(xs-1,headTop+y,SCALE_DK);
        p(xs+w,headTop+y,SCALE_DK);
        // Top highlight
        if(y===0)b(xs,headTop+y,w,1,SCALE_LT);
      }
      // Jaw/mouth — horizontal line at bottom of head
      b(headX-Math.floor(HEAD_W/2)+2,headBaseY-1,HEAD_W-4,1,C.DKFOR);

      // ==== HOOD (L3 only — cobra-style flare) ====
      if(HOOD){
        const hoodY=headTop+Math.floor(HEAD_H/2);
        p(headX-Math.floor(HEAD_W/2),hoodY,SCALE_DK);
        p(headX-Math.floor(HEAD_W/2)-1,hoodY+1,SCALE_DK);
        p(headX-Math.floor(HEAD_W/2)-1,hoodY,SCALE_MD);
        p(headX+Math.floor(HEAD_W/2)+1,hoodY,SCALE_DK);
        p(headX+Math.floor(HEAD_W/2)+2,hoodY+1,SCALE_DK);
        p(headX+Math.floor(HEAD_W/2)+2,hoodY,SCALE_MD);
        // Hood spots — amber dots on the flare
        p(headX-Math.floor(HEAD_W/2)-1,hoodY+1,C.AMBER);
        p(headX+Math.floor(HEAD_W/2)+2,hoodY+1,C.AMBER);
      }

      // ==== EYE (on the side of the head, visible in profile) ====
      const eyeY=headTop+Math.floor(HEAD_H/2)-1;
      const eyeX=headX+Math.floor(HEAD_W/2)-2;
      // Eye socket (darker recess)
      p(eyeX,eyeY,C.DKFOR);
      p(eyeX+1,eyeY,C.DKFOR);
      p(eyeX,eyeY+1,C.DKFOR);
      p(eyeX+1,eyeY+1,C.DKFOR);
      // Iris fill
      p(eyeX,eyeY,EYE_COL);
      p(eyeX+1,eyeY+1,EYE_COL);
      // Slit pupil at L3 (vertical slit — classic viper eye)
      if(lv>=3){
        p(eyeX,eyeY+1,PUPIL);
        p(eyeX+1,eyeY,PUPIL);
      }else{
        // Round pupil at L1/L2
        p(eyeX+1,eyeY+1,PUPIL);
      }
      // Bright highlight
      p(eyeX,eyeY,C.WHITE);

      // Mirror eye on the other side at L3 (we see both with the
      // hood extended)
      if(HOOD){
        const eyeX2=headX-Math.floor(HEAD_W/2)+1;
        p(eyeX2,eyeY,EYE_COL);
        p(eyeX2+1,eyeY,C.DKFOR);
      }

      // ==== FORKED TONGUE (flickers out of the mouth) ====
      // Tongue always visible on the Viper — it's the
      // iconic-snake read. Forks at the tip at L2+.
      const tongueBaseY=headBaseY-1;
      const tongueBaseX=headX+Math.floor(HEAD_W/2)-1;
      const tongueLen=lv===1?3:lv===2?5:7;
      // Main tongue shaft extending to the right
      for(let t=0;t<tongueLen;t++){
        p(tongueBaseX+t,tongueBaseY,TONGUE_COL);
        if(t>0)p(tongueBaseX+t,tongueBaseY-1,C.MAGENTA);
      }
      // Forked tip (Y shape) — L2+ actually splits into two prongs
      if(FANGS){
        const tipX=tongueBaseX+tongueLen;
        p(tipX,tongueBaseY-1,TONGUE_COL);
        p(tipX,tongueBaseY+1,TONGUE_COL);
        p(tipX+1,tongueBaseY-1,C.MAGENTA);
        p(tipX+1,tongueBaseY+1,C.MAGENTA);
      }else{
        p(tongueBaseX+tongueLen,tongueBaseY,C.WHITE);
      }
      // Fire — tongue lashes farther + white-hot tip
      if(br){
        for(let t=tongueLen+1;t<=tongueLen+2+lv;t++){
          p(tongueBaseX+t,tongueBaseY,TONGUE_COL);
          p(tongueBaseX+t,tongueBaseY-1,C.MAGENTA);
        }
        if(fl)p(tongueBaseX+tongueLen+2+lv,tongueBaseY,C.WHITE);
      }

      // ==== FANGS (L2+, visible when mouth open) ====
      if(FANGS){
        // Two small white fangs below the jaw line
        p(headX-1,headBaseY,C.WHITE);
        p(headX+1,headBaseY,C.WHITE);
        if(lv>=3){
          // Longer fangs
          p(headX-1,headBaseY+1,C.WHITE);
          p(headX+1,headBaseY+1,C.WHITE);
        }
      }

      // ==== VENOM DROOL (L3 always; L2 fire only) ====
      if(VENOM_DROOL){
        p(headX-1,headBaseY+2,C.VENOM);
        p(headX+1,headBaseY+2,C.VENOM);
        if(fl){
          p(headX-1,headBaseY+3,C.TOXIC);
          p(headX+1,headBaseY+3,C.TOXIC);
          p(headX,headBaseY+3,C.SPORE);
        }
      }else if(lv===2&&fl){
        p(headX-1,headBaseY+2,C.SPORE);
        p(headX+1,headBaseY+2,C.SPORE);
      }

      // ==== TAIL TIP (peeks out from the bottom of the coil) ====
      // Small tail sliver hanging off the bottom-right of the
      // lowest coil so the snake reads as having a tail end.
      const tailY=baseY-1;
      const tailX=abx+COIL_W-1;
      p(tailX+1,tailY,SCALE_MD);
      p(tailX+2,tailY-1,SCALE_DK);
      if(lv>=2){
        // Rattle hint at the tail tip at L2+
        p(tailX+3,tailY-1,C.AMBER);
        p(tailX+4,tailY-2,C.DKBARK);
      }
      if(lv>=3){
        p(tailX+5,tailY-2,C.AMBER);
      }

      // ==== STATE OVERLAYS ====
      if(s===1){
        // Charge: eye flares bright, tongue extends
        p(eyeX,eyeY,C.WHITE);
        p(eyeX+1,eyeY+1,C.GOLD);
      }
      if(fl){
        // Fire: strike flash — bright white at the mouth
        p(headX,headBaseY-1,C.WHITE);
        p(headX-1,headBaseY-1,C.PINK);
        p(headX+1,headBaseY-1,C.PINK);
      }
      if(s===3){
        // Cooldown: eye closed (horizontal slit)
        p(eyeX,eyeY,C.DKFOR);
        p(eyeX+1,eyeY,C.DKFOR);
        p(eyeX,eyeY+1,C.DKFOR);
        p(eyeX+1,eyeY+1,C.DKFOR);
      }
    },
    // 4. Blossom — Pink/magenta flower bloom on stalk (3 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,22,20,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      // Stalk — thicker at higher levels
      const stalkW=Math.min(3,1+Math.floor(lv/2));
      const stalkH=Math.min(16,10+lv);
      tStalk(p,b,16-Math.floor(stalkW/2),22-stalkH,stalkH,stalkW,C.MDGRN,C.GREEN,C.LTGRN);
      // Leaves on stalk — more at higher levels
      const leafCount=Math.min(6,lv+1);
      for(let i=0;i<leafCount;i++){
        const ly=22-stalkH+2+Math.floor(i*stalkH/(leafCount+1));
        const lx=i%2===0?14-Math.floor(lv/2):17+Math.floor(lv/2);
        p(lx,ly,i%3===0?C.MDGRN:C.GREEN);
        if(lv>=3)p(lx+(i%2===0?-1:1),ly-1,C.LTGRN);
        if(lv>=5)p(lx+(i%2===0?-1:1),ly,C.GREEN);
      }
      // Flower bloom — petals grow with level
      const baseR=2+lv;
      const petalR=fl?baseR+2:br?baseR+1:baseR;
      const pCol=fl?C.LTPNK:br?C.PINK:(lv>=3?C.PINK:C.MAGENTA);
      const pCol2=fl?C.PINK:br?C.MAGENTA:(lv>=3?C.MAGENTA:C.DKPNK);
      const flowerY=22-stalkH-1;
      // Top petal
      for(let i=0;i<petalR;i++){b(15,flowerY-2-i,2,1,i<1?pCol:pCol2);}
      // Bottom petal
      for(let i=0;i<petalR-1;i++){b(15,flowerY+2+i,2,1,i<1?pCol:pCol2);}
      // Left petal
      for(let i=0;i<petalR;i++){b(16-petalR+i-1,flowerY,1,2,i<2?pCol2:pCol);}
      // Right petal
      for(let i=0;i<petalR;i++){b(17+i,flowerY,1,2,i<petalR-2?pCol:pCol2);}
      // Secondary petals at high levels (diagonal)
      if(lv>=3){
        const dr=Math.floor(petalR*0.7);
        for(let i=0;i<dr;i++){
          p(16-1-i,flowerY-1-i,pCol2);p(17+i,flowerY-1-i,pCol2);
          p(16-1-i,flowerY+1+i,pCol2);p(17+i,flowerY+1+i,pCol2);
        }
      }
      // Multiple flower heads at level 5
      if(lv>=5){
        // Small secondary blooms
        const sx1=10,sy1=flowerY+3,sx2=22,sy2=flowerY+2;
        for(let i=0;i<3;i++){b(sx1-i,sy1-1,1,2,C.MAGENTA);b(sx1+1+i,sy1-1,1,2,C.MAGENTA);b(sx1,sy1-2-i,2,1,C.PINK);b(sx1,sy1+1+Math.min(i,1),2,1,C.PINK);}
        p(sx1,sy1,C.AMBER);p(sx1+1,sy1,C.LTAMB);
        for(let i=0;i<3;i++){b(sx2-i,sy2-1,1,2,C.MAGENTA);b(sx2+1+i,sy2-1,1,2,C.MAGENTA);b(sx2,sy2-2-i,2,1,C.PINK);b(sx2,sy2+1+Math.min(i,1),2,1,C.PINK);}
        p(sx2,sy2,C.AMBER);p(sx2+1,sy2,C.LTAMB);
        // Connecting stems
        tStalk(p,b,sx1+1,flowerY+5,4,1,C.MDGRN,C.GREEN,C.LTGRN);
        tStalk(p,b,sx2,flowerY+4,5,1,C.MDGRN,C.GREEN,C.LTGRN);
      }
      // Center / pollen — larger at higher levels
      const ctrR=lv>=4?2:1;
      b(16-ctrR,flowerY+1-ctrR,ctrR*2,ctrR*2,fl?C.LTAMB:C.AMBER);
      p(16-ctrR,flowerY+1-ctrR,fl?C.WHITE:C.LTAMB);p(16+ctrR-1,flowerY+ctrR,C.DKAMB);
      // Extra petals for fire state
      if(fl){
        p(16-petalR-2,flowerY-2,C.PINK);p(16+petalR+1,flowerY-2,C.PINK);
        p(16-petalR-1,flowerY+2,C.PINK);p(16+petalR,flowerY+2,C.PINK);
        p(16,flowerY-petalR-2,C.LTPNK);p(16,flowerY-petalR-3,C.PINK);
      }
      // Pollen particles — more at higher levels
      if(br){
        p(10,flowerY-3,C.AMBER);p(22,flowerY-1,C.LTAMB);
        if(lv>=2)p(8,flowerY+1,C.DKAMB);
        if(lv>=4){p(7,flowerY-2,C.LTAMB);p(24,flowerY,C.AMBER);}
      }
      if(fl){
        p(7,flowerY-4,C.LTAMB);p(24,flowerY-3,C.AMBER);p(6,flowerY+3,C.DKAMB);p(25,flowerY,C.LTAMB);
        if(lv>=3){p(5,flowerY-1,C.AMBER);p(26,flowerY-2,C.LTAMB);}
      }
      if(s===3){b(15,flowerY-1,2,3,C.DKPNK);p(14,flowerY,C.MAGENTA);p(17,flowerY,C.MAGENTA);}
    },
    // 5. Spore — Mushroom cap releasing spore cloud (3 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,23,20,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      // Mushroom stem — thicker at higher levels
      const stemW=2+Math.floor(lv/2);
      const stemH=Math.min(12,7+lv);
      b(16-Math.floor(stemW/2),23-stemH,stemW,stemH,C.PLBARK);b(16-Math.floor((stemW-2)/2),23-stemH,Math.max(2,stemW-2),stemH,C.LTBARK);
      // Stem rings at high levels
      if(lv>=3)for(let i=0;i<Math.floor(stemH/3);i++){b(16-Math.floor(stemW/2)-1,23-stemH+i*3+1,stemW+2,1,C.BARK);}
      // Mushroom cap — wider at higher levels
      const baseCapW=6+lv*2;
      const capW=fl?baseCapW+4:br?baseCapW+2:baseCapW;
      const capH=Math.min(8,4+lv);
      for(let y=0;y<capH;y++){
        const w=Math.max(2,Math.round(capW*(1-Math.abs(y-capH*0.4)/capH)));
        const sx=16-Math.floor(w/2);
        const capY=23-stemH-capH+2;
        b(sx,capY+y,w,1,y<1?C.LTSPOR:y<Math.ceil(capH*0.4)?C.SPORE:y<Math.ceil(capH*0.8)?C.DKSPOR:C.DKFOR);
      }
      const capTopY=23-stemH-capH+2;
      // Cap highlight
      b(14,capTopY,4,1,C.LTSPOR);p(13,capTopY+1,fl?C.WHITE:C.LTSPOR);
      // Cap spots — more at higher levels
      p(12,capTopY+2,C.LTAMB);p(18,capTopY+1,C.LTAMB);p(15,capTopY,fl?C.WHITE:C.LTAMB);
      if(lv>=2){p(10,capTopY+2,C.LTAMB);p(20,capTopY+2,C.LTAMB);}
      if(lv>=4){p(9,capTopY+3,C.AMBER);p(22,capTopY+1,C.AMBER);}
      if(lv>=5){
        // Cap pattern rings
        for(let i=0;i<4;i++){const a=i*Math.PI/2;p(16+Math.round(Math.cos(a)*3),capTopY+2+Math.round(Math.sin(a)*1),C.LTAMB);}
      }
      // Spore cloud — grows with states AND level
      const baseSporeR=Math.floor(lv*0.8);
      const sporeR=fl?baseSporeR+6:br?baseSporeR+3:baseSporeR;
      if(sporeR>0){
        const sporeN=Math.min(12,6+lv);
        for(let i=0;i<sporeN;i++){
          const a=i*Math.PI*2/sporeN;
          const r=sporeR-i%2;
          const sx=16+Math.round(Math.cos(a)*r),sy=capTopY-1+Math.round(Math.sin(a)*r);
          if(sy>=0&&sy<32&&sx>=0&&sx<32)p(sx,sy,i%2===0?C.TOXIC:C.LTSPOR);
        }
      }
      if(fl){
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          const r=sporeR+2;
          const sx=16+Math.round(Math.cos(a)*r),sy=capTopY-1+Math.round(Math.sin(a)*r);
          if(sy>=0&&sy<32&&sx>=0&&sx<32)p(sx,sy,i%3===0?C.TOXIC:C.DKSPOR);
        }
      }
      // Gills under cap
      const gillY=capTopY+capH-1;
      for(let x=16-Math.floor(capW/3);x<=16+Math.floor(capW/3);x+=2)if(x>=0&&x<32)p(x,gillY,C.DKFOR);
      // Small mushrooms at base — more at higher levels
      const miniCount=Math.min(4,lv);
      const miniPos=[[10,21],[21,21],[7,22],[24,22]];
      for(let i=0;i<miniCount;i++){
        const[mx,my]=miniPos[i];
        p(mx,my,C.SPORE);p(mx+1,my-1,C.LTSPOR);
        if(lv>=4)p(mx-1,my,C.DKSPOR);
      }
      if(s===3){b(14,capTopY+1,4,2,C.DKSPOR);p(16,capTopY-1,C.DKFOR);}
    },
    // 6. Sunroot — Sunflower splash DPS. Radiant petals, dark seed
    //    centre; bloom rises higher at each level. (3 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,22,20,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      const cx=16,bcy=8+(3-lv); // higher level blooms higher
      // Stalk
      b(cx-1,bcy+3,2,14,C.MDGRN);
      b(cx,bcy+3,1,14,C.GREEN);
      // Leaves off the stalk
      p(cx-3,bcy+8,C.GREEN);p(cx-4,bcy+9,C.MDGRN);
      p(cx+2,bcy+7,C.GREEN);p(cx+3,bcy+8,C.MDGRN);
      if(lv>=2){p(cx-4,bcy+10,C.LTGRN);p(cx+3,bcy+11,C.LTGRN);}
      // Bloom centre — dark seed disc
      const br2=2+lv;
      for(let dy=-br2;dy<=br2;dy++){
        for(let dx=-br2;dx<=br2;dx++){
          const d2=dx*dx+dy*dy;
          if(d2<=br2*br2){
            p(cx+dx,bcy+dy,d2<(br2-1)*(br2-1)?C.DKAMB:C.BARK);
          }
        }
      }
      // 8 petals around the bloom
      const pr=br2+1;
      const pcol=fl?C.WHITE:br?C.LTAMB:C.AMBER;
      const off=[[0,-pr],[pr,0],[0,pr],[-pr,0],[pr-1,-pr+1],[pr-1,pr-1],[-pr+1,pr-1],[-pr+1,-pr+1]];
      for(const [dx,dy] of off){
        p(cx+dx,bcy+dy,pcol);
        if(lv>=3){
          p(cx+Math.sign(dx)*(Math.abs(dx)+1),bcy+dy,C.GOLD);
          p(cx+dx,bcy+Math.sign(dy)*(Math.abs(dy)+1),C.GOLD);
        }
      }
      // Seed pattern at higher levels
      if(lv>=2){p(cx,bcy,C.DKBARK);p(cx-1,bcy-1,C.DKBARK);p(cx+1,bcy+1,C.DKBARK);}
      // Charge: glow ring outside petals
      if(s===1){for(const [dx,dy] of off){p(cx+(dx*13/10|0),bcy+(dy*13/10|0),C.LTAMB);}}
      // Fire: radiant spike upward
      if(fl){
        p(cx,bcy-pr-1,C.WHITE);p(cx,bcy-pr-2,C.GOLD);
        p(cx-1,bcy-pr-1,C.LTAMB);p(cx+1,bcy-pr-1,C.LTAMB);
      }
      // Cooldown: seed disc darkens
      if(s===3){b(cx-1,bcy-1,2,2,C.DKAMB);}
    },
    // 7. Vine — Whipping vine tendril (3 levels)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,22,20,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      // Central vine stalk — thicker at higher levels
      const vineW=1+Math.floor(lv/2);
      for(let y=6;y<22;y++){
        const x=16+Math.round(Math.sin((y-6)*0.4)*2);
        for(let w=0;w<vineW;w++){
          p(x-w,y,w===0?C.VINE:C.DKVINE);
          p(x+1+w,y,(w===0&&y%3===0)?C.LTVINE:C.VINE);
        }
      }
      // Secondary vines at high level
      if(lv>=3){
        for(let y=8;y<20;y++){
          const x=14+Math.round(Math.sin((y-8)*0.5)*1.5);
          p(x,y,C.DKVINE);
          const x2=18+Math.round(Math.sin((y-8)*0.6)*1.5);
          p(x2,y,C.VINE);
        }
      }
      // Vine tip / whip — longer at higher levels
      const baseWhip=2+lv*2;
      const whipExtend=fl?baseWhip+4:br?baseWhip+2:baseWhip;
      for(let i=0;i<whipExtend;i++){
        const wx=fl?16+i*1.2:16+i*0.8;
        const wy=5-i+Math.sin(i*0.8)*1.5;
        const ix=Math.round(wx),iy=Math.round(wy);
        if(ix>=0&&ix<32&&iy>=0&&iy<32)p(ix,iy,i<2?C.LTVINE:C.VINE);
      }
      // Fire: vine lashes outward — more tendrils at higher levels
      if(fl){
        const lashN=4+lv*2;
        for(let i=0;i<lashN;i++){p(22+Math.floor(i*0.8),4+Math.round(Math.sin(i)*2),i<lashN/2?C.LTGRN:C.GREEN);}
        p(22+Math.floor(lashN*0.8),3,C.LTVINE);p(23+Math.floor(lashN*0.8),4,C.VINE);
      }
      // Curling tendrils — more at higher levels
      const tendrilCount=1+lv;
      for(let i=0;i<tendrilCount;i++){
        const ty=8+i*Math.floor(12/tendrilCount);
        p(13-Math.min(i,3),ty,br?C.LTGRN:C.GREEN);p(19+Math.min(i,3),ty+2,br?C.LTGRN:C.GREEN);
        if(lv>=2){p(12-Math.min(i,3),ty+1,C.DKVINE);p(20+Math.min(i,3),ty+1,C.DKVINE);}
      }
      // Leaves — more at higher levels
      p(12,9,C.GREEN);p(20,13,C.LTGRN);
      if(lv>=2){p(11,17,C.MDGRN);p(21,11,C.MDGRN);}
      if(lv>=3){p(10,13,C.GREEN);p(22,9,C.LTGRN);p(9,19,C.MDGRN);p(23,15,C.GREEN);}
      // Thorns on vine — more at higher levels
      p(14,10,C.THORN);
      if(lv>=2){p(18,14,C.THORN);p(13,18,C.DKTHRN);}
      if(lv>=3){p(12,12,C.THORN);p(20,16,C.THORN);p(14,20,C.DKTHRN);}
      if(s===3){
        for(let y=6;y<12;y++){const x=16+Math.round(Math.sin((y-6)*0.4)*2);p(x,y,C.DKVINE);}
      }
    },
    // 8. Elder Treant (Ultimate) — Ancient tree face/trunk (1 level)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      // Massive root base — custom for ultimate
      for(let i=0;i<12;i++){
        const cw=22-Math.abs(i-6)+Math.round(Math.sin(i*0.5)*2);
        const sx=16-Math.floor(cw/2);
        b(sx,20+i,cw,1,i<3?C.BARK:i<7?C.DKBARK:i<10?C.STUMP:C.DKFOR);
      }
      // Spiral vine whorl signature on base
      p(12,24,fl?C.LTGRN:C.GREEN);p(13,25,C.VINE);p(14,26,C.DKVINE);
      p(11,25,fl?C.LTVINE:C.VINE);p(12,26,C.MDGRN);
      p(20,24,fl?C.LTGRN:C.GREEN);p(19,25,C.VINE);
      // Trunk
      b(12,4,8,18,C.BARK);b(13,4,6,18,C.LTBARK);b(14,4,4,18,C.PLBARK);
      // Bark texture
      for(let y=5;y<20;y+=2){p(12,y,C.DKBARK);p(19,y+1,C.DKBARK);p(14,y,C.LTBARK);}
      // Face — ancient tree face
      // Eyes
      b(13,9,2,2,fl?C.LTAMB:C.AMBER);b(17,9,2,2,fl?C.LTAMB:C.AMBER);
      p(13,9,fl?C.WHITE:C.LTAMB);p(17,9,fl?C.WHITE:C.LTAMB);
      p(14,10,C.DKAMB);p(18,10,C.DKAMB);
      // Mouth / knot
      b(14,13,4,2,C.DKBARK);b(15,13,2,1,C.STUMP);
      // Eyebrow ridges
      b(12,8,3,1,C.DKBARK);b(17,8,3,1,C.DKBARK);
      // Crown — branches and leaves
      b(10,2,12,3,C.BARK);b(11,1,10,2,C.LTBARK);b(13,0,6,1,C.PLBARK);
      // Branch left
      p(9,3,C.BARK);p(8,2,C.BARK);p(7,1,C.LTBARK);p(6,0,br?C.LTGRN:C.GREEN);p(7,0,C.GREEN);
      // Branch right
      p(22,3,C.BARK);p(23,2,C.BARK);p(24,1,C.LTBARK);p(25,0,br?C.LTGRN:C.GREEN);p(24,0,C.GREEN);
      // Leaf clusters on crown
      for(let i=0;i<5;i++){
        p(10+i*2,0,fl?C.LTGRN:C.GREEN);p(11+i*2,1,br?C.PALGRN:C.LTGRN);
      }
      if(fl){p(8,0,C.PALGRN);p(23,0,C.PALGRN);p(5,1,C.LTGRN);p(26,1,C.LTGRN);}
      // Glowing roots
      const gc=fl?C.LTGRN:br?C.GREEN:C.MDGRN;
      p(10,20,gc);p(22,20,gc);p(8,22,gc);p(24,22,gc);
      if(fl){p(6,24,C.PALGRN);p(26,24,C.PALGRN);p(7,23,C.LTGRN);p(25,23,C.LTGRN);}
      // Root tendrils
      tVine(p,10,20,6,26,C.DKBARK,fl);
      tVine(p,22,20,26,26,C.DKBARK,fl);
      // Moss on trunk
      p(12,16,C.MOSS);p(19,18,C.LTMOSS);p(13,20,C.MOSS);
      // Amber/gold glow for ultimate
      if(br){p(15,6,C.AMBER);p(16,5,C.LTAMB);p(14,4,C.DKAMB);}
      if(fl){b(14,5,4,2,C.LTAMB);p(15,4,C.WHITE);p(16,4,C.AMBER);}
      if(s===3){b(13,9,2,2,C.DKAMB);b(17,9,2,2,C.DKAMB);p(15,6,C.DKBARK);}
    },
    // 9. Razor Bramble — Bramble's divergent DPS branch. A lean
    //    bark-and-blades trunk: serrated thorn-blades fan out from
    //    a textured dark core, tooth-like crown at the top, barbed
    //    spine running top-to-bottom, red bloodied highlights.
    //    L1 → L2 → L3 each add a real silhouette change (more
    //    blades, serrations, veins, trunk details) so upgrading
    //    reads at a glance. (3 levels = engine levels 2, 3, 4)
    (c,o,s,lv)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBaseLv(p,b,22,18,s===1?1:s===2?2:0,lv);
      const br=s>=1,fl=s===2;
      const cx=16;
      const coreW=6+lv*2,coreH=10+lv*2;
      const coreTop=22-coreH,xL=cx-Math.floor(coreW/2);

      // ---- Trunk silhouette (dark outline) ----
      b(xL,coreTop,coreW,coreH,C.DKFOR);
      // Slight waist — narrow the middle one cell on both sides so
      // the trunk reads as organic, not a rectangle.
      const waistY=coreTop+Math.floor(coreH/2);
      p(xL,waistY,C.SHAD);p(xL,waistY+1,C.SHAD);
      p(xL+coreW-1,waistY,C.SHAD);p(xL+coreW-1,waistY+1,C.SHAD);
      // Rounded base corners
      p(xL,coreTop+coreH-1,C.SHAD);p(xL+coreW-1,coreTop+coreH-1,C.SHAD);

      // ---- Bark texture (grain + knots) ----
      // Fill interior with dark forest, then stipple a deterministic
      // bark pattern — vertical grain strokes, knots, light highlights
      // along one side (left = lit, right = shadow).
      for(let y=coreTop+1;y<coreTop+coreH-1;y++){
        for(let x=xL+1;x<xL+coreW-1;x++){
          const n=(x*11+y*7+lv*3)%13;
          if(n<6)p(x,y,C.FOREST);
          else if(n===6||n===7)p(x,y,C.DKFOR);        // dark grain
          else if(n===8)p(x,y,C.DKBARK);              // bark streak
          else if(n===9)p(x,y,C.BARK);
          else if(n===10&&x<cx)p(x,y,C.MDGRN);        // mossy patch (left)
          else if(n===11&&x>=cx)p(x,y,C.STUMP);       // shadow side
          else p(x,y,C.FOREST);
        }
      }
      // Vertical grain strokes — long darker runs that read as
      // bark channels. Positioned deterministically from lv.
      const grainCols=[xL+1,xL+Math.floor(coreW/2),xL+coreW-2];
      for(const gx of grainCols){
        for(let y=coreTop+2;y<coreTop+coreH-2;y++){
          if((y+gx)%3===0)p(gx,y,C.DKBARK);
        }
      }
      // Knots — small oval-ish bark features
      const knots:[number,number][]=[[xL+2,coreTop+3],[xL+coreW-3,coreTop+5]];
      if(lv>=2)knots.push([xL+1,coreTop+coreH-4]);
      if(lv>=3)knots.push([xL+coreW-2,coreTop+coreH-5],[xL+Math.floor(coreW/2)+1,coreTop+2]);
      for(const[kx,ky]of knots){
        p(kx,ky,C.DKBARK);p(kx+1,ky,C.BARK);p(kx,ky+1,C.BARK);p(kx+1,ky+1,C.DKBARK);
      }

      // ---- Blood vein network (the "razor" identity) ----
      // Runs down the trunk like a blood vessel. Brighter when
      // charging/firing. Scales with level. Crimson red (not pink)
      // so it doesn't read as Blossom's flower at small scale.
      const veinCol=fl?C.LTBLOOD:br?C.BLOOD:C.DKBLOOD;
      const veinMid=fl?C.BLOOD:br?C.DKBLOOD:C.DKBLOOD;
      // Main vertical vein just left of centre
      for(let y=coreTop+2;y<coreTop+coreH-1;y++){
        p(cx-1,y,y%2===0?veinCol:veinMid);
      }
      // Branching capillaries at higher levels
      if(lv>=2){
        p(cx-2,coreTop+4,veinMid);p(cx-2,coreTop+5,veinMid);
        p(cx,coreTop+coreH-3,veinMid);p(cx,coreTop+coreH-4,veinCol);
      }
      if(lv>=3){
        p(cx+1,coreTop+3,veinCol);p(cx+2,coreTop+3,veinMid);
        p(cx-3,coreTop+coreH-5,veinMid);p(cx-4,coreTop+coreH-5,C.DKPNK);
        p(cx+1,coreTop+coreH-2,veinCol);
      }

      // ---- Serrated blades fanning out from each side ----
      // Every blade is a 2-px-thick angled segment with a bright
      // spine highlight and a bloody tip. Count + length both
      // scale dramatically per level.
      const bladeCount=3+lv*2;
      for(let i=0;i<bladeCount;i++){
        const side=i%2===0?-1:1;
        const slot=Math.floor(i/2);
        const rowSpacing=Math.max(2,Math.floor((coreH-2)/Math.max(1,Math.ceil(bladeCount/2))));
        const by=coreTop+2+slot*rowSpacing;
        if(by>=coreTop+coreH-1)continue;
        const bx=xL+(side===-1?0:coreW-1);
        const len=2+lv+(i%3===0?1:0);

        // Blade main body — two-tone angled segment with upward tilt
        for(let d=1;d<=len;d++){
          const x=bx+side*d;
          const y=by-Math.floor(d*0.4);
          // Back edge (shadow)
          p(x,y+1,C.DKBARK);
          // Spine (mid)
          p(x,y,d<len?C.BARK:C.LTBARK);
          // Serrated edge — alternating pixels above the spine
          if(d%2===0&&d<len){p(x,y-1,C.LTBARK);}
          // Occasional blood drip along the edge at higher levels
          if(lv>=2&&d===Math.floor(len/2))p(x,y-1,veinMid);
        }
        // Tip — bright highlight + blood
        const tipX=bx+side*(len+1);
        const tipY=by-Math.floor(len*0.4);
        p(tipX,tipY,lv>=3?C.WHITE:C.PLBARK);
        p(tipX,tipY-1,lv>=2?veinCol:C.LTBARK);
        if(lv>=2)p(tipX+side,tipY,veinMid);
        if(lv>=3){p(tipX+side,tipY-1,veinCol);p(tipX,tipY+1,C.DKBARK);}

        // Attachment point — where the blade meets the trunk, a
        // little darker "socket" so the blade doesn't float.
        p(bx,by,C.SHAD);
        p(bx,by+1,C.DKBARK);
      }

      // ---- Barbed spine running down the trunk's centre ----
      // Like a row of tiny thorns pinning the vein. Scales with lv.
      if(lv>=2){
        for(let y=coreTop+3;y<coreTop+coreH-2;y+=3){
          p(cx,y,C.THORN);
          p(cx+1,y-1,C.DKTHRN);
        }
      }
      if(lv>=3){
        // Extra hooked barbs at matriarch level
        for(let y=coreTop+4;y<coreTop+coreH-2;y+=4){
          p(cx-2,y,C.DKTHRN);
          p(cx-3,y,C.THORN);
        }
      }

      // ---- Tooth-like crown at the top ----
      // Replaces the old "single blade". Three (L1) → five (L2) →
      // seven (L3) upward fangs of varying length, centred on cx.
      const fangs=3+(lv-1)*2; // 3, 5, 7
      for(let f=0;f<fangs;f++){
        const offset=f-Math.floor(fangs/2);
        const fx=cx+offset;
        const baseY=coreTop;
        // Fang length varies — the middle one tallest, outer ones
        // shorter.
        const flen=(fangs-Math.abs(offset)*2)+1;
        for(let y=0;y<flen;y++){
          const ty=baseY-1-y;
          const col=y===0?C.LTBARK:y===flen-1?(fl?C.WHITE:C.PLBARK):y<flen-1?C.BARK:C.DKBARK;
          p(fx,ty,col);
          // Blade spine — a single pixel highlight on one side at
          // higher levels.
          if(lv>=3&&y===Math.floor(flen/2))p(fx+(offset<0?-1:1),ty,C.LTBARK);
        }
        // Bone-white fang tip with a dab of blood at the bite edge
        if(lv>=2){
          p(fx,baseY-flen,C.BONE);
          p(fx,baseY-flen+1,C.BLOOD);
          if(lv>=3&&f===Math.floor(fangs/2))p(fx,baseY-flen-1,C.LTBLOOD);
        }
      }
      // Inter-fang gaps shadowed so each fang reads separately
      for(let f=0;f<fangs-1;f++){
        const gapX=cx+(f-Math.floor(fangs/2));
        p(gapX,coreTop,C.DKFOR); // shadow where fangs separate
      }

      // ---- Barbed spikes running down the outer edges ----
      if(lv>=2){
        for(let y=0;y<Math.floor(coreH/2);y++){
          if(y%2===0){
            p(xL-1,coreTop+1+y,C.DKTHRN);
            p(xL+coreW,coreTop+1+y,C.DKTHRN);
          }
        }
      }
      if(lv>=3){
        // Longer, nastier barbs at matriarch level
        for(let y=0;y<coreH-3;y++){
          if(y%3===0){
            p(xL-2,coreTop+1+y,C.THORN);
            p(xL+coreW+1,coreTop+1+y,C.THORN);
          }
        }
      }

      // ---- Moss / blood at the base ----
      // The Grove won't let go of this thing — moss and dried blood
      // pool at the foot of the trunk where it meets the pedestal.
      p(xL+1,coreTop+coreH-1,C.MDGRN);
      p(xL+coreW-2,coreTop+coreH-1,C.MDGRN);
      if(lv>=2){
        p(xL+2,coreTop+coreH-1,C.DKBLOOD);
        p(xL+coreW-3,coreTop+coreH-1,C.DKBLOOD);
      }
      if(lv>=3){
        p(xL,coreTop+coreH,C.BLOOD);
        p(xL+coreW-1,coreTop+coreH,C.BLOOD);
      }

      // ---- State overlays ----
      // Charge — vein network pulses red, blade spines glow warm
      if(s===1){
        for(let y=coreTop+3;y<coreTop+coreH-2;y+=2){
          p(cx-1,y,C.LTBLOOD);
        }
        p(cx,coreTop-1,C.BLOOD); // crown tip pulse
      }
      // Fire — launched central fang + red spark ring
      if(fl){
        const tipY=coreTop-(1+fangs);
        p(cx,tipY-1,C.BONE);
        p(cx,tipY-2,C.BLOOD);
        p(cx-1,tipY-1,C.DKBLOOD);
        p(cx+1,tipY-1,C.DKBLOOD);
        // Red spark trail down vein
        p(cx-1,coreTop+2,C.LTBLOOD);
        p(cx-1,coreTop+5,C.BLOOD);
        p(cx-1,coreTop+8,C.DKBLOOD);
      }
      // Cooldown — dim veins, retracted blades
      if(s===3){
        for(let y=coreTop+2;y<coreTop+coreH-1;y++){
          p(cx-1,y,C.DKBLOOD);
        }
        // Draw dark overlay on crown so fangs appear partially
        // tucked.
        for(let f=0;f<fangs;f++){
          const offset=f-Math.floor(fangs/2);
          p(cx+offset,coreTop-1,C.DKBARK);
        }
      }
    },
  ];
  // Layout: 9 cols × 24 rows. Per tower column, levels stack: lv1 states 0-3, lv2 states 0-3, ...
  const cols=9,rows=T_ROWS;
  for(let col=0;col<cols;col++){
    const maxLv=T_LEVELS[col];
    for(let lv=1;lv<=maxLv;lv++){
      for(let state=0;state<4;state++){
        const row=(lv-1)*4+state;
        fns[col](ctx,[col*T_CELL,row*T_CELL],state,lv);
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (6×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

export function drawProjectiles(ctx){
  const fns=[
    // Bramble: same thorn/spike art — short ranged but fires thorns
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const ang=[-1,0,1][f];
        // Sharp thorn spike
        for(let i=0;i<8;i++){
          const w=i<2?1:i<6?2:1;
          b(cx-Math.floor(w/2)+ang*(i>4?1:0),cy-4+i,w,1,i<2?C.WHITE:i<4?C.LTTHRN:i<6?C.THORN:C.DKTHRN);
        }
        p(cx,cy-5,f===0?C.WHITE:C.LTTHRN);
        p(cx-2,cy,C.DKTHRN);p(cx+2,cy,C.DKTHRN);
      }
      else if(f===3){
        // Impact: thorn shatter burst
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.THORN:C.LTTHRN);}
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.THORN);
      }
      else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.LTTHRN:C.DKTHRN);}
        p(cx,cy,C.THORN);p(cx-1,cy+1,C.DKTHRN);
      }
      else{
        [[3,5],[12,4],[5,11],[10,12],[7,3],[9,13]].forEach(([x,y],i)=>p(x,y,i%2?C.DKTHRN:C.THORN));
        p(cx,cy,C.DKTHRN);
      }
    },
    // Root: root tendril reaching → root burst
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const ext=[3,5,7][f];
        // Root tendril
        for(let i=0;i<ext;i++){
          const x=cx+Math.round(Math.sin(i*0.8)*1.5);
          p(x,cy+2-i,i<2?C.PLBARK:i<4?C.BARK:C.DKBARK);
          if(i>1)p(x-1,cy+2-i,C.DKBARK);
        }
        p(cx,cy+3,C.STUMP);p(cx-1,cy+4,C.DKBARK);p(cx+1,cy+4,C.DKBARK);
      }
      else if(f===3){
        // Root burst
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.BARK:C.LTBARK);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.PLBARK);
        }
        p(cx,cy,C.LTAMB);
      }
      else if(f===4){
        for(let i=0;i<6;i++){const a=i*Math.PI/3,r=4;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DKBARK);}
        b(cx-1,cy-1,2,2,C.BARK);p(cx,cy,C.LTBARK);
      }
      else{
        [[4,5],[11,6],[6,11],[9,4],[3,9],[13,8]].forEach(([x,y],i)=>p(x,y,i%2?C.DKBARK:C.STUMP));
      }
    },
    // Thornweaver: melee mobile unit — no projectile (column left
    // blank by design; the mobile_unit trait handles attacks at
    // close range so no projectile is ever fired).
    (_c,_o,_f)=>{/* intentionally empty */},
    // Blossom: pollen cloud → bloom flash (pink)
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[2,3,4][f];
        // Pollen cloud
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y,d<1?C.WHITE:d<r*0.5?C.LTAMB:d<r*0.8?C.AMBER:C.DKAMB);
          }
        }
        if(f>0){p(cx-r-1,cy,C.DKAMB);p(cx+r+1,cy,C.DKAMB);}
      }
      else if(f===3){
        // Bloom flash — pink burst
        b(cx-2,cy-2,4,4,C.PINK);b(cx-1,cy-1,2,2,C.LTPNK);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.PINK:C.LTPNK);}
        p(cx,cy,C.WHITE);
      }
      else if(f===4){
        for(let i=0;i<6;i++){const a=i*Math.PI/3,r2=4;
          p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),C.MAGENTA);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.PINK);
        }
        p(cx,cy,C.LTPNK);
      }
      else{
        [[5,5],[10,6],[7,11],[4,8],[12,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DKPNK:C.MAGENTA));
        p(cx,cy,C.DKPNK);
      }
    },
    // Spore: green spore ball → toxic cloud expand
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[2,3,3][f];
        // Spore ball
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y,d<1?C.LTSPOR:d<r*0.6?C.SPORE:C.DKSPOR);
          }
        }
        p(cx-1,cy-1,C.WHITE);
        if(f===2){p(cx-r-1,cy,C.DKSPOR);p(cx,cy-r-1,C.DKSPOR);}
      }
      else if(f===3){
        // Toxic cloud expand
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r2=4+i%2;
          p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),i%2?C.TOXIC:C.SPORE);
        }
        b(cx-2,cy-2,4,4,C.SPORE);b(cx-1,cy-1,2,2,C.LTSPOR);p(cx,cy,C.WHITE);
      }
      else if(f===4){
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r2=5+i%3;
          p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),i%3===0?C.TOXIC:C.DKSPOR);
        }
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.SPORE);}
        p(cx,cy,C.LTSPOR);
      }
      else{
        [[4,4],[11,5],[6,12],[9,3],[3,9],[13,10]].forEach(([x,y],i)=>p(x,y,i%2?C.DKSPOR:C.DKFOR));
        p(cx,cy,C.DKSPOR);
      }
    },
    // Sunroot: fireball petal → bloom-burst
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const spin=f;
        // Fireball — amber/gold core
        for(let dy=-2;dy<=2;dy++){
          for(let dx=-2;dx<=2;dx++){
            if(dx*dx+dy*dy<=4){
              const d=Math.abs(dx)+Math.abs(dy);
              p(cx+dx,cy+dy,d<2?C.GOLD:C.AMBER);
            }
          }
        }
        // Flare highlight rotates with spin
        p(cx+(spin-1),cy,C.WHITE);
        p(cx,cy+(spin-1),C.WHITE);
      }
      else if(f===3){
        // Impact: bloom burst radiating outward
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.GOLD:C.AMBER);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.LTAMB);
        }
        p(cx,cy,C.WHITE);
      }
      else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.LTAMB:C.DKAMB);}
        p(cx,cy,C.AMBER);
      }
      else{
        [[3,5],[12,4],[5,11],[10,12],[7,3],[9,13]].forEach(([x,y],i)=>p(x,y,i%2?C.DKAMB:C.AMBER));
        p(cx,cy,C.DKBARK);
      }
    },
    // Vine: whipping vine tip → vine snap
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const curl=[0,1,2][f];
        // Vine tip whipping
        for(let i=0;i<8;i++){
          const x=cx-3+i,y=cy+Math.round(Math.sin((i+curl)*0.8)*2);
          if(x>=0&&x<16&&y>=0&&y<16)p(x,y,i<2?C.DKVINE:i<5?C.VINE:C.LTVINE);
        }
        // Vine tip point
        p(cx+5,cy+Math.round(Math.sin((5+curl)*0.8)*2)-1,C.LTGRN);
        p(cx-4,cy+1,C.DKVINE);
      }
      else if(f===3){
        // Vine snap impact
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.VINE:C.LTVINE);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.LTGRN);
        }
        p(cx,cy,C.WHITE);
      }
      else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.DKVINE:C.VINE);
        }
        p(cx,cy,C.VINE);p(cx+1,cy-1,C.LTGRN);
      }
      else{
        [[3,6],[12,5],[5,11],[10,12],[7,3]].forEach(([x,y],i)=>p(x,y,i%2?C.DKVINE:C.DKFOR));
        p(cx,cy,C.DKVINE);
      }
    },
    // Elder: massive root ball → ancient explosion (green+gold)
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[3,4,4][f];
        // Massive root ball
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y,d<1?C.LTAMB:d<r*0.4?C.AMBER:d<r*0.7?C.GREEN:C.DKFOR);
          }
        }
        p(cx-1,cy-1,C.WHITE);p(cx+1,cy+1,C.LTGRN);
        // Root tendrils
        if(f>0){p(cx-r-1,cy,C.BARK);p(cx+r+1,cy,C.BARK);p(cx,cy-r-1,C.DKBARK);p(cx,cy+r+1,C.DKBARK);}
        if(f===2){p(cx-r-2,cy+1,C.DKBARK);p(cx+r+2,cy-1,C.DKBARK);}
      }
      else if(f===3){
        // Ancient explosion — green + gold
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r2=5;
          p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),i%3===0?C.LTAMB:i%2?C.LTGRN:C.GREEN);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.AMBER:C.GREEN);
        }
        b(cx-2,cy-2,4,4,C.GREEN);b(cx-1,cy-1,2,2,C.LTAMB);p(cx,cy,C.WHITE);
      }
      else if(f===4){
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r2=6+i%2;
          p(cx+Math.round(Math.cos(a)*r2),cy+Math.round(Math.sin(a)*r2),i%3===0?C.AMBER:i%2?C.DKFOR:C.MDGRN);
        }
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DKAMB);}
        p(cx,cy,C.AMBER);p(cx+1,cy,C.GREEN);
      }
      else{
        [[3,4],[12,5],[5,12],[10,3],[4,8],[13,9],[7,13],[9,2]].forEach(([x,y],i)=>p(x,y,i%3===0?C.DKAMB:i%2?C.DKFOR:C.DKBARK));
        p(cx,cy,C.DKFOR);
      }
    },
    // Razor Bramble projectile — a sharp thorn-blade with red
    // bloodied edge. Impact = short red droplet spray.
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const ang=[-1,0,1][f];
        // Blade-like thorn spike — longer than Bramble's
        for(let i=0;i<10;i++){
          const w=i<2?1:i<7?2:1;
          b(cx-Math.floor(w/2)+ang*(i>5?1:0),cy-5+i,w,1,i<2?C.WHITE:i<4?C.LTBARK:i<8?C.BARK:C.DKBARK);
        }
        // Red bloodied edge
        p(cx-1,cy-3,C.PINK);p(cx+1,cy-3,C.PINK);
        p(cx,cy-6,f===0?C.WHITE:C.MAGENTA);
      }
      else if(f===3){
        // Impact — red droplet spray
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.PINK:C.MAGENTA);}
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.DKBARK);
      }
      else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.PINK:C.DKPNK);}
        p(cx,cy,C.MAGENTA);p(cx-1,cy+1,C.DKBARK);
      }
      else{
        [[3,5],[12,4],[5,11],[10,12],[7,3],[9,13]].forEach(([x,y],i)=>p(x,y,i%2?C.DKBARK:C.DKPNK));
        p(cx,cy,C.DKBARK);
      }
    },
  ];
  const cols=9,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

export function drawHero(ctx){
  // Druid — nature-clad figure with staff, leaf/vine clothing
  function drawChar(c,o,dir,opts={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,rootCast=false,thornBurst=false,wildShift=false,natureWrath=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Nature wrath marks — swirling leaf particles
    if(natureWrath){
      [[3,2],[26,5],[1,18],[29,15],[5,32],[27,30],[2,45],[28,42],[8,1],[24,3],[4,38],[28,36]].forEach(([mx,my],i)=>{
        p(mx,my,i%2?C.GREEN:C.LTGRN);p(mx+1,my+1,C.AMBER);p(mx-1,my+1,i%3?C.VINE:C.LTGRN);p(mx,my+2,C.GREEN);
      });
    }

    const lean=rootCast?-1:atk&&atkFrame>0?1:0;
    const headY=rootCast?8:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx_=cx+lean;

    // LEAF CLOAK (behind body)
    if(dir===2||dir===0){
      const cY=torY+2, sp=natureWrath?2:wildShift?3:1;
      for(let i=0;i<18;i++){
        const w=6+Math.floor(i*0.5)+sp, sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3)*0.8);
        const cl=i<4?C.MDGRN:i<10?C.DKFOR:i<14?C.FOREST:C.SHAD;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Leaf edge highlights
      for(let i=0;i<14;i++){
        const w=6+Math.floor(i*0.5)+sp, sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.3)*0.8);
        if(cY+i<62){p(sx_,cY+i,C.GREEN);if(sx_+w-1<32)p(sx_+w-1,cY+i,i%3===0?C.GREEN:C.DKFOR);}
      }
      // Bottom leaf tatter
      const bY_=Math.min(cY+16,61);
      for(let x=-6;x<7;x++){const px_=bx_+x;if(px_>=0&&px_<32&&(px_+bY_)%3!==0)p(px_,bY_,C.DKFOR);if(px_>=0&&px_<32&&(px_+bY_)%2===0&&bY_+1<63)p(px_,bY_+1,C.SHAD);}
    }

    // HAIR / HEAD WRAP — leafy crown
    if(dir===0){
      // Down facing — leaf/vine headwrap
      b(bx_-4,headY,8,2,C.DKFOR);b(bx_-5,headY+2,10,3,C.DKFOR);
      b(bx_-4,headY+1,8,1,C.FOREST);b(bx_-3,headY-1,6,1,C.MDGRN);b(bx_-2,headY-2,4,1,C.GREEN);
      p(bx_-1,headY-3,C.LTGRN);p(bx_,headY-3,C.GREEN);
      // Leaf crown accents
      p(bx_-3,headY-1,C.LTGRN);p(bx_+2,headY-1,C.LTGRN);
      // Face — tanned skin in shadow
      b(bx_-3,headY+2,6,3,C.PLBARK);b(bx_-4,headY+3,8,2,C.LTBARK);
      // Eyes — green druid eyes
      p(bx_-2,headY+3,natureWrath?C.LTAMB:C.GREEN);p(bx_-1,headY+3,C.LTGRN);
      p(bx_+1,headY+3,natureWrath?C.LTAMB:C.GREEN);p(bx_+2,headY+3,C.LTGRN);
      p(bx_-2,headY+4,C.DKFOR);p(bx_+2,headY+4,C.DKFOR);
      b(bx_-4,headY,8,1,C.GREEN);p(bx_-5,headY+2,C.MDGRN);
    } else if(dir===1){
      // Side profile
      b(bx_-3,headY,6,2,C.DKFOR);b(bx_-4,headY+2,8,3,C.DKFOR);
      b(bx_-3,headY+1,5,1,C.FOREST);b(bx_-2,headY-1,4,1,C.MDGRN);b(bx_-1,headY-2,3,1,C.GREEN);
      p(bx_,headY-3,C.LTGRN);
      b(bx_+4,headY+3,2,3,C.DKFOR);p(bx_+5,headY+2,C.DKFOR);
      b(bx_-3,headY+2,5,3,C.LTBARK);
      // One eye
      p(bx_+1,headY+3,natureWrath?C.LTAMB:C.GREEN);p(bx_+2,headY+3,C.LTGRN);
      p(bx_+1,headY+4,C.DKFOR);
      b(bx_-3,headY,6,1,C.GREEN);
    } else {
      // Up — back of head
      b(bx_-4,headY,8,5,C.DKFOR);b(bx_-3,headY,6,4,C.FOREST);
      b(bx_-3,headY-1,6,1,C.MDGRN);b(bx_-2,headY-2,4,1,C.GREEN);
      p(bx_-1,headY-3,C.LTGRN);p(bx_,headY-3,C.GREEN);
      b(bx_+4,headY+3,2,3,C.DKFOR);p(bx_+5,headY+2,C.DKFOR);
      b(bx_-4,headY,8,1,C.GREEN);
      // Back detail — braided vines
      p(bx_-1,headY+1,C.VINE);p(bx_,headY+2,C.VINE);p(bx_+1,headY+1,C.VINE);
    }

    // VINE SCARF
    if(dir!==2){
      const sY=torY-1;
      b(bx_-5,sY,3,1,C.VINE);b(bx_-5,sY+1,2,1,C.VINE);p(bx_-6,sY+1,C.LTVINE);
      const trail=4;
      for(let i=0;i<trail;i++){const tx=bx_-6-i,ty=sY+1+i;if(ty<63&&tx>=0)p(tx,ty,i<trail-1?C.VINE:C.DKVINE);if(i>0&&ty<63&&tx+1<32)p(tx+1,ty,C.DKFOR);}
    }

    // TORSO — bark/leather armor with vine wrapping
    b(bx_-3,torY,6,8,C.DKBARK);b(bx_-2,torY,4,8,C.BARK);
    if(dir===0){
      // Chest vine wrap
      p(bx_-2,torY+1,C.VINE);p(bx_-1,torY+2,C.VINE);p(bx_,torY+3,C.VINE);p(bx_+1,torY+2,C.VINE);p(bx_+2,torY+1,C.VINE);
    } else if(dir===1){
      p(bx_,torY+1,C.VINE);p(bx_+1,torY+2,C.VINE);p(bx_,torY+3,C.VINE);
    } else {
      p(bx_-1,torY+1,C.VINE);p(bx_,torY+2,C.VINE);p(bx_+1,torY+1,C.VINE);
    }
    // Belt — woven vine
    b(bx_-3,torY+7,6,1,C.DKVINE);b(bx_-2,torY+7,4,1,C.VINE);p(bx_,torY+7,C.AMBER);
    if(thornBurst){p(bx_-4,torY+1,C.LTGRN);p(bx_+4,torY+1,C.LTGRN);p(bx_-4,torY+6,C.GREEN);p(bx_+4,torY+6,C.GREEN);}

    // ARMS & STAFF
    if(atk){
      if(dir===0){
        // Staff slam down
        if(atkFrame===0){b(bx_+3,torY-2,2,3,C.BARK);for(let i=0;i<10;i++)p(bx_+5,torY-3-i,i===0?C.LTGRN:i<3?C.GREEN:C.BARK);b(bx_+4,torY,3,1,C.DKVINE);p(bx_+5,torY-12,C.LTAMB);p(bx_+5,torY-13,C.AMBER);}
        else{b(bx_+3,torY+2,2,3,C.BARK);for(let i=0;i<10;i++)p(bx_+5,torY+6+i,i===0?C.LTGRN:i<3?C.GREEN:C.BARK);b(bx_+4,torY+5,3,1,C.DKVINE);p(bx_+5,torY+16,C.LTAMB);for(let i=0;i<4;i++)p(bx_+4+i,torY+2+Math.floor(i*0.6),C.MDGRN);}
        b(bx_-5,torY+2,2,4,C.DKBARK);
      } else if(dir===1){
        if(atkFrame===0){b(bx_+3,torY-1,3,2,C.BARK);for(let i=0;i<10;i++)p(bx_+6,torY-2-i,i===0?C.LTGRN:i<3?C.GREEN:C.BARK);b(bx_+5,torY+1,3,1,C.DKVINE);p(bx_+6,torY-11,C.LTAMB);p(bx_+6,torY-12,C.AMBER);}
        else{b(bx_+3,torY+1,3,2,C.BARK);for(let i=0;i<10;i++){const x_=bx_+6+Math.floor(i*0.3),y_=torY+4+i;if(x_<32&&y_<63)p(x_,y_,i===0?C.LTGRN:i<3?C.GREEN:C.BARK);}b(bx_+5,torY+3,3,1,C.DKVINE);}
      } else {
        if(atkFrame===0){b(bx_+3,torY-2,2,3,C.BARK);for(let i=0;i<8;i++)p(bx_+5,torY-3-i,i===0?C.LTGRN:i<2?C.GREEN:C.BARK);b(bx_+4,torY,2,1,C.DKVINE);}
        else{b(bx_+3,torY+3,2,3,C.BARK);for(let i=0;i<8;i++)p(bx_+5,torY+7+i,i<2?C.GREEN:C.BARK);b(bx_+4,torY+6,2,1,C.DKVINE);}
      }
    } else {
      // Idle/walk — arms holding staff
      const aY=torY+1;
      if(dir===0){
        b(bx_-5,aY+armSwing,2,5,C.DKBARK);p(bx_-5,aY+armSwing,C.BARK);
        b(bx_+3,aY-armSwing,2,5,C.DKBARK);p(bx_+4,aY-armSwing,C.BARK);
        // Staff at side — wooden with living branch top
        for(let i=0;i<9;i++)p(bx_+5,aY-armSwing+i,i<2?C.GREEN:i<4?C.LTBARK:C.BARK);
        p(bx_+5,aY-armSwing-1,C.LTGRN);p(bx_+5,aY-armSwing-2,C.AMBER);p(bx_+6,aY-armSwing,C.LTGRN);
      } else if(dir===1){
        b(bx_+3,aY-armSwing,2,5,C.DKBARK);p(bx_+4,aY-armSwing,C.BARK);
        for(let i=0;i<9;i++)p(bx_+5,aY-armSwing+i,i<2?C.GREEN:i<4?C.LTBARK:C.BARK);
        p(bx_+5,aY-armSwing-1,C.LTGRN);p(bx_+5,aY-armSwing-2,C.AMBER);
      } else {
        b(bx_-5,aY+armSwing,2,5,C.DKBARK);p(bx_-5,aY+armSwing,C.BARK);
        b(bx_+3,aY-armSwing,2,5,C.DKBARK);p(bx_+4,aY-armSwing,C.BARK);
      }
    }

    // LEGS — bark/leather leggings
    const lh=10;
    b(bx_-2+lOff,legY,2,lh,C.DKBARK);p(bx_-1+lOff,legY,C.BARK);
    b(bx_+1+rOff,legY,2,lh,C.DKBARK);p(bx_+2+rOff,legY,C.BARK);
    // Knee vine wraps
    b(bx_-2+lOff,legY+Math.floor(lh*0.5),2,1,C.VINE);
    b(bx_+1+rOff,legY+Math.floor(lh*0.5),2,1,C.VINE);
    // Boots — root-woven
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-3+lOff,lfy,4,2,C.DKBARK);b(bx_-3+lOff,lfy,3,1,C.BARK);
    b(bx_+rOff,rfy,4,2,C.DKBARK);b(bx_+1+rOff,rfy,3,1,C.BARK);
    // Ground moss wisps
    if(lfy+2<63){p(bx_-3+lOff,lfy+2,C.DKMOSS);p(bx_+3+rOff,rfy+2,C.DKMOSS);}

    // Hurt flash — thorns
    if(hurt){p(bx_+4,headY+1,C.LTGRN);p(bx_+5,headY,C.AMBER);p(bx_+6,headY+1,C.LTGRN);p(bx_+5,headY+2,C.AMBER);}

    // Root cast ground lines
    if(rootCast)for(let y=headY-2;y<legY+8;y+=3){p(bx_-7,y,C.BARK);p(bx_+7,y+1,C.BARK);}

    // Thornburst ground marker
    if(thornBurst){b(bx_-6,55,14,2,C.GREEN);b(bx_-5,54,12,1,C.MDGRN);b(bx_-4,57,10,1,C.DKFOR);}
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities — rootEntangle1,rootEntangle2,thornBurst1,thornBurst2,wildShift1,wildShift2,natureWrath1,natureWrath2
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
  // Abilities
  frames.push([
    {dir:0,opts:{rootCast:true,lOff:-1,rOff:-1}},
    {dir:0,opts:{rootCast:true,lOff:1,rOff:1,armSwing:1}},
    {dir:0,opts:{thornBurst:true,atk:true,atkFrame:0,lOff:1}},
    {dir:0,opts:{thornBurst:true,atk:true,atkFrame:1,lOff:2,rOff:-1}},
    {dir:1,opts:{wildShift:true,lOff:2,rOff:1}},
    {dir:1,opts:{wildShift:true,lOff:3,rOff:2}},
    {dir:0,opts:{natureWrath:true}},
    {dir:0,opts:{natureWrath:true,lOff:1,rOff:-1,armSwing:1}},
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
        // Crumble to leaves — body falling apart
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Collapsed body
        b(6,30,5,4,C.DKBARK);b(7,31,3,2,C.BARK);b(6,30,5,1,C.LTBARK);p(8,32,C.GREEN);p(9,32,C.MDGRN);
        b(10,32,10,4,C.DKBARK);b(11,32,8,3,C.BARK);
        // Fallen staff
        b(20,34,6,2,C.BARK);b(22,36,4,2,C.BARK);b(24,29,1,6,C.LTBARK);p(24,28,C.GREEN);p(24,27,C.LTGRN);
        // Scattered leaves
        b(8,36,14,3,C.DKFOR);b(7,37,16,2,C.DKMOSS);
        for(let x=6;x<24;x++){if(x%3!==0)p(x,39,C.DKMOSS);if(x%4===0)p(x,40,C.SHAD);}
        // Leaf scatter pattern
        [[8,26,C.GREEN],[14,24,C.LTGRN],[20,27,C.MDGRN],[11,22,C.GREEN],[17,25,C.VINE]].forEach(([x,y,cl])=>p(x,y,cl));
        // Vine scarf on ground
        b(4,33,3,2,C.VINE);b(3,34,2,1,C.DKVINE);p(2,35,C.DKFOR);
      } else if(frame.opts.custom==='death2'){
        // Full leaf dissolution
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Ground remnants
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.DKMOSS);if(x%3===0)p(x,41,C.DKFOR);}
        // Staff remnant
        p(22,36,C.LTBARK);p(22,35,C.GREEN);p(22,41,C.BARK);
        // Amber glow remnant
        p(7,40,C.AMBER);p(8,41,C.DKAMB);p(6,41,C.DKFOR);
        // Floating leaves dissolving upward
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.LTGRN:i%4===0?C.GREEN:i%3===0?C.MDGRN:i%2===0?C.DKFOR:C.SHAD);
        });
        p(14,42,C.GREEN);p(15,42,C.DKFOR);
      } else if(frame.opts.custom==='portrait'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Background
        b(2,2,28,60,C.VOID);b(3,3,26,58,C.SHAD);
        // Head — leaf crown
        b(6,6,20,8,C.DKFOR);b(7,7,18,6,C.FOREST);b(6,6,20,2,C.GREEN);b(7,5,18,2,C.MDGRN);b(8,4,16,2,C.GREEN);b(10,3,12,1,C.LTGRN);
        // Crown leaves
        p(26,8,C.DKFOR);p(27,9,C.SHAD);p(28,10,C.SHAD);p(27,10,C.DKFOR);
        // Face
        b(8,10,16,10,C.LTBARK);b(9,11,14,8,C.PLBARK);
        // Eyes — deep green druid eyes
        b(9,14,5,3,C.DKFOR);b(10,14,3,2,C.GREEN);b(11,14,1,2,C.LTGRN);p(11,14,C.WHITE);
        b(18,14,5,3,C.DKFOR);b(19,14,3,2,C.GREEN);b(20,14,1,2,C.LTGRN);p(20,14,C.WHITE);
        p(8,16,C.DKFOR);p(7,17,C.FOREST);p(23,16,C.DKFOR);p(24,17,C.FOREST);
        // Mouth
        b(12,19,8,1,C.DKBARK);
        // Vine scarf
        b(7,21,18,6,C.VINE);b(8,22,16,4,C.LTVINE);b(9,23,14,2,C.LTGRN);
        b(10,22,2,4,C.VINE);b(18,22,2,4,C.VINE);b(14,22,1,4,C.VINE);
        // Shoulders — bark armor
        b(4,20,4,6,C.DKBARK);b(5,20,2,5,C.BARK);b(24,20,4,6,C.DKBARK);b(25,20,2,5,C.BARK);
        // Torso
        b(8,27,16,14,C.DKBARK);b(9,27,14,12,C.BARK);
        // Vine wrap pattern
        p(10,29,C.VINE);p(12,30,C.VINE);p(14,31,C.VINE);p(16,30,C.VINE);p(18,29,C.VINE);
        // Staff
        b(24,28,2,10,C.LTBARK);p(25,27,C.GREEN);p(24,26,C.LTGRN);p(25,25,C.AMBER);
        // Border
        b(2,2,28,1,C.GREEN);b(2,61,28,1,C.GREEN);b(2,2,1,60,C.GREEN);b(29,2,1,60,C.GREEN);
        p(3,3,C.AMBER);p(28,3,C.AMBER);p(3,60,C.AMBER);p(28,60,C.AMBER);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Bramble','Root','Grove Viper','Blossom','Spore','Sunroot','Vine','Elder Treant','Razor Bramble'];
const T_STATES=['Idle','Charge','Fire','Cooldown'];
// Generate row labels: "Lv1 Idle", "Lv1 Charge", ..., "Lv6 Cooldown"
const T_ROW_LABELS:string[]=[];
for(let lv=1;lv<=T_MAX_LV;lv++)for(const st of T_STATES)T_ROW_LABELS.push(`Lv${lv} ${st}`);
const P_NAMES=['Thorn','Root','Blossom','Spore','Vine','Elder'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Root 1','Root 2','Thorn 1','Thorn 2','Wild 1','Wild 2','Wrath 1','Wrath 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=9*T_CELL;tc.height=T_ROWS*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+9*T_CELL*tS;tpv.height=T_ROWS*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a1108';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<T_ROWS;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#33aa44';tpc.font='bold 9px monospace';tpc.fillText(T_ROW_LABELS[r],3,by+T_CELL*tS/2+3);
      // Separator line between level groups
      if(r>0&&r%4===0){tpc.fillStyle='#33aa44';tpc.fillRect(tLW,by-2,9*T_CELL*tS,1);}
      for(let cc=0;cc<9;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a2a1a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#88aa77';tpc.font='9px monospace';const lvInfo=`${T_NAMES[cc]} (${T_LEVELS[cc]}lv)`;tpc.fillText(lvInfo,bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=9*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+9*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#0a1108';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#33aa44';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<9;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a2a1a';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#88aa77';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#0a1108';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#33aa44';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a2a1a';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#88aa77';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:React.RefObject<HTMLCanvasElement>,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current!.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'nature_towers_animated.png',
      info:{sz:'576×1536',cell:'64×64',loader:"this.load.spritesheet('nature_towers','nature_towers_animated.png',{frameWidth:64,frameHeight:64})",note:`9 cols (towers) × ${T_ROWS} rows (${T_MAX_LV} levels × 4 states). Levels: ${T_NAMES.map((n,i)=>`${n}=${T_LEVELS[i]}`).join(', ')}`}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'nature_projectiles_animated.png',
      info:{sz:'288×192',cell:'32×32',loader:"this.load.spritesheet('nature_proj','nature_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'9 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Druid',ref:hRef,pvRef:hPv,dl:'druid_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('druid','druid_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#0a1108',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.GREEN,margin:0,fontSize:15}}>NATURE FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.GREEN,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#1a4422':'#111',color:tab===t.id?C.GREEN:'#558855',border:`1px solid ${tab===t.id?'#33aa44':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {['preview','actual'].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a2a1a':'#111',color:view===v?C.AMBER:'#445544',border:`1px solid ${view===v?'#334':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Nature ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref} data-label={`Nature ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?9*P_CELL*3:9*T_CELL*2,border:'1px solid #1a2a1a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#558855',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#88bb66'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#88bb66'}}>Phaser:</b> <code style={{color:C.AMBER}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#88bb66'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
