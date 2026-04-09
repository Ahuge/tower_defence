import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
  HELL:'#ff4422',ORNG:'#ff8844',FLAME:'#ffcc00',DKBLD:'#220000',EMBR:'#cc2200',
  DPRED:'#881100',LAVA:'#ff6600',BRGHT:'#ffee44',WHITE:'#ffffff',
  CHAR:'#1a0800',OBSID:'#110400',ASH:'#332211',DKASH:'#221100',
  SMOKE:'#443322',LTSMK:'#665544',GRAY:'#555544',DKGRAY:'#2a2218',
  GRNSOL:'#44ff66',DKGRN:'#22aa44',LTGRN:'#88ffaa',PLGRN:'#ccffdd',
  SKULL:'#ddccaa',BONE:'#aa9977',DKBONE:'#665544',
  GLOW:'#ff8800',LTGLOW:'#ffaa44',DMGLOW:'#cc4400',
  BLACK:'#000000',VOID:'#0a0000',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

function iBase(p:any,b:any,topY:number,w:number,glow:number){
  const cx=16;
  // Charred obsidian platform
  for(let i=0;i<10;i++){
    const cw=w-6+Math.floor(i*0.8),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.ASH:i<5?C.DKASH:i<8?C.CHAR:C.OBSID);
  }
  b(cx-Math.floor((w-6)/2),topY,w-6,1,C.SMOKE);
  // Lava cracks
  p(cx-3,topY+3,glow>1?C.LAVA:C.EMBR);p(cx-2,topY+4,glow>1?C.ORNG:C.EMBR);
  p(cx-2,topY+5,glow>0?C.EMBR:C.DPRED);p(cx-3,topY+6,C.DPRED);
  p(cx+2,topY+4,glow>1?C.LAVA:C.DPRED);p(cx+1,topY+5,glow>0?C.EMBR:C.DPRED);
  // Ember particles
  if(glow>0){p(cx-4,topY+2,C.DPRED);p(cx+3,topY+3,C.DPRED);p(cx-5,topY+1,C.ORNG);}
  if(glow>1){p(cx+4,topY+1,C.FLAME);p(cx-6,topY,C.ORNG);}
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.OBSID);
}

function iFlame(p:any,cx:number,topY:number,h:number,w:number,bright:boolean){
  // Flame column
  for(let i=0;i<h;i++){
    const t=i/h;
    const fw=Math.max(1,Math.round(w*(1-t*0.7)));
    const sx=cx-Math.floor(fw/2)+Math.round(Math.sin(i*0.8)*0.8);
    for(let x=0;x<fw;x++){
      const d=Math.abs(x-fw/2)/(fw/2);
      const cl=t<0.2?(d<0.3?C.WHITE:C.BRGHT):t<0.4?(d<0.3?C.BRGHT:C.FLAME):t<0.6?(d<0.4?C.FLAME:C.ORNG):t<0.8?(d<0.4?C.ORNG:C.HELL):C.EMBR;
      p(sx+x,topY+h-1-i,bright&&i%3===0?C.WHITE:cl);
    }
  }
}

function iLavaCrack(p:any,x1:number,y1:number,x2:number,y2:number,col:string,bright:boolean){
  const dy=y2-y1,dx=x2-x1;
  for(let i=0;i<=Math.abs(dy);i++){
    const t=i/Math.max(1,Math.abs(dy));
    const yy=y1+Math.round(i*Math.sign(dy));
    const xx=Math.round(x1+dx*t+Math.sin(t*Math.PI*2)*1.2);
    p(xx,yy,bright&&i%2===0?C.ORNG:col);
  }
}

// ===== TOWER LEVEL COUNTS =====
const T_LEVELS=[3,4,3,2,2,3]; // Imp, Hellfire, Soul Drain, Fiend, Immolate, Apocalypse
const T_MAX_LVL=4; // max across all towers -> 16 rows
const T_STATES_PER_LVL=4; // idle, charge, fire, cooldown

