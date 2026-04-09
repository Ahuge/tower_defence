import { useRef, useEffect, useState } from "react";

// ===== PALETTE =====
const C={
  DVIO:'#220044',DKVIO:'#331166',MDVIO:'#442288',BRVIO:'#6644ff',LTVIO:'#9988ff',PLVIO:'#bbaaff',
  LAV:'#cc88ff',LTLAV:'#dd99ff',PLLAV:'#eeccff',
  DKBLU:'#223388',MDBLU:'#4466cc',LTBLU:'#88aaff',PLBLU:'#bbddff',
  ICE:'#aaddff',DKICE:'#6699cc',LTICE:'#cceeFF',WHITE:'#ffffff',
  YEL:'#ffdd44',LTYEL:'#ffee88',PLYEL:'#ffffcc',DKYEL:'#ccaa22',
  RED:'#ff4422',DKRED:'#cc2211',LTRED:'#ff7744',ORG:'#ff8833',LTORG:'#ffaa55',
  GOLD:'#ffcc00',DKGLD:'#aa8800',LTGLD:'#ffee88',
  VOID:'#0a0016',SHAD:'#110022',DKPUR:'#1a0033',
  CYAN:'#00ffcc',DKCYN:'#009977',LTCYN:'#66ffe6',
  GRAY:'#665577',DKGRAY:'#332244',
  PINK:'#ff66aa',
};

// ===== DRAWING HELPERS =====
const mk=(c:CanvasRenderingContext2D,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

// Shared arcane crystal base — layered crystal pedestal with glowing runes
function arcaneBase(p:(x:number,y:number,cl:string)=>void,b:(x:number,y:number,w:number,h:number,cl:string)=>void,topY:number,w:number,glow:number){
  const cx=16;
  // Crystal pedestal layers
  for(let i=0;i<8;i++){
    const cw=w-4+Math.floor(i*0.6),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.MDVIO:i<4?C.DKVIO:i<6?C.DVIO:C.SHAD);
  }
  // Top highlight
  b(cx-Math.floor((w-4)/2),topY,w-4,1,glow>1?C.LTVIO:C.BRVIO);
  // Crystal facets on pedestal
  p(cx-4,topY+1,glow>0?C.LTVIO:C.MDVIO);p(cx+3,topY+1,glow>0?C.LTVIO:C.MDVIO);
  p(cx-3,topY+3,C.DKVIO);p(cx+2,topY+3,C.DKVIO);
  // Rune marks on base
  p(cx-5,topY+5,glow>1?C.LAV:C.BRVIO);p(cx+4,topY+5,glow>1?C.LAV:C.BRVIO);
  p(cx-3,topY+6,glow>0?C.LTVIO:C.MDVIO);p(cx+2,topY+6,glow>0?C.LTVIO:C.MDVIO);
  // Bottom shadow
  b(cx-Math.floor(w/2),topY+7,w,1,C.VOID);
  // Floating rune particles
  if(glow>0){
    p(cx-6,topY+3,C.LAV);p(cx+5,topY+2,C.LAV);
  }
  if(glow>1){
    p(cx-7,topY+1,C.PLLAV);p(cx+6,topY+1,C.PLLAV);
  }
}

// Energy tendril connecting base to floating element
function arcaneTendril(p:(x:number,y:number,cl:string)=>void,x1:number,y1:number,x2:number,y2:number,col:string,bright:boolean){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*3)*1.2);
    p(xx,yy,bright&&i%2===0?C.PLLAV:col);
  }
}

// Crystal spire helper
function crystalSpire(p:(x:number,y:number,cl:string)=>void,b:(x:number,y:number,w:number,h:number,cl:string)=>void,x:number,y:number,h:number,w:number,c1:string,c2:string,ct:string){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.85)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// Floating orbiting crystal mark (signature above each tower)
function arcaneOrbit(p:(x:number,y:number,cl:string)=>void,cx:number,cy:number,phase:number,col:string){
  const ox=cx+Math.round(Math.cos(phase)*3);
  const oy=cy+Math.round(Math.sin(phase)*1.5);
  p(ox,oy,col);
  p(ox,oy-1,C.PLLAV);
}

// ===== TOWER LEVEL COUNTS =====
// Bolt:4, Frost:3, Storm:5, Focus:4, ManaDrain:4, Meteor:3, ArcaneNova:1
const T_LEVELS=[4,3,5,4,4,3,1];
const T_MAX_LVL=5; // max across all towers — sheet has this many level-groups
const T_ROWS_PER_LVL=4; // idle/charge/fire/cooldown per level
const T_TOTAL_ROWS=T_MAX_LVL*T_ROWS_PER_LVL; // 20

// ===== TOWERS (7 cols × 20 rows at 64×64) =====
// Layout: for each upgrade level (1-5), 4 animation rows (idle/charge/fire/cooldown).
// Towers with fewer levels repeat their max level for remaining rows.

// --- Per-tower draw functions accepting (ctx, offset, animState 0-3, level 1-5) ---

function drawBolt(c:CanvasRenderingContext2D,o:number[],s:number,level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  // Bolt colors: blue-white electric palette
  const BOLT_DK='#2255aa',BOLT_MD='#4488ff',BOLT_LT='#88bbff',BOLT_PL='#ccddff',BOLT_BR='#aaccff';
  const glow=level>=3?2:level>=2?1:0;
  arcaneBase(p,b,23,18,glow);
  const cy=12-Math.min(level,4);
  // Crystal body - diamond shape, grows with level
  const cSize=4+level;
  for(let i=0;i<cSize;i++){const hw=i<Math.ceil(cSize/2)?i+1:cSize-i;b(16-hw,cy-Math.floor(cSize/2)+i,hw*2,1,i<2?BOLT_PL:i<Math.ceil(cSize*0.6)?BOLT_LT:BOLT_MD);}
  // Inner glow — brighter at higher levels
  const coreCol=level>=4?C.WHITE:level>=3?BOLT_PL:level>=2?BOLT_LT:BOLT_MD;
  b(15,cy-1,2,2,coreCol);
  p(16,cy,level>=3?C.WHITE:BOLT_LT);
  // Tendrils — more complex at higher levels
  const tCol=level>=3?BOLT_LT:BOLT_MD;
  arcaneTendril(p,14,cy+3,13,23,tCol,level>=4);
  arcaneTendril(p,18,cy+3,19,23,tCol,level>=4);
  if(level>=3){arcaneTendril(p,12,cy+4,10,23,BOLT_DK,level>=4);arcaneTendril(p,20,cy+4,22,23,BOLT_DK,level>=4);}
  // Orbiting crystals — more at higher levels
  arcaneOrbit(p,16,cy-5,s*1.5,BOLT_BR);
  if(level>=2){arcaneOrbit(p,12,cy-3,s*1.5+2,BOLT_PL);}
  if(level>=3){arcaneOrbit(p,20,cy-3,s*1.5+4,BOLT_LT);}
  if(level>=4){arcaneOrbit(p,16,cy-7,s*1.0+1,C.WHITE);}
  // Pulse particles — more with level
  if(level>=2){p(10,cy-1,BOLT_BR);p(22,cy,BOLT_BR);}
  if(level>=3){p(8,cy+1,BOLT_PL);p(24,cy-1,BOLT_PL);}
  if(level>=4){
    for(let i=0;i<6;i++){const a=i*Math.PI/3;p(16+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*5),BOLT_PL);}
    p(16,cy-5,C.WHITE);p(16,cy+5,C.WHITE);
  }
  // Glow aura at high levels
  if(level>=3){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;const r=level>=4?8:6;p(16+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*(r-1)),level>=4?BOLT_LT:BOLT_DK);}
  }
  // Base runes brighter at higher levels
  if(level>=2){p(10,22,BOLT_MD);p(22,22,BOLT_MD);}
  if(level>=3){p(8,21,BOLT_BR);p(24,21,BOLT_BR);}
  if(s===3){p(15,cy,BOLT_DK);p(17,cy,BOLT_DK);}
}

