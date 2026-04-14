// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
export const C={
  PGOLD:'#ffffaa',WHITE:'#ffffff',GOLD:'#ffdd44',DKBRN:'#443300',HOLY:'#ffeecc',WHOLY:'#fff8ee',
  LTGLD:'#ffee88',DKGLD:'#bb9922',DEEPGLD:'#886611',CREAM:'#fff5dd',
  MARBLE:'#eeeedd',LTMARB:'#fffff0',DKMARB:'#ccccaa',GRAYMARB:'#aaaaaa',
  BLUE:'#aaddff',LTBLUE:'#cceeFF',DKBLUE:'#6699cc',
  AMBER:'#ffaa33',LTYEL:'#ffffdd',BRIGHTYEL:'#ffff88',
  SKY:'#eeeeff',SHADOW:'#665544',DKSHADOW:'#332211',
  ARMOR:'#ddcc88',LTARMOR:'#eedd99',DKARMOR:'#aa9955',DEEPARMOR:'#887733',
  CAPE:'#eeeeee',DKCAPE:'#cccccc',DEESCAPE:'#aaaaaa',
  SKIN:'#ffddbb',DKSKIN:'#ddbb99',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

function tPedestal(p:any,b:any,topY:number,w:number,glow:number){
  const cx=16;
  // White marble pedestal
  for(let i=0;i<8;i++){
    const cw=w-4+Math.floor(i*0.6),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.LTMARB:i<4?C.MARBLE:i<6?C.DKMARB:C.GRAYMARB);
  }
  // Golden trim on top
  b(cx-Math.floor((w-4)/2),topY,w-4,1,C.GOLD);
  b(cx-Math.floor((w-4)/2),topY+1,w-4,1,C.LTGLD);
  // Golden accents on sides
  p(cx-Math.floor(w/2)+1,topY+3,C.GOLD);p(cx+Math.floor(w/2)-2,topY+3,C.GOLD);
  // Upward light rays
  if(glow>0){
    p(cx-2,topY-1,C.LTYEL);p(cx+1,topY-1,C.LTYEL);
    if(glow>1){p(cx,topY-2,C.BRIGHTYEL);p(cx-1,topY-2,C.PGOLD);}
  }
  // Base shadow
  b(cx-Math.floor((w-2)/2),topY+7,w-2,1,C.SHADOW);
}

function tHalo(p:any,cx:number,cy:number,r:number,bright:boolean){
  // Radiant halo ring
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    const x=cx+Math.round(Math.cos(a)*r);
    const y=cy+Math.round(Math.sin(a)*r);
    p(x,y,bright?C.WHITE:i%2===0?C.GOLD:C.LTGLD);
  }
}

function tLightRay(p:any,x:number,y1:number,y2:number,col:string,bright:string){
  for(let y=y1;y<=y2;y++){
    p(x,y,y%2===0?bright:col);
  }
}

function tSpire(p:any,b:any,x:number,y:number,h:number,w:number,c1:string,c2:string,ct:string){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.85)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// ===== LEVEL COUNTS PER TOWER =====
const T_LEVELS=[5,5,4,2,2]; // Acolyte, Ward, Smite, Sanctuary, Absolution
const T_MAX_LVL=5;
const T_STATES_PER_LVL=4; // idle, charge, fire, cooldown
const T_TOTAL_ROWS=T_MAX_LVL*T_STATES_PER_LVL; // 20

// ===== LEVEL-BASED VISUAL HELPERS =====
// Returns glow intensity 0-4 based on level (1-indexed)
function lvlGlow(lvl:number){return Math.min(lvl-1,4);}
// Returns pedestal width scaling with level
function lvlPedW(base:number,lvl:number){return base+Math.floor((lvl-1)*0.8);}
// Returns number of halo rings for level
function lvlHalos(lvl:number){return lvl>=5?3:lvl>=4?2:lvl>=3?1:0;}
// Returns wing size scaling 0-3
function lvlWings(lvl:number){return lvl>=5?3:lvl>=4?2:lvl>=3?1:0;}

function tMultiHalo(p:any,cx:number,cy:number,count:number,bright:boolean){
  tHalo(p,cx,cy,4,bright);
  if(count>=2)tHalo(p,cx,cy,6,false);
  if(count>=3){for(let i=0;i<16;i++){const a=i*Math.PI/8;p(cx+Math.round(Math.cos(a)*8),cy+Math.round(Math.sin(a)*5),i%3===0?C.WHITE:C.PGOLD);}}
}

function tWings(p:any,b:any,cx:number,fy:number,size:number,bright:boolean){
  if(size<=0)return;
  // Wing base
  const w=2+size,h=3+size;
  b(cx-6-size,fy+1,w,h,C.WHOLY);b(cx+5,fy+1,w,h,C.WHOLY);
  p(cx-6-size,fy+1,C.WHITE);p(cx+4+size,fy+1,C.WHITE);
  if(size>=2){
    // Extended feathers
    for(let i=0;i<size;i++){p(cx-8-i,fy+i,bright?C.WHITE:C.PGOLD);p(cx+7+i,fy+i,bright?C.WHITE:C.PGOLD);}
    b(cx-7-size,fy+2,size,2,C.HOLY);b(cx+6+1,fy+2,size,2,C.HOLY);
  }
  if(size>=3){
    // Grand wing rays
    for(let i=0;i<4;i++){p(cx-10-i,fy-1+i,C.PGOLD);p(cx+9+i,fy-1+i,C.PGOLD);}
    p(cx-12,fy,C.LTYEL);p(cx+11,fy,C.LTYEL);
  }
}

function tLevelGlowParticles(p:any,cx:number,fy:number,lvl:number,bright:boolean){
  if(lvl>=2){p(cx-6,fy-1,C.PGOLD);p(cx+6,fy,C.PGOLD);p(cx-8,fy+3,C.LTYEL);p(cx+8,fy+2,C.LTYEL);}
  if(lvl>=3){p(cx-9,fy-2,C.WHITE);p(cx+9,fy-3,C.WHITE);p(cx-10,fy+5,C.PGOLD);p(cx+10,fy+4,C.PGOLD);}
  if(lvl>=4){
    for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*7),fy+3+Math.round(Math.sin(a)*5),C.LTYEL);}
    if(bright){for(let i=0;i<8;i++){const a=i*Math.PI/4+0.4;p(cx+Math.round(Math.cos(a)*9),fy+3+Math.round(Math.sin(a)*7),C.PGOLD);}}
  }
  if(lvl>=5){
    for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*10),fy+2+Math.round(Math.sin(a)*8),i%2?C.WHITE:C.BRIGHTYEL);}
    // Blinding radiance rays
    for(let r=6;r<13;r+=2){p(cx,fy-r+3,C.WHITE);p(cx-1,fy-r+4,C.PGOLD);p(cx+1,fy-r+4,C.PGOLD);}
  }
}

// Golden trim detail level
function tLevelTrim(p:any,b:any,topY:number,w:number,lvl:number){
  if(lvl>=2){p(16-Math.floor(w/2)+2,topY+2,C.LTGLD);p(16+Math.floor(w/2)-3,topY+2,C.LTGLD);}
  if(lvl>=3){b(16-Math.floor(w/2)+1,topY+1,2,1,C.BRIGHTYEL);b(16+Math.floor(w/2)-3,topY+1,2,1,C.BRIGHTYEL);}
  if(lvl>=4){for(let i=0;i<w-6;i+=2)p(16-Math.floor(w/2)+3+i,topY,C.WHITE);}
}

