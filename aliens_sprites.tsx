// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
export const C={
  LIME:'#88ff44',BGRN:'#aaff66',ACID:'#ffff44',DKBIO:'#112200',
  CHIT:'#445522',CHLT:'#667744',OLIV:'#556633',DKOLV:'#334411',
  NGRN:'#66dd22',DGRN:'#44aa11',DDGRN:'#227700',VDGRN:'#115500',
  LGRN:'#bbff88',PGRN:'#ccffaa',WGRN:'#eeffdd',
  YGRN:'#ccff44',DYEL:'#aaaa00',LTYEL:'#ffff88',PALYEL:'#ffffcc',
  SLIME:'#77cc22',DSLIM:'#558811',GLOW:'#aaffaa',
  BRWN:'#554422',DBRWN:'#332211',RUST:'#665533',
  RED:'#cc3322',DRED:'#881111',ORED:'#ff6644',
  WHITE:'#ffffff',GRAY:'#667766',DKGRAY:'#334433',BLACK:'#000000',
  PURP:'#8844aa',DPURP:'#552266',LPURP:'#aa66cc',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

// Organic hive base with hex cell texture — compact version
function aBase(p:any,b:any,topY:number,w:number,glow:number){
  const cx=16;
  // Slim mound shape (5 rows instead of 10)
  for(let i=0;i<5;i++){
    const cw=w-8+Math.floor(i*1.2),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<1?C.CHLT:i<3?C.CHIT:C.DKOLV);
  }
  b(cx-Math.floor((w-8)/2),topY,w-8,1,C.OLIV);
  // Hexagonal cell pattern
  const hx=[[cx-3,topY+1],[cx,topY+1],[cx+2,topY+2],[cx-2,topY+3]];
  hx.forEach(([x,y])=>{p(x,y,glow>1?C.LIME:C.NGRN);p(x+1,y,glow>1?C.BGRN:C.DGRN);});
  // Acid drips
  if(glow>0){p(cx-2,topY+4,C.LIME);p(cx+2,topY+4,C.SLIME);}
  if(glow>1){p(cx-3,topY+4,C.DGRN);p(cx+3,topY+4,C.NGRN);}
  b(cx-Math.floor((w-4)/2),topY+4,w-4,1,C.DKBIO);
}

// Chitin spire
function aSpire(p:any,b:any,x:number,y:number,h:number,w:number,c1:string,c2:string,ct:string){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.85)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// Tendril/appendage
function aTendril(p:any,x1:number,y1:number,x2:number,y2:number,col:string,bright:boolean){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*2)*1.5);
    p(xx,yy,bright&&i%2===0?C.LIME:col);
  }
}

// ===== TOWERS (8 cols × 16 rows at 64×64, 4 levels × 4 states) =====
// Max levels per tower: Spitter=4, Stinger=3, SwarmNode=3, AcidSprayer=4, HiveSpire=4, BroodMother=3, Swarmling=2, Overmind=3
const TOWER_LEVELS=[4,3,3,4,4,3,2,3];