function drawFrost(c:CanvasRenderingContext2D,o:number[],s:number,level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  const glow=level>=3?2:level>=2?1:0;
  arcaneBase(p,b,23,20,glow);
  const cy=11-Math.min(level,3);
  // Main ice crystal — taller/wider at higher levels
  const mainH=10+level*1,mainW=3+Math.min(level,3);
  crystalSpire(p,b,14,cy-Math.floor(mainH/3),mainH,mainW,C.DKICE,level>=3?C.LTICE:C.ICE,level>=3?C.WHITE:C.LTICE);
  // Side ice shards — appear at level 2+, grow
  if(level>=2){
    const sH=6+level,sW=2+Math.min(level-1,2);
    crystalSpire(p,b,9,cy-1,sH,sW,C.DKICE,level>=3?C.ICE:C.DKICE,level>=3?C.LTICE:C.ICE);
    crystalSpire(p,b,21,cy-2,sH+1,sW,C.DKICE,level>=3?C.ICE:C.DKICE,level>=3?C.LTICE:C.ICE);
  }
  // Extra crystal formations at level 3
  if(level>=3){
    crystalSpire(p,b,6,cy+2,5,2,C.DKICE,C.ICE,C.LTICE);
    crystalSpire(p,b,24,cy+1,6,2,C.DKICE,C.ICE,C.LTICE);
  }
  // Cold mist
  if(level>=2){for(let i=0;i<5;i++){p(8+i*3,cy+10,C.DKICE);p(9+i*3,cy+11,C.PLBLU);}}
  if(level>=3){for(let i=0;i<7;i++){p(6+i*3,cy+12,C.PLBLU);}}
  // Frost particles
  p(12,cy-2,level>=3?C.WHITE:C.LTICE);p(20,cy-1,level>=3?C.WHITE:C.LTICE);
  if(level>=3){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;p(16+Math.round(Math.cos(a)*6),cy+3+Math.round(Math.sin(a)*5),i%2?C.WHITE:C.LTICE);}
    b(14,cy-5,4,1,C.WHITE);
  }
  // Tendrils
  arcaneTendril(p,14,cy+8,13,23,C.DKICE,level>=3);
  arcaneTendril(p,18,cy+8,19,23,C.DKICE,level>=3);
  // Orbiting crystal
  arcaneOrbit(p,16,cy-6,s*1.2,C.LTICE);
  if(level>=2){arcaneOrbit(p,12,cy-4,s*1.2+2,C.ICE);}
  if(level>=3){arcaneOrbit(p,20,cy-4,s*1.2+4,C.WHITE);}
  if(s===3){p(15,cy,C.DKICE);p(16,cy+1,C.DKICE);}
}

function drawStorm(c:CanvasRenderingContext2D,o:number[],s:number,level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  const glow=level>=4?2:level>=2?1:0;
  arcaneBase(p,b,23,20,glow);
  const cy=12-Math.min(level,5);
  // Crackling orb — grows with level
  const orbR=3+Math.min(level,4);
  for(let r=orbR;r>0;r--)for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    p(16+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>orbR-1?C.DKYEL:r>orbR*0.5?C.YEL:r>1?C.LTYEL:C.WHITE);
  }
  b(15,cy-1,2,2,level>=4?C.WHITE:C.LTYEL);
  p(16,cy,C.WHITE);
  // Sparks — more at higher levels
  const sparkCount=2+level*2;
  for(let i=0;i<sparkCount;i++){
    const a=i*Math.PI*2/sparkCount,r=orbR+2+Math.floor(i%3);
    p(16+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.WHITE:i%2?C.LTYEL:C.YEL);
  }
  // Jagged lightning lines — more at higher levels
  if(level>=2){
    p(13,cy-3,C.YEL);p(12,cy-4,C.LTYEL);p(14,cy-5,C.YEL);
    p(19,cy-2,C.YEL);p(20,cy-3,C.LTYEL);p(18,cy-4,C.YEL);
  }
  if(level>=3){
    p(10,cy-1,C.LTYEL);p(22,cy,C.LTYEL);p(8,cy+2,C.YEL);p(24,cy+1,C.YEL);
  }
  if(level>=4){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;p(16+Math.round(Math.cos(a)*8),cy+Math.round(Math.sin(a)*7),i%2?C.LTYEL:C.WHITE);}
  }
  if(level>=5){
    // Particle storm — intense discharge
    for(let i=0;i<16;i++){const a=i*Math.PI/8;
      p(16+Math.round(Math.cos(a)*10),cy+Math.round(Math.sin(a)*8),i%3===0?C.WHITE:i%2?C.LTYEL:C.YEL);
    }
    p(16,cy-8,C.WHITE);p(16,cy+8,C.WHITE);p(8,cy,C.WHITE);p(24,cy,C.WHITE);
  }
  // Tendrils
  arcaneTendril(p,14,cy+4,13,23,level>=3?C.YEL:C.DKYEL,level>=4);
  arcaneTendril(p,18,cy+4,19,23,level>=3?C.YEL:C.DKYEL,level>=4);
  if(level>=4){arcaneTendril(p,12,cy+5,10,23,C.DKYEL,level>=5);arcaneTendril(p,20,cy+5,22,23,C.DKYEL,level>=5);}
  // Orbiting crystals
  arcaneOrbit(p,16,cy-7,s*1.8,C.LTYEL);
  if(level>=2){arcaneOrbit(p,12,cy-5,s*1.8+2,C.YEL);}
  if(level>=3){arcaneOrbit(p,20,cy-5,s*1.8+4,C.LTYEL);}
  if(level>=4){arcaneOrbit(p,16,cy-9,s*1.0+1,C.WHITE);}
  if(level>=5){arcaneOrbit(p,10,cy-3,s*2.0+3,C.PLYEL);arcaneOrbit(p,22,cy-3,s*2.0+5,C.PLYEL);}
  if(s===3){b(14,cy-1,4,3,C.DKYEL);p(16,cy,C.YEL);}
}