// ===== TOWERS (5 cols × 20 rows at 64×64) =====
export function drawTowers(ctx:any){
  const fns=[
    // Acolyte — kneeling holy figure on pedestal (5 levels)
    (c:any,o:number[],s:number,lvl:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const pw=lvlPedW(20,lvl);
      tPedestal(p,b,23,pw,s===1?1:s===2?2:0);
      tLevelTrim(p,b,23,pw,lvl);
      const br=s>=1,fl=s===2;
      const fy=12;
      // Kneeling figure body — robes get brighter with level
      const robeCol=lvl>=4?C.WHITE:lvl>=3?C.WHOLY:C.HOLY;
      const robeBright=lvl>=3?C.WHITE:C.WHOLY;
      b(14,fy+4,4,6,robeCol);b(15,fy+4,2,6,robeBright);
      b(14,fy,4,4,C.HOLY);b(15,fy+1,2,2,C.WHITE);
      p(15,fy+1,C.SKIN);p(16,fy+1,C.SKIN);
      // Kneeling legs
      b(13,fy+8,2,3,robeCol);b(17,fy+8,2,3,robeCol);
      b(12,fy+10,3,1,C.DKMARB);b(17,fy+10,3,1,C.DKMARB);
      // Arms in prayer — golden trim at higher levels
      b(13,fy+5,2,3,C.HOLY);b(17,fy+5,2,3,C.HOLY);
      p(14,fy+5,lvl>=3?C.BRIGHTYEL:C.PGOLD);p(17,fy+5,lvl>=3?C.BRIGHTYEL:C.PGOLD);
      // Halo(s)
      const hCount=lvlHalos(lvl);
      if(hCount>0)tMultiHalo(p,16,fy-2,hCount,fl);
      else tHalo(p,16,fy-2,4,fl);
      // Glow particles scaled by level
      if(br)tLevelGlowParticles(p,16,fy,lvl,fl);
      // Wings scaled by level
      const ws=lvlWings(lvl);
      tWings(p,b,16,fy,ws,fl);
      // Basic wing hints for low levels
      if(ws===0){
        b(9,fy+2,3,4,C.WHOLY);b(20,fy+2,3,4,C.WHOLY);
        p(9,fy+2,C.WHITE);p(22,fy+2,C.WHITE);
        p(8,fy+3,br?C.PGOLD:C.HOLY);p(23,fy+3,br?C.PGOLD:C.HOLY);
      }
      // Pedestal golden trim
      p(11,25,br?C.LTGLD:C.GOLD);p(20,25,br?C.LTGLD:C.GOLD);
      if(s===3){p(15,fy+2,C.DKMARB);p(16,fy+6,C.DKMARB);}
    },
    // Ward — protective barrier pillar with rune circle (5 levels)
    (c:any,o:number[],s:number,lvl:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const pw=lvlPedW(22,lvl);
      tPedestal(p,b,24,pw,s===1?1:s===2?2:0);
      tLevelTrim(p,b,24,pw,lvl);
      const br=s>=1,fl=s===2;
      // Central pillar — wider/brighter at higher levels
      const pilW=lvl>=4?6:4,pilX=16-Math.floor(pilW/2);
      b(pilX,4,pilW,20,C.MARBLE);b(pilX+1,4,pilW-2,20,C.LTMARB);
      b(pilX,4,pilW,1,C.WHITE);p(pilX,4,C.GOLD);p(pilX+pilW-1,4,C.GOLD);
      // Pillar runes — more runes at higher levels
      const runeCount=3+lvl;
      for(let i=0;i<runeCount;i++){p(pilX,6+i*Math.floor(14/runeCount),br?C.GOLD:C.DKGLD);p(pilX+pilW-1,7+i*Math.floor(14/runeCount),br?C.GOLD:C.DKGLD);}
      // Rune circle on ground — larger at higher levels
      const rcY=22,rcR=fl?6+lvl:br?5+lvl:4+lvl;
      const runeCirclePts=12+lvl*2;
      for(let i=0;i<runeCirclePts;i++){
        const a=i*Math.PI*2/runeCirclePts;
        const rx=16+Math.round(Math.cos(a)*Math.min(rcR,14));
        const ry=rcY+Math.round(Math.sin(a)*Math.floor(Math.min(rcR,14)*0.4));
        p(rx,ry,i%2===0?C.GOLD:C.LTGLD);
      }
      // Shield effect — more particles at higher levels
      if(br){
        const shieldR=3+lvl;
        for(let i=0;i<6+lvl*2;i++){const a=i*Math.PI*2/(6+lvl*2);p(16+Math.round(Math.cos(a)*shieldR),12+Math.round(Math.sin(a)*shieldR),C.PGOLD);}
      }
      if(fl){
        // Bright barrier dome — bigger with level
        const domeR=4+lvl;
        for(let i=0;i<10+lvl*2;i++){
          const a=i*Math.PI*2/(10+lvl*2);
          p(16+Math.round(Math.cos(a)*domeR),10+Math.round(Math.sin(a)*Math.floor(domeR*0.7)),C.WHITE);
          p(16+Math.round(Math.cos(a)*(domeR+1)),10+Math.round(Math.sin(a)*Math.floor((domeR+1)*0.7)),C.PGOLD);
        }
        b(14,3,4,1,C.WHITE);b(13,2,6,1,C.LTYEL);
      }
      // Cross on pillar top — bigger at high level
      p(15,5,C.GOLD);p(16,5,C.GOLD);p(15,6,C.LTGLD);p(16,6,C.LTGLD);
      p(14,5,C.DKGLD);p(17,5,C.DKGLD);
      if(lvl>=4){p(15,4,C.WHITE);p(16,4,C.WHITE);p(14,6,C.GOLD);p(17,6,C.GOLD);}
      if(lvl>=5){p(15,3,C.BRIGHTYEL);p(16,3,C.BRIGHTYEL);}
      // Halo(s) above pillar at higher levels
      if(lvl>=3)tMultiHalo(p,16,2,lvlHalos(lvl),fl);
      // Mute wave particles
      if(fl){p(6,14,C.PGOLD);p(26,14,C.PGOLD);p(4,16,C.LTYEL);p(28,16,C.LTYEL);}
      if(s===3){p(15,8,C.DKMARB);p(16,12,C.DKMARB);}
    },
    // Smite — raised sword/hammer of judgment (4 levels)
    (c:any,o:number[],s:number,lvl:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const pw=lvlPedW(20,lvl);
      tPedestal(p,b,24,pw,s===1?1:s===2?2:0);
      tLevelTrim(p,b,24,pw,lvl);
      const br=s>=1,fl=s===2;
      // Hammer handle
      b(15,6,2,16,C.DKBRN);b(15,6,2,1,C.GOLD);
      p(15,7,C.DEEPGLD);p(16,7,C.DEEPGLD);
      // Hammer head — grows with level
      const hw=8+lvl*1,hx=16-Math.floor(hw/2);
      b(hx,3,hw,4,C.GOLD);b(hx+1,3,hw-2,4,C.LTGLD);
      b(hx,3,hw,1,C.WHITE);b(hx+1,4,hw-2,1,C.BRIGHTYEL);
      p(hx,3,C.DKGLD);p(hx+hw-1,3,C.DKGLD);p(hx,6,C.DKGLD);p(hx+hw-1,6,C.DKGLD);
      // Hammer face details
      p(hx+2,4,C.WHITE);p(hx+hw-3,4,C.WHITE);
      p(hx+2,5,C.PGOLD);p(hx+hw-3,5,C.PGOLD);
      // Extra ornate details at high levels
      if(lvl>=3){for(let i=1;i<hw-1;i+=2)p(hx+i,3,C.WHITE);}
      if(lvl>=4){p(16,2,C.WHITE);p(15,2,C.BRIGHTYEL);p(17,2,C.BRIGHTYEL);}
      // Lightning bolt on fire — more bolts at higher levels
      if(fl){
        const lx=[16,15,17,14,16,15,17,16,15,16];
        for(let i=0;i<10;i++){
          p(lx[i],8+i,i<2?C.WHITE:i<5?C.BRIGHTYEL:i<8?C.GOLD:C.LTGLD);
          if(i>0)p(lx[i]-1,8+i,C.PGOLD);
        }
        // Extra lightning at high levels
        if(lvl>=3){for(let i=0;i<8;i++){p(12+Math.round(Math.sin(i)*2),9+i,C.BRIGHTYEL);}}
        if(lvl>=4){for(let i=0;i<8;i++){p(20-Math.round(Math.sin(i)*2),9+i,C.BRIGHTYEL);}}
        // Impact sparks
        const sparkCount=4+lvl;
        for(let i=0;i<sparkCount;i++){const a=i*Math.PI*2/sparkCount;p(16+Math.round(Math.cos(a)*(3+lvl)),20+Math.round(Math.sin(a)*2),C.WHITE);}
        p(16,19,C.WHITE);p(15,20,C.BRIGHTYEL);p(17,20,C.BRIGHTYEL);
      }
      // Charge glow
      if(br&&!fl){
        p(16,2,C.LTYEL);p(15,1,C.PGOLD);p(17,1,C.PGOLD);
        p(10,4,C.PGOLD);p(21,4,C.PGOLD);
        if(lvl>=3){p(16,0,C.WHITE);p(9,3,C.LTYEL);p(22,3,C.LTYEL);}
      }
      // Light rays from hammer — more rays at higher levels
      if(br){tLightRay(p,9,1,5,C.PGOLD,C.LTYEL);tLightRay(p,23,1,5,C.PGOLD,C.LTYEL);
        if(lvl>=3){tLightRay(p,7,0,4,C.PGOLD,C.LTYEL);tLightRay(p,25,0,4,C.PGOLD,C.LTYEL);}
      }
      if(fl){tLightRay(p,7,0,4,C.LTGLD,C.WHITE);tLightRay(p,25,0,4,C.LTGLD,C.WHITE);
        if(lvl>=3){tLightRay(p,5,0,3,C.PGOLD,C.BRIGHTYEL);tLightRay(p,27,0,3,C.PGOLD,C.BRIGHTYEL);}
      }
      if(s===3){p(14,4,C.DKGLD);p(17,5,C.DKGLD);b(15,6,2,1,C.SHADOW);}
    },
    // Sanctuary — small temple/shrine with absorbing light (2 levels)
    (c:any,o:number[],s:number,lvl:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const pw=lvlPedW(24,lvl);
      tPedestal(p,b,25,pw,s===1?1:s===2?2:0);
      tLevelTrim(p,b,25,pw,lvl);
      const br=s>=1,fl=s===2;
      const isHigh=lvl>=2;
      // Temple base structure — larger at level 2
      const tw=isHigh?18:16,tx=16-Math.floor(tw/2);
      b(tx,14,tw,10,C.MARBLE);b(tx+1,14,tw-2,10,C.LTMARB);
      // Pillars — extra pillars at level 2
      b(tx,10,2,14,C.MARBLE);b(tx+1,10,1,14,C.LTMARB);
      b(tx+tw-2,10,2,14,C.MARBLE);b(tx+tw-2,10,1,14,C.LTMARB);
      if(isHigh){b(tx+Math.floor(tw/3),10,2,14,C.DKMARB);b(tx+tw-Math.floor(tw/3)-2,10,2,14,C.DKMARB);}
      // Roof / triangle top — taller at level 2
      const roofH=isHigh?8:6;
      for(let i=0;i<roofH;i++){
        const rw=tw-i*2;
        b(16-Math.floor(rw/2),9-i,rw,1,i<2?C.GOLD:i<Math.floor(roofH*0.6)?C.LTGLD:C.PGOLD);
      }
      p(16,9-roofH+1,C.WHITE);
      // Cross at peak — bigger at level 2
      p(16,9-roofH,C.GOLD);p(15,9-roofH+1,C.GOLD);p(17,9-roofH+1,C.GOLD);p(16,9-roofH+2,C.GOLD);
      if(isHigh){p(14,9-roofH+1,C.LTGLD);p(18,9-roofH+1,C.LTGLD);p(16,9-roofH-1,C.WHITE);}
      // Door/opening
      const dw=isHigh?8:6,dh=isHigh?8:7;
      b(16-Math.floor(dw/2),17,dw,dh,C.SHADOW);b(16-Math.floor(dw/2)+1,17,dw-2,dh,C.DKSHADOW);
      // Absorbing light inside
      if(br){
        b(14,18,4,4,fl?C.BRIGHTYEL:C.PGOLD);b(15,18,2,4,fl?C.WHITE:C.LTYEL);
        p(15,19,C.WHITE);p(16,20,fl?C.WHITE:C.PGOLD);
        if(isHigh){b(13,19,6,3,fl?C.BRIGHTYEL:C.PGOLD);b(14,19,4,2,fl?C.WHITE:C.LTYEL);}
      }
      // Light spiral inward
      if(fl){
        const pts=[[5,12],[27,11],[3,18],[29,17],[6,22],[26,21],[10,8],[22,7]];
        pts.forEach(([x,y],i)=>p(x,y,i%2===0?C.PGOLD:C.LTYEL));
        p(11,15,C.PGOLD);p(21,15,C.PGOLD);p(12,13,C.LTYEL);p(20,13,C.LTYEL);
        if(isHigh){
          for(let i=0;i<8;i++){const a=i*Math.PI/4;p(16+Math.round(Math.cos(a)*12),16+Math.round(Math.sin(a)*8),C.PGOLD);}
        }
      }
      // Charge particles
      if(br&&!fl){p(6,10,C.PGOLD);p(26,10,C.PGOLD);p(5,15,C.LTYEL);p(27,15,C.LTYEL);}
      // Golden window accents — more at level 2
      p(tx+3,12,C.GOLD);p(tx+tw-4,12,C.GOLD);p(tx+3,15,C.DKGLD);p(tx+tw-4,15,C.DKGLD);
      if(isHigh){p(tx+5,13,C.LTGLD);p(tx+tw-6,13,C.LTGLD);}
      // Halo above temple at level 2
      if(isHigh)tHalo(p,16,9-roofH-2,5,fl);
      if(s===3){b(14,18,4,4,C.SHADOW);p(15,19,C.DKGLD);}
    },
    // Absolution (Ultimate) — grand cathedral spire (2 levels)
    (c:any,o:number[],s:number,lvl:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const pw=lvlPedW(26,lvl);
      tPedestal(p,b,25,pw,s===1?1:s===2?2:0);
      tLevelTrim(p,b,25,pw,lvl);
      const br=s>=1,fl=s===2;
      const isHigh=lvl>=2;
      // Main cathedral spire
      tSpire(p,b,14,1,isHigh?24:22,isHigh?5:4,C.MARBLE,C.LTMARB,C.WHITE);
      // Side spires
      tSpire(p,b,7,8,isHigh?16:14,isHigh?4:3,C.DKMARB,C.MARBLE,C.LTMARB);
      tSpire(p,b,22,8,isHigh?16:14,isHigh?4:3,C.DKMARB,C.MARBLE,C.LTMARB);
      // Extra flanking spires at level 2
      if(isHigh){
        tSpire(p,b,4,12,10,2,C.GRAYMARB,C.DKMARB,C.MARBLE);
        tSpire(p,b,26,12,10,2,C.GRAYMARB,C.DKMARB,C.MARBLE);
        p(4,12,C.GOLD);p(27,12,C.GOLD);
      }
      // Spire tips - golden
      p(15,1,C.GOLD);p(16,1,C.GOLD);p(15,0,C.WHITE);
      p(8,8,C.GOLD);p(23,8,C.GOLD);
      if(isHigh){p(16,0,C.BRIGHTYEL);p(15,-1<0?0:0,C.WHITE);}
      // Cathedral body — wider at level 2
      const bw=isHigh?18:16,bbx=16-Math.floor(bw/2);
      b(bbx,22,bw,3,C.MARBLE);b(bbx+1,22,bw-2,3,C.LTMARB);
      // Rose window — brighter at level 2
      const rwS=isHigh?6:4,rwX=16-Math.floor(rwS/2);
      b(rwX,16,rwS,rwS,C.GOLD);b(rwX+1,17,rwS-2,rwS-2,fl?C.WHITE:br?C.BRIGHTYEL:C.LTGLD);
      p(rwX,16,C.DKGLD);p(rwX+rwS-1,16,C.DKGLD);p(rwX,16+rwS-1,C.DKGLD);p(rwX+rwS-1,16+rwS-1,C.DKGLD);
      // Radiating light beams
      if(br){
        for(let i=1;i<6;i++){p(16-i,1+i,C.PGOLD);p(16+i,1+i,C.PGOLD);}
        for(let i=1;i<4;i++){p(8-i,8+i,C.LTYEL);p(24+i,8+i,C.LTYEL);}
        if(isHigh){for(let i=1;i<5;i++){p(4-i,12+i,C.PGOLD);p(28+i,12+i,C.PGOLD);}}
      }
      if(fl){
        // Full holy nova — larger at level 2
        const novaR1=isHigh?10:8,novaR2=isHigh?12:10;
        for(let i=0;i<16;i++){
          const a=i*Math.PI/8;
          p(16+Math.round(Math.cos(a)*novaR1),13+Math.round(Math.sin(a)*novaR1),C.WHITE);
          p(16+Math.round(Math.cos(a)*novaR2),13+Math.round(Math.sin(a)*novaR2),C.PGOLD);
        }
        tLightRay(p,16,0,5,C.LTYEL,C.WHITE);
        for(let x=5;x<28;x+=2)p(x,13,x%4===0?C.WHITE:C.PGOLD);
        b(15,0,2,2,C.WHITE);
        const ringR=isHigh?14:12;
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(16+Math.round(Math.cos(a)*ringR),13+Math.round(Math.sin(a)*Math.floor(ringR*0.8)),C.LTYEL);}
        if(isHigh){for(let i=0;i<16;i++){const a=i*Math.PI/8;p(16+Math.round(Math.cos(a)*15),13+Math.round(Math.sin(a)*12),C.PGOLD);}}
      }
      // Halo above main spire — multiple at level 2
      if(isHigh)tMultiHalo(p,16,3,3,fl);
      else tHalo(p,16,3,3,fl);
      // Golden trim on body
      b(bbx,22,bw,1,C.GOLD);p(bbx,22,C.LTGLD);p(bbx+bw-1,22,C.LTGLD);
      // Buttress details
      b(6,18,2,6,C.DKMARB);b(24,18,2,6,C.DKMARB);
      p(6,18,C.GOLD);p(25,18,C.GOLD);
      if(isHigh){b(4,20,2,4,C.DKMARB);b(26,20,2,4,C.DKMARB);p(4,20,C.GOLD);p(27,20,C.GOLD);}
      if(s===3){p(15,17,C.DKGLD);p(16,18,C.DKGLD);b(15,0,2,2,C.SHADOW);}
    },
  ];
  const cols=5,rows=T_TOTAL_ROWS;
  // Layout: for each level (1..T_MAX_LVL), 4 state rows; towers with fewer levels get blank cells
  for(let col=0;col<cols;col++){
    const maxLvl=T_LEVELS[col];
    for(let lvl=1;lvl<=T_MAX_LVL;lvl++){
      for(let st=0;st<T_STATES_PER_LVL;st++){
        const row=(lvl-1)*T_STATES_PER_LVL+st;
        if(lvl<=maxLvl){
          fns[col](ctx,[col*T_CELL,row*T_CELL],st,lvl);
        }
        // else: leave blank for towers that don't have this level
      }
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (5×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

export function drawProjectiles(ctx:any){
  const fns=[
    // Acolyte: golden light mote → gentle heal flash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Traveling golden light mote
        const bob=[0,-1,1][f];
        const r=2;
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++)if(x*x+y*y<=r*r){
          const d=Math.sqrt(x*x+y*y);
          p(cx+x,cy+y+bob,d<1?C.WHITE:d<r*0.6?C.PGOLD:C.LTGLD);
        }
        // Trailing sparkle
        p(cx-3-f,cy+1,C.PGOLD);p(cx-2-f,cy-1,f>0?C.LTYEL:C.PGOLD);
        p(cx+3,cy+bob,C.LTYEL);
      } else if(f===3){
        // Impact: heal flash expanding
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.PGOLD:C.LTYEL);}
        b(cx-1,cy-1,3,3,C.PGOLD);p(cx,cy,C.WHITE);
        for(let i=0;i<4;i++){const a=i*Math.PI/2;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.WHITE);}
      } else if(f===4){
        // Heal flash mid
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.LTGLD:C.PGOLD);}
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.LTYEL);}
        p(cx,cy,C.WHITE);p(cx+1,cy,C.PGOLD);p(cx-1,cy,C.PGOLD);
      } else {
        // Fading particles
        [[4,5],[11,4],[6,10],[9,3],[3,8],[12,9],[7,6],[10,11]].forEach(([x,y],i)=>p(x,y,i%3===0?C.PGOLD:i%2?C.LTGLD:C.LTYEL));
      }
    },
    // Ward: white barrier pulse → mute wave (silence rings)
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Traveling barrier pulse
        const phase=f;
        const r=[3,4,3][f];
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4+phase*0.3;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2===0?C.WHITE:C.PGOLD);
        }
        b(cx-1,cy-1,2,2,C.WHITE);p(cx,cy,C.LTYEL);
        // Pulse trail
        if(f>0){p(cx-4,cy,C.PGOLD);p(cx-3,cy+1,C.HOLY);}
      } else if(f===3){
        // Impact: silence ring expanding
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.WHITE);}
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.PGOLD);}
        p(cx,cy,C.WHITE);
        // X mute symbol
        p(cx-1,cy-1,C.GOLD);p(cx+1,cy-1,C.GOLD);p(cx-1,cy+1,C.GOLD);p(cx+1,cy+1,C.GOLD);
      } else if(f===4){
        // Double silence ring
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),i%2?C.PGOLD:C.HOLY);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.WHITE);
        }
        p(cx,cy,C.LTYEL);
      } else {
        // Fading mute particles
        [[3,4],[12,5],[5,11],[10,3],[7,7],[4,9],[11,8]].forEach(([x,y],i)=>p(x,y,i%2?C.PGOLD:C.HOLY));
        p(cx,cy,C.DKMARB);
      }
    },
    // Smite: holy bolt downward → holy explosion (cross pattern)
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Holy bolt traveling down
        const yOff=[-2,0,2][f];
        for(let i=0;i<8;i++){
          const x_=cx+Math.round(Math.sin(i*0.5)*1);
          p(x_,cy-4+i+yOff,i<2?C.WHITE:i<4?C.BRIGHTYEL:i<6?C.GOLD:C.LTGLD);
        }
        p(cx,cy-5+yOff,C.WHITE);p(cx-1,cy-3+yOff,C.PGOLD);p(cx+1,cy-3+yOff,C.PGOLD);
      } else if(f===3){
        // Holy explosion - cross pattern
        // Vertical
        for(let i=-5;i<=5;i++)p(cx,cy+i,Math.abs(i)<2?C.WHITE:Math.abs(i)<4?C.BRIGHTYEL:C.GOLD);
        // Horizontal
        for(let i=-5;i<=5;i++)p(cx+i,cy,Math.abs(i)<2?C.WHITE:Math.abs(i)<4?C.BRIGHTYEL:C.GOLD);
        p(cx,cy,C.WHITE);
      } else if(f===4){
        // Expanded cross with diagonal
        for(let i=-6;i<=6;i++){p(cx,cy+i,Math.abs(i)<3?C.PGOLD:C.LTGLD);p(cx+i,cy,Math.abs(i)<3?C.PGOLD:C.LTGLD);}
        // Diagonals
        for(let i=1;i<5;i++){p(cx+i,cy+i,C.GOLD);p(cx-i,cy+i,C.GOLD);p(cx+i,cy-i,C.GOLD);p(cx-i,cy-i,C.GOLD);}
        p(cx,cy,C.LTYEL);
      } else {
        // Fading cross remnants
        for(let i=-3;i<=3;i++){if(i!==0){p(cx,cy+i,C.DKGLD);p(cx+i,cy,C.DKGLD);}}
        p(cx,cy,C.LTGLD);
        [[4,4],[12,4],[4,12],[12,12]].forEach(([x,y])=>p(x,y,C.DEEPGLD));
      }
    },
    // Sanctuary: absorbing light spiral → protection dome flash
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Spiraling inward light
        const phase=f*2;
        for(let i=0;i<10;i++){
          const a=(i+phase)*Math.PI/5;
          const r=6-i*0.5;
          if(r>0)p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i<3?C.PGOLD:i<6?C.LTYEL:C.WHITE);
        }
        p(cx,cy,f===2?C.WHITE:C.PGOLD);
        if(f>0)p(cx,cy,C.WHITE);
      } else if(f===3){
        // Protection dome flash
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*4),C.PGOLD);
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*3),C.LTYEL);
        }
        // Dome top arc
        for(let x=-4;x<=4;x++){
          const y_=cy-Math.round(Math.sqrt(16-x*x)*0.8);
          p(cx+x,y_,C.WHITE);
        }
        b(cx-1,cy-1,3,3,C.LTYEL);p(cx,cy,C.WHITE);
      } else if(f===4){
        // Dome expanding
        for(let i=0;i<16;i++){const a=i*Math.PI/8;
          p(cx+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*5),i%2?C.PGOLD:C.HOLY);
        }
        for(let x=-5;x<=5;x++){
          const y_=cy-Math.round(Math.sqrt(25-x*x)*0.7);
          p(cx+x,y_,x%2===0?C.WHITE:C.PGOLD);
        }
        p(cx,cy,C.LTYEL);
      } else {
        // Fading dome particles
        [[5,3],[11,4],[3,7],[13,8],[7,12],[9,2],[6,10],[10,6]].forEach(([x,y],i)=>p(x,y,i%3===0?C.PGOLD:i%2?C.HOLY:C.LTYEL));
      }
    },
    // Absolution: massive holy beam → divine nova (expanding cross + rings)
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Massive holy beam traveling
        const w=[2,3,4][f];
        b(cx-Math.floor(w/2),0,w,16,C.LTYEL);
        b(cx-Math.floor(w/2)+1,0,Math.max(1,w-2),16,C.PGOLD);
        if(w>2)b(cx,0,1,16,C.WHITE);
        // Side glow
        p(cx-Math.floor(w/2)-1,cy-2,C.PGOLD);p(cx+Math.floor(w/2)+1,cy+2,C.PGOLD);
        p(cx-Math.floor(w/2)-1,cy+3,C.LTYEL);p(cx+Math.floor(w/2)+1,cy-3,C.LTYEL);
      } else if(f===3){
        // Divine nova: expanding cross + inner ring
        // Cross
        for(let i=-7;i<=7;i++){p(cx+i,cy,Math.abs(i)<3?C.WHITE:Math.abs(i)<5?C.BRIGHTYEL:C.GOLD);p(cx,cy+i,Math.abs(i)<3?C.WHITE:Math.abs(i)<5?C.BRIGHTYEL:C.GOLD);}
        // Inner ring
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.PGOLD);}
        p(cx,cy,C.WHITE);
      } else if(f===4){
        // Full divine nova: cross + double ring
        for(let i=-7;i<=7;i++){p(cx+i,cy,Math.abs(i)<2?C.PGOLD:C.LTGLD);p(cx,cy+i,Math.abs(i)<2?C.PGOLD:C.LTGLD);}
        // Diagonals
        for(let i=1;i<6;i++){p(cx+i,cy+i,C.GOLD);p(cx-i,cy+i,C.GOLD);p(cx+i,cy-i,C.GOLD);p(cx-i,cy-i,C.GOLD);}
        // Outer ring
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*7),i%2?C.PGOLD:C.LTYEL);}
        // Inner ring
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.WHITE);}
        p(cx,cy,C.LTYEL);
      } else {
        // Fading nova remnants
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.DEEPGLD:C.DKGLD);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.LTGLD);
        }
        p(cx,cy,C.DKGLD);
      }
    },
  ];
  const cols=5,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