export function drawTowers(ctx:any){
  const fns=[
    // 1. Spitter — small round bug with open mouth spitting upward (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[14,16,18,22][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Round bug body — compact oval
      const bdy=[4,5,6,7][lv], bdx=16-Math.floor(bdy/2);
      const bodyTop=18-bdy;
      b(bdx,bodyTop,bdy,bdy+2,C.CHIT);b(bdx+1,bodyTop,bdy-2,bdy+1,C.CHLT);
      // Wide open mouth at top — this is the spitter's defining feature
      const mw=[4,5,6,8][lv], mx=16-Math.floor(mw/2);
      b(mx,bodyTop-3,mw,3,C.DKBIO); // mouth cavity
      p(mx,bodyTop-1,C.CHIT);p(mx+mw-1,bodyTop-1,C.CHIT); // jaw edges
      // Teeth around mouth
      for(let i=0;i<mw;i+=2){p(mx+i,bodyTop-3,fl?C.ACID:C.LIME);} // top teeth
      for(let i=1;i<mw;i+=2){p(mx+i,bodyTop-1,C.OLIV);} // bottom teeth
      if(lv>=2){p(mx-1,bodyTop-2,C.CHIT);p(mx+mw,bodyTop-2,C.CHIT);} // wider jaw
      if(lv>=3){p(mx-1,bodyTop-3,C.OLIV);p(mx+mw,bodyTop-3,C.OLIV);}
      // Small eyes beside mouth
      p(mx-1,bodyTop-1,fl?C.ACID:C.LIME);p(mx+mw,bodyTop-1,fl?C.ACID:C.LIME);
      if(lv>=2){p(mx-2,bodyTop,C.LIME);p(mx+mw+1,bodyTop,C.LIME);}
      // Short stubby legs — 2-3 pairs
      const legPairs=[2,2,3,3][lv];
      for(let i=0;i<legPairs;i++){
        const ly=bodyTop+2+i*2;
        if(ly<27){p(bdx-1,ly,C.CHIT);p(bdx-2,ly+1,C.DKOLV);p(bdx+bdy,ly,C.CHIT);p(bdx+bdy+1,ly+1,C.DKOLV);}
      }
      // Acid spit (fire state)
      if(s===2){
        p(15,bodyTop-4,C.ACID);p(16,bodyTop-5,C.LIME);p(15,bodyTop-6,C.BGRN);p(16,bodyTop-7,C.NGRN);
        p(14,bodyTop-5,C.YGRN);p(17,bodyTop-6,C.YGRN);
        if(lv>=2){p(13,bodyTop-6,C.LIME);p(18,bodyTop-7,C.ACID);}
        if(lv>=3){p(12,bodyTop-7,C.YGRN);p(19,bodyTop-8,C.LIME);p(15,bodyTop-8,C.WHITE);}
      }
      if(s===1){p(15,bodyTop-4,C.LIME);p(16,bodyTop-5,C.NGRN);}
      // Glow spots on body
      p(bdx+1,bodyTop+1,br?C.LIME:C.NGRN);
      if(lv>=1){p(bdx+bdy-2,bodyTop+2,C.NGRN);}
      if(lv>=3){p(16,bodyTop+1,fl?C.ACID:C.LIME);}
      if(s===3){p(15,bodyTop,C.DGRN);p(16,bodyTop+1,C.DGRN);}
    },
    // 2. Stinger — SHORT and WIDE scorpion/spider with curving tail (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[16,18,20][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // WIDE flat body — emphasis on horizontal spread
      const bdw=[12,16,20][lv], bdh=[3,3,4][lv], bdy=21, bdx=16-Math.floor(bdw/2);
      b(bdx,bdy,bdw,bdh,C.CHIT);b(bdx+1,bdy,bdw-2,bdh-1,C.CHLT);
      b(bdx+2,bdy-1,bdw-4,1,C.OLIV); // carapace top ridge
      if(lv>=1){b(bdx,bdy-1,bdw,1,C.OLIV);}
      if(lv>=2){b(bdx-1,bdy+1,bdw+2,bdh-1,C.CHIT);} // extra-wide
      // Small head at front — flat and wide
      const hw=[4,5,6][lv];
      b(16-Math.floor(hw/2),bdy-2,hw,2,C.CHLT);
      // Eyes on head
      p(16-Math.floor(hw/2),bdy-2,fl?C.ACID:C.LIME);p(16+Math.ceil(hw/2)-1,bdy-2,fl?C.ACID:C.LIME);
      // Large pincers extending far to each side
      const pw=[3,4,5][lv];
      // Left pincer — curved
      b(bdx-pw-1,bdy,pw,2,C.CHIT);p(bdx-pw-2,bdy,C.OLIV);p(bdx-pw-2,bdy+1,C.CHLT);
      p(bdx-pw-2,bdy-1,C.CHLT); // pincer tip up
      // Right pincer — curved
      b(bdx+bdw+1,bdy,pw,2,C.CHIT);p(bdx+bdw+pw+1,bdy,C.OLIV);p(bdx+bdw+pw+1,bdy+1,C.CHLT);
      p(bdx+bdw+pw+1,bdy-1,C.CHLT); // pincer tip up
      if(lv>=2){p(bdx-pw-3,bdy,C.LIME);p(bdx+bdw+pw+2,bdy,C.LIME);} // glowing pincer tips
      // Splayed legs — 3-4 pairs, spreading wide
      const legPairs=[3,4,4][lv];
      for(let i=0;i<legPairs;i++){
        const ly=bdy+1+Math.floor(i*0.5), spread=3+i*2;
        if(ly<27){
          p(bdx-spread,ly+1,C.CHIT);p(bdx-spread-1,ly+2,C.DKOLV);
          p(bdx+bdw-1+spread,ly+1,C.CHIT);p(bdx+bdw+spread,ly+2,C.DKOLV);
        }
      }
      // TAIL — curves up from right side of body, arcs over, stinger hangs down
      // Tail segment: rises from body right-center, curves up and left
      const tx=16+Math.floor(bdw/4); // start right of center
      p(tx,bdy-1,C.CHIT);p(tx+1,bdy-2,C.CHIT);p(tx+2,bdy-3,C.CHLT);
      p(tx+2,bdy-4,C.CHLT);p(tx+1,bdy-5,C.CHIT);p(tx,bdy-6,C.OLIV);
      p(tx-1,bdy-7,C.CHLT);p(tx-2,bdy-8,C.CHLT);
      // Tail thickens at higher levels
      if(lv>=1){p(tx+1,bdy-3,C.CHLT);p(tx+2,bdy-5,C.CHIT);p(tx-1,bdy-6,C.CHIT);}
      if(lv>=2){p(tx+3,bdy-3,C.CHIT);p(tx+3,bdy-4,C.OLIV);p(tx-2,bdy-7,C.CHIT);}
      // Stinger tip — curving down at end
      const stx=tx-2, sty=bdy-8;
      p(stx-1,sty+1,C.OLIV);p(stx-1,sty+2,br?C.ACID:C.LIME); // stinger point down
      if(fl){
        // Venom dripping from stinger
        p(stx-1,sty+2,C.ACID);p(stx-1,sty+3,C.LIME);p(stx-2,sty+3,C.YGRN);
        p(stx,sty+3,C.ACID);p(stx-1,sty+4,C.NGRN);
        if(lv>=1){p(stx-2,sty+4,C.YGRN);p(stx,sty+4,C.LIME);}
        if(lv>=2){p(stx-1,sty+5,C.ACID);p(stx-2,sty+2,C.NGRN);p(stx+1,sty+3,C.NGRN);}
      } else if(br){
        p(stx-1,sty+2,C.ACID);p(stx-1,sty+3,C.NGRN);
      }
      // Glow spots on carapace
      p(16,bdy,br?C.LIME:C.NGRN);
      if(lv>=1){p(bdx+3,bdy+1,C.NGRN);}
      if(s===3){p(tx,bdy-4,C.DGRN);p(stx-1,sty+1,C.DGRN);}
    },
    // 3. Swarm Node — MULTIPLE FLOATING BLOBS/ORBS clustered together (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[14,16,18][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Helper to draw a small floating orb
      const orb=(ox:number,oy:number,r:number,bright:boolean)=>{
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r){
            const d=Math.sqrt(x*x+y*y);
            p(ox+x,oy+y,d<r*0.4?(bright?C.ACID:C.LIME):d<r*0.75?(bright?C.LIME:C.NGRN):C.DGRN);
          }
        }
        p(ox,oy,bright?C.WHITE:fl?C.ACID:C.LIME); // bright center
      };
      // Orb positions — scattered, NOT touching, like a swarm cluster
      // lv0: 3 orbs, lv1: 5 orbs, lv2: 7 orbs
      const orbData:{x:number,y:number,r:number}[][] = [
        // lv0: 3 small orbs in loose triangle
        [{x:16,y:12,r:3},{x:10,y:18,r:2},{x:22,y:17,r:2}],
        // lv1: 5 orbs in wider spread
        [{x:16,y:10,r:3},{x:9,y:16,r:2},{x:23,y:15,r:2},{x:12,y:22,r:2},{x:21,y:21,r:2}],
        // lv2: 7 orbs filling the space
        [{x:16,y:8,r:3},{x:8,y:14,r:2},{x:24,y:13,r:2},{x:11,y:21,r:2},{x:21,y:20,r:2},{x:6,y:20,r:2},{x:26,y:18,r:2}],
      ];
      const orbs=orbData[lv];
      orbs.forEach((od,i)=>orb(od.x,od.y,od.r,fl&&i===0));
      // Energy threads between orbs (faint connections)
      if(br||fl){
        for(let i=1;i<orbs.length;i++){
          const o0=orbs[0],oi=orbs[i];
          const mx=Math.round((o0.x+oi.x)/2),my=Math.round((o0.y+oi.y)/2);
          p(mx,my,fl?C.LIME:C.DGRN);
        }
      }
      // Floating particles around orbs (fire state)
      if(fl){
        const partN=[4,6,8][lv];
        for(let i=0;i<partN;i++){
          const a=i*Math.PI*2/partN;
          p(16+Math.round(Math.cos(a)*12),14+Math.round(Math.sin(a)*8),i%2?C.BGRN:C.LIME);
        }
      }
      // Subtle glow halos on idle/ready
      if(br&&!fl){
        orbs.forEach(od=>{
          p(od.x-od.r-1,od.y,C.VDGRN);p(od.x+od.r+1,od.y,C.VDGRN);
        });
      }
      if(s===3){p(16,12,C.DGRN);p(10,17,C.DGRN);}
    },
    // 4. Acid Sprayer — CRESCENT/ARC shaped nozzle spraying in arc (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[16,18,20,22][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Crescent body — drawn as an arc/C-shape opening upward
      const outerR=[6,7,8,10][lv], innerR=[3,4,5,6][lv];
      const cy=19, cx=16;
      for(let y=-outerR;y<=outerR;y++)for(let x=-outerR;x<=outerR;x++){
        const d2=x*x+y*y;
        if(d2<=outerR*outerR && d2>=innerR*innerR && y>=(-outerR*0.3)){ // bottom arc only (crescent)
          const d=Math.sqrt(d2);
          p(cx+x,cy+y,d<(innerR+1)?C.CHLT:d<(outerR-1)?C.CHIT:C.DKOLV);
        }
      }
      // Crescent tips — the horns of the arc pointing up
      const tipY=cy-Math.floor(outerR*0.3);
      p(cx-outerR,tipY,C.CHLT);p(cx-outerR+1,tipY-1,C.OLIV);
      p(cx+outerR,tipY,C.CHLT);p(cx+outerR-1,tipY-1,C.OLIV);
      if(lv>=1){p(cx-outerR,tipY-1,C.CHIT);p(cx+outerR,tipY-1,C.CHIT);}
      if(lv>=2){p(cx-outerR+1,tipY-2,C.LIME);p(cx+outerR-1,tipY-2,C.LIME);}
      if(lv>=3){p(cx-outerR-1,tipY,C.OLIV);p(cx+outerR+1,tipY,C.OLIV);p(cx-outerR,tipY-2,C.NGRN);p(cx+outerR,tipY-2,C.NGRN);}
      // Acid veins on crescent surface
      p(cx-2,cy+1,C.NGRN);p(cx+2,cy+1,C.NGRN);p(cx,cy+2,br?C.LIME:C.DGRN);
      if(lv>=1){p(cx-3,cy,C.LIME);p(cx+3,cy,C.LIME);}
      if(lv>=2){p(cx-4,cy-1,C.NGRN);p(cx+4,cy-1,C.NGRN);}
      if(lv>=3){p(cx,cy+3,fl?C.WHITE:C.ACID);p(cx-1,cy+2,C.LIME);p(cx+1,cy+2,C.LIME);}
      // Nozzle opening at center-top of arc (inside the crescent)
      const nw=[2,3,3,4][lv];
      b(cx-Math.floor(nw/2),cy-innerR+1,nw,2,C.DKBIO); // nozzle hole
      p(cx-Math.floor(nw/2),cy-innerR,C.OLIV);p(cx+Math.ceil(nw/2)-1,cy-innerR,C.OLIV);
      // Acid spray — fans out in an ARC from the crescent opening
      if(fl){
        // Wide arc spray — particles fan out left and right
        const sprayN=[5,7,9,12][lv];
        for(let i=0;i<sprayN;i++){
          const a=Math.PI*0.2+i*Math.PI*0.6/sprayN; // spread across ~110 degrees upward
          const r1=innerR+2+Math.floor(i%3);
          const r2=innerR+4+Math.floor(i%2);
          p(cx+Math.round(Math.cos(a)*r1-outerR*0.5),cy-Math.round(Math.sin(a)*r1),i<sprayN/3?C.ACID:i<sprayN*2/3?C.LIME:C.BGRN);
          p(cx+Math.round(Math.cos(a)*r2-outerR*0.3),cy-Math.round(Math.sin(a)*r2),i<sprayN/3?C.YGRN:C.NGRN);
        }
        // Extra spray particles at high levels
        if(lv>=2){p(cx-6,cy-6,C.LIME);p(cx+4,cy-7,C.LIME);p(cx-3,cy-8,C.NGRN);p(cx+2,cy-8,C.ACID);}
        if(lv>=3){p(cx-8,cy-5,C.BGRN);p(cx+6,cy-6,C.YGRN);p(cx,cy-9,C.WHITE);p(cx-5,cy-8,C.ACID);}
      } else if(br){
        p(cx,cy-innerR-1,C.LIME);p(cx-1,cy-innerR-2,C.NGRN);p(cx+1,cy-innerR-2,C.BGRN);
        if(lv>=2){p(cx-2,cy-innerR-1,C.NGRN);p(cx+2,cy-innerR-1,C.LIME);}
      }
      // Dripping acid from crescent bottom
      p(cx,cy+outerR-1,br?C.LIME:C.NGRN);p(cx-1,cy+outerR,C.DGRN);
      if(lv>=2){p(cx+1,cy+outerR,C.DGRN);}
      if(s===3){p(cx-2,cy,C.DGRN);p(cx+2,cy+1,C.DGRN);}
    },
    // 5. Hive Spire — tall spore-releasing tower (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[16,18,20,24][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Main spire — taller/wider at higher levels
      const sw=[3,4,4,5][lv], sh=[18,20,22,25][lv], sy=27-sh;
      aSpire(p,b,16-Math.floor(sw/2),sy,sh,sw,C.CHIT,C.CHLT,C.OLIV);
      // Side spires — more and taller at higher levels
      if(lv>=0){
        const ssh=[12,14,16,18][lv], ssw=[2,2,3,3][lv];
        aSpire(p,b,16-Math.floor(sw/2)-ssw-2,27-ssh+2,ssh,ssw,C.DKOLV,C.CHIT,C.CHLT);
        aSpire(p,b,16+Math.ceil(sw/2)+2,27-ssh,ssh,ssw,C.DKOLV,C.CHIT,C.CHLT);
      }
      if(lv>=2){
        aSpire(p,b,16-Math.floor(sw/2)-6,27-10,10,2,C.DKOLV,C.CHIT,C.CHLT);
        aSpire(p,b,16+Math.ceil(sw/2)+5,27-10,10,2,C.DKOLV,C.CHIT,C.CHLT);
      }
      if(lv>=3){
        aSpire(p,b,16-Math.floor(sw/2)-8,27-8,8,2,C.VDGRN,C.DKOLV,C.CHIT);
        aSpire(p,b,16+Math.ceil(sw/2)+7,27-8,8,2,C.VDGRN,C.DKOLV,C.CHIT);
      }
      // Hex pattern on spires
      const hexN=[3,4,5,6][lv];
      for(let i=0;i<hexN;i++){const yy=sy+2+i*3;if(yy<27){p(16,yy,C.NGRN);p(16+1,yy+1,C.DGRN);}}
      // Spore caps at top — bigger at higher levels
      const capW=[2,3,4,6][lv];
      b(16-Math.floor(capW/2),sy,capW,2,fl?C.LIME:C.NGRN);b(16-Math.floor((capW-2)/2),sy-1,Math.max(2,capW-2),1,br?C.ACID:C.LIME);
      if(lv>=2){b(16-Math.floor(capW/2)-1,sy+1,capW+2,1,fl?C.BGRN:C.DGRN);}
      if(lv>=3){p(16,sy-2,fl?C.WHITE:C.ACID);}
      // Floating spores — more at higher levels
      if(fl){
        const sporePos=[[12,0,C.ACID],[19,1,C.LIME],[8,2,C.BGRN],[23,0,C.LIME],[10,3,C.YGRN],[21,2,C.ACID],[6,1,C.LIME],[25,3,C.ACID]];
        const sporeN=[4,5,6,8][lv];
        for(let i=0;i<sporeN;i++)p(sporePos[i][0] as number,sporePos[i][1] as number,sporePos[i][2] as string);
      }
      if(br){
        p(13,1,C.LIME);p(18,2,C.NGRN);
        if(lv>=1)p(8,5,C.BGRN);
        if(lv>=2){p(23,4,C.BGRN);p(10,3,C.NGRN);}
      }
      // Bioluminescent nodes — more at higher levels
      p(16,sy+2,br?C.ACID:C.LIME);
      if(lv>=1){p(10,18,br?C.LIME:C.NGRN);p(22,16,br?C.LIME:C.NGRN);}
      if(lv>=2){p(8,20,C.NGRN);p(24,18,C.NGRN);}
      if(lv>=3){p(6,22,br?C.LIME:C.DGRN);p(26,20,br?C.LIME:C.DGRN);p(16,sy+1,fl?C.WHITE:C.ACID);}
      if(s===3){p(16,sy+1,C.DGRN);p(10,17,C.DGRN);}
    },
    // 6. Brood Mother — WIDE maternal creature with wing-like carapace sheltering eggs (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[18,20,22][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Wide body — horizontal oval, much wider than tall
      const rx=[7,9,11][lv], ry=[3,4,4][lv], bcy=16;
      for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){
        if((x*x)/(rx*rx)+(y*y)/(ry*ry)<=1){
          const d=Math.sqrt((x*x)/(rx*rx)+(y*y)/(ry*ry));
          p(16+x,bcy+y,d<0.4?C.CHLT:d<0.7?C.CHIT:C.DKOLV);
        }
      }
      // Wing-like carapace extensions — curve down on sides to shelter eggs below
      const wingW=[3,4,5][lv];
      // Left wing — extends from body, curves down
      for(let i=0;i<wingW;i++){
        const wx=16-rx-1-i, wy=bcy-ry+1+i;
        b(wx,wy,2,2,C.CHIT);p(wx,wy,C.CHLT);
        if(wy+2<27)p(wx,wy+2,C.DKOLV);
      }
      // Right wing — mirror
      for(let i=0;i<wingW;i++){
        const wx=16+rx-1+i, wy=bcy-ry+1+i;
        b(wx,wy,2,2,C.CHIT);p(wx+1,wy,C.CHLT);
        if(wy+2<27)p(wx+1,wy+2,C.DKOLV);
      }
      // Wing membrane patterns at higher levels
      if(lv>=1){
        p(16-rx-2,bcy-ry+2,C.OLIV);p(16+rx+2,bcy-ry+2,C.OLIV);
        p(16-rx-3,bcy,C.NGRN);p(16+rx+3,bcy,C.NGRN);
      }
      if(lv>=2){
        p(16-rx-4,bcy-ry+4,C.OLIV);p(16+rx+4,bcy-ry+4,C.OLIV);
        p(16-rx-3,bcy+1,C.DGRN);p(16+rx+3,bcy+1,C.DGRN);
      }
      // Small head at top — tiny compared to body
      const hw=[3,3,4][lv];
      b(16-Math.floor(hw/2),bcy-ry-3,hw,3,C.CHLT);b(16-Math.floor((hw-2)/2),bcy-ry-4,Math.max(2,hw-2),1,C.OLIV);
      // Eyes
      p(16-Math.floor(hw/2),bcy-ry-2,fl?C.ACID:C.LIME);p(16+Math.ceil(hw/2)-1,bcy-ry-2,fl?C.ACID:C.LIME);
      // Antennae
      p(16-Math.floor(hw/2)-1,bcy-ry-4,C.CHIT);p(16+Math.ceil(hw/2),bcy-ry-4,C.CHIT);
      // EGGS underneath body — visible between legs, sheltered by wings
      const eggY=bcy+ry+1;
      const eggPositions=[
        [12,eggY],[14,eggY],[16,eggY],[18,eggY],[20,eggY],
        [13,eggY+2],[15,eggY+2],[17,eggY+2],[19,eggY+2],
        [11,eggY+1],[21,eggY+1],
      ];
      const eggN=[4,7,10][lv];
      for(let i=0;i<eggN;i++){
        const [ex,ey]=eggPositions[i%eggPositions.length];
        if(ey<27){
          p(ex,ey,fl?C.LTYEL:br?C.ACID:C.YGRN);p(ex,ey+1,fl?C.YGRN:C.DGRN);
        }
      }
      // Legs — short, wide stance to straddle eggs
      const legPairs=[3,4,4][lv];
      for(let i=0;i<legPairs;i++){
        const ly=bcy+1+i, lSpread=rx+1+i;
        if(ly<27){
          p(16-lSpread,ly,C.CHIT);p(16-lSpread-1,ly+1,C.DKOLV);
          p(16+lSpread,ly,C.CHIT);p(16+lSpread+1,ly+1,C.DKOLV);
        }
      }
      // Egg launching (fire state)
      if(fl){
        p(16,bcy-ry-5,C.ACID);p(15,bcy-ry-7,C.YGRN);p(17,bcy-ry-8,C.LTYEL);
        p(14,bcy-ry-6,C.LIME);p(18,bcy-ry-7,C.LIME);
        if(lv>=1){p(13,bcy-ry-7,C.NGRN);p(19,bcy-ry-8,C.NGRN);}
        if(lv>=2){p(12,bcy-ry-8,C.YGRN);p(20,bcy-ry-9,C.LTYEL);p(16,bcy-ry-9,C.ACID);}
      }
      // Pulsing veins on carapace
      p(16-rx+2,bcy-1,br?C.LIME:C.NGRN);p(16+rx-2,bcy-1,br?C.LIME:C.NGRN);
      if(lv>=1){p(16,bcy,C.NGRN);}
      if(lv>=2){p(16-rx+1,bcy,br?C.LIME:C.NGRN);p(16+rx-1,bcy,br?C.LIME:C.NGRN);}
      if(s===3){p(15,bcy-1,C.DGRN);p(17,bcy+1,C.DGRN);}
    },
    // 7. Swarmling (MOBILE UNIT) — 2 levels, Row0=idle, Row1=walk, Row2=attack, Row3=death
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16,cy=16;
      // lv=0: small bug, lv=1: slightly larger, sharper mandibles
      const sc=lv===0?0:1; // size class
      if(s===0){
        // IDLE
        const bw=6+sc*2, bh=4+sc;
        b(cx-Math.floor(bw/2),cy-2,bw,bh,C.CHIT);b(cx-Math.floor(bw/2)+1,cy-2,bw-2,bh-1,C.CHLT);
        // Head
        const hw=4+sc;
        b(cx-Math.floor(hw/2),cy-5-sc,hw,3+sc,C.CHLT);b(cx-Math.floor((hw-2)/2),cy-6-sc,Math.max(2,hw-2),1,C.OLIV);
        p(cx-Math.floor(hw/2),cy-4-sc,C.LIME);p(cx+Math.ceil(hw/2)-1,cy-4-sc,C.LIME);
        if(sc>0){p(cx,cy-4-sc,C.ACID);}
        // Antennae
        p(cx-Math.floor(hw/2)-1,cy-7-sc,C.CHIT);p(cx-Math.floor(hw/2)-2,cy-8-sc,C.NGRN);
        p(cx+Math.ceil(hw/2),cy-7-sc,C.CHIT);p(cx+Math.ceil(hw/2)+1,cy-8-sc,C.NGRN);
        // Mandibles — sharper at lv1
        p(cx-Math.floor(hw/2)-1,cy-5-sc,C.CHIT);p(cx+Math.ceil(hw/2),cy-5-sc,C.CHIT);
        if(sc>0){p(cx-Math.floor(hw/2)-2,cy-5-sc,C.OLIV);p(cx+Math.ceil(hw/2)+1,cy-5-sc,C.OLIV);p(cx-Math.floor(hw/2)-2,cy-6-sc,C.LIME);p(cx+Math.ceil(hw/2)+1,cy-6-sc,C.LIME);}
        // Legs (3+sc pairs)
        const legPairs=3+sc;
        for(let i=0;i<legPairs;i++){
          const ly=cy-1+i*(sc>0?1:1);
          p(cx-Math.floor(bw/2)-1,ly,C.CHIT);p(cx-Math.floor(bw/2)-2,ly+1,C.DKOLV);
          p(cx+Math.ceil(bw/2),ly,C.CHIT);p(cx+Math.ceil(bw/2)+1,ly+1,C.DKOLV);
        }
        // Glow spots
        p(cx-1,cy-1,C.NGRN);p(cx+1,cy,C.NGRN);
        if(sc>0){p(cx,cy-1,C.LIME);p(cx-Math.floor(bw/2)+1,cy,C.NGRN);}
        // Chitin plating at lv1
        if(sc>0){b(cx-Math.floor(bw/2),cy-2,bw,1,C.OLIV);}
      } else if(s===1){
        // WALK
        const bw=6+sc*2;
        b(cx-Math.floor(bw/2),cy-1,bw,4+sc,C.CHIT);b(cx-Math.floor(bw/2)+1,cy-1,bw-2,3+sc,C.CHLT);
        const hw=4+sc;
        b(cx-Math.floor(hw/2)+1,cy-4-sc,hw,3+sc,C.CHLT);b(cx-Math.floor((hw-2)/2)+1,cy-5-sc,Math.max(2,hw-2),1,C.OLIV);
        p(cx-Math.floor(hw/2)+1,cy-3-sc,C.LIME);p(cx+Math.ceil(hw/2),cy-3-sc,C.LIME);
        if(sc>0){p(cx+1,cy-3-sc,C.ACID);}
        // Antennae forward
        p(cx-Math.floor(hw/2),cy-6-sc,C.CHIT);p(cx-Math.floor(hw/2)+1,cy-7-sc,C.NGRN);
        p(cx+Math.ceil(hw/2)+1,cy-6-sc,C.CHIT);p(cx+Math.ceil(hw/2)+2,cy-7-sc,C.NGRN);
        // Walking legs — alternating
        p(cx-Math.floor(bw/2)-1,cy,C.CHIT);p(cx-Math.floor(bw/2)-2,cy-1,C.DKOLV);
        p(cx+Math.ceil(bw/2),cy+1+sc,C.CHIT);p(cx+Math.ceil(bw/2)+1,cy+2+sc,C.DKOLV);
        p(cx-Math.floor(bw/2)-1,cy+2+sc,C.CHIT);p(cx-Math.floor(bw/2)-2,cy+3+sc,C.DKOLV);
        p(cx+Math.ceil(bw/2),cy-1,C.CHIT);p(cx+Math.ceil(bw/2)+1,cy-2,C.DKOLV);
        if(sc>0){
          p(cx-Math.floor(bw/2)-1,cy+3+sc,C.DKOLV);p(cx+Math.ceil(bw/2),cy+3+sc,C.DKOLV);
        } else {
          p(cx-3,cy+3,C.DKOLV);p(cx+2,cy+3,C.DKOLV);
        }
        p(cx,cy,C.NGRN);
        if(sc>0){b(cx-Math.floor(bw/2),cy-1,bw,1,C.OLIV);}
      } else if(s===2){
        // ATTACK (bite)
        const bw=6+sc*2;
        b(cx-Math.floor(bw/2),cy-1,bw,4+sc,C.CHIT);b(cx-Math.floor(bw/2)+1,cy-1,bw-2,3+sc,C.CHLT);
        const hw=4+sc;
        b(cx-Math.floor(hw/2)+1,cy-4-sc,hw,3+sc,C.CHLT);b(cx-Math.floor((hw-2)/2)+1,cy-5-sc,Math.max(2,hw-2),1,C.OLIV);
        // Eyes glow bright
        p(cx-Math.floor(hw/2)+1,cy-3-sc,C.ACID);p(cx+Math.ceil(hw/2),cy-3-sc,C.ACID);
        if(sc>0){p(cx+1,cy-3-sc,C.WHITE);}
        // Mandibles wide open — wider at lv1
        const mOff=sc>0?1:0;
        p(cx-3-mOff,cy-4-sc,C.CHIT);p(cx-4-mOff,cy-5-sc,C.OLIV);p(cx-5-mOff,cy-5-sc,C.LIME);
        p(cx+4+mOff,cy-4-sc,C.CHIT);p(cx+5+mOff,cy-5-sc,C.OLIV);p(cx+6+mOff,cy-5-sc,C.LIME);
        if(sc>0){p(cx-6-mOff,cy-4-sc,C.LIME);p(cx+7+mOff,cy-4-sc,C.LIME);}
        // Bite effect
        p(cx,cy-6-sc,C.ACID);p(cx+1,cy-7-sc,C.YGRN);
        if(sc>0){p(cx-1,cy-7-sc,C.LIME);p(cx+2,cy-7-sc,C.LIME);}
        // Legs braced
        p(cx-Math.floor(bw/2)-1,cy,C.CHIT);p(cx-Math.floor(bw/2)-2,cy+1,C.DKOLV);
        p(cx+Math.ceil(bw/2),cy,C.CHIT);p(cx+Math.ceil(bw/2)+1,cy+1,C.DKOLV);
        p(cx-Math.floor(bw/2)-1,cy+2+sc,C.CHIT);p(cx-Math.floor(bw/2)-2,cy+3+sc,C.DKOLV);
        p(cx+Math.ceil(bw/2),cy+2+sc,C.CHIT);p(cx+Math.ceil(bw/2)+1,cy+3+sc,C.DKOLV);
        p(cx-1,cy,C.LIME);p(cx+1,cy+1,C.LIME);
        if(sc>0){p(cx,cy+1,C.NGRN);}
      } else {
        // DEATH — crumpled, dissolving (same for both levels, lv1 slightly bigger remains)
        const bw=6+sc*2;
        b(cx-Math.floor(bw/2),cy+1,bw,3,C.DKOLV);b(cx-Math.floor(bw/2)+1,cy+1,bw-2,2,C.CHIT);
        p(cx-1,cy,C.CHLT);p(cx+1,cy,C.CHLT);
        // Collapsed legs
        p(cx-Math.floor(bw/2)-1,cy+2,C.DKOLV);p(cx+Math.ceil(bw/2),cy+2,C.DKOLV);
        p(cx-Math.floor(bw/2)-2,cy+3,C.DKBIO);p(cx+Math.ceil(bw/2)+1,cy+3,C.DKBIO);
        // Acid pool
        b(cx-Math.floor(bw/2),cy+3,bw,2,C.DGRN);b(cx-Math.floor(bw/2)+1,cy+4,bw-2,1,C.NGRN);
        p(cx,cy+3,C.LIME);p(cx-1,cy+4,C.SLIME);
        if(sc>0){p(cx+1,cy+4,C.SLIME);p(cx-2,cy+3,C.LIME);}
        // Fading glow
        p(cx,cy+1,C.DGRN);p(cx-2,cy+2,C.VDGRN);
      }
    },
    // 8. Overmind (Ultimate) — giant alien brain/eye on organic throne (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const bw=[22,24,26][lv];
      aBase(p,b,27,bw,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Organic throne structure — grows with level
      const tw=[16,18,20][lv], th=[6,7,8][lv], tx=16-Math.floor(tw/2);
      b(tx,27-th,tw,th,C.CHIT);b(tx+1,27-th-1,tw-2,th,C.CHLT);
      b(tx-1,27-th+2,2,th,C.DKOLV);b(tx+tw-1,27-th+2,2,th,C.DKOLV);
      // Throne spires — taller at higher levels
      const tsh=[6,8,10][lv];
      aSpire(p,b,tx,27-th-tsh,tsh,2,C.CHIT,C.CHLT,C.OLIV);
      aSpire(p,b,tx+tw-2,27-th-tsh,tsh,2,C.CHIT,C.CHLT,C.OLIV);
      if(lv>=2){
        aSpire(p,b,tx-2,27-th-tsh+4,tsh-4,2,C.DKOLV,C.CHIT,C.CHLT);
        aSpire(p,b,tx+tw,27-th-tsh+4,tsh-4,2,C.DKOLV,C.CHIT,C.CHLT);
      }
      // Brain dome — larger at higher levels
      const brx=[5,6,7][lv], bry=[4,5,5][lv], bcy=[9,8,7][lv];
      for(let y=-bry;y<=3;y++)for(let x=-brx;x<=brx;x++){
        if((x*x)/(brx*brx)+(y*y)/(bry*bry)<=1){
          const d=Math.sqrt(x*x+y*y);
          p(16+x,bcy+y,d<2?C.LGRN:d<4?C.NGRN:d<Math.max(brx,bry)*0.85?C.DGRN:C.VDGRN);
        }
      }
      // Brain folds — more at higher levels
      const foldN=[3,4,5][lv];
      for(let i=0;i<foldN;i++){
        const fx=16-Math.floor(foldN/2)*2+i*2,fy=bcy-2+Math.round(Math.sin(i*1.2)*1.5);
        p(fx,fy,C.DDGRN);p(fx+1,fy+1,C.DGRN);
      }
      // Central eye — larger at higher levels
      const ew=[3,4,5][lv];
      b(16-Math.floor(ew/2),bcy-1,ew,3,C.DKBIO);b(16-Math.floor((ew-2)/2),bcy-1,Math.max(2,ew-2),3,fl?C.RED:C.ORED);
      p(16-1,bcy,fl?C.WHITE:C.ACID);p(16,bcy,fl?C.LTYEL:C.LIME);
      if(lv>=1){p(16+1,bcy,fl?C.WHITE:C.ORED);}
      if(lv>=2){p(16-2,bcy,fl?C.ORED:C.RED);p(16+2,bcy,fl?C.ORED:C.RED);}
      // Eye glow
      if(br){p(16-brx+1,bcy,C.LIME);p(16+brx-1,bcy,C.LIME);}
      // Psychic waves — more at higher levels
      if(fl){
        const waveN=[8,10,12][lv];
        const r1=[6,7,8][lv], r2=[8,9,10][lv];
        for(let i=0;i<waveN;i++){
          const a=i*Math.PI*2/waveN;
          p(16+Math.round(Math.cos(a)*r1),bcy+Math.round(Math.sin(a)*r1),C.ACID);
          p(16+Math.round(Math.cos(a)*r2),bcy+Math.round(Math.sin(a)*r2),C.LIME);
        }
        if(lv>=2){
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4;
            p(16+Math.round(Math.cos(a)*(r2+2)),bcy+Math.round(Math.sin(a)*(r2+2)),C.NGRN);
          }
        }
      }
      if(br){
        const waveN=[6,8,10][lv];
        for(let i=0;i<waveN;i++){
          const a=i*Math.PI*2/waveN;
          p(16+Math.round(Math.cos(a)*([7,8,9][lv])),bcy+Math.round(Math.sin(a)*([7,8,9][lv])),C.NGRN);
        }
      }
      // Nerve tendrils from brain to throne — more at higher levels
      aTendril(p,16-brx+2,bcy+bry,tx+2,27-th,C.DGRN,fl);
      aTendril(p,16+brx-2,bcy+bry,tx+tw-2,27-th,C.DGRN,fl);
      aTendril(p,16,bcy+bry,16,27-th,C.NGRN,fl);
      if(lv>=1){aTendril(p,16-brx+4,bcy+bry,tx+4,27-th,C.NGRN,fl);}
      if(lv>=2){aTendril(p,16+brx-4,bcy+bry,tx+tw-4,27-th,C.NGRN,fl);aTendril(p,16-brx,bcy+bry-2,tx,27-th+2,C.DGRN,fl);}
      // Hex cells on throne — more at higher levels
      const hexPos=[[tx+2,27-th+2],[tx+6,27-th+3],[tx+tw-3,27-th+2],[tx+tw-7,27-th+3],[tx+4,27-th+5],[tx+tw-5,27-th+5]];
      const hexN=[4,5,6][lv];
      for(let i=0;i<hexN;i++){
        const [hpx,hpy]=hexPos[i%hexPos.length];
        p(hpx,hpy,br?C.NGRN:C.DGRN);
      }
      if(s===3){p(16-1,bcy-2,C.VDGRN);p(16+1,bcy+1,C.VDGRN);}
    },
  ];
  // Render: 16 rows (4 levels × 4 states), 8 cols
  const cols=8,rows=16;
  for(let col=0;col<cols;col++){
    const maxLv=TOWER_LEVELS[col];
    for(let lvIdx=0;lvIdx<4;lvIdx++){
      const lv=Math.min(lvIdx,maxLv-1); // clamp to tower's max level
      for(let state=0;state<4;state++){
        const row=lvIdx*4+state;
        fns[col](ctx,[col*T_CELL,row*T_CELL],state,lv);
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (8×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

export function drawProjectiles(ctx:any){
  const fns=[
    // 1. Spitter: acid glob -> acid splash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Acid glob in flight
        const sz=[2,3,2][f],bob=[0,-1,1][f];
        for(let y=-sz;y<=sz;y++)for(let x=-sz;x<=sz;x++){
          if(x*x+y*y<=sz*sz+1){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y+bob,d<1?C.ACID:d<sz*0.7?C.LIME:C.NGRN);
          }
        }
        // Drip trail
        p(cx,cy+sz+1+bob,C.DGRN);p(cx-1,cy+sz+2+bob,C.VDGRN);
        if(f>0){p(cx+1,cy-sz-1+bob,C.NGRN);}
      } else if(f===3){
        // Impact - acid splash
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.LIME);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.ACID);
        }
        b(cx-1,cy-1,2,2,C.ACID);p(cx,cy,C.WHITE);
      } else if(f===4){
        // Splash spreading
        for(let i=0;i<10;i++){
          const a=i*Math.PI/5;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.NGRN);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.LIME);
        }
        p(cx,cy,C.LIME);p(cx-1,cy+1,C.DGRN);
      } else {
        // Fading
        [[3,5],[12,4],[6,11],[10,12],[7,3],[9,13]].forEach(([x,y],i)=>p(x,y,i%2?C.DGRN:C.NGRN));
        p(cx,cy,C.DGRN);
      }
    },
    // 2. Stinger: stinger dart -> poison burst
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Stinger dart
        const ang=[-1,0,1][f];
        for(let i=0;i<8;i++){
          const w=i<2?1:i<6?2:1,sx=cx-Math.floor(w/2)+ang*(i<4?0:1);
          b(sx,cy-4+i,w,1,i<2?C.ACID:i<4?C.LIME:i<6?C.CHLT:C.CHIT);
        }
        p(cx,cy-5,C.WHITE);p(cx,cy-4,C.ACID);
      } else if(f===3){
        // Poison burst
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.LIME:C.NGRN);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.ACID);
        }
        p(cx,cy,C.WHITE);
      } else if(f===4){
        // Poison expanding
        for(let i=0;i<10;i++){
          const a=i*Math.PI/5,r=4+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DGRN);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.NGRN);
        }
        p(cx,cy,C.LIME);
      } else {
        [[4,5],[11,6],[5,10],[10,4],[7,12],[9,3]].forEach(([x,y],i)=>p(x,y,i%2?C.DGRN:C.VDGRN));
      }
    },
    // 3. Swarm Node: energy pulse -> pulse ring
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Energy pulse growing
        const r=[2,3,4][f];
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.LIME:C.BGRN);
        }
        p(cx,cy,f===2?C.WHITE:C.ACID);
        if(f>0)p(cx-1,cy,C.LIME);
      } else if(f===3){
        // Pulse ring burst
        for(let r=3;r<=5;r++)for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r===3?C.ACID:r===4?C.LIME:C.NGRN);
        }
        p(cx,cy,C.WHITE);
      } else if(f===4){
        // Ring expanding
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.NGRN);
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.LIME);
        }
        p(cx,cy,C.LIME);
      } else {
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.VDGRN);
        }
        p(cx,cy,C.DGRN);
      }
    },
    // 4. Acid Sprayer: acid stream -> acid pool
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Acid stream
        const len=[4,6,8][f];
        for(let i=0;i<len;i++){
          const w=i<2?1:2,sx=cx-Math.floor(w/2)+Math.round(Math.sin(i*0.8)*1);
          b(sx,cy-Math.floor(len/2)+i,w,1,i<len*0.3?C.ACID:i<len*0.7?C.LIME:C.NGRN);
        }
        p(cx,cy-Math.floor(len/2),C.WHITE);
        if(f>0){p(cx-2,cy,C.NGRN);p(cx+2,cy-1,C.NGRN);}
      } else if(f===3){
        // Acid pool forming
        b(cx-3,cy,6,2,C.DGRN);b(cx-2,cy,4,2,C.LIME);b(cx-1,cy,2,1,C.ACID);
        p(cx,cy,C.WHITE);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*2),C.NGRN);}
      } else if(f===4){
        // Pool spreading
        b(cx-4,cy-1,8,3,C.DGRN);b(cx-3,cy-1,6,3,C.NGRN);b(cx-2,cy,4,1,C.LIME);
        p(cx-1,cy,C.SLIME);p(cx+1,cy-1,C.SLIME);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*2),C.VDGRN);}
      } else {
        b(cx-3,cy,6,1,C.VDGRN);b(cx-2,cy,4,1,C.DGRN);p(cx,cy,C.NGRN);
      }
    },
    // 5. Hive Spire: chain spore -> spore scatter
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Chain spore - linked spore pods
        const n=[2,3,3][f];
        for(let i=0;i<n;i++){
          const y=cy-3+i*3,x=cx+Math.round(Math.sin(i*1.2)*2);
          b(x-1,y,2,2,C.NGRN);p(x,y,C.LIME);
          if(i<n-1)p(x,y+2,C.DGRN); // link
        }
        if(f===2){p(cx-3,cy-1,C.BGRN);p(cx+3,cy,C.BGRN);}
      } else if(f===3){
        // Spore scatter burst
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,r=3+i%2;
          b(cx+Math.round(Math.cos(a)*r)-1,cy+Math.round(Math.sin(a)*r)-1,2,2,C.NGRN);
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.LIME);
        }
        p(cx,cy,C.ACID);
      } else if(f===4){
        // Scattered spores drifting
        [[3,3],[12,5],[5,10],[10,11],[7,2],[9,13],[2,7],[13,8]].forEach(([x,y],i)=>{
          p(x,y,i%3===0?C.LIME:i%2?C.NGRN:C.DGRN);
          if(i%3===0)p(x+1,y,C.DGRN);
        });
      } else {
        [[4,6],[11,4],[6,11],[9,8],[3,9],[12,10]].forEach(([x,y],i)=>p(x,y,i%2?C.VDGRN:C.DGRN));
      }
    },
    // 6. Brood Mother: egg launch -> egg crack
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Egg in flight
        const bob=[0,-1,1][f],sz=[2,3,2][f];
        b(cx-1,cy-sz+bob,2,sz*2,C.YGRN);b(cx-1,cy-sz+1+bob,2,sz*2-2,C.ACID);
        p(cx,cy-sz+bob,C.LTYEL);p(cx-1,cy+sz-1+bob,C.DGRN);
        // Rotation wobble
        if(f===1){p(cx+1,cy-1+bob,C.LIME);p(cx-2,cy+bob,C.LIME);}
      } else if(f===3){
        // Egg crack - hatching
        b(cx-2,cy-1,4,3,C.YGRN);b(cx-1,cy-1,2,2,C.ACID);
        // Crack lines
        p(cx-2,cy-1,C.DKBIO);p(cx+1,cy,C.DKBIO);p(cx,cy+1,C.DKBIO);
        // Shell fragments
        p(cx-3,cy-2,C.YGRN);p(cx+3,cy-1,C.YGRN);p(cx-1,cy+2,C.DGRN);
        p(cx,cy,C.LIME);
      } else if(f===4){
        // Egg burst - fragments scatter
        [[cx-3,cy-3],[cx+3,cy-2],[cx-4,cy+2],[cx+4,cy+1],[cx-1,cy-4],[cx+2,cy+3]].forEach(([x,y],i)=>{
          p(x,y,i%2?C.YGRN:C.DGRN);
        });
        b(cx-1,cy-1,2,2,C.NGRN);p(cx,cy,C.LIME);
        // Acid splash
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.DGRN);}
      } else {
        // Fade
        [[5,5],[10,7],[7,10],[4,8],[11,5]].forEach(([x,y],i)=>p(x,y,i%2?C.VDGRN:C.DGRN));
        p(cx,cy,C.DGRN);
      }
    },
    // 7. Swarmling: bite snap -> blood splash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Bite snap - mandible closing
        const open=[3,2,0][f];
        // Top mandible
        b(cx-2,cy-2-open,4,2,C.CHLT);p(cx-1,cy-3-open,C.OLIV);p(cx+1,cy-3-open,C.OLIV);
        // Bottom mandible
        b(cx-2,cy+open,4,2,C.CHLT);p(cx-1,cy+1+open,C.OLIV);p(cx+1,cy+1+open,C.OLIV);
        // Teeth
        p(cx-2,cy-1-open,C.ACID);p(cx+1,cy-1-open,C.ACID);
        p(cx-2,cy+open,C.ACID);p(cx+1,cy+open,C.ACID);
        if(f===2){p(cx,cy,C.RED);p(cx-1,cy,C.ORED);}
      } else if(f===3){
        // Blood splash impact
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.RED:C.ORED);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.DRED);
        }
        p(cx,cy,C.RED);p(cx-1,cy,C.ORED);
      } else if(f===4){
        // Blood scatter
        [[3,4],[12,5],[5,11],[10,3],[7,12],[9,2],[2,8],[13,9]].forEach(([x,y],i)=>{
          p(x,y,i%3===0?C.RED:i%2?C.DRED:C.ORED);
        });
        p(cx,cy,C.DRED);
      } else {
        [[4,6],[11,5],[6,10],[10,9],[3,8]].forEach(([x,y],i)=>p(x,y,i%2?C.DRED:C.DKBIO));
      }
    },
    // 8. Overmind: psychic wave -> mind blast ring
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Psychic wave - expanding ring
        const r=[2,3,4][f];
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.ACID:C.LIME);
        }
        // Inner glow
        p(cx,cy,f===0?C.WHITE:C.ACID);
        if(f>0){p(cx-1,cy,C.LIME);p(cx+1,cy,C.LIME);}
        if(f===2){p(cx,cy-1,C.BGRN);p(cx,cy+1,C.BGRN);}
      } else if(f===3){
        // Mind blast ring
        for(let r=3;r<=6;r++)for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          const col=r<4?C.ACID:r<5?C.LIME:C.NGRN;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),col);
        }
        b(cx-1,cy-1,2,2,C.ACID);p(cx,cy,C.WHITE);
      } else if(f===4){
        // Blast expanding
        for(let i=0;i<16;i++){
          const a=i*Math.PI/8,r=5+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.LIME:C.NGRN);
        }
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DGRN);
        }
        p(cx,cy,C.LIME);
      } else {
        // Fading
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.VDGRN);
        }
        p(cx,cy,C.DGRN);
      }
    },
  ];
  const cols=8,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