function drawFocus(c:CanvasRenderingContext2D,o:number[],s:number,level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  // Focus colors: gray/silver precision palette
  const F_DK='#555566',F_MD='#888899',F_LT='#aaaacc',F_PL='#ccccdd',F_BR='#ddddee',F_ACC='#bbbbdd';
  const glow=level>=3?2:level>=2?1:0;
  arcaneBase(p,b,24,18,glow);
  const topY=5-Math.min(level,4);
  // Main crystal lens — taller at higher levels, angular gray
  const lensH=16+level*1,lensW=1+Math.min(level,3);
  crystalSpire(p,b,16-Math.floor(lensW/2),topY,lensH,lensW,F_DK,level>=3?F_LT:F_MD,level>=3?F_PL:F_LT);
  // Lens facets — wider at higher levels
  const facetW=4+level;
  b(16-Math.floor(facetW/2),topY+8,facetW,3,F_MD);
  b(16-Math.floor((facetW-2)/2),topY+9,facetW-2,1,level>=3?F_PL:level>=2?F_LT:F_MD);
  // Lens center glow — bright white crosshair dot
  p(16,topY+9,level>=3?C.WHITE:level>=2?F_PL:F_LT);
  p(15,topY+9,level>=3?F_PL:F_LT);
  // Side facet lines — angular precision marks
  p(12,topY+7,F_MD);p(19,topY+7,F_MD);
  p(12,topY+10,F_DK);p(19,topY+10,F_DK);
  // Crosshair marks on lens
  p(16,topY+7,level>=3?C.WHITE:F_BR);p(16,topY+11,level>=3?C.WHITE:F_BR);
  p(14,topY+9,level>=2?F_BR:F_LT);p(18,topY+9,level>=2?F_BR:F_LT);
  // Side secondary crystals at level 3+
  if(level>=3){
    crystalSpire(p,b,9,topY+4,8,2,F_DK,F_MD,F_LT);
    crystalSpire(p,b,22,topY+3,9,2,F_DK,F_MD,F_LT);
  }
  if(level>=4){
    crystalSpire(p,b,6,topY+7,6,2,F_DK,F_DK,F_MD);
    crystalSpire(p,b,25,topY+6,7,2,F_DK,F_DK,F_MD);
  }
  // Focus beam indicator — thin precise silver beam
  if(level>=2){p(16,topY-1,F_PL);p(16,topY-2,F_ACC);}
  if(level>=3){
    for(let i=0;i<4;i++)p(16,topY-1-i,i===0?C.WHITE:F_PL);
    p(15,topY-2,F_ACC);p(17,topY-2,F_ACC);
  }
  if(level>=4){
    for(let i=0;i<6;i++)p(16,topY-1-i,i<2?C.WHITE:i<4?F_PL:F_ACC);
    p(14,topY-3,F_LT);p(18,topY-3,F_LT);
  }
  // Tendrils
  arcaneTendril(p,15,topY+16,14,24,level>=3?F_LT:F_MD,level>=4);
  arcaneTendril(p,17,topY+16,18,24,level>=3?F_LT:F_MD,level>=4);
  if(level>=3){arcaneTendril(p,13,topY+14,11,24,F_DK,level>=4);}
  // Orbiting crystals
  arcaneOrbit(p,16,topY-3,s*1.0,F_ACC);
  if(level>=2){arcaneOrbit(p,12,topY,s*1.0+2,F_LT);}
  if(level>=3){arcaneOrbit(p,20,topY,s*1.0+4,F_PL);}
  if(level>=4){arcaneOrbit(p,16,topY-5,s*0.8+1,C.WHITE);}
  if(s===3){p(16,topY+9,F_DK);}
}

function drawManaDrain(c:CanvasRenderingContext2D,o:number[],s:number,level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  const glow=level>=3?2:level>=2?1:0;
  arcaneBase(p,b,23,20,glow);
  const cy=12-Math.min(level,4);
  // Dark crystal — grows with level
  const cSize=6+level;
  for(let i=0;i<cSize;i++){const hw=i<Math.floor(cSize/2)?i+1:cSize-i;b(16-hw,cy-Math.floor(cSize/2)+i,hw*2,1,C.BRVIO);}
  for(let i=1;i<cSize-1;i++){const hw=i<Math.floor(cSize/2)?i:cSize-1-i;b(16-hw+1,cy-Math.floor(cSize/2)+i,Math.max(1,hw*2-2),1,C.DVIO);}
  // Void core
  b(15,cy-1,2,2,C.VOID);p(16,cy,C.SHAD);
  // Inward-pulling vortex spirals instead of zig-zag tendrils
  const spiralArms=2+Math.min(level,3);
  const spiralR=5+level;
  for(let arm=0;arm<spiralArms;arm++){
    const baseA=arm*Math.PI*2/spiralArms;
    for(let t=0;t<spiralR;t++){
      const pr=1-t/spiralR; // 1 at outer edge, 0 at center
      const angle=baseA+pr*Math.PI*1.5; // spiral inward ~1.5 turns
      const r=pr*(spiralR+1);
      const sx=16+Math.round(Math.cos(angle)*r);
      const sy=cy+Math.round(Math.sin(angle)*(r*0.85));
      p(sx,sy,t<2?C.DKVIO:t<spiralR-2?C.MDVIO:C.LTVIO);
    }
  }
  // Dark void particles being sucked inward
  const particleCount=4+level*2;
  for(let i=0;i<particleCount;i++){
    const a=i*Math.PI*2/particleCount,r=4+level+(i%3);
    const px=16+Math.round(Math.cos(a)*r),py=cy+Math.round(Math.sin(a)*(r-1));
    p(px,py,i%3===0?C.DKPUR:i%2?C.DVIO:C.SHAD);
  }
  // Outer drain wisps — curved, not zig-zag
  if(level>=2){
    for(let i=0;i<6;i++){const a=i*Math.PI/3,r=spiralR+2+i%2;
      p(16+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*(r-1)),C.DKVIO);
    }
  }
  if(level>=3){
    for(let i=0;i<8;i++){const a=i*Math.PI/4,r=spiralR+3;
      p(16+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*(r-1)),C.MDVIO);
    }
  }
  if(level>=4){
    // Implosion ring
    for(let i=0;i<12;i++){const a=i*Math.PI/6;
      p(16+Math.round(Math.cos(a)*9),cy+Math.round(Math.sin(a)*8),C.DKVIO);
      p(16+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*6),C.MDVIO);
    }
  }
  // Base connection — straight vertical drain lines (not zig-zag tendrils)
  for(let y=cy+Math.floor(cSize/2)+1;y<=23;y++){
    const pr=(y-(cy+Math.floor(cSize/2)+1))/(23-(cy+Math.floor(cSize/2)+1));
    p(14+Math.round(Math.sin(pr*Math.PI*2)*1),y,C.DKVIO);
    p(18-Math.round(Math.sin(pr*Math.PI*2)*1),y,C.DKVIO);
  }
  if(level>=3){for(let y=cy+Math.floor(cSize/2)+2;y<=23;y++){p(16,y,C.DVIO);}}
  // Orbiting crystals
  arcaneOrbit(p,16,cy-6,s*1.3,C.DVIO);
  if(level>=2){arcaneOrbit(p,12,cy-4,s*1.3+2,C.MDVIO);}
  if(level>=3){arcaneOrbit(p,20,cy-4,s*1.3+4,C.BRVIO);}
  if(level>=4){arcaneOrbit(p,16,cy-8,s*1.0+1,C.LTVIO);}
  if(s===3){p(15,cy-1,C.DVIO);p(16,cy,C.DVIO);}
}

