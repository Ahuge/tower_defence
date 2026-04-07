import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
  DKFOR:'#113311',FOREST:'#1a4422',MDGRN:'#226633',GREEN:'#33aa44',LTGRN:'#66dd77',PALGRN:'#aaffbb',
  BARK:'#664422',LTBARK:'#885533',PLBARK:'#aa7744',DKBARK:'#3a2211',STUMP:'#4a3318',
  AMBER:'#ffaa44',DKAMB:'#cc7722',LTAMB:'#ffcc88',GOLD:'#ffcc00',
  PINK:'#ee55aa',LTPNK:'#ff88cc',MAGENTA:'#cc2288',DKPNK:'#882255',
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

function tBase(p,b,topY,w,glow){
  const cx=16;
  // Gnarled root/stump base with moss
  for(let i=0;i<10;i++){
    const cw=w-6+Math.floor(i*0.8)+Math.round(Math.sin(i*0.7)*1.2),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.LTBARK:i<5?C.BARK:i<8?C.DKBARK:C.STUMP);
  }
  // Top rim bark highlight
  b(cx-Math.floor((w-6)/2),topY,w-6,1,C.PLBARK);
  // Spiral vine whorl (signature mark)
  p(cx-3,topY+3,glow>1?C.LTGRN:C.GREEN);p(cx-2,topY+4,glow>1?C.LTGRN:C.GREEN);
  p(cx-2,topY+5,glow>0?C.GREEN:C.MDGRN);p(cx-3,topY+6,C.DKFOR);
  p(cx-1,topY+3,glow>1?C.LTVINE:C.VINE);p(cx,topY+4,glow>0?C.VINE:C.DKVINE);
  // Moss patches
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.DKMOSS);
  if(glow>0){p(cx-4,topY+2,C.MOSS);p(cx+2,topY+3,C.MOSS);}
  // Root tendrils at bottom
  p(cx-5,topY+8,C.DKBARK);p(cx+4,topY+8,C.DKBARK);
  p(cx-6,topY+9,C.STUMP);p(cx+5,topY+9,C.STUMP);
}

function tVine(p,x1,y1,x2,y2,col,bright){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*2)*1.5);
    p(xx,yy,bright&&i%2===0?C.LTGRN:col);
  }
}