export function drawHero(ctx:any){
  // Paladin — armored holy knight, golden plate armor, white cape, glowing mace/hammer
  function drawChar(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,smite=false,shield=false,consecrate=false,judgment=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Judgment ascending light
    if(judgment){
      for(let x=-3;x<=3;x++)for(let y=0;y<64;y++){
        if((x+y)%4===0)p(cx+x,y,y<20?C.WHITE:y<40?C.PGOLD:C.LTYEL);
      }
      for(let i=0;i<10;i++){const a=i*Math.PI/5;p(cx+Math.round(Math.cos(a)*8),30+Math.round(Math.sin(a)*8),C.PGOLD);}
    }

    // Consecration ground AoE
    if(consecrate){
      b(cx-10,52,20,4,C.DKGLD);b(cx-9,52,18,3,C.GOLD);b(cx-8,53,16,1,C.LTGLD);
      for(let i=0;i<16;i++){const a=i*Math.PI/8;p(cx+Math.round(Math.cos(a)*10),54+Math.round(Math.sin(a)*3),i%2?C.GOLD:C.LTGLD);}
      // Holy runes on ground
      p(cx-5,53,C.PGOLD);p(cx+5,53,C.PGOLD);p(cx,52,C.WHITE);
    }

    const lean=smite?1:atk&&atkFrame>0?1:0;
    const headY=smite?6:8;
    const torY=headY+8;
    const legY=torY+10;
    const bx_=cx+lean;

    // WHITE CAPE (behind body)
    if(dir===2||dir===0){
      const cY=torY+1,sp=smite?2:judgment?3:1;
      for(let i=0;i<16;i++){
        const w=5+Math.floor(i*0.4)+sp,sx_=bx_-Math.floor(w/2)+Math.round(Math.sin(i*0.25)*0.5);
        const cl=i<3?C.CAPE:i<8?C.DKCAPE:i<12?C.DEESCAPE:C.GRAYMARB;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Cape edge highlights
      for(let i=0;i<12;i++){
        const w=5+Math.floor(i*0.4)+sp,sx_=bx_-Math.floor(w/2);
        if(cY+i<62){p(sx_,cY+i,C.WHITE);if(sx_+w-1<32)p(sx_+w-1,cY+i,i%3===0?C.WHITE:C.CAPE);}
      }
    }

    // HELMET
    if(dir===0){
      // Front - golden helmet with visor
      b(bx_-4,headY,8,3,C.ARMOR);b(bx_-3,headY,6,2,C.LTARMOR);
      b(bx_-3,headY-1,6,1,C.GOLD);b(bx_-2,headY-2,4,1,C.LTGLD);
      p(bx_,headY-3,C.WHITE); // helmet crest
      // Visor slit
      b(bx_-3,headY+3,6,2,C.DKBRN);b(bx_-2,headY+3,4,1,C.DKSHADOW);
      // Eyes through visor
      const eg=smite||judgment;
      p(bx_-1,headY+3,eg?C.WHITE:C.PGOLD);p(bx_+1,headY+3,eg?C.WHITE:C.PGOLD);
      // Cheek guards
      b(bx_-4,headY+3,1,3,C.DKARMOR);b(bx_+4,headY+3,1,3,C.DKARMOR);
      // Halo above helmet
      tHalo(p,bx_,headY-5,4,eg);
    } else if(dir===1){
      // Side - helmet profile
      b(bx_-3,headY,7,3,C.ARMOR);b(bx_-2,headY,5,2,C.LTARMOR);
      b(bx_-2,headY-1,5,1,C.GOLD);b(bx_-1,headY-2,3,1,C.LTGLD);
      p(bx_,headY-3,C.WHITE);
      b(bx_-2,headY+3,5,2,C.DKBRN);b(bx_-1,headY+3,3,1,C.DKSHADOW);
      const eg=smite||judgment;
      p(bx_+1,headY+3,eg?C.WHITE:C.PGOLD);
      b(bx_+4,headY+2,1,3,C.DKARMOR);
      tHalo(p,bx_,headY-5,4,eg);
    } else {
      // Back - helmet rear
      b(bx_-4,headY,8,5,C.ARMOR);b(bx_-3,headY,6,4,C.LTARMOR);
      b(bx_-3,headY-1,6,1,C.GOLD);b(bx_-2,headY-2,4,1,C.LTGLD);
      p(bx_,headY-3,C.WHITE);
      // Neck guard
      b(bx_-3,headY+4,6,2,C.DKARMOR);
      p(bx_-1,headY+1,C.GOLD);p(bx_,headY+2,C.GOLD);p(bx_+1,headY+1,C.GOLD);
      tHalo(p,bx_,headY-5,4,false);
    }

    // GORGET (neck armor)
    b(bx_-4,torY-1,8,2,C.GOLD);b(bx_-3,torY-1,6,1,C.LTGLD);

    // TORSO — golden plate armor
    b(bx_-4,torY,8,9,C.ARMOR);b(bx_-3,torY,6,9,C.LTARMOR);
    if(dir===0){
      // Chest cross emblem
      p(bx_,torY+1,C.WHITE);p(bx_-1,torY+2,C.GOLD);p(bx_,torY+2,C.WHITE);p(bx_+1,torY+2,C.GOLD);
      p(bx_,torY+3,C.GOLD);p(bx_,torY+4,C.DKGLD);
      // Plate lines
      p(bx_-3,torY+2,C.DKARMOR);p(bx_+3,torY+2,C.DKARMOR);
    } else if(dir===1){
      p(bx_+1,torY+1,C.GOLD);p(bx_+1,torY+2,C.WHITE);p(bx_+1,torY+3,C.GOLD);
      p(bx_-1,torY+2,C.DKARMOR);
    } else {
      p(bx_-1,torY+2,C.GOLD);p(bx_,torY+2,C.DKARMOR);p(bx_+1,torY+2,C.GOLD);
    }
    // Belt
    b(bx_-4,torY+8,8,1,C.GOLD);b(bx_-3,torY+8,6,1,C.LTGLD);p(bx_,torY+8,C.WHITE);

    // Shield effect (golden dome around character)
    if(shield){
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8;
        p(bx_+Math.round(Math.cos(a)*10),torY+2+Math.round(Math.sin(a)*12),i%2?C.GOLD:C.LTGLD);
        p(bx_+Math.round(Math.cos(a)*11),torY+2+Math.round(Math.sin(a)*13),C.PGOLD);
      }
    }

    // ARMS & HAMMER
    if(atk){
      if(dir===0){
        // Hammer swing down
        if(atkFrame===0){
          // Arm raised
          b(bx_+4,torY-4,3,6,C.ARMOR);b(bx_+5,torY-4,1,6,C.LTARMOR);
          // Hammer up
          b(bx_+4,torY-8,3,4,C.DKBRN);b(bx_+3,torY-12,5,4,C.GOLD);b(bx_+4,torY-12,3,4,C.LTGLD);
          p(bx_+5,torY-12,C.WHITE); // hammer glow
          // Light trail
          for(let i=0;i<4;i++)p(bx_+5,torY-13-i,i===0?C.WHITE:C.PGOLD);
        } else {
          // Arm swung down
          b(bx_+4,torY+2,3,6,C.ARMOR);b(bx_+5,torY+2,1,6,C.LTARMOR);
          // Hammer at impact
          b(bx_+4,torY+8,3,4,C.DKBRN);b(bx_+3,torY+12,5,4,C.GOLD);b(bx_+4,torY+12,3,4,C.LTGLD);
          // Light trail from swing
          for(let i=0;i<6;i++){p(bx_+5+Math.floor(i*0.3),torY-2+Math.floor(i*2.5),i<2?C.WHITE:C.PGOLD);}
          // Impact burst
          for(let i=0;i<6;i++){const a=i*Math.PI/3;p(bx_+5+Math.round(Math.cos(a)*3),torY+14+Math.round(Math.sin(a)*2),C.BRIGHTYEL);}
        }
        // Left arm (shield arm)
        b(bx_-6,torY+1,2,5,C.ARMOR);
      } else if(dir===1){
        if(atkFrame===0){
          b(bx_+4,torY-3,3,5,C.ARMOR);b(bx_+5,torY-3,1,5,C.LTARMOR);
          b(bx_+4,torY-7,3,4,C.DKBRN);b(bx_+3,torY-11,5,4,C.GOLD);b(bx_+4,torY-11,3,4,C.LTGLD);
          p(bx_+5,torY-11,C.WHITE);
          for(let i=0;i<3;i++)p(bx_+5,torY-12-i,C.PGOLD);
        } else {
          b(bx_+4,torY+1,3,5,C.ARMOR);b(bx_+5,torY+1,1,5,C.LTARMOR);
          b(bx_+4,torY+6,3,4,C.DKBRN);
          for(let i=0;i<8;i++){const x_=bx_+6+Math.floor(i*0.4),y_=torY+10+i;if(x_<32&&y_<63)p(x_,y_,i<2?C.WHITE:i<4?C.BRIGHTYEL:C.GOLD);}
          b(bx_+5,torY+10,3,3,C.GOLD);p(bx_+6,torY+10,C.LTGLD);
        }
      } else {
        if(atkFrame===0){
          b(bx_+4,torY-4,3,6,C.ARMOR);
          b(bx_+4,torY-8,3,4,C.DKBRN);b(bx_+3,torY-12,5,3,C.GOLD);b(bx_+4,torY-12,3,3,C.LTGLD);
          for(let i=0;i<3;i++)p(bx_+5,torY-13-i,C.PGOLD);
        } else {
          b(bx_+4,torY+3,3,6,C.ARMOR);
          b(bx_+4,torY+9,3,4,C.DKBRN);b(bx_+3,torY+13,5,3,C.GOLD);
          for(let i=0;i<5;i++)p(bx_+5,torY+16+i,i<2?C.BRIGHTYEL:C.GOLD);
        }
      }
    } else {
      // Idle/walk arms with hammer at side
      const aY=torY+1;
      if(dir===0){
        // Both arms visible
        b(bx_-6,aY+armSwing,2,6,C.ARMOR);p(bx_-6,aY+armSwing,C.LTARMOR);
        b(bx_+4,aY-armSwing,2,6,C.ARMOR);p(bx_+5,aY-armSwing,C.LTARMOR);
        // Hammer at right side
        for(let i=0;i<5;i++)p(bx_+6,aY-armSwing+3+i,i===0?C.DKBRN:C.DKBRN);
        b(bx_+5,aY-armSwing+8,3,3,C.GOLD);b(bx_+6,aY-armSwing+8,1,3,C.LTGLD);
      } else if(dir===1){
        b(bx_+4,aY-armSwing,2,6,C.ARMOR);p(bx_+5,aY-armSwing,C.LTARMOR);
        for(let i=0;i<5;i++)p(bx_+6,aY-armSwing+3+i,C.DKBRN);
        b(bx_+5,aY-armSwing+8,3,3,C.GOLD);b(bx_+6,aY-armSwing+8,1,3,C.LTGLD);
      } else {
        b(bx_-6,aY+armSwing,2,6,C.ARMOR);p(bx_-6,aY+armSwing,C.LTARMOR);
        b(bx_+4,aY-armSwing,2,6,C.ARMOR);p(bx_+5,aY-armSwing,C.LTARMOR);
      }
    }

    // Smite blast effect
    if(smite){
      // Lightning from above
      for(let y=0;y<headY-5;y++){
        const x_=bx_+Math.round(Math.sin(y*0.7)*2);
        p(x_,y,y%2===0?C.WHITE:C.BRIGHTYEL);
        p(x_-1,y,C.PGOLD);
      }
      // Sparks around
      for(let i=0;i<6;i++){const a=i*Math.PI/3;p(bx_+Math.round(Math.cos(a)*6),headY+Math.round(Math.sin(a)*4),C.BRIGHTYEL);}
    }

    // LEGS — armored greaves
    const lh=10;
    b(bx_-3+lOff,legY,3,lh,C.ARMOR);p(bx_-2+lOff,legY,C.LTARMOR);
    b(bx_+1+rOff,legY,3,lh,C.ARMOR);p(bx_+2+rOff,legY,C.LTARMOR);
    // Knee guards
    b(bx_-3+lOff,legY+Math.floor(lh*0.4),3,1,C.GOLD);
    b(bx_+1+rOff,legY+Math.floor(lh*0.4),3,1,C.GOLD);
    // Armored boots
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-4+lOff,lfy,5,2,C.DKARMOR);b(bx_-3+lOff,lfy,4,1,C.ARMOR);
    b(bx_+rOff,rfy,5,2,C.DKARMOR);b(bx_+1+rOff,rfy,4,1,C.ARMOR);
    // Ground glow
    if(!smite&&lfy+2<63){p(bx_-3+lOff,lfy+2,C.PGOLD);p(bx_+3+rOff,rfy+2,C.PGOLD);}

    // Hurt flash
    if(hurt){p(bx_+5,headY+1,C.GOLD);p(bx_+6,headY,C.WHITE);p(bx_+7,headY+1,C.GOLD);p(bx_+6,headY+2,C.WHITE);}
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities smite1,smite2,shield1,shield2,consecrate1,consecrate2,judgment1,judgment2
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
  // Abilities row
  frames.push([
    {dir:0,opts:{smite:true,atk:true,atkFrame:0,lOff:1}},
    {dir:0,opts:{smite:true,atk:true,atkFrame:1,lOff:2,rOff:-1}},
    {dir:0,opts:{shield:true}},
    {dir:0,opts:{shield:true,armSwing:1}},
    {dir:0,opts:{consecrate:true,lOff:1}},
    {dir:0,opts:{consecrate:true,lOff:-1,rOff:1,armSwing:1}},
    {dir:0,opts:{judgment:true}},
    {dir:0,opts:{judgment:true,lOff:1,rOff:-1,armSwing:1}},
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
        // Ascending in light — body dissolving upward
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Fallen body
        b(7,34,5,4,C.ARMOR);b(8,35,3,2,C.LTARMOR);b(7,34,5,1,C.GOLD);
        b(11,36,10,4,C.ARMOR);b(12,36,8,3,C.LTARMOR);
        // Cape spread
        b(4,37,3,2,C.CAPE);b(3,38,2,1,C.DKCAPE);p(2,39,C.DEESCAPE);
        // Hammer beside body
        b(21,38,6,2,C.DKBRN);b(22,36,4,3,C.GOLD);p(23,36,C.LTGLD);
        // Ground
        b(5,40,22,2,C.DKMARB);b(6,41,20,1,C.GRAYMARB);
        // Ascending light particles
        for(let i=0;i<12;i++){
          const x_=8+Math.floor(Math.random()*16);
          const y_=24+i*2;
          p(x_,y_,i<4?C.WHITE:i<8?C.PGOLD:C.LTYEL);
        }
        // Rising sparkles above body
        [[10,28],[14,26],[18,24],[12,22],[16,20],[11,18],[15,16],[13,14]].forEach(([x,y],i)=>{
          p(x,y,i%3===0?C.WHITE:i%2===0?C.PGOLD:C.LTYEL);
        });
        // Light beam above
        b(14,8,4,14,C.LTYEL);b(15,8,2,14,C.PGOLD);p(15,8,C.WHITE);p(16,10,C.WHITE);
      } else if(frame.opts.custom==='death2'){
        // Fully ascended — only light remains
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Ground mark
        for(let x=8;x<24;x++){if(x%2===0)p(x,46,C.DKMARB);if(x%3===0)p(x,45,C.GRAYMARB);}
        // Hammer left behind
        b(12,42,3,3,C.GOLD);b(14,43,2,4,C.DKBRN);p(13,42,C.LTGLD);
        // Ascending particles all the way up
        [[10,38],[14,34],[18,36],[12,30],[16,28],[11,24],[15,20],[13,16],[17,12],[14,8],[16,4],[12,2]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.WHITE:i%3===0?C.PGOLD:i%2===0?C.LTYEL:C.LTGLD);
        });
        // Fading cross at top
        p(15,2,C.PGOLD);p(14,3,C.LTGLD);p(16,3,C.LTGLD);p(15,4,C.LTGLD);
        // Halo remnant
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(15+Math.round(Math.cos(a)*3),6+Math.round(Math.sin(a)*2),i%2?C.PGOLD:C.LTYEL);}
      } else if(frame.opts.custom==='portrait'){
        // Portrait — front-facing armored paladin bust
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Background
        b(2,2,28,60,C.DKSHADOW);b(3,3,26,58,C.SHADOW);
        // Helmet
        b(8,6,16,8,C.ARMOR);b(9,7,14,6,C.LTARMOR);
        b(9,5,14,2,C.GOLD);b(10,4,12,2,C.LTGLD);b(12,3,8,1,C.WHITE);
        // Crest
        p(15,2,C.WHITE);p(16,2,C.WHITE);p(15,1,C.PGOLD);
        // Visor
        b(10,11,12,3,C.DKBRN);b(11,11,10,2,C.DKSHADOW);
        // Eyes through visor
        b(11,12,3,2,C.PGOLD);p(12,12,C.WHITE);
        b(18,12,3,2,C.PGOLD);p(19,12,C.WHITE);
        // Cheek guards
        p(8,11,C.DKARMOR);p(7,12,C.DEEPARMOR);p(24,11,C.DKARMOR);p(25,12,C.DEEPARMOR);
        // Halo
        for(let i=0;i<10;i++){const a=i*Math.PI/5;p(16+Math.round(Math.cos(a)*10),6+Math.round(Math.sin(a)*4),i%2?C.GOLD:C.PGOLD);}
        // Gorget
        b(8,15,16,3,C.GOLD);b(9,15,14,2,C.LTGLD);
        // Shoulder armor
        b(4,18,6,6,C.ARMOR);b(5,18,4,5,C.LTARMOR);p(5,18,C.GOLD);
        b(22,18,6,6,C.ARMOR);b(23,18,4,5,C.LTARMOR);p(26,18,C.GOLD);
        // Chest plate
        b(8,18,16,18,C.ARMOR);b(9,18,14,16,C.LTARMOR);
        // Cross emblem on chest
        p(16,21,C.WHITE);p(15,22,C.GOLD);p(16,22,C.WHITE);p(17,22,C.GOLD);
        p(16,23,C.GOLD);p(16,24,C.DKGLD);p(16,25,C.DEEPGLD);
        // Cape edges
        b(3,20,2,16,C.CAPE);b(27,20,2,16,C.CAPE);
        b(3,20,1,16,C.DKCAPE);b(28,20,1,16,C.DKCAPE);
        // Border
        b(2,2,28,1,C.GOLD);b(2,61,28,1,C.GOLD);b(2,2,1,60,C.GOLD);b(29,2,1,60,C.GOLD);
        p(3,3,C.WHITE);p(28,3,C.WHITE);p(3,60,C.WHITE);p(28,60,C.WHITE);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Acolyte','Ward','Smite','Sanctuary','Absolution'];
const T_STATE_NAMES=['Idle','Charge','Fire','Cooldown'];
const T_ROW_LABELS:string[]=[];
for(let lvl=1;lvl<=T_MAX_LVL;lvl++)for(const st of T_STATE_NAMES)T_ROW_LABELS.push(`L${lvl} ${st}`);
const P_NAMES=['Light Mote','Barrier Pulse','Holy Bolt','Absorb Spiral','Holy Beam'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Smite 1','Smite 2','Shield 1','Shield 2','Consec 1','Consec 2','Judgment 1','Judgment 2'];
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
    const tpv=tPv.current!;const tS=2,tLW=66,tLH=13;
    tpv.width=tLW+5*T_CELL*tS;tpv.height=T_TOTAL_ROWS*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a0808';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<T_TOTAL_ROWS;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle=r%T_STATES_PER_LVL===0?'#ddbb44':'#ccaa44';tpc.font='bold 9px monospace';tpc.fillText(T_ROW_LABELS[r],3,by+T_CELL*tS/2+3);
      // Draw level separator line
      if(r%T_STATES_PER_LVL===0&&r>0){tpc.strokeStyle='#665500';tpc.beginPath();tpc.moveTo(0,by-2);tpc.lineTo(tpv.width,by-2);tpc.stroke();}
      for(let cc=0;cc<5;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#332200';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);
        // Show tower names above the first row of level 1
        if(r===0){tpc.fillStyle='#aa9966';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc]+` (${T_LEVELS[cc]}lvl)`,bx_+2,by-2);}
        // Grey out cells for towers that don't have this level
        const lvl=Math.floor(r/T_STATES_PER_LVL)+1;
        if(lvl>T_LEVELS[cc]){tpc.fillStyle='rgba(10,8,8,0.7)';tpc.fillRect(bx_,by,T_CELL*tS,T_CELL*tS);tpc.fillStyle='#443322';tpc.font='8px monospace';tpc.fillText('N/A',bx_+T_CELL*tS/2-8,by+T_CELL*tS/2+3);}
      }}

    // Projectiles
    const pc_=pRef.current!;pc_.width=5*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+5*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#0a0808';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#ccaa44';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<5;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#332200';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#aa9966';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#0a0808';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#ccaa44';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#332200';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#aa9966';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'celestial_towers_animated.png',
      info:{sz:'320×1280',cell:'64×64',loader:"this.load.spritesheet('celestial_towers','celestial_towers_animated.png',{frameWidth:64,frameHeight:64})",note:`5 cols (towers) × ${T_TOTAL_ROWS} rows (${T_MAX_LVL} levels × 4 states). Levels: ${T_NAMES.map((n,i)=>`${n}=${T_LEVELS[i]}`).join(', ')}`}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'celestial_projectiles_animated.png',
      info:{sz:'160×192',cell:'32×32',loader:"this.load.spritesheet('celestial_proj','celestial_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'5 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Paladin',ref:hRef,pvRef:hPv,dl:'paladin_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('paladin','paladin_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#0a0808',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.GOLD,margin:0,fontSize:15}}>CELESTIAL FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.GOLD,color:'#332200',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#332200':'#111',color:tab===t.id?C.GOLD:'#887744',border:`1px solid ${tab===t.id?'#665500':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #332200',margin:'0 2px'}}/>
        {(['preview','actual'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a1808':'#111',color:view===v?C.PGOLD:'#665544',border:`1px solid ${view===v?'#443300':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Celestial ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref} data-label={`Celestial ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?5*P_CELL*3:5*T_CELL*2,border:'1px solid #332200'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#887755',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:C.DKGLD}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:C.DKGLD}}>Phaser:</b> <code style={{color:C.PGOLD}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:C.DKGLD}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