function drawMeteor(c:CanvasRenderingContext2D,o:number[],s:number,level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  const glow=level>=3?2:level>=2?1:0;
  arcaneBase(p,b,24,20,glow);
  const cy=11-Math.min(level,3);
  // Burning crystal — grows with level
  const cSize=8+level*1;
  for(let i=0;i<cSize;i++){const hw=i<Math.floor(cSize/2)?i+1:cSize-i;b(16-hw,cy-Math.floor(cSize/2)+i,hw*2,1,i<Math.floor(cSize*0.3)?C.LTRED:i<Math.floor(cSize*0.6)?C.RED:i<Math.floor(cSize*0.8)?C.DKRED:C.DVIO);}
  // Inner fire
  const iSize=cSize-2;
  for(let i=1;i<iSize;i++){const hw=i<Math.floor(iSize/2)?i:iSize-i;b(16-hw+1,cy-Math.floor(cSize/2)+1+i,Math.max(1,hw*2-2),1,i<Math.floor(iSize*0.3)?C.LTORG:i<Math.floor(iSize*0.6)?C.ORG:C.RED);}
  // Hot core
  b(15,cy-1,2,2,level>=3?C.WHITE:level>=2?C.LTYEL:C.ORG);
  p(16,cy,level>=3?C.WHITE:C.LTYEL);
  // Falling star trail
  if(level>=2){
    p(16,cy-Math.floor(cSize/2)-1,C.LTORG);p(15,cy-Math.floor(cSize/2)-2,C.ORG);p(17,cy-Math.floor(cSize/2)-2,C.ORG);
    p(16,cy-Math.floor(cSize/2)-3,C.RED);
  }
  if(level>=3){
    // Fire burst
    for(let i=0;i<10;i++){const a=i*Math.PI/5;
      p(16+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*6),i%2?C.LTRED:C.ORG);
      p(16+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*4),C.LTYEL);
    }
    p(16,cy-Math.floor(cSize/2)-2,C.WHITE);
  }
  // Ember particles
  p(10,cy-3,level>=2?C.ORG:C.RED);p(22,cy-2,level>=2?C.ORG:C.RED);
  p(8,cy+2,C.DKRED);p(24,cy+1,C.DKRED);
  if(level>=2){p(6,cy,C.RED);p(26,cy-1,C.RED);}
  // Tendrils
  arcaneTendril(p,14,cy+5,13,24,level>=2?C.RED:C.DKRED,level>=3);
  arcaneTendril(p,18,cy+5,19,24,level>=2?C.RED:C.DKRED,level>=3);
  if(level>=3){arcaneTendril(p,12,cy+6,10,24,C.DKRED,true);}
  // Orbiting crystals
  arcaneOrbit(p,16,cy-Math.floor(cSize/2)-2,s*1.6,C.LTORG);
  if(level>=2){arcaneOrbit(p,12,cy-Math.floor(cSize/3),s*1.6+2,C.ORG);}
  if(level>=3){arcaneOrbit(p,20,cy-Math.floor(cSize/3),s*1.6+4,C.LTYEL);}
  if(s===3){b(14,cy-2,4,4,C.DKRED);p(16,cy,C.RED);}
}

function drawArcaneNova(c:CanvasRenderingContext2D,o:number[],s:number,_level:number){
  const{p,b}=mk(c,o,T_G,T_G,T_PX);
  // Ultimate — always max visuals (single level)
  arcaneBase(p,b,24,24,2);
  const cy=7;
  // Central massive crystal
  for(let i=0;i<12;i++){const hw=i<6?i+2:14-i;b(16-hw,cy-6+i,hw*2,1,i<3?C.PLLAV:i<6?C.LTVIO:i<9?C.BRVIO:C.MDVIO);}
  // Inner rainbow core
  for(let i=2;i<10;i++){const hw=i<5?i-1:10-i;if(hw>0)b(16-hw+1,cy-4+i,Math.max(1,hw*2-2),1,
    i<4?C.LTICE:i<6?C.LTYEL:i<8?C.LTRED:C.LAV);}
  // Bright core
  b(15,cy-1,2,3,C.WHITE);
  p(16,cy,C.WHITE);
  // Side crystal formations
  crystalSpire(p,b,7,cy-2,10,3,C.DKICE,C.ICE,C.LTICE);
  crystalSpire(p,b,23,cy-1,9,3,C.DKRED,C.RED,C.LTRED);
  crystalSpire(p,b,5,cy+2,7,2,C.DKYEL,C.YEL,C.LTYEL);
  crystalSpire(p,b,25,cy+1,8,2,C.DKVIO,C.BRVIO,C.LTVIO);
  // Multi-color glow particles
  const colors=[C.LAV,C.LTICE,C.LTYEL,C.LTRED,C.LTVIO,C.PLLAV,C.PLBLU,C.PLYEL];
  // Rainbow nova ring
  for(let i=0;i<16;i++){const a=i*Math.PI/8;
    p(16+Math.round(Math.cos(a)*10),cy+Math.round(Math.sin(a)*8),colors[i%8]);
    p(16+Math.round(Math.cos(a)*8),cy+Math.round(Math.sin(a)*6),C.WHITE);
  }
  b(14,cy-7,4,1,C.WHITE);b(13,cy-8,6,1,C.PLLAV);
  // Multiple tendrils
  arcaneTendril(p,13,cy+6,11,24,C.LTVIO,true);
  arcaneTendril(p,16,cy+6,16,24,C.LAV,true);
  arcaneTendril(p,19,cy+6,21,24,C.LTVIO,true);
  // Multiple orbiting crystals
  arcaneOrbit(p,16,cy-8,s*1.0,C.LTICE);
  arcaneOrbit(p,12,cy-6,s*1.5+2,C.LTYEL);
  arcaneOrbit(p,20,cy-6,s*1.5+4,C.LTRED);
  if(s===3){
    b(13,cy-3,6,6,C.MDVIO);b(14,cy-2,4,4,C.DKVIO);p(16,cy,C.BRVIO);
  }
}