function tStalk(p,b,x,y,h,w,c1,c2,ct){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.6)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// ===== TOWERS (6×4 at 64×64) =====
function drawTowers(ctx){
  const fns=[
    // 1. Thorn — Spiky plant shooting thorns
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Central stalk
      b(15,8,2,14,C.DKFOR);b(15,8,1,14,C.MDGRN);
      // Sharp angular leaves / thorns
      const spread=fl?3:br?2:1;
      // Left thorns
      for(let i=0;i<4;i++){
        const ty=10+i*3,tx=14-spread-i;
        p(tx,ty,fl?C.LTTHRN:C.THORN);p(tx+1,ty-1,fl?C.LTGRN:C.GREEN);p(tx-1,ty+1,C.DKTHRN);
      }
      // Right thorns
      for(let i=0;i<4;i++){
        const ty=11+i*3,tx=17+spread+i;
        p(tx,ty,fl?C.LTTHRN:C.THORN);p(tx-1,ty-1,fl?C.LTGRN:C.GREEN);p(tx+1,ty+1,C.DKTHRN);
      }
      // Top spike cluster
      p(15,6,br?C.LTTHRN:C.THORN);p(16,5,fl?C.WHITE:C.LTTHRN);p(16,7,C.THORN);
      p(14,7,br?C.LTGRN:C.GREEN);p(17,6,br?C.LTGRN:C.GREEN);
      if(fl){p(13,4,C.LTTHRN);p(18,4,C.LTTHRN);p(15,3,C.WHITE);p(16,3,C.LTGRN);}
      // Fire state: thorns launched outward
      if(fl){
        for(let i=0;i<3;i++){p(8-i,8+i,C.THORN);p(24+i,9+i,C.THORN);}
        p(6,7,C.LTTHRN);p(27,8,C.LTTHRN);
      }
      // Leaf accents
      p(12,14,C.GREEN);p(20,16,C.GREEN);p(11,18,br?C.LTGRN:C.GREEN);
      // Cooldown: retracted
      if(s===3){p(14,10,C.DKTHRN);p(17,11,C.DKTHRN);b(15,9,2,2,C.DKFOR);}
    },
    // 2. Root — Twisted root mass
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,23,22,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Central root mass
      for(let y=8;y<22;y++){
        const w=Math.max(3,Math.round(8+Math.sin((y-8)*0.4)*3));
        const sx=16-Math.floor(w/2)+Math.round(Math.sin(y*0.6)*1);
        b(sx,y,w,1,y<12?C.BARK:y<18?C.DKBARK:C.STUMP);
      }
      // Inner texture
      for(let y=10;y<20;y++){
        const x=15+Math.round(Math.sin(y*0.5)*1.5);
        p(x,y,y%2===0?C.PLBARK:C.LTBARK);
      }
      // Tendrils reaching outward
      const reach=fl?6:br?4:2;
      tVine(p,12,14,12-reach,10,C.BARK,fl);
      tVine(p,20,14,20+reach,10,C.BARK,fl);
      tVine(p,14,20,14-reach,23,C.DKBARK,fl);
      tVine(p,18,20,18+reach,23,C.DKBARK,fl);
      // Top root knot
      b(14,7,4,3,C.BARK);b(15,7,2,2,C.LTBARK);p(14,7,C.PLBARK);
      // Fire state: tendrils burst out
      if(fl){
        for(let i=0;i<4;i++){p(5-i,8+i*2,C.LTBARK);p(27+i,9+i*2,C.LTBARK);}
        p(3,7,C.PLBARK);p(29,8,C.PLBARK);
      }
      // Moss highlights
      p(13,12,C.MOSS);p(19,15,C.LTMOSS);p(11,18,br?C.LTMOSS:C.MOSS);
      if(s===3){b(14,10,4,2,C.DKBARK);p(15,12,C.STUMP);}
    },
    // 3. Blossom — Pink/magenta flower bloom on stalk
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Stalk
      tStalk(p,b,15,8,14,2,C.MDGRN,C.GREEN,C.LTGRN);
      // Small leaves on stalk
      p(14,14,C.GREEN);p(17,16,C.GREEN);p(13,18,C.MDGRN);p(18,12,C.MDGRN);
      // Flower bloom - petals open wider on charge/fire
      const petalR=fl?6:br?5:4;
      const pCol=fl?C.LTPNK:br?C.PINK:C.MAGENTA;
      const pCol2=fl?C.PINK:br?C.MAGENTA:C.DKPNK;
      // Top petal
      for(let i=0;i<petalR;i++){b(16-1,5-i,2,1,i<1?pCol:pCol2);}
      // Bottom petal
      for(let i=0;i<petalR-1;i++){b(16-1,9+i,2,1,i<1?pCol:pCol2);}
      // Left petal
      for(let i=0;i<petalR;i++){b(15-petalR+i,7,1,2,i<2?pCol2:pCol);}
      // Right petal
      for(let i=0;i<petalR;i++){b(17+i,7,1,2,i<petalR-2?pCol:pCol2);}
      // Center / pollen
      b(15,7,2,2,fl?C.LTAMB:C.AMBER);p(15,7,fl?C.WHITE:C.LTAMB);p(16,8,C.DKAMB);
      // Extra petals for fire state
      if(fl){
        p(12,4,C.PINK);p(20,4,C.PINK);p(10,9,C.PINK);p(22,9,C.PINK);
        p(16,2,C.LTPNK);p(16,1,C.PINK);
      }
      // Pollen particles
      if(br){p(10,3,C.AMBER);p(22,5,C.LTAMB);p(8,7,C.DKAMB);}
      if(fl){p(7,2,C.LTAMB);p(24,3,C.AMBER);p(6,9,C.DKAMB);p(25,6,C.LTAMB);}
      if(s===3){b(15,6,2,3,C.DKPNK);p(14,7,C.MAGENTA);p(17,7,C.MAGENTA);}
    },
    // 4. Spore — Mushroom cap releasing spore cloud
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,23,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Mushroom stem
      b(14,14,4,9,C.PLBARK);b(15,14,2,9,C.LTBARK);
      // Mushroom cap
      const capW=fl?14:br?12:10;
      for(let y=0;y<6;y++){
        const w=Math.max(2,Math.round(capW*(1-Math.abs(y-2.5)/5)));
        const sx=16-Math.floor(w/2);
        b(sx,6+y,w,1,y<1?C.LTSPOR:y<3?C.SPORE:y<5?C.DKSPOR:C.DKFOR);
      }
      // Cap highlight
      b(14,6,4,1,C.LTSPOR);p(13,7,fl?C.WHITE:C.LTSPOR);
      // Cap spots
      p(12,8,C.LTAMB);p(18,7,C.LTAMB);p(15,6,fl?C.WHITE:C.LTAMB);
      // Spore cloud — grows with states
      const sporeR=fl?7:br?4:0;
      if(sporeR>0){
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          const r=sporeR-i%2;
          const sx=16+Math.round(Math.cos(a)*r),sy=4+Math.round(Math.sin(a)*r);
          if(sy>=0&&sy<32&&sx>=0&&sx<32)p(sx,sy,i%2===0?C.TOXIC:C.LTSPOR);
        }
      }
      if(fl){
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          const r=sporeR+2;
          const sx=16+Math.round(Math.cos(a)*r),sy=4+Math.round(Math.sin(a)*r);
          if(sy>=0&&sy<32&&sx>=0&&sx<32)p(sx,sy,i%3===0?C.TOXIC:C.DKSPOR);
        }
      }
      // Gills under cap
      p(13,11,C.DKFOR);p(15,11,C.DKFOR);p(17,11,C.DKFOR);p(19,11,C.DKFOR);
      // Small mushrooms at base
      p(10,21,C.SPORE);p(11,20,C.LTSPOR);p(21,21,C.SPORE);p(22,20,C.LTSPOR);
      if(s===3){b(14,7,4,2,C.DKSPOR);p(16,5,C.DKFOR);}
    },
    // 5. Vine — Whipping vine tendril
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Central vine stalk
      for(let y=6;y<22;y++){
        const x=16+Math.round(Math.sin((y-6)*0.4)*2);
        p(x,y,C.VINE);p(x-1,y,C.DKVINE);p(x+1,y,y%3===0?C.LTVINE:C.VINE);
      }
      // Vine tip / whip
      const whipExtend=fl?8:br?5:2;
      for(let i=0;i<whipExtend;i++){
        const wx=fl?16+i*1.2:16+i*0.8;
        const wy=5-i+Math.sin(i*0.8)*1.5;
        const ix=Math.round(wx),iy=Math.round(wy);
        if(ix>=0&&ix<32&&iy>=0&&iy<32)p(ix,iy,i<2?C.LTVINE:C.VINE);
      }
      // Fire: vine lashes outward
      if(fl){
        for(let i=0;i<6;i++){p(22+i,4+Math.round(Math.sin(i)*2),i<3?C.LTGRN:C.GREEN);}
        p(28,3,C.LTVINE);p(29,4,C.VINE);
      }
      // Curling tendrils
      for(let i=0;i<3;i++){
        const ty=10+i*4;
        p(13-i,ty,br?C.LTGRN:C.GREEN);p(19+i,ty+2,br?C.LTGRN:C.GREEN);
      }
      // Small leaves
      p(12,9,C.GREEN);p(20,13,C.LTGRN);p(11,17,C.MDGRN);p(21,11,C.MDGRN);
      // Thorns on vine
      p(14,10,C.THORN);p(18,14,C.THORN);p(13,18,C.DKTHRN);
      if(s===3){
        for(let y=6;y<12;y++){const x=16+Math.round(Math.sin((y-6)*0.4)*2);p(x,y,C.DKVINE);}
      }
    },
    // 6. Elder Treant (Ultimate) — Ancient tree face/trunk
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
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
  ];
  const cols=6,rows=4;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*T_CELL,row*T_CELL],row);
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (6×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx){
  const fns=[
    // Thorn: flying thorn/spike → thorn shatter
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
  ];
  const cols=6,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx){
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
const T_NAMES=['Thorn','Root','Blossom','Spore','Vine','Elder Treant'];
const T_STATES=['Idle','Charge','Fire','Cooldown'];
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
    const tc=tRef.current!;tc.width=6*T_CELL;tc.height=4*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=66,tLH=13;
    tpv.width=tLW+6*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a1108';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#33aa44';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<6;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a2a1a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#88aa77';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=6*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+6*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#0a1108';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#33aa44';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<6;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a2a1a';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#88aa77';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

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
      info:{sz:'384×256',cell:'64×64',loader:"this.load.spritesheet('nature_towers','nature_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'6 cols (towers) × 4 rows (idle, charge, fire, cooldown)'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'nature_projectiles_animated.png',
      info:{sz:'192×192',cell:'32×32',loader:"this.load.spritesheet('nature_proj','nature_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'6 cols × 6 rows (3 travel + 3 impact)'}},
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
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?6*P_CELL*3:6*T_CELL*2,border:'1px solid #1a2a1a'}}/>
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