// ===== TOWERS (6x16 at 64x64) — 4 levels x 4 states =====
function drawTowers(ctx:any){
  // Each tower fn receives (ctx, offset, state 0-3, level 1-based)
  const fns=[
    // 1. Imp — Small demon perched on base (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const glow=s===1?1:s===2?2:0;
      const baseW=lv>=3?24:lv>=2?22:20;
      iBase(p,b,22,baseW,glow);
      const fy=s===1?5:s===2?4:6;
      // Body — grows with level
      const bw=lv>=3?6:lv>=2?5:4;
      const bh=lv>=3?7:lv>=2?6:5;
      b(16-Math.floor(bw/2),fy+4,bw,bh,C.DPRED);b(15,fy+4,Math.min(bw-1,3),bh,C.HELL);
      // Head — grows
      const hw=lv>=3?8:lv>=2?7:6;
      b(16-Math.floor(hw/2),fy,hw,lv>=2?5:4,C.HELL);b(14,fy,lv>=2?5:4,lv>=2?4:3,C.ORNG);
      // Horns — longer at higher levels
      p(12,fy-1,C.DKASH);p(11,fy-2,C.DKASH);p(19,fy-1,C.DKASH);p(20,fy-2,C.DKASH);
      if(lv>=2){p(10,fy-3,C.CHAR);p(21,fy-3,C.CHAR);}
      if(lv>=3){p(9,fy-4,C.DKASH);p(22,fy-4,C.DKASH);p(8,fy-5,C.CHAR);p(23,fy-5,C.CHAR);}
      // Eyes — brighter at higher levels
      const eyeCol=lv>=3?C.WHITE:lv>=2?C.BRGHT:C.FLAME;
      p(14,fy+1,s>=1?eyeCol:C.FLAME);p(17,fy+1,s>=1?eyeCol:C.FLAME);
      // Mouth — grin
      p(15,fy+2,C.DKBLD);p(16,fy+2,C.DKBLD);
      if(lv>=3){p(14,fy+2,C.DKBLD);p(17,fy+2,C.DKBLD);}
      // Tail — longer at higher levels
      p(18,fy+6,C.DPRED);p(19,fy+7,C.DPRED);p(20,fy+8,C.EMBR);p(21,fy+9,C.EMBR);p(22,fy+8,C.DPRED);
      if(s>=1||lv>=2)p(23,fy+7,C.HELL);
      if(lv>=3){p(24,fy+6,C.DPRED);p(25,fy+5,C.EMBR);}
      // Wings — grow with level
      b(10,fy+3,3,1,C.DPRED);b(9,fy+2,2,1,C.DPRED);p(8,fy+1,C.DPRED);
      b(19,fy+3,3,1,C.DPRED);b(21,fy+2,2,1,C.DPRED);p(23,fy+1,C.DPRED);
      if(lv>=2){p(7,fy,C.DPRED);p(24,fy,C.DPRED);b(7,fy+1,2,1,C.DPRED);b(23,fy+1,2,1,C.DPRED);}
      if(lv>=3){p(6,fy-1,C.DPRED);p(25,fy-1,C.DPRED);p(5,fy-2,C.DPRED);p(26,fy-2,C.DPRED);}
      // Arms
      b(12,fy+5,2,2,C.HELL);b(18,fy+5,2,2,C.HELL);
      if(lv>=2){b(11,fy+5,1,2,C.DPRED);b(20,fy+5,1,2,C.DPRED);}
      // Feet
      p(13,fy+9,C.DPRED);p(14,fy+9,C.DPRED);p(17,fy+9,C.DPRED);p(18,fy+9,C.DPRED);
      // Fire wisps — more at higher levels
      if(s>=1||lv>=2){p(10,fy-1,C.ORNG);p(22,fy,C.ORNG);p(9,fy+5,C.FLAME);}
      if(s===2||lv>=3){p(7,fy-2,C.FLAME);p(25,fy-1,C.FLAME);p(6,fy+3,C.ORNG);p(26,fy+4,C.ORNG);}
      if(lv>=3){p(4,fy-3,C.ORNG);p(27,fy-2,C.ORNG);p(5,fy+6,C.FLAME);p(27,fy+7,C.FLAME);}
      // Expired (s===3) = fading
      if(s===3){
        b(16-Math.floor(bw/2),fy+4,bw,bh,C.DKASH);b(16-Math.floor(hw/2),fy,hw,4,C.ASH);
        p(14,fy+1,C.EMBR);p(17,fy+1,C.EMBR);
        p(15,fy+2,C.CHAR);p(16,fy+2,C.CHAR);
      }
    },
    // 2. Hellfire — Flaming brazier/pyre, AoE fire (4 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const glow=s===1?1:s===2?2:0;
      const baseW=lv>=4?26:lv>=3?24:lv>=2?22:20;
      iBase(p,b,23,baseW,glow);
      const br=s>=1,fl=s===2;
      // Brazier bowl — wider at higher levels
      const bowlW=lv>=4?14:lv>=3?12:lv>=2?11:10;
      for(let i=0;i<6;i++){
        const bw=bowlW+Math.floor(i*1.5),sx=16-Math.floor(bw/2);
        b(sx,17+i,bw,1,i<2?C.ASH:i<4?C.DKASH:i<8?C.CHAR:C.OBSID);
      }
      b(16-Math.floor(bowlW/2)-1,17,bowlW+2,1,C.SMOKE);b(16-Math.floor(bowlW/2),16,bowlW,1,C.LTSMK);
      // Coals inside — more intense at higher levels
      const coalW=bowlW+2;
      b(16-Math.floor(coalW/2),18,coalW,2,lv>=3?C.HELL:C.DPRED);
      b(16-Math.floor(coalW/2)+1,18,coalW-2,1,lv>=4?C.BRGHT:fl?C.LAVA:lv>=3?C.LAVA:C.EMBR);
      p(12,19,lv>=3?C.LAVA:C.ORNG);p(15,19,br||lv>=2?C.LAVA:C.EMBR);p(18,19,lv>=3?C.LAVA:C.ORNG);
      if(lv>=4){p(10,19,C.LAVA);p(20,19,C.LAVA);}
      // Pedestal legs
      b(11,23,3,1,C.DKASH);b(18,23,3,1,C.DKASH);b(12,24,1,2,C.ASH);b(19,24,1,2,C.ASH);
      if(lv>=3){b(9,23,2,1,C.DKASH);b(21,23,2,1,C.DKASH);}
      // Fire — grows with state AND level
      const fhBase=s===0?8:s===1?11:s===2?14:6;
      const fh=fhBase+Math.floor((lv-1)*2);
      const fwBase=s===0?4:s===1?6:s===2?8:3;
      const fw_=fwBase+Math.floor((lv-1)*1.5);
      iFlame(p,16,17-fh,fh,fw_,fl||lv>=4);
      // Side flames — appear earlier at higher levels
      if(br||lv>=2){
        iFlame(p,12,14,5+(lv-1),2,lv>=3);
        iFlame(p,20,14,5+(lv-1),2,lv>=3);
      }
      if(fl||lv>=3){
        iFlame(p,9,12-lv,6+lv,3,lv>=4);
        iFlame(p,23,12-lv,6+lv,3,lv>=4);
        p(6,8,C.ORNG);p(25,6,C.FLAME);p(4,10,C.EMBR);p(27,9,C.EMBR);
      }
      if(lv>=4){
        iFlame(p,6,10,8,3,true);iFlame(p,26,10,8,3,true);
        p(3,6,C.FLAME);p(28,5,C.BRGHT);p(2,8,C.ORNG);p(29,7,C.ORNG);
      }
      // Heat shimmer
      if(br||lv>=2){p(14,5,lv>=3?C.FLAME:C.ORNG);p(18,4,lv>=3?C.BRGHT:C.FLAME);p(16,3,fl||lv>=4?C.BRGHT:C.ORNG);}
      if(lv>=3){p(12,3,C.ORNG);p(20,2,C.FLAME);}
      if(lv>=4){p(10,2,C.FLAME);p(22,1,C.BRGHT);p(16,1,C.WHITE);}
      if(s===3){b(16-Math.floor(coalW/2),18,coalW,2,C.DKASH);p(14,19,C.DPRED);}
    },
    // 3. Soul Drain — Dark crystal/skull pulling soul wisps (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const glow=s===1?1:s===2?2:0;
      const baseW=lv>=3?24:lv>=2?22:20;
      iBase(p,b,23,baseW,glow);const br=s>=1;
      // Skull on pedestal — bigger at higher levels
      const skW=lv>=3?8:lv>=2?7:6;
      const skH=lv>=3?8:lv>=2?7:6;
      const skX=16-Math.floor(skW/2);
      const skY=lv>=3?8:lv>=2?9:10;
      b(skX,skY,skW,skH,C.SKULL);b(skX+1,skY,skW-2,skH-1,C.BONE);
      // Eye sockets — more intense glow at higher levels
      const eyeGlow=lv>=3?C.PLGRN:lv>=2?C.LTGRN:C.GRNSOL;
      b(skX+1,skY+1,2,2,C.DKBLD);b(skX+skW-3,skY+1,2,2,C.DKBLD);
      p(skX+1,skY+1,br?C.LTGRN:eyeGlow);p(skX+skW-3,skY+1,br?C.LTGRN:eyeGlow);
      if(s===2||lv>=3){p(skX+2,skY+1,C.PLGRN);p(skX+skW-2,skY+1,C.PLGRN);}
      if(lv>=3){p(skX+1,skY,C.GRNSOL);p(skX+skW-3,skY,C.GRNSOL);}
      // Nose
      p(15,skY+skH-3,C.DKBONE);p(16,skY+skH-3,C.DKBONE);
      // Jaw
      b(skX,skY+skH-2,skW,2,C.BONE);b(skX+1,skY+skH-1,skW-2,1,C.DKBONE);
      p(skX+1,skY+skH-2,C.DKBLD);p(skX+2,skY+skH-2,C.SKULL);p(skX+skW-3,skY+skH-2,C.DKBLD);p(skX+skW-2,skY+skH-2,C.SKULL);
      // Extra horns/spikes on skull at higher levels
      if(lv>=2){p(skX-1,skY-1,C.BONE);p(skX+skW,skY-1,C.BONE);p(skX-2,skY-2,C.DKBONE);p(skX+skW+1,skY-2,C.DKBONE);}
      if(lv>=3){p(skX-3,skY-3,C.BONE);p(skX+skW+2,skY-3,C.BONE);p(16,skY-1,C.DKBONE);p(16,skY-2,C.BONE);}
      // Dark crystal base — bigger at higher levels
      const crW=lv>=3?10:lv>=2?9:8;
      b(16-Math.floor(crW/2),skY+skH,crW,lv>=3?5:4,C.CHAR);b(16-Math.floor(crW/2)+1,skY+skH,crW-2,lv>=3?4:3,C.OBSID);
      p(14,skY+skH+1,C.DPRED);p(17,skY+skH+1,C.DPRED);
      if(lv>=2){p(13,skY+skH+2,C.DPRED);p(18,skY+skH+2,C.DPRED);}
      if(lv>=3){p(12,skY+skH+1,C.EMBR);p(19,skY+skH+1,C.EMBR);}
      // Pedestal
      b(14,20,4,3,C.DKASH);b(15,20,2,3,C.ASH);
      // Green soul wisps — more at higher levels
      const wispCount=lv>=3?14:lv>=2?10:br?10:6;
      const allWisps=[[5,8],[7,6],[9,9],[23,7],[25,9],[21,6],[4,12],[27,11],[6,14],[26,13],[3,6],[28,5],[2,10],[29,8]];
      allWisps.slice(0,wispCount).forEach(([x,y],i)=>p(x,y,i%3===0?C.PLGRN:i%2===0?C.LTGRN:C.GRNSOL));
      // Wisp trails toward skull
      if(br||lv>=2){
        const trail=[[9,9],[10,9],[11,10],[12,10],[22,8],[21,9],[20,9],[19,10]];
        trail.forEach(([x,y],i)=>p(x,y,i%2===0?C.DKGRN:C.GRNSOL));
        if(lv>=3){
          [[8,8],[7,8],[6,9],[25,7],[26,8],[27,9]].forEach(([x,y],i)=>p(x,y,i%2===0?C.GRNSOL:C.LTGRN));
        }
      }
      if(s===2||lv>=3){
        const ringR=lv>=3?10:8;
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(16+Math.round(Math.cos(a)*ringR),12+Math.round(Math.sin(a)*(ringR*0.75)),i%2?C.GRNSOL:C.LTGRN);}
        p(16,12,C.WHITE);p(15,12,C.PLGRN);p(17,12,C.PLGRN);
        if(lv>=3){p(14,12,C.LTGRN);p(18,12,C.LTGRN);p(16,11,C.PLGRN);p(16,13,C.PLGRN);}
      }
      if(s===3){p(skX+1,skY+1,C.DKGRN);p(skX+skW-3,skY+1,C.DKGRN);b(skX,skY,skW,skH,C.DKBONE);}
    },
    // 4. Fiend (MOBILE/KAMIKAZE) — idle/run/glow/explode (2 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const big=lv>=2;
      if(s===0){
        // IDLE — crouched demon ready to spring
        const bx=16,by=big?9:10;
        const bw=big?8:6,bh=big?10:8;
        b(bx-Math.floor(bw/2),by+2,bw,bh,C.DPRED);b(bx-Math.floor(bw/2)+1,by+2,bw-2,bh-1,C.HELL);
        // Head
        const hw=big?8:6;
        b(bx-Math.floor(hw/2),by-2,hw,big?5:4,C.HELL);b(bx-Math.floor(hw/2)+1,by-2,hw-2,big?4:3,C.ORNG);
        // Horns — forward-curving, longer at lv2
        p(bx-4,by-3,C.DKASH);p(bx-5,by-4,C.CHAR);p(bx+3,by-3,C.DKASH);p(bx+4,by-4,C.CHAR);
        if(big){p(bx-6,by-5,C.DKASH);p(bx+5,by-5,C.DKASH);}
        // Eyes — brighter at lv2
        p(bx-2,by-1,big?C.BRGHT:C.FLAME);p(bx+1,by-1,big?C.BRGHT:C.FLAME);
        // Mouth — snarl
        b(bx-1,by+1,2,1,C.DKBLD);p(bx-2,by+1,C.EMBR);p(bx+1,by+1,C.EMBR);
        // Claws
        p(bx-4,by+4,C.DKASH);p(bx-5,by+5,C.DKASH);p(bx+3,by+4,C.DKASH);p(bx+4,by+5,C.DKASH);
        if(big){p(bx-6,by+6,C.CHAR);p(bx+5,by+6,C.CHAR);}
        // Legs — crouched
        b(bx-3,by+10,3,big?5:4,C.DPRED);b(bx+1,by+10,3,big?5:4,C.DPRED);
        b(bx-4,by+14,4,2,C.CHAR);b(bx+1,by+14,4,2,C.CHAR);
        // Tail
        p(bx+3,by+8,C.DPRED);p(bx+4,by+9,C.EMBR);p(bx+5,by+10,C.EMBR);
        if(big){p(bx+6,by+11,C.DPRED);p(bx+7,by+10,C.EMBR);}
        // Glowing cracks at lv2
        if(big){p(bx-1,by+4,C.ORNG);p(bx+1,by+6,C.FLAME);p(bx,by+8,C.EMBR);p(bx-2,by+7,C.ORNG);}
        // Fire wisps
        p(bx-1,by-4,C.ORNG);p(bx+2,by-5,C.FLAME);
        if(big){p(bx-3,by-5,C.FLAME);p(bx+4,by-6,C.ORNG);p(bx-5,by+3,C.ORNG);p(bx+5,by+3,C.FLAME);}
      } else if(s===1){
        // RUN — lunging forward, arms out
        const bx=14,by=big?7:8;
        const bw=big?7:5,bh=big?9:7;
        b(bx-Math.floor(bw/2),by+2,bw,bh,C.DPRED);b(bx-Math.floor(bw/2)+1,by+2,bw-2,bh-1,C.HELL);
        // Head — forward
        const hw=big?7:5;
        b(bx+1,by-2,hw,big?5:4,C.HELL);b(bx+2,by-2,hw-2,big?4:3,C.ORNG);
        // Horns
        p(bx+6,by-3,C.DKASH);p(bx+7,by-4,C.CHAR);p(bx,by-3,C.DKASH);
        if(big){p(bx+8,by-5,C.DKASH);}
        // Eyes — blazing
        p(bx+2,by-1,C.BRGHT);p(bx+4,by-1,C.BRGHT);
        // Mouth — open, fire
        p(bx+3,by+1,C.FLAME);p(bx+4,by+1,C.ORNG);
        if(big){p(bx+5,by+1,C.FLAME);}
        // Arms — reaching forward
        b(bx+3,by+3,big?5:4,2,C.HELL);p(bx+7,by+3,C.DKASH);p(bx+7,by+4,C.DKASH);p(bx+8,by+3,C.DKASH);
        if(big){p(bx+9,by+3,C.DKASH);p(bx+9,by+4,C.CHAR);}
        // Legs — running stride
        b(bx-3,by+9,3,big?6:5,C.DPRED);b(bx+2,by+9,3,big?4:3,C.DPRED);
        b(bx-4,by+14,4,2,C.CHAR);b(bx+3,by+12,4,2,C.CHAR);
        // Fire trail behind — more intense at lv2
        p(bx-5,by+4,C.ORNG);p(bx-6,by+5,C.FLAME);p(bx-7,by+6,C.EMBR);
        p(bx-4,by+3,C.HELL);p(bx-6,by+7,C.DPRED);
        if(big){p(bx-8,by+5,C.FLAME);p(bx-9,by+6,C.ORNG);p(bx-7,by+4,C.BRGHT);}
        // Speed lines
        p(bx-8,by+2,C.ORNG);p(bx-9,by+5,C.EMBR);p(bx-7,by+8,C.DPRED);
        // Glowing cracks at lv2
        if(big){p(bx,by+4,C.ORNG);p(bx-1,by+6,C.FLAME);p(bx+1,by+5,C.BRGHT);}
      } else if(s===2){
        // ABOUT TO EXPLODE — glowing, pulsing, body cracking with light
        const bx=16,by=big?7:8;
        const bw=big?8:6,bh=big?10:8;
        b(bx-Math.floor(bw/2),by+2,bw,bh,C.HELL);b(bx-Math.floor(bw/2)+1,by+2,bw-2,bh-1,C.ORNG);
        // Glow cracks — more at lv2
        p(bx-1,by+3,C.BRGHT);p(bx+1,by+5,C.FLAME);p(bx-2,by+6,C.BRGHT);p(bx+2,by+4,C.FLAME);
        p(bx,by+7,C.WHITE);
        if(big){p(bx-1,by+5,C.WHITE);p(bx+1,by+3,C.WHITE);p(bx,by+9,C.BRGHT);p(bx-2,by+8,C.FLAME);}
        // Head — eyes blazing white
        b(bx-3,by-2,6,4,C.ORNG);b(bx-2,by-2,4,3,C.FLAME);
        if(big){b(bx-4,by-2,8,5,C.ORNG);b(bx-3,by-2,6,4,C.FLAME);}
        p(bx-2,by-1,C.WHITE);p(bx+1,by-1,C.WHITE);
        // Horns glowing
        p(bx-4,by-3,C.ORNG);p(bx-5,by-4,C.FLAME);p(bx+3,by-3,C.ORNG);p(bx+4,by-4,C.FLAME);
        if(big){p(bx-6,by-5,C.BRGHT);p(bx+5,by-5,C.BRGHT);}
        // Aura glow — bigger at lv2
        const auraR=big?8:6;
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(bx+Math.round(Math.cos(a)*auraR),by+4+Math.round(Math.sin(a)*auraR),i%2?C.ORNG:C.FLAME);
          p(bx+Math.round(Math.cos(a)*(auraR+1)),by+4+Math.round(Math.sin(a)*(auraR+1)),i%3===0?C.FLAME:C.EMBR);
        }
        if(big){
          for(let i=0;i<8;i++){const a=i*Math.PI/4;
            p(bx+Math.round(Math.cos(a)*(auraR+2)),by+4+Math.round(Math.sin(a)*(auraR+2)),i%2?C.BRGHT:C.FLAME);
          }
        }
        // Legs — braced
        b(bx-3,by+10,3,4,C.ORNG);b(bx+1,by+10,3,4,C.ORNG);
        p(bx-2,by+12,C.FLAME);p(bx+2,by+12,C.FLAME);
        // Ground glow
        b(bx-5,by+15,10,1,C.EMBR);b(bx-4,by+16,8,1,C.DPRED);
        if(big){b(bx-6,by+14,12,1,C.ORNG);b(bx-7,by+15,14,1,C.EMBR);}
      } else {
        // EXPLOSION — massive blast ring, bigger at lv2
        const bx=16,by=16;
        const maxR=big?14:12;
        for(let r=maxR;r>0;r--){
          for(let i=0;i<24;i++){
            const a=i*Math.PI/12;
            const x=bx+Math.round(Math.cos(a)*r);
            const y=by+Math.round(Math.sin(a)*r);
            if(x>=0&&x<32&&y>=0&&y<32){
              const cl=r>maxR-2?C.DPRED:r>maxR-4?C.EMBR:r>maxR-6?C.HELL:r>maxR-8?C.ORNG:r>maxR-10?C.FLAME:C.WHITE;
              p(x,y,cl);
            }
          }
        }
        const coreR=big?3:2;
        b(bx-coreR,by-coreR,coreR*2,coreR*2,C.WHITE);b(bx-1,by-1,2,2,C.BRGHT);
        p(3,4,C.DKASH);p(28,3,C.CHAR);p(5,27,C.ASH);p(27,26,C.DKASH);
        p(2,14,C.EMBR);p(29,12,C.EMBR);p(8,2,C.ORNG);p(24,28,C.ORNG);
        if(big){p(1,8,C.FLAME);p(30,10,C.FLAME);p(4,28,C.ORNG);p(28,28,C.ORNG);}
      }
    },
    // 5. Immolate — Self-immolating figure in flame cage (2 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const glow=s===1?1:s===2?2:0;
      const big=lv>=2;
      iBase(p,b,24,big?24:20,glow);const br=s>=1,fl=s===2;
      // Figure — humanoid shape in center, bigger at lv2
      const figW=big?6:4,figH=big?12:10;
      b(16-Math.floor(figW/2),big?6:8,figW,figH,C.DPRED);b(15,big?6:8,Math.min(figW-1,3),figH-1,C.EMBR);
      // Head
      b(14,big?3:5,big?6:4,big?4:3,C.DPRED);b(15,big?3:5,big?4:2,big?3:2,C.EMBR);
      // Eyes — brighter at lv2
      const eyeY=big?4:6;
      p(14,eyeY,big?(br?C.BRGHT:C.FLAME):(br?C.FLAME:C.ORNG));p(big?19:17,eyeY,big?(br?C.BRGHT:C.FLAME):(br?C.FLAME:C.ORNG));
      // Arms raised — longer at lv2
      b(big?9:11,big?6:8,big?4:3,2,C.DPRED);b(big?19:18,big?6:8,big?4:3,2,C.DPRED);
      p(big?8:10,big?5:7,C.DPRED);p(big?23:21,big?5:7,C.DPRED);
      p(big?8:10,big?4:6,br?C.EMBR:C.DPRED);p(big?23:21,big?4:6,br?C.EMBR:C.DPRED);
      if(big){p(7,3,C.DPRED);p(24,3,C.DPRED);}
      // Legs
      b(13,18,3,4,C.DPRED);b(17,18,3,4,C.DPRED);
      if(big){b(12,18,1,4,C.DPRED);b(20,18,1,4,C.DPRED);}
      // Flame cage — bigger at lv2
      const cageH_=fl?(big?22:18):br?(big?18:14):(big?14:10);
      const cageW_=fl?(big?12:10):br?(big?10:8):(big?8:6);
      for(let side=-1;side<=1;side+=2){
        const cx_=16+side*(cageW_);
        for(let i=0;i<cageH_;i++){
          const jitter=Math.round(Math.sin(i*1.2)*0.8);
          const cl=i<cageH_*0.2?C.EMBR:i<cageH_*0.5?(fl?C.ORNG:C.HELL):i<cageH_*0.8?C.ORNG:C.FLAME;
          p(cx_+jitter,22-i,br&&i%2===0?C.FLAME:cl);
          if(big)p(cx_+jitter+(side>0?1:-1),22-i,i%3===0?(fl?C.BRGHT:C.ORNG):C.EMBR);
        }
      }
      // Horizontal flame bars
      if(br||big){
        for(let x=16-cageW_;x<=16+cageW_;x++){
          p(x,22-cageH_,fl||big?C.BRGHT:C.FLAME);
          if(fl||big)p(x,22-cageH_+1,C.ORNG);
        }
      }
      // Self-immolation flames on body — taller at lv2
      iFlame(p,16,big?-1:2,big?8:6,big?4:3,fl||big);
      if(br||big){p(13,7,C.FLAME);p(19,7,C.FLAME);p(12,10,C.ORNG);p(20,10,C.ORNG);}
      if(big){p(11,6,C.FLAME);p(21,6,C.FLAME);p(10,9,C.ORNG);p(22,9,C.ORNG);}
      // Sacrifice state = massive glow
      if(fl||big){
        const glowR=big?14:12;
        for(let i=0;i<16;i++){const a=i*Math.PI/8;
          p(16+Math.round(Math.cos(a)*glowR),14+Math.round(Math.sin(a)*(glowR*0.8)),i%2?C.ORNG:C.FLAME);
        }
        p(16,0,C.BRGHT);p(15,1,C.FLAME);p(17,1,C.FLAME);
        if(big){p(14,0,C.ORNG);p(18,0,C.ORNG);}
      }
      if(s===3){b(16-Math.floor(figW/2),big?6:8,figW,figH,C.DKASH);p(15,eyeY,C.DPRED);p(16,eyeY,C.DPRED);}
    },
    // 6. Apocalypse (Ultimate) — Demonic gate/portal with flames (3 levels)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      // Gate pillars — wider/taller at higher levels
      const pilW=lv>=3?6:lv>=2?5:4;
      const pilH=lv>=3?26:lv>=2?25:24;
      const pilLX=lv>=3?2:lv>=2?3:4;
      const pilRX=lv>=3?24:lv>=2?24:24;
      b(pilLX,4,pilW,pilH,C.CHAR);b(pilLX+1,4,pilW-2,pilH,C.DKASH);b(pilLX,4,pilW,1,C.ASH);
      b(pilRX,4,pilW,pilH,C.CHAR);b(pilRX+1,4,pilW-2,pilH,C.DKASH);b(pilRX,4,pilW,1,C.ASH);
      // Archway top — grander at higher levels
      const archSpan=lv>=3?24:lv>=2?22:20;
      for(let i=0;i<(lv>=3?8:6);i++){
        const aw=archSpan-i*2,sx=16-Math.floor(aw/2);
        b(sx,4-i,aw,1,i<2?C.DKASH:i<4?C.CHAR:C.OBSID);
      }
      b(16-Math.floor(archSpan/2)+2,4,archSpan-4,1,fl||lv>=3?C.EMBR:C.ASH);
      // Runes on pillars — denser at higher levels
      for(let y=6;y<26;y+=lv>=3?2:3){
        p(pilLX+1,y,br||lv>=2?C.ORNG:C.EMBR);p(pilRX+pilW-2,y,br||lv>=2?C.ORNG:C.EMBR);
        if(fl||lv>=3){p(pilLX+2,y+1,C.FLAME);p(pilRX+pilW-3,y+1,C.FLAME);}
      }
      // Skull keystone — bigger at higher levels
      const skW=lv>=3?6:4;
      b(16-Math.floor(skW/2),lv>=3?-2:0,skW,lv>=3?4:3,C.SKULL);b(15,lv>=3?-2:0,2,lv>=3?3:2,C.BONE);
      p(16-Math.floor(skW/2),1,C.HELL);p(16+Math.floor(skW/2)-1,1,C.HELL);
      p(15,2,C.DKBLD);p(16,2,C.DKBLD);
      if(lv>=2){p(16-Math.floor(skW/2)-1,0,C.DKASH);p(16+Math.floor(skW/2),0,C.DKASH);}
      if(lv>=3){p(16-Math.floor(skW/2)-2,-1,C.CHAR);p(16+Math.floor(skW/2)+1,-1,C.CHAR);p(16,-3,C.BONE);}
      // Portal interior — wider at higher levels
      const pw=fl||lv>=3?16:br||lv>=2?14:10;
      for(let y=5;y<26;y++){
        const w=Math.min(pw,pw-Math.abs(y-15)*0.3);
        const sw=Math.max(2,Math.round(w));
        b(16-Math.floor(sw/2),y,sw,1,C.DKBLD);
      }
      // Fire pouring out — more streams at higher levels
      const fireStreams=lv>=3?3:lv>=2?2:1;
      for(let fs=0;fs<fireStreams;fs++){
        const fOff=(fs-Math.floor(fireStreams/2))*3;
        for(let y=6;y<25;y++){
          const x=14+fOff+Math.round(Math.sin(y*0.5+fs)*2);
          p(x,y,fl||lv>=3?C.FLAME:br||lv>=2?C.ORNG:C.HELL);
          p(x+1,y,fl||lv>=3?C.ORNG:C.EMBR);
          if(fl||lv>=3)p(x-1,y,C.BRGHT);
        }
      }
      // Lava eyes in the void — more at higher levels
      p(13,12,br||lv>=2?C.FLAME:C.ORNG);p(18,12,br||lv>=2?C.FLAME:C.ORNG);
      if(fl||lv>=3){p(13,12,C.BRGHT);p(18,12,C.BRGHT);p(14,13,C.ORNG);p(17,13,C.ORNG);}
      if(lv>=2){p(12,15,C.ORNG);p(19,15,C.ORNG);}
      if(lv>=3){p(11,18,C.FLAME);p(20,18,C.FLAME);p(13,20,C.EMBR);p(18,20,C.EMBR);}
      // Flames pouring from top
      if(br||lv>=2){
        iFlame(p,10,0,6+(lv-1)*2,3,lv>=3);iFlame(p,22,0,6+(lv-1)*2,3,lv>=3);
      }
      if(fl||lv>=3){
        iFlame(p,8,-1,8+lv,4,true);iFlame(p,24,-1,8+lv,4,true);
        iFlame(p,16,-2,6+lv,3,true);
      }
      if(lv>=3){
        iFlame(p,5,-1,6,3,true);iFlame(p,27,-1,6,3,true);
      }
      // Base — charred ground
      b(lv>=3?1:3,27,lv>=3?30:26,4,C.CHAR);b(lv>=3?2:4,27,lv>=3?28:24,1,C.DKASH);
      // Lava cracks in base
      iLavaCrack(p,8,28,12,30,lv>=3?C.LAVA:C.EMBR,fl||lv>=3);
      iLavaCrack(p,20,27,24,30,lv>=3?C.LAVA:C.EMBR,fl||lv>=3);
      if(fl||lv>=2){p(10,28,C.LAVA);p(22,28,C.LAVA);p(16,29,C.ORNG);}
      if(lv>=3){iLavaCrack(p,4,28,8,31,C.LAVA,true);iLavaCrack(p,24,28,28,31,C.LAVA,true);}
      if(s===3){
        for(let y=6;y<25;y++)b(10,y,12,1,C.OBSID);
        p(14,12,C.DPRED);p(17,12,C.DPRED);
      }
    },
  ];
  const cols=6,rows=T_MAX_LVL*T_STATES_PER_LVL; // 16 rows
  for(let col=0;col<cols;col++){
    const maxLv=T_LEVELS[col];
    for(let lv=1;lv<=T_MAX_LVL;lv++){
      const effectiveLv=Math.min(lv,maxLv); // clamp to tower's max level
      for(let st=0;st<T_STATES_PER_LVL;st++){
        const row=(lv-1)*T_STATES_PER_LVL+st;
        fns[col](ctx,[col*T_CELL,row*T_CELL],st,effectiveLv);
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (6x6 at 32x32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:any){
  const fns=[
    // 1. Imp: small fireball -> fire puff
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Small fireball in flight — rotating
        const rot=f*0.6;
        const r=2+f*0.3;
        for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){
          if(x*x+y*y<=r*r+1){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y,d<0.8?C.WHITE:d<1.5?C.BRGHT:d<2?C.FLAME:C.ORNG);
          }
        }
        // Trail
        const tLen=[2,3,4][f];
        for(let i=1;i<=tLen;i++)p(cx-2-i,cy+Math.round(Math.sin(i+rot)*0.8),i<2?C.ORNG:C.EMBR);
        p(cx+2,cy-1,C.HELL);
      } else if(f===3){
        // Impact — fire puff expanding
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.ORNG:C.FLAME);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.BRGHT);
        }
        b(cx-1,cy-1,2,2,C.WHITE);p(cx,cy,C.WHITE);
      } else if(f===4){
        // Dissipating puff
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.EMBR:C.DPRED);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.ORNG);
        }
        p(cx,cy,C.FLAME);
      } else {
        // Fading embers
        [[4,5],[11,4],[6,10],[9,12],[3,8],[13,7]].forEach(([x,y],i)=>p(x,y,i%2?C.EMBR:C.DPRED));
        p(cx,cy,C.DPRED);
      }
    },
    // 2. Hellfire: flame wave -> fire burst
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Flame wave — arc shape moving forward
        const spread=[3,4,5][f];
        for(let i=-spread;i<=spread;i++){
          const h=Math.max(1,4-Math.abs(i));
          for(let j=0;j<h;j++){
            const cl=j===0?C.BRGHT:j===1?C.FLAME:C.ORNG;
            p(cx+i,cy-j,f===2&&j===0?C.WHITE:cl);
          }
        }
        // Heat trail
        for(let i=-2;i<=2;i++)p(cx+i,cy+1,C.EMBR);
        if(f>0)for(let i=-1;i<=1;i++)p(cx+i,cy+2,C.DPRED);
      } else if(f===3){
        // Fire burst — radial
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          for(let r=1;r<5;r++){
            const cl=r<2?C.WHITE:r<3?C.FLAME:r<4?C.ORNG:C.HELL;
            p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),cl);
          }
        }
        b(cx-1,cy-1,2,2,C.WHITE);
      } else if(f===4){
        // Burst fading
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.EMBR:C.HELL);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.ORNG);
        }
        p(cx,cy,C.FLAME);
      } else {
        // Smoldering
        [[5,6],[10,5],[7,10],[4,8],[12,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DPRED:C.EMBR));
        p(cx,cy,C.DPRED);
      }
    },
    // 3. Soul Drain: green soul wisp -> soul absorbed flash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Green soul wisp — ethereal
        const bob=[0,-1,1][f];
        for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){
          if(x*x+y*y<=5){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y+bob,d<1?C.WHITE:d<1.8?C.PLGRN:C.GRNSOL);
          }
        }
        // Wispy trail
        p(cx-3,cy+bob+1,C.DKGRN);p(cx-4,cy+bob,C.DKGRN);p(cx-5,cy+bob+1,f>0?C.DKGRN:C.VOID);
        // Glow
        p(cx+2,cy-2+bob,C.LTGRN);p(cx-2,cy+2+bob,C.LTGRN);
      } else if(f===3){
        // Absorbed — bright green flash
        for(let i=0;i<10;i++){const a=i*Math.PI/5;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.GRNSOL:C.LTGRN);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.PLGRN);
        }
        b(cx-1,cy-1,2,2,C.WHITE);p(cx,cy,C.WHITE);
      } else if(f===4){
        // Fading absorption
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKGRN);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.GRNSOL);
        }
        p(cx,cy,C.LTGRN);
      } else {
        [[5,5],[10,6],[7,11],[4,9],[12,8]].forEach(([x,y],i)=>p(x,y,i%2?C.DKGRN:C.GRNSOL));
      }
    },
    // 4. Fiend: running fire trail -> massive explosion ring
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Running fire trail — streaking flames
        const len=[4,6,8][f];
        for(let i=0;i<len;i++){
          const w=Math.max(1,3-Math.floor(i*0.4));
          for(let j=0;j<w;j++){
            const cl=i<2?C.FLAME:i<4?C.ORNG:C.EMBR;
            p(cx-Math.floor(len/2)+i,cy-Math.floor(w/2)+j+Math.round(Math.sin(i)*0.6),cl);
          }
        }
        p(cx+Math.floor(len/2),cy,C.BRGHT);
        // Sparks
        if(f>0){p(cx-4,cy-2,C.ORNG);p(cx-5,cy+1,C.EMBR);}
        if(f>1){p(cx-6,cy-1,C.FLAME);p(cx-7,cy+2,C.DPRED);}
      } else if(f===3){
        // MASSIVE explosion ring
        for(let r=6;r>0;r--){
          for(let i=0;i<16;i++){
            const a=i*Math.PI/8;
            const x=cx+Math.round(Math.cos(a)*r);
            const y=cy+Math.round(Math.sin(a)*r);
            if(x>=0&&x<16&&y>=0&&y<16){
              const cl=r>5?C.EMBR:r>4?C.HELL:r>3?C.ORNG:r>2?C.FLAME:r>1?C.BRGHT:C.WHITE;
              p(x,y,cl);
            }
          }
        }
        b(cx-1,cy-1,2,2,C.WHITE);
      } else if(f===4){
        // Explosion expanding/fading
        for(let r=7;r>2;r--){
          for(let i=0;i<16;i++){
            const a=i*Math.PI/8;
            const x=cx+Math.round(Math.cos(a)*r);
            const y=cy+Math.round(Math.sin(a)*r);
            if(x>=0&&x<16&&y>=0&&y<16)p(x,y,r>5?C.DPRED:r>4?C.EMBR:C.HELL);
          }
        }
        p(cx,cy,C.ORNG);
      } else {
        // Smoke remains
        for(let i=0;i<10;i++){const a=i*Math.PI/5;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.ASH:C.DKASH);
        }
        p(cx,cy,C.DPRED);p(cx+1,cy-1,C.ASH);
      }
    },
    // 5. Immolate: flame pillar -> immolation nova
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Flame pillar — vertical column
        const h=[6,8,10][f],w=[2,3,3][f];
        for(let i=0;i<h;i++){
          const fw_=Math.max(1,w-Math.floor(i*0.2));
          for(let x=0;x<fw_;x++){
            const t=i/h;
            const cl=t<0.2?C.EMBR:t<0.4?C.HELL:t<0.6?C.ORNG:t<0.8?C.FLAME:C.BRGHT;
            p(cx-Math.floor(fw_/2)+x,cy+Math.floor(h/2)-i,cl);
          }
        }
        p(cx,cy-Math.floor(h/2),f===2?C.WHITE:C.BRGHT);
      } else if(f===3){
        // Immolation nova — expanding ring of fire
        for(let r=5;r>0;r--){
          for(let i=0;i<12;i++){
            const a=i*Math.PI/6;
            p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>3?C.HELL:r>2?C.ORNG:r>1?C.FLAME:C.WHITE);
          }
        }
        b(cx-1,cy-1,2,2,C.BRGHT);p(cx,cy,C.WHITE);
        // Radial fire lines
        for(let i=0;i<6;i++){const a=i*Math.PI/3;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.FLAME);
        }
      } else if(f===4){
        // Nova fading
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),i%2?C.DPRED:C.EMBR);
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.HELL);
        }
        p(cx,cy,C.ORNG);
      } else {
        [[4,4],[12,5],[6,11],[10,3],[3,8],[13,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DPRED:C.EMBR));
      }
    },
    // 6. Apocalypse: apocalyptic meteor -> hellfire explosion (biggest, most dramatic)
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Apocalyptic meteor — huge fireball with debris
        const phase=f;
        const r=3;
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r+2){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x-phase,cy+y-phase,d<1?C.WHITE:d<1.8?C.BRGHT:d<2.5?C.FLAME:C.ORNG);
          }
        }
        // Massive fire trail
        const tLen=4+phase*2;
        for(let i=1;i<=tLen;i++){
          const jitter=Math.round(Math.sin(i*1.5)*1);
          p(cx-phase+r+i,cy-phase-1+jitter,i<2?C.FLAME:i<4?C.ORNG:i<6?C.HELL:C.EMBR);
          if(i<tLen-1)p(cx-phase+r+i,cy-phase+jitter,i<3?C.ORNG:C.EMBR);
        }
        // Smoke
        if(phase>0){p(cx+5,cy-4,C.ASH);p(cx+6,cy-3,C.DKASH);}
        // Ground shadow
        if(phase>1){b(cx-3,13,6,1,C.OBSID);b(cx-2,14,4,1,C.CHAR);}
      } else if(f===3){
        // HELLFIRE EXPLOSION — maximum drama
        for(let r=7;r>0;r--){
          for(let i=0;i<24;i++){
            const a=i*Math.PI/12;
            const x=cx+Math.round(Math.cos(a)*r);
            const y=cy+Math.round(Math.sin(a)*r);
            if(x>=0&&x<16&&y>=0&&y<16){
              const cl=r>6?C.DPRED:r>5?C.EMBR:r>4?C.HELL:r>3?C.ORNG:r>2?C.FLAME:r>1?C.BRGHT:C.WHITE;
              p(x,y,cl);
            }
          }
        }
        b(cx-1,cy-1,2,2,C.WHITE);
        // Fire rays
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          for(let r=1;r<8;r++){
            const x=cx+Math.round(Math.cos(a)*r);
            const y=cy+Math.round(Math.sin(a)*r);
            if(x>=0&&x<16&&y>=0&&y<16)p(x,y,r<3?C.WHITE:r<5?C.FLAME:C.HELL);
          }
        }
      } else if(f===4){
        // Explosion fading — still big
        for(let r=7;r>2;r--){
          for(let i=0;i<20;i++){
            const a=i*Math.PI/10;
            const x=cx+Math.round(Math.cos(a)*r);
            const y=cy+Math.round(Math.sin(a)*r);
            if(x>=0&&x<16&&y>=0&&y<16)p(x,y,r>5?C.DPRED:r>4?C.EMBR:C.HELL);
          }
        }
        p(cx,cy,C.ORNG);p(cx-1,cy,C.HELL);p(cx+1,cy,C.HELL);
        // Debris
        p(1,2,C.ASH);p(14,1,C.DKASH);p(2,13,C.ASH);p(13,14,C.DKASH);
      } else {
        // Scorched remains
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%3===0?C.EMBR:i%2?C.CHAR:C.ASH);
        }
        b(cx-1,cy-1,2,2,C.DPRED);p(cx,cy,C.EMBR);
        p(3,3,C.DKASH);p(12,4,C.CHAR);p(5,12,C.DKASH);p(11,11,C.CHAR);
      }
    },
  ];
  const cols=6,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8x5 at 64x128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx:any){
  // Berserker — muscular demon-touched warrior, red skin/markings, huge axe, flames from eyes
  function drawChar(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,charge=false,leap=false,rage=false,rampage=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Rampage fire aura
    if(rampage){
      for(let i=0;i<16;i++){const a=i*Math.PI/8;
        const r1=10+Math.round(Math.sin(i*2)*2);
        p(cx+Math.round(Math.cos(a)*r1),30+Math.round(Math.sin(a)*r1),i%2?C.ORNG:C.FLAME);
        p(cx+Math.round(Math.cos(a)*(r1-2)),30+Math.round(Math.sin(a)*(r1-2)),i%3===0?C.FLAME:C.HELL);
      }
      // Ground fire
      for(let x=4;x<28;x++){if(x%2===0)p(x,56,C.ORNG);if(x%3===0)p(x,57,C.EMBR);}
    }

    const lean=charge?3:leap?0:atk&&atkFrame>0?1:0;
    const headY=leap?3:charge?6:7;
    const torY=headY+8;
    const legY=torY+10;
    const bx_=cx+lean;

    // BODY BUILD — muscular, broad
    // Torso — wide, powerful
    b(bx_-4,torY,8,9,C.DPRED);b(bx_-3,torY,6,8,C.HELL);
    if(dir===0){
      // Chest muscles
      b(bx_-3,torY+1,3,3,C.ORNG);b(bx_+1,torY+1,3,3,C.ORNG);
      p(bx_,torY+1,C.DPRED); // center line
      // Abs
      p(bx_-1,torY+5,C.ORNG);p(bx_+1,torY+5,C.ORNG);
      p(bx_-1,torY+7,C.ORNG);p(bx_+1,torY+7,C.ORNG);
    } else if(dir===1){
      b(bx_-2,torY+1,4,3,C.ORNG);
      p(bx_,torY+5,C.ORNG);p(bx_,torY+7,C.ORNG);
    } else {
      // Back muscles
      b(bx_-3,torY+1,6,4,C.EMBR);
      p(bx_,torY+2,C.DPRED);p(bx_,torY+4,C.DPRED);
    }
    // Demon markings on torso
    if(rage||rampage){
      p(bx_-3,torY+2,C.FLAME);p(bx_+3,torY+2,C.FLAME);
      p(bx_-2,torY+5,C.ORNG);p(bx_+2,torY+5,C.ORNG);
    }
    // Belt/waist
    b(bx_-4,torY+8,8,1,C.DKASH);b(bx_-3,torY+8,6,1,C.CHAR);p(bx_,torY+8,C.EMBR);

    // HEAD — strong jaw, demon features
    if(dir===0){
      b(bx_-4,headY,8,7,C.HELL);b(bx_-3,headY,6,6,C.ORNG);
      // Brow ridge
      b(bx_-4,headY,8,2,C.DPRED);b(bx_-3,headY,6,1,C.EMBR);
      // Eyes — flames come from them
      p(bx_-2,headY+2,C.FLAME);p(bx_-1,headY+2,C.BRGHT);
      p(bx_+1,headY+2,C.FLAME);p(bx_+2,headY+2,C.BRGHT);
      // Flame trails from eyes
      p(bx_-3,headY+1,C.ORNG);p(bx_+3,headY+1,C.ORNG);
      if(rage||rampage){p(bx_-4,headY,C.FLAME);p(bx_+4,headY,C.FLAME);p(bx_-5,headY-1,C.ORNG);p(bx_+5,headY-1,C.ORNG);}
      // Nose
      p(bx_,headY+3,C.DPRED);
      // Jaw
      b(bx_-3,headY+5,6,2,C.DPRED);b(bx_-2,headY+5,4,1,C.HELL);
      // Mouth
      p(bx_-1,headY+6,C.DKBLD);p(bx_,headY+6,C.DKBLD);p(bx_+1,headY+6,C.DKBLD);
      // Short horns
      p(bx_-4,headY-1,C.DKASH);p(bx_-5,headY-2,C.CHAR);
      p(bx_+4,headY-1,C.DKASH);p(bx_+5,headY-2,C.CHAR);
    } else if(dir===1){
      b(bx_-3,headY,7,7,C.HELL);b(bx_-2,headY,5,6,C.ORNG);
      b(bx_-3,headY,7,2,C.DPRED);
      // One eye
      p(bx_+1,headY+2,C.FLAME);p(bx_+2,headY+2,C.BRGHT);
      p(bx_+3,headY+1,C.ORNG);
      if(rage||rampage){p(bx_+4,headY,C.FLAME);p(bx_+5,headY-1,C.ORNG);}
      p(bx_+1,headY+3,C.DPRED);
      b(bx_-2,headY+5,5,2,C.DPRED);
      p(bx_+1,headY+6,C.DKBLD);
      p(bx_+4,headY-1,C.DKASH);p(bx_+5,headY-2,C.CHAR);
    } else {
      b(bx_-4,headY,8,7,C.HELL);b(bx_-3,headY,6,6,C.EMBR);
      b(bx_-4,headY,8,2,C.DPRED);
      // Back of head
      p(bx_-1,headY+2,C.DPRED);p(bx_+1,headY+2,C.DPRED);
      b(bx_-3,headY+5,6,2,C.DPRED);
      p(bx_-4,headY-1,C.DKASH);p(bx_-5,headY-2,C.CHAR);
      p(bx_+4,headY-1,C.DKASH);p(bx_+5,headY-2,C.CHAR);
    }

    // ARMS & AXE
    if(atk){
      if(dir===0){
        // Massive axe swing down
        if(atkFrame===0){
          // Axe raised — arm up
          b(bx_+4,torY-4,3,6,C.HELL);b(bx_+5,torY-4,2,5,C.ORNG);
          // Axe head — big and brutal
          b(bx_+3,torY-8,6,4,C.GRAY);b(bx_+4,torY-8,4,3,C.LTSMK);
          p(bx_+3,torY-8,C.DKGRAY);p(bx_+8,torY-8,C.DKGRAY);
          // Axe edge glow
          p(bx_+3,torY-7,C.EMBR);p(bx_+8,torY-7,C.EMBR);
          // Handle
          b(bx_+5,torY-4,1,8,C.DKASH);
          // Left arm down
          b(bx_-6,torY+1,3,5,C.HELL);b(bx_-5,torY+1,2,4,C.ORNG);
        } else {
          // Axe smashing down
          b(bx_+4,torY+2,3,5,C.HELL);b(bx_+5,torY+2,2,4,C.ORNG);
          // Axe head at ground
          b(bx_+3,torY+8,6,4,C.GRAY);b(bx_+4,torY+9,4,3,C.LTSMK);
          p(bx_+3,torY+8,C.EMBR);p(bx_+8,torY+11,C.EMBR);
          // Impact sparks
          for(let i=0;i<5;i++){p(bx_+2+i*2,torY+12+Math.round(Math.sin(i)*1.5),i%2?C.FLAME:C.ORNG);}
          b(bx_+5,torY+4,1,5,C.DKASH);
          b(bx_-6,torY+3,3,4,C.HELL);
        }
      } else if(dir===1){
        if(atkFrame===0){
          // Axe wound up
          b(bx_+4,torY-3,3,5,C.HELL);
          b(bx_+2,torY-7,5,4,C.GRAY);b(bx_+3,torY-7,3,3,C.LTSMK);
          p(bx_+2,torY-6,C.EMBR);p(bx_+6,torY-6,C.EMBR);
          b(bx_+4,torY-3,1,6,C.DKASH);
        } else {
          // Axe swung forward
          b(bx_+4,torY+1,5,3,C.HELL);
          b(bx_+8,torY-1,4,5,C.GRAY);b(bx_+9,torY,3,3,C.LTSMK);
          p(bx_+8,torY-1,C.EMBR);p(bx_+11,torY+3,C.EMBR);
          b(bx_+5,torY+2,4,1,C.DKASH);
          // Slash trail
          for(let i=0;i<4;i++)p(bx_+7+i,torY-2+i,C.ORNG);
        }
      } else {
        if(atkFrame===0){
          b(bx_+4,torY-4,3,6,C.HELL);
          b(bx_+3,torY-8,5,4,C.GRAY);b(bx_+4,torY-8,3,3,C.LTSMK);
          b(bx_+4,torY-4,1,7,C.DKASH);
        } else {
          b(bx_+4,torY+3,3,4,C.HELL);
          b(bx_+3,torY+8,5,4,C.GRAY);b(bx_+4,torY+9,3,3,C.LTSMK);
          b(bx_+4,torY+4,1,5,C.DKASH);
        }
      }
    } else {
      // Idle/walk arms — muscular
      const aY=torY+1;
      if(dir===0){
        b(bx_-6,aY+armSwing,3,6,C.HELL);b(bx_-5,aY+armSwing,2,5,C.ORNG);
        b(bx_+4,aY-armSwing,3,6,C.HELL);b(bx_+5,aY-armSwing,2,5,C.ORNG);
        // Axe at side
        b(bx_+6,aY-armSwing+1,1,8,C.DKASH);
        b(bx_+5,aY-armSwing-2,3,3,C.GRAY);p(bx_+5,aY-armSwing-2,C.EMBR);
        // Fists
        b(bx_-6,aY+armSwing+5,2,2,C.DPRED);
        b(bx_+5,aY-armSwing+5,2,2,C.DPRED);
      } else if(dir===1){
        b(bx_+4,aY-armSwing,3,6,C.HELL);b(bx_+5,aY-armSwing,2,5,C.ORNG);
        b(bx_+6,aY-armSwing+1,1,8,C.DKASH);
        b(bx_+5,aY-armSwing-2,3,3,C.GRAY);p(bx_+5,aY-armSwing-2,C.EMBR);
        b(bx_+5,aY-armSwing+5,2,2,C.DPRED);
      } else {
        b(bx_-6,aY+armSwing,3,6,C.HELL);b(bx_-5,aY+armSwing,2,5,C.EMBR);
        b(bx_+4,aY-armSwing,3,6,C.HELL);b(bx_+5,aY-armSwing,2,5,C.EMBR);
        // Axe on back
        b(bx_-1,aY-4,1,10,C.DKASH);
        b(bx_-3,aY-6,4,3,C.GRAY);p(bx_-3,aY-5,C.EMBR);
      }
    }

    // LEGS — powerful
    const lh=10;
    b(bx_-3+lOff,legY,3,lh,C.DPRED);b(bx_-2+lOff,legY,2,lh-1,C.HELL);
    b(bx_+1+rOff,legY,3,lh,C.DPRED);b(bx_+2+rOff,legY,2,lh-1,C.HELL);
    // Knee guards
    b(bx_-3+lOff,legY+Math.floor(lh*0.5),3,1,C.DKASH);
    b(bx_+1+rOff,legY+Math.floor(lh*0.5),3,1,C.DKASH);
    // Boots — heavy
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-4+lOff,lfy,5,2,C.CHAR);b(bx_-3+lOff,lfy,4,1,C.DKASH);
    b(bx_+rOff,rfy,5,2,C.CHAR);b(bx_+1+rOff,rfy,4,1,C.DKASH);
    // Ground shadow
    if(!leap&&lfy+2<63){p(bx_-4+lOff,lfy+2,C.OBSID);p(bx_+4+rOff,rfy+2,C.OBSID);}

    // Demon skin markings — glowing veins
    if(rage){
      // Veins glow bright on arms and chest
      p(bx_-4,torY+2,C.FLAME);p(bx_+4,torY+2,C.FLAME);
      p(bx_-3,torY+4,C.ORNG);p(bx_+3,torY+4,C.ORNG);
      p(bx_-2,legY+2,C.ORNG);p(bx_+2,legY+2,C.ORNG);
      p(bx_-3,headY+3,C.FLAME);p(bx_+3,headY+3,C.FLAME);
    }

    // Leap slam — airborne
    if(leap){
      // Jump dust below
      for(let x=6;x<26;x++){if(x%2===0)p(x,58,C.ASH);if(x%3===0)p(x,59,C.DKASH);}
      // Impact target marker
      b(bx_-4,56,8,1,C.EMBR);b(bx_-3,55,6,1,C.HELL);
    }

    // Charge lean lines
    if(charge){
      for(let y=headY;y<legY+6;y+=3){p(bx_-8,y,C.ORNG);p(bx_-9,y+1,C.EMBR);}
    }

    // Hurt flash
    if(hurt){p(bx_+5,headY+1,C.HELL);p(bx_+6,headY,C.FLAME);p(bx_+7,headY+1,C.HELL);p(bx_+6,headY+2,C.ORNG);}
  }

  // Layout: 8 cols x 5 rows at 64x128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities — cleave sweep, blood rage, leap slam, rampage
  // R4: hurt, death1, death2, portrait

  const frames:any[]=[];
  for(let dir=0;dir<3;dir++){
    frames.push([
      {dir,opts:{}},
      {dir,opts:{armSwing:1}},
      {dir,opts:{lOff:2,rOff:-1,armSwing:1}},
      {dir,opts:{lOff:-1,rOff:2,armSwing:-1}},
      {dir,opts:{lOff:3,rOff:0,armSwing:1}},
      {dir,opts:{lOff:0,rOff:3,armSwing:-1}},
      {dir,opts:{atk:true,atkFrame:0,lOff:1}},
      {dir,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},
    ]);
  }
  // Abilities
  frames.push([
    {dir:0,opts:{atk:true,atkFrame:0,lOff:1}},                    // Cleave sweep 1
    {dir:0,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},            // Cleave sweep 2
    {dir:0,opts:{rage:true}},                                       // Blood rage 1 (veins glow)
    {dir:0,opts:{rage:true,armSwing:1}},                            // Blood rage 2
    {dir:0,opts:{leap:true,lOff:1,rOff:1}},                        // Leap slam 1
    {dir:0,opts:{leap:true,atk:true,atkFrame:1,lOff:2,rOff:-1}},  // Leap slam 2
    {dir:0,opts:{rampage:true}},                                    // Rampage 1 (fire aura)
    {dir:0,opts:{rampage:true,charge:true,lOff:2,rOff:1}},        // Rampage 2 (charging)
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
        // Collapse in flames
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Body collapsed sideways
        b(7,32,5,4,C.DPRED);b(8,33,3,2,C.HELL);b(7,32,5,1,C.EMBR);p(9,34,C.ORNG);
        // Torso flat
        b(11,34,10,4,C.DPRED);b(12,34,8,3,C.HELL);
        // Legs sprawled
        b(21,36,6,2,C.DPRED);b(23,38,4,2,C.DPRED);
        // Axe dropped
        b(4,36,1,6,C.DKASH);b(3,35,3,2,C.GRAY);p(3,35,C.EMBR);
        // Flames consuming body
        iFlame(p,10,28,6,3,false);iFlame(p,16,29,5,2,false);iFlame(p,22,30,4,2,false);
        // Embers
        [[8,26,C.ORNG],[14,24,C.FLAME],[20,27,C.EMBR],[11,22,C.FLAME],[17,25,C.ORNG]].forEach(([x,y,cl]:any)=>p(x,y,cl));
        // Ground scorch
        b(6,38,18,2,C.CHAR);
        for(let x=5;x<25;x++){if(x%3!==0)p(x,40,C.OBSID);if(x%4===0)p(x,41,C.CHAR);}
      } else if(frame.opts.custom==='death2'){
        // Burned remains + dissipating flame
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Scorched ground
        for(let x=6;x<26;x++){if(x%2===0)p(x,42,C.CHAR);if(x%3===0)p(x,41,C.OBSID);}
        // Ash pile
        b(10,39,12,3,C.ASH);b(11,39,10,2,C.DKASH);
        // Remaining embers
        p(12,38,C.EMBR);p(18,38,C.DPRED);p(15,37,C.EMBR);
        // Dissipating fire particles
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.FLAME:i%4===0?C.ORNG:i%3===0?C.EMBR:i%2===0?C.DPRED:C.CHAR);
        });
        // Axe remains
        p(8,40,C.DKASH);p(7,40,C.GRAY);p(9,40,C.GRAY);
        p(15,42,C.EMBR);p(16,42,C.DPRED);
      } else if(frame.opts.custom==='portrait'){
        // Berserker portrait — close-up face
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Background — dark infernal
        b(2,2,28,60,C.DKBLD);b(3,3,26,58,C.OBSID);
        // Face — large
        b(6,8,20,16,C.HELL);b(7,9,18,14,C.ORNG);
        // Brow ridge — heavy
        b(6,8,20,4,C.DPRED);b(7,8,18,3,C.EMBR);b(8,7,16,2,C.DPRED);
        // Eyes — blazing with fire trails
        b(8,14,5,3,C.DKBLD);b(9,14,3,2,C.FLAME);b(10,14,1,2,C.BRGHT);p(10,14,C.WHITE);
        b(19,14,5,3,C.DKBLD);b(20,14,3,2,C.FLAME);b(21,14,1,2,C.BRGHT);p(21,14,C.WHITE);
        // Fire trailing from eyes
        p(7,13,C.ORNG);p(6,12,C.FLAME);p(5,11,C.ORNG);
        p(24,13,C.ORNG);p(25,12,C.FLAME);p(26,11,C.ORNG);
        // Nose
        p(15,17,C.DPRED);p(16,17,C.DPRED);p(15,18,C.DKBLD);p(16,18,C.DKBLD);
        // Jaw — strong
        b(7,20,18,4,C.DPRED);b(8,20,16,3,C.HELL);
        // Mouth — snarl
        b(11,21,10,2,C.DKBLD);b(12,21,8,1,C.DPRED);
        // Fangs
        p(12,22,C.SKULL);p(19,22,C.SKULL);
        // Horns at temples
        p(5,9,C.DKASH);p(4,8,C.CHAR);p(3,7,C.DKASH);
        p(26,9,C.DKASH);p(27,8,C.CHAR);p(28,7,C.DKASH);
        // Demon markings on face
        p(8,16,C.FLAME);p(9,18,C.ORNG);p(22,16,C.FLAME);p(23,18,C.ORNG);
        // Neck/shoulders
        b(6,24,20,8,C.DPRED);b(7,24,18,6,C.HELL);
        // Shoulder armor/markings
        b(4,26,4,6,C.DKASH);b(5,26,2,5,C.CHAR);b(24,26,4,6,C.DKASH);b(25,26,2,5,C.CHAR);
        // Chest markings
        p(12,28,C.FLAME);p(14,30,C.ORNG);p(16,28,C.FLAME);p(18,30,C.ORNG);
        // Axe handle visible
        b(25,30,2,14,C.DKASH);p(26,29,C.GRAY);p(25,28,C.EMBR);
        // Border — fiery
        b(2,2,28,1,C.EMBR);b(2,61,28,1,C.EMBR);b(2,2,1,60,C.EMBR);b(29,2,1,60,C.EMBR);
        p(3,3,C.FLAME);p(28,3,C.FLAME);p(3,60,C.FLAME);p(28,60,C.FLAME);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Imp','Hellfire','Soul Drain','Fiend','Immolate','Apocalypse'];
const T_STATE_LABELS=['Idle','Charge','Fire','Cooldown'];
const T_ROW_LABELS:string[]=[];
for(let lv=1;lv<=T_MAX_LVL;lv++)for(const st of T_STATE_LABELS)T_ROW_LABELS.push(`L${lv} ${st}`);
const P_NAMES=['Imp','Hellfire','Soul Drain','Fiend','Immolate','Apocalypse'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Cleave 1','Cleave 2','Rage 1','Rage 2','Leap 1','Leap 2','Rampage 1','Rampage 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers — now 6 cols x 16 rows
    const tRows=T_MAX_LVL*T_STATES_PER_LVL;
    const tc=tRef.current!;tc.width=6*T_CELL;tc.height=tRows*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+6*T_CELL*tS;tpv.height=tRows*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a0000';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<tRows;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#cc4400';tpc.font='bold 9px monospace';tpc.fillText(T_ROW_LABELS[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<6;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a0800';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#cc8866';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=6*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+6*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#0a0000';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#cc4400';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<6;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a0800';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#cc8866';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#0a0000';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#cc4400';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a0800';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#cc8866';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tRows=T_MAX_LVL*T_STATES_PER_LVL;
  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'infernal_towers_animated.png',
      info:{sz:`384x${tRows*T_CELL}`,cell:'64x64',loader:"this.load.spritesheet('infernal_towers','infernal_towers_animated.png',{frameWidth:64,frameHeight:64})",note:`6 cols (towers) x ${tRows} rows (${T_MAX_LVL} levels x 4 states). Levels: ${T_LEVELS.map((l,i)=>T_NAMES[i]+':'+l).join(', ')}. Fiend col uses rows as: idle, run, glow, explode per level`}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'infernal_projectiles_animated.png',
      info:{sz:'192x192',cell:'32x32',loader:"this.load.spritesheet('infernal_proj','infernal_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'6 cols x 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Berserker',ref:hRef,pvRef:hPv,dl:'berserker_hero_directional.png',
      info:{sz:'512x640',cell:'64x128',loader:"this.load.spritesheet('berserker','berserker_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle x2, walk x4, atk x2) . Row 3: Abilities (Cleave, Rage, Leap, Rampage) . Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#0a0000',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.HELL,margin:0,fontSize:15}}>INFERNAL FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.HELL,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#331100':'#111',color:tab===t.id?C.HELL:'#885533',border:`1px solid ${tab===t.id?'#cc4400':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {(['preview','actual'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a0800':'#111',color:view===v?C.FLAME:'#665533',border:`1px solid ${view===v?'#443300':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'85vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Infernal ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref} data-label={`Infernal ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?6*P_CELL*3:6*T_CELL*2,border:'1px solid #1a0800'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#885544',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#cc6633'}}>Sheet:</b> {cur.info.sz}px . {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#cc6633'}}>Phaser:</b> <code style={{color:C.FLAME}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#cc6633'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