function drawTowers(ctx:CanvasRenderingContext2D){
  const towerFns=[drawBolt,drawFrost,drawStorm,drawFocus,drawManaDrain,drawMeteor,drawArcaneNova];
  const cols=7,rows=T_TOTAL_ROWS;
  for(let col=0;col<cols;col++){
    const maxLvl=T_LEVELS[col];
    for(let lvl=1;lvl<=T_MAX_LVL;lvl++){
      const effectiveLvl=Math.min(lvl,maxLvl);
      for(let anim=0;anim<T_ROWS_PER_LVL;anim++){
        const row=(lvl-1)*T_ROWS_PER_LVL+anim;
        towerFns[col](ctx,[col*T_CELL,row*T_CELL],anim,effectiveLvl);
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (7×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:CanvasRenderingContext2D){
  const fns=[
    // Bolt — purple energy ball → purple burst
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[3,3,4][f],bob=[0,-1,1][f];
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r){
          const d=Math.sqrt(x*x+y*y);p(cx+x,cy+y+bob,d<1?C.WHITE:d<r*0.5?C.PLLAV:d<r*0.8?C.LTVIO:C.BRVIO);
        }
        p(cx-r-1,cy+bob,C.MDVIO);p(cx+r+1,cy+bob,C.MDVIO);
        // Trail
        if(f>0){p(cx-3-f,cy+bob+1,C.MDVIO);p(cx-4-f,cy+bob,C.BRVIO);}
      }else if(f===3){
        // Impact 1 — burst outward
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.LTVIO:C.BRVIO);}
        b(cx-2,cy-2,4,4,C.LTVIO);b(cx-1,cy-1,2,2,C.PLLAV);p(cx,cy,C.WHITE);
      }else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=4+i%2;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.PLLAV:C.MDVIO);}
        p(cx,cy,C.LTVIO);p(cx+1,cy-1,C.BRVIO);
      }else{
        [[4,5],[12,4],[6,11],[10,12],[3,8],[13,7]].forEach(([x,y],i)=>p(x,y,i%2?C.MDVIO:C.BRVIO));
        p(cx,cy,C.MDVIO);
      }
    },
    // Frost — ice shard → ice shatter
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const ang=[-1,0,1][f];
        // Ice shard — elongated crystal
        for(let i=0;i<10;i++){const w=i<2?1:i<8?2:1,sx=cx-Math.floor(w/2)+ang*(i<5?0:1);
          b(sx,cy-5+i,w,1,i<2?C.WHITE:i<4?C.LTICE:i<7?C.ICE:C.DKICE);
        }
        p(cx-2,cy-2,C.DKICE);p(cx+2,cy+2,C.DKICE);
      }else if(f===3){
        // Ice shatter 1
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.ICE:C.LTICE);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.WHITE);
        }
        p(cx,cy,C.WHITE);
      }else if(f===4){
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.LTICE:C.DKICE);}
        p(cx,cy,C.ICE);
      }else{
        [[4,4],[11,5],[6,12],[9,3],[3,8],[13,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DKICE:C.ICE));
      }
    },
    // Storm — lightning bolt → electrical discharge
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Lightning bolt shape — jagged vertical
        const off=[0,1,-1][f];
        p(cx+off,cy-5,C.LTYEL);p(cx+off+1,cy-4,C.WHITE);p(cx+off,cy-3,C.LTYEL);
        p(cx+off-1,cy-2,C.WHITE);p(cx+off,cy-1,C.LTYEL);p(cx+off+1,cy,C.WHITE);
        p(cx+off,cy+1,C.LTYEL);p(cx+off-1,cy+2,C.YEL);p(cx+off,cy+3,C.DKYEL);
        p(cx+off+1,cy+4,C.DKYEL);
        // Side sparks
        p(cx-3,cy-1+f,C.YEL);p(cx+3,cy+1-f,C.YEL);
      }else if(f===3){
        // Electrical discharge 1
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.YEL);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.LTYEL);
        }
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.LTYEL);
      }else if(f===4){
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=4+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.DKYEL:C.YEL);
        }
        p(cx-1,cy,C.YEL);p(cx+1,cy,C.YEL);p(cx,cy,C.LTYEL);
      }else{
        [[3,5],[12,4],[5,11],[10,12],[7,3],[9,13]].forEach(([x,y],i)=>p(x,y,i%2?C.DKYEL:C.YEL));
        p(cx,cy,C.DKYEL);
      }
    },
    // Focus — thin beam point → focused flash
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Thin beam point — narrow bright line
        const len=[6,7,8][f];
        for(let i=0;i<len;i++){
          p(cx,cy-Math.floor(len/2)+i,i===0?C.WHITE:i<2?C.PLLAV:i<len-1?C.LTVIO:C.BRVIO);
        }
        // Side shimmer
        p(cx-1,cy,f===1?C.LTVIO:C.BRVIO);p(cx+1,cy,f===2?C.LTVIO:C.BRVIO);
      }else if(f===3){
        // Focused flash — bright cross
        b(cx-1,cy-4,2,8,C.LTVIO);b(cx-4,cy-1,8,2,C.LTVIO);
        b(cx-1,cy-2,2,4,C.PLLAV);b(cx-2,cy-1,4,2,C.PLLAV);
        p(cx,cy,C.WHITE);
      }else if(f===4){
        // Fading cross
        p(cx,cy-3,C.BRVIO);p(cx,cy+3,C.BRVIO);p(cx-3,cy,C.BRVIO);p(cx+3,cy,C.BRVIO);
        b(cx-1,cy-1,2,2,C.LTVIO);p(cx,cy,C.PLLAV);
      }else{
        p(cx,cy,C.MDVIO);p(cx,cy-1,C.DKVIO);p(cx,cy+1,C.DKVIO);p(cx-1,cy,C.DKVIO);p(cx+1,cy,C.DKVIO);
      }
    },
    // Mana Drain — dark orb with tendrils → void implosion
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[3,3,4][f];
        // Dark orb
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r){
          const d=Math.sqrt(x*x+y*y);p(cx+x,cy+y,d<1?C.VOID:d<r*0.5?C.SHAD:d<r*0.8?C.DVIO:C.BRVIO);
        }
        // Tendrils reaching out
        const ta=f*0.8;
        for(let i=0;i<4;i++){const a=ta+i*Math.PI/2;
          p(cx+Math.round(Math.cos(a)*(r+2)),cy+Math.round(Math.sin(a)*(r+2)),C.LTVIO);
          p(cx+Math.round(Math.cos(a)*(r+1)),cy+Math.round(Math.sin(a)*(r+1)),C.MDVIO);
        }
      }else if(f===3){
        // Void implosion 1 — ring collapsing
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.BRVIO:C.LTVIO);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.MDVIO);
        }
        b(cx-1,cy-1,2,2,C.VOID);p(cx,cy,C.DVIO);
      }else if(f===4){
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DKVIO);}
        b(cx-2,cy-2,4,4,C.VOID);b(cx-1,cy-1,2,2,C.SHAD);p(cx,cy,C.VOID);
      }else{
        p(cx,cy,C.VOID);p(cx-1,cy,C.SHAD);p(cx+1,cy,C.SHAD);p(cx,cy-1,C.SHAD);p(cx,cy+1,C.SHAD);
      }
    },
    // Meteor — large fireball → massive explosion ring
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[4,5,4][f],bob=[0,-1,1][f];
        // Large fireball
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r){
          const d=Math.sqrt(x*x+y*y);p(cx+x,cy+y+bob,d<1?C.WHITE:d<r*0.3?C.LTYEL:d<r*0.6?C.ORG:d<r*0.8?C.RED:C.DKRED);
        }
        // Flame trail
        p(cx-r,cy+bob-1,C.RED);p(cx-r-1,cy+bob,C.DKRED);
        if(f>0){p(cx-r-2,cy+bob+1,C.DKRED);}
      }else if(f===3){
        // Massive explosion ring 1
        for(let i=0;i<16;i++){const a=i*Math.PI/8;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),i%2?C.RED:C.ORG);
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.LTYEL);
        }
        b(cx-2,cy-2,4,4,C.ORG);b(cx-1,cy-1,2,2,C.WHITE);p(cx,cy,C.WHITE);
      }else if(f===4){
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=5+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.ORG:C.DKRED);
        }
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.RED);}
        p(cx,cy,C.ORG);
      }else{
        [[3,4],[12,3],[5,12],[10,13],[2,8],[14,7],[7,2],[9,14]].forEach(([x,y],i)=>p(x,y,i%2?C.DKRED:C.RED));
        p(cx,cy,C.DKRED);
      }
    },
    // Arcane Nova — swirling multi-color orb → rainbow nova blast
    (c:CanvasRenderingContext2D,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      const colors=[C.LTVIO,C.LTICE,C.LTYEL,C.LTRED,C.LAV,C.PLLAV,C.PLBLU,C.PLYEL];
      if(f<3){
        const r=[4,4,5][f],rot=f*2;
        // Swirling multi-color orb
        for(let i=0;i<12;i++){const a=(i+rot)*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),colors[i%8]);
        }
        for(let i=0;i<6;i++){const a=(i+rot)*Math.PI/3;
          p(cx+Math.round(Math.cos(a)*(r-2)),cy+Math.round(Math.sin(a)*(r-2)),colors[(i+2)%8]);
        }
        b(cx-1,cy-1,2,2,C.PLLAV);p(cx,cy,C.WHITE);
      }else if(f===3){
        // Rainbow nova 1
        for(let i=0;i<16;i++){const a=i*Math.PI/8;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),colors[i%8]);
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),colors[(i+4)%8]);
        }
        b(cx-2,cy-2,4,4,C.PLLAV);b(cx-1,cy-1,2,2,C.WHITE);p(cx,cy,C.WHITE);
      }else if(f===4){
        for(let i=0;i<16;i++){const a=i*Math.PI/8,r=5+i%3;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),colors[i%8]);
        }
        p(cx,cy,C.LTVIO);p(cx-1,cy,C.LTICE);p(cx+1,cy,C.LTYEL);
      }else{
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),colors[i]);
        }
        p(cx,cy,C.MDVIO);
      }
    },
  ];
  const cols=7,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx:CanvasRenderingContext2D){
  // dir: 0=down,1=side,2=up | opts for animation variants
  function drawChar(c:CanvasRenderingContext2D,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,blink=false,frostNova=false,meteorCh=false,staffThrust=false,hurt=false,armSwing=0}=opts;
    const cx=16;
    const lean=blink?3:atk&&atkFrame>0?1:0;
    const headY=blink?5:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx=cx+lean;

    // Blink afterimage
    if(blink){
      for(let y=0;y<20;y++){const w=y<4?3:y<10?5:3,sx=bx-10-Math.floor(w/2);
        for(let x=0;x<w;x++){const px=sx+x;if(px>=0)p(px,8+y,y%2?C.VOID:C.SHAD);}
      }
      p(bx-8,12,C.MDVIO);p(bx-12,15,C.DVIO);
    }

    // Meteor channel ground marker
    if(meteorCh){
      for(let i=0;i<12;i++){const a=i*Math.PI/6;
        p(bx+Math.round(Math.cos(a)*8),55+Math.round(Math.sin(a)*3),i%2?C.RED:C.ORG);
      }
      b(bx-6,57,12,1,C.DKRED);
    }

    // Frost nova ground ring
    if(frostNova){
      for(let i=0;i<16;i++){const a=i*Math.PI/8;
        p(bx+Math.round(Math.cos(a)*10),50+Math.round(Math.sin(a)*4),i%2?C.ICE:C.LTICE);
        p(bx+Math.round(Math.cos(a)*8),50+Math.round(Math.sin(a)*3),C.WHITE);
      }
    }

    // ROBE (behind body — the main large garment)
    if(dir===2||dir===0){
      const cY=torY+2;
      for(let i=0;i<18;i++){
        const w=6+Math.floor(i*0.6),sx=bx-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(blink?2:0))*0.8);
        const cl=i<4?C.MDVIO:i<10?C.DKVIO:i<14?C.DVIO:C.SHAD;
        for(let x=0;x<w;x++){const px=sx+x;if(px>=0&&px<32&&cY+i<62)p(px,cY+i,cl);}
      }
      // Edge highlights — arcane shimmer
      for(let i=0;i<14;i++){
        const w=6+Math.floor(i*0.6),sx=bx-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(blink?2:0))*0.8);
        if(cY+i<62){p(sx,cY+i,C.BRVIO);if(sx+w-1<32)p(sx+w-1,cY+i,i%3===0?C.BRVIO:C.DKVIO);}
      }
      // Rune marks on robe
      for(let i=4;i<12;i+=3){
        const sx=bx-Math.floor((6+Math.floor(i*0.6))/2);
        if(cY+i<62)p(sx+2,cY+i,C.LAV);
      }
      // Bottom tatter
      const bY=Math.min(cY+16,61);
      for(let x=-6;x<7;x++){const px=bx+x;if(px>=0&&px<32&&(px+bY)%3!==0)p(px,bY,C.SHAD);if(px>=0&&px<32&&(px+bY)%2===0&&bY+1<63)p(px,bY+1,C.VOID);}
    }

    // HOOD — pointed wizard hood
    if(dir===0){
      // Down — front of hood with pointed top
      b(bx-4,headY,8,2,C.DKVIO);b(bx-5,headY+2,10,3,C.DKVIO);
      b(bx-4,headY+1,8,1,C.MDVIO);b(bx-3,headY-1,6,1,C.MDVIO);b(bx-2,headY-2,4,1,C.BRVIO);
      p(bx-1,headY-3,C.BRVIO);p(bx,headY-4,C.LTVIO);p(bx,headY-5,C.PLLAV); // Pointed tip
      // Hood drape
      b(bx+5,headY+3,2,3,C.DKVIO);p(bx+6,headY+2,C.DKVIO);
      // Inner shadow
      b(bx-3,headY+2,6,3,C.VOID);b(bx-4,headY+3,8,2,C.VOID);
      // Glowing eyes
      const eg=staffThrust||meteorCh;
      p(bx-2,headY+3,eg?C.PLLAV:C.LTVIO);p(bx-1,headY+3,eg?C.WHITE:C.PLLAV);
      p(bx+1,headY+3,eg?C.PLLAV:C.LTVIO);p(bx+2,headY+3,eg?C.WHITE:C.PLLAV);
      p(bx-2,headY+4,C.DVIO);p(bx+2,headY+4,C.DVIO);
      b(bx-4,headY,8,1,C.BRVIO);p(bx-5,headY+2,C.BRVIO);
    } else if(dir===1){
      // Side — profile
      b(bx-3,headY,6,2,C.DKVIO);b(bx-4,headY+2,8,3,C.DKVIO);
      b(bx-3,headY+1,5,1,C.MDVIO);b(bx-2,headY-1,4,1,C.MDVIO);b(bx-1,headY-2,3,1,C.BRVIO);
      p(bx,headY-3,C.LTVIO);p(bx,headY-4,C.PLLAV); // Pointed tip
      b(bx+4,headY+3,2,3,C.DKVIO);p(bx+5,headY+2,C.DKVIO);
      b(bx-3,headY+2,5,3,C.VOID);
      // One eye
      const eg=staffThrust||meteorCh;
      p(bx+1,headY+3,eg?C.PLLAV:C.LTVIO);p(bx+2,headY+3,eg?C.WHITE:C.PLLAV);
      p(bx+1,headY+4,C.DVIO);
      b(bx-3,headY,6,1,C.BRVIO);
    } else {
      // Up — back of hood
      b(bx-4,headY,8,5,C.DKVIO);b(bx-3,headY,6,4,C.MDVIO);
      b(bx-3,headY-1,6,1,C.MDVIO);b(bx-2,headY-2,4,1,C.BRVIO);
      p(bx-1,headY-3,C.BRVIO);p(bx,headY-4,C.LTVIO);p(bx,headY-5,C.PLLAV); // Pointed tip
      b(bx+4,headY+3,2,3,C.DKVIO);p(bx+5,headY+2,C.DKVIO);
      b(bx-4,headY,8,1,C.BRVIO);
      // Back rune
      p(bx-1,headY+1,C.LAV);p(bx,headY+2,C.LAV);p(bx+1,headY+1,C.LAV);
    }

    // TORSO (robes)
    b(bx-3,torY,6,8,C.DKVIO);b(bx-2,torY,4,8,C.MDVIO);
    if(dir===0){
      // Chest rune pattern
      p(bx-2,torY+1,C.BRVIO);p(bx-1,torY+2,C.LAV);p(bx,torY+3,C.BRVIO);p(bx+1,torY+2,C.LAV);p(bx+2,torY+1,C.BRVIO);
    } else if(dir===1){
      p(bx,torY+1,C.BRVIO);p(bx+1,torY+2,C.LAV);p(bx,torY+3,C.BRVIO);
    } else {
      p(bx-1,torY+1,C.BRVIO);p(bx,torY+2,C.LAV);p(bx+1,torY+1,C.BRVIO);
    }
    // Sash / belt
    b(bx-3,torY+7,6,1,C.GRAY);b(bx-2,torY+7,4,1,C.DKGRAY);p(bx,torY+7,C.LAV);

    // ARMS & STAFF
    if(atk){
      if(dir===0){
        // Staff thrust down
        if(atkFrame===0){
          b(bx+3,torY-2,2,3,C.DKVIO);b(bx+4,torY-3,1,12,C.DKGRAY);p(bx+4,torY-3,C.GRAY);
          // Crystal tip glow
          p(bx+4,torY-4,C.LTVIO);p(bx+4,torY-5,C.PLLAV);p(bx+3,torY-5,C.LAV);p(bx+5,torY-5,C.LAV);p(bx+4,torY-6,C.WHITE);
        }else{
          b(bx+3,torY+2,2,3,C.DKVIO);
          // Staff thrusted forward/down
          for(let i=0;i<8;i++)p(bx+5,torY+6+i,i===0?C.GRAY:C.DKGRAY);
          // Crystal burst at impact
          p(bx+5,torY+14,C.LTVIO);p(bx+4,torY+15,C.PLLAV);p(bx+6,torY+15,C.PLLAV);p(bx+5,torY+16,C.WHITE);
          for(let i=0;i<4;i++){const a=i*Math.PI/2;p(bx+5+Math.round(Math.cos(a)*2),torY+15+Math.round(Math.sin(a)*2),C.LAV);}
        }
        b(bx-5,torY+2,2,4,C.DKVIO);
      } else if(dir===1){
        if(atkFrame===0){
          b(bx+3,torY-1,3,2,C.DKVIO);b(bx+5,torY-6,1,8,C.DKGRAY);p(bx+5,torY-6,C.GRAY);
          p(bx+5,torY-7,C.LTVIO);p(bx+5,torY-8,C.PLLAV);p(bx+4,torY-8,C.LAV);p(bx+6,torY-8,C.LAV);p(bx+5,torY-9,C.WHITE);
        }else{
          b(bx+3,torY+1,3,2,C.DKVIO);
          for(let i=0;i<8;i++){const x_=bx+6+Math.floor(i*0.3),y_=torY+4+i;if(x_<32&&y_<63)p(x_,y_,i===0?C.GRAY:C.DKGRAY);}
          p(bx+8,torY+12,C.LTVIO);p(bx+7,torY+13,C.PLLAV);p(bx+9,torY+13,C.PLLAV);p(bx+8,torY+14,C.WHITE);
        }
      } else {
        if(atkFrame===0){
          b(bx+3,torY-2,2,3,C.DKVIO);b(bx+4,torY-7,1,8,C.DKGRAY);
          p(bx+4,torY-8,C.LTVIO);p(bx+4,torY-9,C.PLLAV);p(bx+4,torY-10,C.WHITE);
        }else{
          b(bx+3,torY+3,2,3,C.DKVIO);
          for(let i=0;i<6;i++)p(bx+4,torY+7+i,C.DKGRAY);
          p(bx+4,torY+13,C.LTVIO);p(bx+4,torY+14,C.PLLAV);
        }
      }
    } else {
      // idle/walk — staff held at side
      const aY=torY+1;
      if(dir===0){
        b(bx-5,aY+armSwing,2,5,C.DKVIO);p(bx-5,aY+armSwing,C.MDVIO);
        b(bx+3,aY-armSwing,2,5,C.DKVIO);p(bx+4,aY-armSwing,C.MDVIO);
        // Staff
        for(let i=0;i<10;i++)p(bx+5,aY-armSwing-2+i,i===0?C.GRAY:C.DKGRAY);
        p(bx+5,aY-armSwing-3,C.LTVIO);p(bx+5,aY-armSwing-4,C.PLLAV);p(bx+5,aY-armSwing-5,C.WHITE);
      } else if(dir===1){
        b(bx+3,aY-armSwing,2,5,C.DKVIO);p(bx+4,aY-armSwing,C.MDVIO);
        for(let i=0;i<10;i++)p(bx+5,aY-armSwing-2+i,i===0?C.GRAY:C.DKGRAY);
        p(bx+5,aY-armSwing-3,C.LTVIO);p(bx+5,aY-armSwing-4,C.PLLAV);p(bx+5,aY-armSwing-5,C.WHITE);
      } else {
        b(bx-5,aY+armSwing,2,5,C.DKVIO);p(bx-5,aY+armSwing,C.MDVIO);
        b(bx+3,aY-armSwing,2,5,C.DKVIO);p(bx+4,aY-armSwing,C.MDVIO);
      }
    }

    // LEGS
    const lh=10;
    b(bx-2+lOff,legY,2,lh,C.DKVIO);p(bx-1+lOff,legY,C.MDVIO);
    b(bx+1+rOff,legY,2,lh,C.DKVIO);p(bx+2+rOff,legY,C.MDVIO);
    // Knee guards
    b(bx-2+lOff,legY+Math.floor(lh*0.5),2,1,C.GRAY);
    b(bx+1+rOff,legY+Math.floor(lh*0.5),2,1,C.GRAY);
    // Boots
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx-3+lOff,lfy,4,2,C.MDVIO);b(bx-3+lOff,lfy,3,1,C.BRVIO);
    b(bx+rOff,rfy,4,2,C.MDVIO);b(bx+1+rOff,rfy,3,1,C.BRVIO);
    // Ground wisps
    if(!blink&&lfy+2<63){p(bx-3+lOff,lfy+2,C.SHAD);p(bx+3+rOff,rfy+2,C.SHAD);}

    // Hurt flash
    if(hurt){p(bx+4,headY+1,C.RED);p(bx+5,headY,C.LTRED);p(bx+6,headY+1,C.RED);p(bx+5,headY+2,C.LTRED);}

    // Blink phase lines
    if(blink)for(let y=headY-2;y<legY+8;y+=3){p(bx-7,y,C.MDVIO);p(bx+7,y+1,C.MDVIO);}
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities staffThrust, frostNova, blink, meteorChannel, + 4 effect frames
  // R4: hurt, death1, death2, portrait, empty×4

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
    {dir:0,opts:{staffThrust:true,atk:true,atkFrame:0,lOff:1}},
    {dir:0,opts:{staffThrust:true,atk:true,atkFrame:1,lOff:2,rOff:-1}},
    {dir:0,opts:{frostNova:true}},
    {dir:0,opts:{frostNova:true,armSwing:1}},
    {dir:1,opts:{blink:true,lOff:2,rOff:1}},
    {dir:1,opts:{blink:true,lOff:3,rOff:2}},
    {dir:0,opts:{meteorCh:true}},
    {dir:0,opts:{meteorCh:true,armSwing:1,lOff:1,rOff:-1}},
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
    row.forEach((frame:any,rx:number)=>{
      if(!frame)return;
      const o=[rx*H_CW,ry*H_CH];
      if(frame.opts.custom==='death1'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Collapsed mage on ground
        b(6,30,5,4,C.DKVIO);b(7,31,3,2,C.MDVIO);b(6,30,5,1,C.BRVIO);p(8,32,C.LTVIO);p(9,32,C.MDVIO);
        b(10,32,10,4,C.DKVIO);b(11,32,8,3,C.MDVIO);
        // Scattered robe
        b(4,33,3,2,C.LTVIO);b(3,34,2,1,C.BRVIO);p(2,35,C.MDVIO);
        // Staff on ground
        b(20,34,6,1,C.DKGRAY);p(20,34,C.GRAY);p(26,34,C.LTVIO);p(27,34,C.PLLAV);
        // Crystal glow fading
        p(27,33,C.LAV);p(28,34,C.MDVIO);
        b(8,36,14,3,C.DKVIO);b(7,37,16,2,C.SHAD);
        for(let x=6;x<24;x++){if(x%3!==0)p(x,39,C.SHAD);if(x%4===0)p(x,40,C.VOID);}
        [[8,26,C.MDVIO],[14,24,C.SHAD],[20,27,C.DKVIO],[11,22,C.SHAD],[17,25,C.MDVIO]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
      } else if(frame.opts.custom==='death2'){
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Dissolving into arcane particles
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.SHAD);if(x%3===0)p(x,41,C.DKVIO);}
        p(22,36,C.LTVIO);p(22,35,C.PLLAV);p(22,41,C.MDVIO);p(7,40,C.LAV);p(8,41,C.BRVIO);p(6,41,C.MDVIO);
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.PLLAV:i%4===0?C.LTVIO:i%3===0?C.BRVIO:i%2===0?C.MDVIO:C.SHAD);
        });
        p(14,42,C.LAV);p(15,42,C.MDVIO);
      } else if(frame.opts.custom==='portrait'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Portrait — close-up face
        b(2,2,28,60,C.VOID);b(3,3,26,58,C.SHAD);
        // Hood
        b(6,6,20,8,C.DKVIO);b(7,7,18,6,C.MDVIO);b(6,6,20,2,C.BRVIO);b(7,5,18,2,C.MDVIO);b(8,4,16,2,C.BRVIO);b(10,3,12,1,C.LTVIO);
        // Pointed top
        p(15,2,C.PLLAV);p(16,2,C.LTVIO);
        p(26,8,C.DKVIO);p(27,9,C.SHAD);p(28,10,C.SHAD);p(27,10,C.DKVIO);
        // Face void
        b(8,10,16,10,C.VOID);b(9,11,14,8,C.VOID);
        // Glowing eyes
        b(9,14,5,3,C.MDVIO);b(10,14,3,2,C.LTVIO);b(11,14,1,2,C.PLLAV);p(11,14,C.WHITE);
        b(18,14,5,3,C.MDVIO);b(19,14,3,2,C.LTVIO);b(20,14,1,2,C.PLLAV);p(20,14,C.WHITE);
        // Eye glow trails
        p(8,16,C.MDVIO);p(7,17,C.DVIO);p(23,16,C.MDVIO);p(24,17,C.DVIO);
        // Chin area
        b(12,19,8,1,C.DKVIO);
        // Robe collar
        b(7,21,18,6,C.DKVIO);b(8,22,16,4,C.MDVIO);b(9,23,14,2,C.BRVIO);
        // Rune patterns on collar
        b(10,22,2,4,C.DKVIO);b(18,22,2,4,C.DKVIO);b(14,22,1,4,C.LAV);
        // Shoulder pauldrons
        b(4,20,4,6,C.DKVIO);b(5,20,2,5,C.MDVIO);b(24,20,4,6,C.DKVIO);b(25,20,2,5,C.MDVIO);
        // Robe body
        b(8,27,16,14,C.DKVIO);b(9,27,14,12,C.MDVIO);
        // Chest runes
        p(10,29,C.BRVIO);p(12,30,C.LAV);p(14,31,C.BRVIO);p(16,30,C.LAV);p(18,29,C.BRVIO);
        // Staff
        b(24,28,2,10,C.DKGRAY);p(25,27,C.PLLAV);p(24,26,C.LTVIO);p(25,25,C.WHITE);
        // Border
        b(2,2,28,1,C.BRVIO);b(2,61,28,1,C.BRVIO);b(2,2,1,60,C.BRVIO);b(29,2,1,60,C.BRVIO);
        p(3,3,C.LAV);p(28,3,C.LAV);p(3,60,C.LAV);p(28,60,C.LAV);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Bolt','Frost','Storm','Focus','Mana Drain','Meteor','Arcane Nova'];
const T_STATES:string[]=[];
for(let lvl=1;lvl<=T_MAX_LVL;lvl++){for(const st of['Idle','Charge','Fire','Cooldown'])T_STATES.push(`L${lvl} ${st}`);};
const P_NAMES=['Bolt','Frost','Storm','Focus','Mana Drain','Meteor','Arcane Nova'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Staff 1','Staff 2','Frost 1','Frost 2','Blink 1','Blink 2','Meteor 1','Meteor 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function ArcaneSprites(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=7*T_CELL;tc.height=T_TOTAL_ROWS*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+7*T_CELL*tS;tpv.height=T_TOTAL_ROWS*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#07050c';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<T_TOTAL_ROWS;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#6644ff';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<7;cc++){const bx=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a1a2a';tpc.strokeRect(bx,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#9988ff';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx+2,by-2);}}}

    // Projectiles
    const pc=pRef.current!;pc.width=7*P_CELL;pc.height=6*P_CELL;
    const pCtx=pc.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+7*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#07050c';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#6644ff';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<7;cc++){const bx=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx,by);ppc.scale(pS,pS);ppc.drawImage(pc,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a1a2a';ppc.strokeRect(bx,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#9988ff';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#07050c';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#6644ff';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a1a2a';hpc.strokeRect(bx,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#9988ff';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:React.RefObject<HTMLCanvasElement>,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current!.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'arcane_towers_animated.png',
      info:{sz:'448×1280',cell:'64×64',loader:"this.load.spritesheet('arcane_towers','arcane_towers_animated.png',{frameWidth:64,frameHeight:64})",note:`7 cols (towers) × ${T_TOTAL_ROWS} rows (5 upgrade levels × 4 anim states). Levels: Bolt=4, Frost=3, Storm=5, Focus=4, ManaDrain=4, Meteor=3, ArcaneNova=1. Towers with fewer levels repeat max for remaining rows.`}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'arcane_projectiles_animated.png',
      info:{sz:'224×192',cell:'32×32',loader:"this.load.spritesheet('arcane_proj','arcane_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'7 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Arcanist',ref:hRef,pvRef:hPv,dl:'arcanist_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('arcanist','arcanist_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#07050c',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.BRVIO,margin:0,fontSize:15}}>ARCANE FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref as React.RefObject<HTMLCanvasElement>,cur.dl)} style={{background:C.BRVIO,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#220055':'#111',color:tab===t.id?C.LAV:'#665588',border:`1px solid ${tab===t.id?'#4422aa':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {(['preview','actual'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a1a2a':'#111',color:view===v?C.LAV:'#445566',border:`1px solid ${view===v?'#334':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef as any} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Arcane ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref as any} data-label={`Arcane ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?7*P_CELL*3:7*T_CELL*2,border:'1px solid #1a1a2a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#665588',fontSize:9,marginTop:10,maxWidth:700}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#9988ff'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#9988ff'}}>Phaser:</b> <code style={{color:C.LAV}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#9988ff'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