export function drawHero(ctx:any){
  // Necromancer: dark-robed figure with skull staff, green energy, skeletal hands
  // dir: 0=down, 1=side, 2=up
  function drawChar(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,float=false,armSwing=0,
      siphon=false,curse=false,drain=false,harvest=false,hurt=false}=opts;
    const cx=16;

    // Harvest skulls flying
    if(harvest){
      [[4,3,C.WHITE],[27,5,C.PGRN],[2,18,C.WHITE],[29,14,C.PGRN],
       [6,32,C.WHITE],[26,28,C.PGRN],[3,42,C.WHITE],[28,38,C.PGRN]].forEach(([mx,my,cl])=>{
        p(mx as number,my as number,cl as string);
        p((mx as number)+1,(my as number)+1,C.DKBIO);
        p((mx as number)-1,(my as number)+1,C.DKBIO);
      });
    }

    const lean=float?0:atk&&atkFrame>0?1:0;
    const headY=float?5:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx=cx+lean;

    // ROBE (behind body)
    if(dir===2||dir===0){
      const cY=torY+2,sp=float?2:curse?2:1;
      for(let i=0;i<18;i++){
        const w=6+Math.floor(i*0.5)+sp,sx=bx-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(float?1.5:0))*0.8);
        const cl=i<4?C.DKBIO:i<10?C.VDGRN:i<14?C.DKBIO:C.BLACK;
        for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Edge highlights
      for(let i=0;i<14;i++){
        const w=6+Math.floor(i*0.5)+sp,sx=bx-Math.floor(w/2)+Math.round(Math.sin(i*0.3+(float?1.5:0))*0.8);
        if(cY+i<62){p(sx,cY+i,C.DDGRN);if(sx+w-1<32)p(sx+w-1,cY+i,i%3===0?C.DDGRN:C.VDGRN);}
      }
      // Tattered bottom
      const bY=Math.min(cY+16,61);
      for(let x=-6;x<7;x++){const px_=bx+x;if(px_>=0&&px_<32&&(px_+bY)%3!==0)p(px_,bY,C.BLACK);if(px_>=0&&px_<32&&(px_+bY)%2===0&&bY+1<63)p(px_,bY+1,C.DKBIO);}
    }

    // HOOD
    if(dir===0){
      // Down facing
      b(bx-4,headY,8,2,C.DKBIO);b(bx-5,headY+2,10,3,C.DKBIO);
      b(bx-4,headY+1,8,1,C.VDGRN);b(bx-3,headY-1,6,1,C.VDGRN);b(bx-2,headY-2,4,1,C.DDGRN);
      p(bx-1,headY-3,C.DDGRN);p(bx,headY-3,C.DGRN);
      b(bx+5,headY+3,2,3,C.DKBIO);p(bx+6,headY+2,C.DKBIO);
      // Inner void
      b(bx-3,headY+2,6,3,C.BLACK);b(bx-4,headY+3,8,2,C.BLACK);
      // Glowing eyes
      const eg=curse||harvest;
      p(bx-2,headY+3,eg?C.ACID:C.LIME);p(bx-1,headY+3,eg?C.WHITE:C.BGRN);
      p(bx+1,headY+3,eg?C.ACID:C.LIME);p(bx+2,headY+3,eg?C.WHITE:C.BGRN);
      p(bx-2,headY+4,C.DGRN);p(bx+2,headY+4,C.DGRN);
      b(bx-4,headY,8,1,C.DDGRN);p(bx-5,headY+2,C.DDGRN);
    } else if(dir===1){
      // Side profile
      b(bx-3,headY,6,2,C.DKBIO);b(bx-4,headY+2,8,3,C.DKBIO);
      b(bx-3,headY+1,5,1,C.VDGRN);b(bx-2,headY-1,4,1,C.VDGRN);b(bx-1,headY-2,3,1,C.DDGRN);
      p(bx,headY-3,C.DGRN);
      b(bx+4,headY+3,2,3,C.DKBIO);p(bx+5,headY+2,C.DKBIO);
      b(bx-3,headY+2,5,3,C.BLACK);
      const eg=curse||harvest;
      p(bx+1,headY+3,eg?C.ACID:C.LIME);p(bx+2,headY+3,eg?C.WHITE:C.BGRN);
      p(bx+1,headY+4,C.DGRN);
      b(bx-3,headY,6,1,C.DDGRN);
    } else {
      // Up - back of hood
      b(bx-4,headY,8,5,C.DKBIO);b(bx-3,headY,6,4,C.VDGRN);
      b(bx-3,headY-1,6,1,C.VDGRN);b(bx-2,headY-2,4,1,C.DDGRN);
      p(bx-1,headY-3,C.DDGRN);p(bx,headY-3,C.DGRN);
      b(bx+4,headY+3,2,3,C.DKBIO);p(bx+5,headY+2,C.DKBIO);
      b(bx-4,headY,8,1,C.DDGRN);
      p(bx-1,headY+1,C.DDGRN);p(bx,headY+2,C.DDGRN);p(bx+1,headY+1,C.DDGRN);
    }

    // SKULL COLLAR (visible from front/side)
    if(dir!==2){
      const sY=torY-1;
      // Small skull on collar
      b(bx-2,sY,3,2,C.WHITE);b(bx-2,sY,3,1,C.PGRN);
      p(bx-2,sY+1,C.DKBIO);p(bx,sY+1,C.DKBIO); // eye sockets
      p(bx-1,sY+2,C.DKGRAY); // jaw
    }

    // TORSO
    b(bx-3,torY,6,8,C.DKBIO);b(bx-2,torY,4,8,C.VDGRN);
    if(dir===0){
      // Rib-like lines on robe
      p(bx-2,torY+1,C.DDGRN);p(bx-1,torY+2,C.DDGRN);p(bx,torY+3,C.DDGRN);p(bx+1,torY+2,C.DDGRN);p(bx+2,torY+1,C.DDGRN);
      // Green energy lines
      p(bx-1,torY+4,C.DGRN);p(bx+1,torY+5,C.DGRN);
    } else if(dir===1){
      p(bx,torY+1,C.DDGRN);p(bx+1,torY+2,C.DDGRN);p(bx,torY+3,C.DDGRN);
    } else {
      p(bx-1,torY+1,C.DDGRN);p(bx,torY+2,C.DDGRN);p(bx+1,torY+1,C.DDGRN);
    }
    // Belt with bone buckle
    b(bx-3,torY+7,6,1,C.DKGRAY);b(bx-2,torY+7,4,1,C.BRWN);p(bx,torY+7,C.WHITE);

    // Curse ground effect
    if(curse){
      for(let i=0;i<10;i++){
        const a=i*Math.PI/5;
        p(bx+Math.round(Math.cos(a)*8),55+Math.round(Math.sin(a)*3),i%2?C.LIME:C.NGRN);
        p(bx+Math.round(Math.cos(a)*6),54+Math.round(Math.sin(a)*2),i%3===0?C.ACID:C.DGRN);
      }
    }

    // ARMS & SKULL STAFF
    if(atk){
      if(dir===0){
        // Staff thrust forward
        if(atkFrame===0){
          // Staff raised
          b(bx+3,torY-2,2,3,C.DKBIO);
          // Staff
          for(let i=0;i<12;i++)p(bx+5,torY-4-i,i===0?C.BRWN:i<3?C.DBRWN:i<8?C.BRWN:C.DBRWN);
          // Skull on staff top
          b(bx+4,torY-16,3,2,C.WHITE);p(bx+4,torY-15,C.DKBIO);p(bx+6,torY-15,C.DKBIO);p(bx+5,torY-14,C.DKGRAY);
          // Green energy
          p(bx+4,torY-17,C.LIME);p(bx+6,torY-17,C.LIME);p(bx+5,torY-18,C.ACID);
          // Skeletal hand
          p(bx+3,torY+1,C.WHITE);p(bx+4,torY+1,C.PGRN);
        } else {
          // Staff thrust down
          b(bx+3,torY+2,2,3,C.DKBIO);
          for(let i=0;i<10;i++)p(bx+5,torY+6+i,i===0?C.BRWN:i<4?C.DBRWN:C.BRWN);
          // Energy blast at tip
          p(bx+5,torY+16,C.LIME);p(bx+4,torY+17,C.ACID);p(bx+6,torY+17,C.ACID);
          p(bx+5,torY+18,C.NGRN);
          p(bx+3,torY+5,C.WHITE);p(bx+4,torY+5,C.PGRN);
        }
        b(bx-5,torY+2,2,4,C.DKBIO);p(bx-5,torY+6,C.WHITE);
      } else if(dir===1){
        if(atkFrame===0){
          b(bx+3,torY-1,3,2,C.DKBIO);
          for(let i=0;i<12;i++)p(bx+6,torY-3-i,i<3?C.BRWN:i<8?C.DBRWN:C.BRWN);
          b(bx+5,torY-15,3,2,C.WHITE);p(bx+5,torY-14,C.DKBIO);p(bx+7,torY-14,C.DKBIO);
          p(bx+5,torY-16,C.LIME);p(bx+7,torY-16,C.LIME);p(bx+6,torY-17,C.ACID);
          p(bx+5,torY+1,C.WHITE);
        } else {
          b(bx+3,torY+1,3,2,C.DKBIO);
          for(let i=0;i<10;i++){const x_=bx+6+Math.floor(i*0.3),y_=torY+4+i;if(x_<32&&y_<63)p(x_,y_,i<4?C.BRWN:C.DBRWN);}
          p(bx+7,torY+14,C.LIME);p(bx+8,torY+15,C.ACID);
          p(bx+5,torY+3,C.WHITE);
        }
      } else {
        if(atkFrame===0){
          b(bx+3,torY-2,2,3,C.DKBIO);
          for(let i=0;i<10;i++)p(bx+5,torY-3-i,i<3?C.BRWN:C.DBRWN);
          b(bx+4,torY-13,3,2,C.WHITE);p(bx+5,torY-14,C.LIME);
        } else {
          b(bx+3,torY+3,2,3,C.DKBIO);
          for(let i=0;i<8;i++)p(bx+5,torY+7+i,i<3?C.BRWN:C.DBRWN);
          p(bx+5,torY+15,C.LIME);p(bx+4,torY+16,C.NGRN);
        }
      }
    } else {
      // Idle/walk arms
      const aY=torY+1;
      if(dir===0){
        // Left arm (skeletal hand visible)
        b(bx-5,aY+armSwing,2,5,C.DKBIO);p(bx-5,aY+armSwing,C.VDGRN);
        p(bx-5,aY+armSwing+5,C.WHITE);p(bx-4,aY+armSwing+5,C.PGRN);
        // Right arm with staff
        b(bx+3,aY-armSwing,2,5,C.DKBIO);p(bx+4,aY-armSwing,C.VDGRN);
        p(bx+3,aY-armSwing+5,C.WHITE);
        // Staff at side
        for(let i=0;i<10;i++)p(bx+5,aY-armSwing-2+i,i<2?C.BRWN:i<7?C.DBRWN:C.BRWN);
        // Small skull on staff
        p(bx+5,aY-armSwing-3,C.WHITE);p(bx+5,aY-armSwing-4,C.PGRN);
      } else if(dir===1){
        b(bx+3,aY-armSwing,2,5,C.DKBIO);p(bx+4,aY-armSwing,C.VDGRN);
        p(bx+3,aY-armSwing+5,C.WHITE);
        for(let i=0;i<10;i++)p(bx+5,aY-armSwing-2+i,i<2?C.BRWN:i<7?C.DBRWN:C.BRWN);
        p(bx+5,aY-armSwing-3,C.WHITE);p(bx+5,aY-armSwing-4,C.PGRN);
      } else {
        b(bx-5,aY+armSwing,2,5,C.DKBIO);p(bx-5,aY+armSwing,C.VDGRN);
        b(bx+3,aY-armSwing,2,5,C.DKBIO);p(bx+4,aY-armSwing,C.VDGRN);
      }
    }

    // Siphon beam
    if(siphon){
      for(let i=0;i<15;i++){
        const x_=bx+6+i,y_=torY-2+Math.round(Math.sin(i*0.5)*2);
        if(x_<32&&y_>=0&&y_<64)p(x_,y_,i%3===0?C.ACID:i%2?C.LIME:C.NGRN);
      }
      p(bx+5,torY-1,C.LIME);p(bx+6,torY-2,C.ACID);
    }

    // Drain life channel
    if(drain){
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6,r=6+Math.sin(i*0.8)*2;
        p(bx+Math.round(Math.cos(a)*r),torY+Math.round(Math.sin(a)*r),i%2?C.LIME:C.NGRN);
      }
      p(bx,torY+2,C.ACID);p(bx-1,torY+3,C.LIME);p(bx+1,torY+3,C.LIME);
    }

    // LEGS (floating/gliding = slight hover)
    const lh=float?8:10;
    const floatOff=float?2:0;
    b(bx-2+lOff,legY+floatOff,2,lh,C.DKBIO);p(bx-1+lOff,legY+floatOff,C.VDGRN);
    b(bx+1+rOff,legY+floatOff,2,lh,C.DKBIO);p(bx+2+rOff,legY+floatOff,C.VDGRN);
    // Boots
    const lfy=Math.min(legY+lh+floatOff,61),rfy=Math.min(legY+lh+floatOff,61);
    b(bx-3+lOff,lfy,4,2,C.VDGRN);b(bx-3+lOff,lfy,3,1,C.DDGRN);
    b(bx+rOff,rfy,4,2,C.VDGRN);b(bx+1+rOff,rfy,3,1,C.DDGRN);
    // Ground wisps
    if(float){
      p(bx-2,lfy+2,C.DGRN);p(bx+2,lfy+2,C.DGRN);p(bx,lfy+3,C.NGRN);
    } else if(lfy+2<63){
      p(bx-3+lOff,lfy+2,C.BLACK);p(bx+3+rOff,rfy+2,C.BLACK);
    }

    // Hurt flash
    if(hurt){p(bx+4,headY+1,C.RED);p(bx+5,headY,C.ORED);p(bx+6,headY+1,C.RED);p(bx+5,headY+2,C.ORED);}
  }

  // Layout: 8 cols x 5 rows at 64x128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities: siphon1,siphon2,curse1,curse2,drain1,drain2,harvest1,harvest2
  // R4: hurt,death1,death2,portrait,x,x,x,x

  const frames:any[]=[];
  // Direction rows (floating/gliding walk)
  for(let dir=0;dir<3;dir++){
    frames.push([
      {dir,opts:{}},
      {dir,opts:{armSwing:1}},
      {dir,opts:{lOff:1,rOff:-1,armSwing:1,float:true}},
      {dir,opts:{lOff:-1,rOff:1,armSwing:-1,float:true}},
      {dir,opts:{lOff:2,rOff:0,armSwing:1,float:true}},
      {dir,opts:{lOff:0,rOff:2,armSwing:-1,float:true}},
      {dir,opts:{atk:true,atkFrame:0,lOff:1}},
      {dir,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},
    ]);
  }
  // Abilities row
  frames.push([
    {dir:1,opts:{siphon:true,lOff:1}},
    {dir:1,opts:{siphon:true,lOff:2,armSwing:1}},
    {dir:0,opts:{curse:true}},
    {dir:0,opts:{curse:true,armSwing:1,lOff:1,rOff:-1}},
    {dir:0,opts:{drain:true,lOff:-1}},
    {dir:0,opts:{drain:true,lOff:1,armSwing:1}},
    {dir:0,opts:{harvest:true}},
    {dir:0,opts:{harvest:true,lOff:1,rOff:-1,armSwing:1}},
  ]);
  // States row
  frames.push([
    {dir:0,opts:{hurt:true,lOff:-1,rOff:-1}},
    {dir:0,opts:{custom:'death1'}},
    {dir:0,opts:{custom:'death2'}},
    {dir:0,opts:{custom:'portrait'}},
    null,null,null,null,
  ]);

  const cols=8,rows=5;
  frames.forEach((row:any[],ry:number)=>{
    row.forEach((frame:any,rx:number)=>{
      if(!frame)return;
      const o=[rx*H_CW,ry*H_CH];
      if(frame.opts.custom==='death1'){
        // Dissolve to bones - collapsed figure with green energy dissipating
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Collapsed robe
        b(6,30,5,4,C.DKBIO);b(7,31,3,2,C.VDGRN);b(6,30,5,1,C.DDGRN);
        // Skull falling from staff
        p(8,32,C.WHITE);p(9,32,C.DKBIO);
        b(10,32,10,4,C.DKBIO);b(11,32,8,3,C.VDGRN);
        // Skeletal hand
        b(4,33,3,2,C.WHITE);b(3,34,2,1,C.PGRN);p(2,35,C.DKGRAY);
        // Staff
        b(20,34,6,2,C.BRWN);b(22,36,4,2,C.DBRWN);
        // Skull on staff
        b(24,29,2,2,C.WHITE);p(24,30,C.DKBIO);p(25,30,C.DKBIO);
        // Green energy wisps
        b(8,36,14,3,C.DKBIO);b(7,37,16,2,C.BLACK);
        for(let x=6;x<24;x++){if(x%3!==0)p(x,39,C.DKBIO);if(x%4===0)p(x,40,C.DGRN);}
        // Dissipating energy
        [[8,26,C.NGRN],[14,24,C.DGRN],[20,27,C.VDGRN],[11,22,C.LIME],[17,25,C.NGRN]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
      } else if(frame.opts.custom==='death2'){
        // Final dissolution - just bones and fading energy
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Bone fragments
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.DKGRAY);if(x%3===0)p(x,41,C.WHITE);}
        // Staff remnant
        p(22,36,C.BRWN);p(22,35,C.DBRWN);p(22,41,C.BRWN);
        // Skull
        p(7,40,C.WHITE);p(8,41,C.PGRN);p(6,41,C.DKGRAY);
        // Fading green particles
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.LIME:i%4===0?C.NGRN:i%3===0?C.DGRN:i%2===0?C.VDGRN:C.DKBIO);
        });
        p(14,42,C.DGRN);p(15,42,C.NGRN);
      } else if(frame.opts.custom==='portrait'){
        // Necromancer portrait - hooded face with green eyes, skull staff
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Background
        b(2,2,28,60,C.BLACK);b(3,3,26,58,C.DKBIO);
        // Hood
        b(6,6,20,8,C.DKBIO);b(7,7,18,6,C.VDGRN);b(6,6,20,2,C.DDGRN);b(7,5,18,2,C.VDGRN);b(8,4,16,2,C.DDGRN);b(10,3,12,1,C.DGRN);
        // Hood drape
        p(26,8,C.DKBIO);p(27,9,C.BLACK);p(28,10,C.BLACK);p(27,10,C.DKBIO);
        // Face void
        b(8,10,16,10,C.BLACK);b(9,11,14,8,C.BLACK);
        // Glowing green eyes
        b(9,14,5,3,C.DGRN);b(10,14,3,2,C.LIME);b(11,14,1,2,C.BGRN);p(11,14,C.WHITE);
        b(18,14,5,3,C.DGRN);b(19,14,3,2,C.LIME);b(20,14,1,2,C.BGRN);p(20,14,C.WHITE);
        // Eye glow trails
        p(8,16,C.DGRN);p(7,17,C.VDGRN);p(23,16,C.DGRN);p(24,17,C.VDGRN);
        // Mouth area
        b(12,19,8,1,C.DKBIO);
        // Skull collar
        b(7,21,18,6,C.WHITE);b(8,22,16,4,C.PGRN);b(9,23,14,2,C.WGRN);
        // Skull details
        b(10,22,2,4,C.DKBIO);b(18,22,2,4,C.DKBIO);b(14,22,1,4,C.DKBIO);
        // Robe
        b(4,20,4,6,C.DKBIO);b(5,20,2,5,C.VDGRN);b(24,20,4,6,C.DKBIO);b(25,20,2,5,C.VDGRN);
        // Body
        b(8,27,16,14,C.DKBIO);b(9,27,14,12,C.VDGRN);
        // Robe pattern
        p(10,29,C.DDGRN);p(12,30,C.DDGRN);p(14,31,C.DDGRN);p(16,30,C.DDGRN);p(18,29,C.DDGRN);
        // Staff
        b(24,28,2,10,C.BRWN);p(25,27,C.WHITE);p(24,26,C.PGRN);
        // Green energy on staff
        p(25,25,C.LIME);p(24,24,C.NGRN);
        // Border
        b(2,2,28,1,C.DDGRN);b(2,61,28,1,C.DDGRN);b(2,2,1,60,C.DDGRN);b(29,2,1,60,C.DDGRN);
        p(3,3,C.LIME);p(28,3,C.LIME);p(3,60,C.LIME);p(28,60,C.LIME);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Spitter','Stinger','Swarm Node','Acid Sprayer','Hive Spire','Brood Mother','Swarmling','Overmind'];
const T_STATES=['Idle','Charge','Fire','Cooldown'];
const T_STATES_MOBILE=['Idle','Walk','Attack','Death'];
const T_ROW_LABELS:string[]=[];
for(let lv=0;lv<4;lv++)for(let si=0;si<4;si++)T_ROW_LABELS.push(`Lv${lv+1} ${T_STATES[si]}`);
const P_NAMES=['Spitter:Acid','Stinger:Dart','Node:Pulse','Acid:Stream','Spire:Spore','Brood:Egg','Swarm:Bite','Mind:Wave'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Siphon 1','Siphon 2','Curse 1','Curse 2','Drain 1','Drain 2','Harvest 1','Harvest 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),
        pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),
        hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=8*T_CELL;tc.height=16*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=90,tLH=13;
    tpv.width=tLW+8*T_CELL*tS;tpv.height=16*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#060d02';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<16;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#66aa22';tpc.font='bold 9px monospace';tpc.fillText(T_ROW_LABELS[r],3,by+T_CELL*tS/2+3);
      // Draw level separator line every 4 rows
      if(r%4===0&&r>0){tpc.strokeStyle='#44aa22';tpc.lineWidth=1;tpc.beginPath();tpc.moveTo(0,by-3);tpc.lineTo(tpv.width,by-3);tpc.stroke();}
      for(let cc=0;cc<8;cc++){const bx=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a2a0a';tpc.strokeRect(bx,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#88aa66';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx+2,by-2);}}}

    // Projectiles
    const pc=pRef.current!;pc.width=8*P_CELL;pc.height=6*P_CELL;
    const pCtx=pc.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+8*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#060d02';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#66aa22';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<8;cc++){const bx=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx,by);ppc.scale(pS,pS);ppc.drawImage(pc,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a2a0a';ppc.strokeRect(bx,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#88aa66';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#060d02';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#66aa22';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a2a0a';hpc.strokeRect(bx,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#88aa66';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'aliens_towers_animated.png',
      info:{sz:'512×1024',cell:'64×64',loader:"this.load.spritesheet('aliens_towers','aliens_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'8 cols × 16 rows (4 levels × 4 states: idle/charge/fire/cooldown). Levels: Spitter=4, Stinger=3, SwarmNode=3, AcidSprayer=4, HiveSpire=4, BroodMother=3, Swarmling(mobile)=2, Overmind=3'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'aliens_projectiles_animated.png',
      info:{sz:'256×192',cell:'32×32',loader:"this.load.spritesheet('aliens_proj','aliens_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'8 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Necromancer',ref:hRef,pvRef:hPv,dl:'necromancer_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('necromancer','necromancer_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities (siphon/curse/drain/harvest) · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#060d02',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.LIME,margin:0,fontSize:15}}>SPAWN ALIENS FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.LIME,color:'#000',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#1a3300':'#111',color:tab===t.id?C.LIME:'#446622',border:`1px solid ${tab===t.id?'#44aa22':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {['preview','actual'].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a2a0a':'#111',color:view===v?C.ACID:'#445522',border:`1px solid ${view===v?'#334411':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'80vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Aliens ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref} data-label={`Aliens ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?8*P_CELL*3:8*T_CELL*2,border:'1px solid #1a2a0a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#557744',fontSize:9,marginTop:10,maxWidth:700}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#88bb44'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#88bb44'}}>Phaser:</b> <code style={{color:C.ACID}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#88bb44'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
