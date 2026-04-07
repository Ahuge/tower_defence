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

// ===== TOWERS (6×4 at 64×64) =====
function drawTowers(ctx:any){
  const fns=[
    // 1. Imp — Small demon perched on base
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      iBase(p,b,22,20,s===1?1:s===2?2:0);
      const fy=s===1?5:s===2?4:6;
      // Body — small crouching imp
      b(14,fy+4,4,5,C.DPRED);b(15,fy+4,2,5,C.HELL);
      // Head
      b(13,fy,6,4,C.HELL);b(14,fy,4,3,C.ORNG);
      // Horns
      p(12,fy-1,C.DKASH);p(11,fy-2,C.DKASH);p(19,fy-1,C.DKASH);p(20,fy-2,C.DKASH);
      // Eyes — mischievous
      p(14,fy+1,C.FLAME);p(17,fy+1,C.FLAME);
      if(s>=1){p(14,fy+1,C.BRGHT);p(17,fy+1,C.BRGHT);}
      // Mouth — grin
      p(15,fy+2,C.DKBLD);p(16,fy+2,C.DKBLD);
      // Tail
      p(18,fy+6,C.DPRED);p(19,fy+7,C.DPRED);p(20,fy+8,C.EMBR);p(21,fy+9,C.EMBR);p(22,fy+8,C.DPRED);
      if(s>=1)p(23,fy+7,C.HELL);
      // Wings — small bat wings
      b(10,fy+3,3,1,C.DPRED);b(9,fy+2,2,1,C.DPRED);p(8,fy+1,C.DPRED);
      b(19,fy+3,3,1,C.DPRED);b(21,fy+2,2,1,C.DPRED);p(23,fy+1,C.DPRED);
      if(s===2){p(7,fy,C.DPRED);p(24,fy,C.DPRED);}
      // Arms
      b(12,fy+5,2,2,C.HELL);b(18,fy+5,2,2,C.HELL);
      // Feet
      p(13,fy+9,C.DPRED);p(14,fy+9,C.DPRED);p(17,fy+9,C.DPRED);p(18,fy+9,C.DPRED);
      // Fire wisps around (state dependent)
      if(s>=1){p(10,fy-1,C.ORNG);p(22,fy,C.ORNG);p(9,fy+5,C.FLAME);}
      if(s===2){p(7,fy-2,C.FLAME);p(25,fy-1,C.FLAME);p(6,fy+3,C.ORNG);p(26,fy+4,C.ORNG);}
      // Expired (s===3) = fading
      if(s===3){
        // Faded colors — ghostly
        b(14,fy+4,4,5,C.DKASH);b(13,fy,6,4,C.ASH);
        p(14,fy+1,C.EMBR);p(17,fy+1,C.EMBR);
        p(15,fy+2,C.CHAR);p(16,fy+2,C.CHAR);
      }
    },
    // 2. Hellfire — Flaming brazier/pyre, AoE fire
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      iBase(p,b,23,22,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Brazier bowl
      for(let i=0;i<6;i++){
        const bw=10+Math.floor(i*1.5),sx=16-Math.floor(bw/2);
        b(sx,17+i,bw,1,i<2?C.ASH:i<4?C.DKASH:C.CHAR);
      }
      b(8,17,16,1,C.SMOKE);b(9,16,14,1,C.LTSMK);
      // Coals inside
      b(10,18,12,2,C.DPRED);b(11,18,10,1,fl?C.LAVA:C.EMBR);
      p(12,19,C.ORNG);p(15,19,br?C.LAVA:C.EMBR);p(18,19,C.ORNG);
      // Pedestal legs
      b(11,23,3,1,C.DKASH);b(18,23,3,1,C.DKASH);b(12,24,1,2,C.ASH);b(19,24,1,2,C.ASH);
      // Fire — grows with state
      const fh=s===0?8:s===1?11:s===2?14:6;
      const fw_=s===0?4:s===1?6:s===2?8:3;
      iFlame(p,16,17-fh,fh,fw_,fl);
      // Side flames
      if(br){
        iFlame(p,12,14,5,2,false);
        iFlame(p,20,14,5,2,false);
      }
      if(fl){
        iFlame(p,9,12,6,3,true);
        iFlame(p,23,12,6,3,true);
        // Ember particles
        p(6,8,C.ORNG);p(25,6,C.FLAME);p(4,10,C.EMBR);p(27,9,C.EMBR);
      }
      // Heat shimmer
      if(br){p(14,5,C.ORNG);p(18,4,C.FLAME);p(16,3,fl?C.BRGHT:C.ORNG);}
      if(s===3){b(10,18,12,2,C.DKASH);p(14,19,C.DPRED);}
    },
    // 3. Soul Drain — Dark crystal/skull pulling soul wisps
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      iBase(p,b,23,20,s===1?1:s===2?2:0);const br=s>=1;
      // Skull on pedestal
      b(13,10,6,6,C.SKULL);b(14,10,4,5,C.BONE);
      // Eye sockets
      b(14,11,2,2,C.DKBLD);b(17,11,2,2,C.DKBLD);
      // Green glow in eyes
      p(14,11,br?C.LTGRN:C.GRNSOL);p(17,11,br?C.LTGRN:C.GRNSOL);
      if(s===2){p(15,11,C.PLGRN);p(18,11,C.PLGRN);}
      // Nose
      p(15,13,C.DKBONE);p(16,13,C.DKBONE);
      // Jaw
      b(13,14,6,2,C.BONE);b(14,15,4,1,C.DKBONE);
      p(14,14,C.DKBLD);p(15,14,C.SKULL);p(16,14,C.DKBLD);p(17,14,C.SKULL);
      // Dark crystal base
      b(12,16,8,4,C.CHAR);b(13,16,6,3,C.OBSID);
      p(14,17,C.DPRED);p(17,17,C.DPRED);
      // Pedestal
      b(14,20,4,3,C.DKASH);b(15,20,2,3,C.ASH);
      // Green soul wisps — being pulled in
      const wisps=br?
        [[5,8],[7,6],[9,9],[23,7],[25,9],[21,6],[4,12],[27,11],[6,14],[26,13]]:
        [[6,9],[8,7],[24,8],[22,10],[5,13],[27,12]];
      wisps.forEach(([x,y],i)=>p(x,y,i%3===0?C.PLGRN:i%2===0?C.LTGRN:C.GRNSOL));
      // Wisp trails toward skull
      if(br){
        const trail=[[9,9],[10,9],[11,10],[12,10],[22,8],[21,9],[20,9],[19,10]];
        trail.forEach(([x,y],i)=>p(x,y,i%2===0?C.DKGRN:C.GRNSOL));
      }
      if(s===2){
        // Intense soul absorption
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(16+Math.round(Math.cos(a)*8),12+Math.round(Math.sin(a)*6),i%2?C.GRNSOL:C.LTGRN);}
        p(16,12,C.WHITE);p(15,12,C.PLGRN);p(17,12,C.PLGRN);
      }
      if(s===3){p(14,11,C.DKGRN);p(17,11,C.DKGRN);b(13,10,6,6,C.DKBONE);}
    },
    // 4. Fiend (MOBILE/KAMIKAZE) — Row0=idle, Row1=run, Row2=about-to-explode, Row3=explosion
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      if(s===0){
        // IDLE — crouched demon ready to spring
        const bx=16,by=10;
        // Body
        b(bx-3,by+2,6,8,C.DPRED);b(bx-2,by+2,4,7,C.HELL);
        // Head
        b(bx-3,by-2,6,4,C.HELL);b(bx-2,by-2,4,3,C.ORNG);
        // Horns — forward-curving
        p(bx-4,by-3,C.DKASH);p(bx-5,by-4,C.CHAR);p(bx+3,by-3,C.DKASH);p(bx+4,by-4,C.CHAR);
        // Eyes — fierce
        p(bx-2,by-1,C.FLAME);p(bx+1,by-1,C.FLAME);
        // Mouth — snarl
        b(bx-1,by+1,2,1,C.DKBLD);p(bx-2,by+1,C.EMBR);p(bx+1,by+1,C.EMBR);
        // Claws
        p(bx-4,by+4,C.DKASH);p(bx-5,by+5,C.DKASH);p(bx+3,by+4,C.DKASH);p(bx+4,by+5,C.DKASH);
        // Legs — crouched
        b(bx-3,by+10,3,4,C.DPRED);b(bx+1,by+10,3,4,C.DPRED);
        b(bx-4,by+14,4,2,C.CHAR);b(bx+1,by+14,4,2,C.CHAR);
        // Tail
        p(bx+3,by+8,C.DPRED);p(bx+4,by+9,C.EMBR);p(bx+5,by+10,C.EMBR);
        // Fire wisps
        p(bx-1,by-4,C.ORNG);p(bx+2,by-5,C.FLAME);
      } else if(s===1){
        // RUN — lunging forward, arms out
        const bx=14,by=8;
        // Body — leaning forward
        b(bx-2,by+2,5,7,C.DPRED);b(bx-1,by+2,3,6,C.HELL);
        // Head — forward
        b(bx+1,by-2,5,4,C.HELL);b(bx+2,by-2,3,3,C.ORNG);
        // Horns
        p(bx+6,by-3,C.DKASH);p(bx+7,by-4,C.CHAR);p(bx,by-3,C.DKASH);
        // Eyes — blazing
        p(bx+2,by-1,C.BRGHT);p(bx+4,by-1,C.BRGHT);
        // Mouth — open, fire
        p(bx+3,by+1,C.FLAME);p(bx+4,by+1,C.ORNG);
        // Arms — reaching forward
        b(bx+3,by+3,4,2,C.HELL);p(bx+7,by+3,C.DKASH);p(bx+7,by+4,C.DKASH);p(bx+8,by+3,C.DKASH);
        // Legs — running stride
        b(bx-3,by+9,3,5,C.DPRED);b(bx+2,by+9,3,3,C.DPRED);
        b(bx-4,by+14,4,2,C.CHAR);b(bx+3,by+12,4,2,C.CHAR);
        // Fire trail behind
        p(bx-5,by+4,C.ORNG);p(bx-6,by+5,C.FLAME);p(bx-7,by+6,C.EMBR);
        p(bx-4,by+3,C.HELL);p(bx-6,by+7,C.DPRED);
        // Speed lines
        p(bx-8,by+2,C.ORNG);p(bx-9,by+5,C.EMBR);p(bx-7,by+8,C.DPRED);
      } else if(s===2){
        // ABOUT TO EXPLODE — glowing, pulsing, body cracking with light
        const bx=16,by=8;
        // Body — glowing cracks
        b(bx-3,by+2,6,8,C.HELL);b(bx-2,by+2,4,7,C.ORNG);
        // Glow cracks
        p(bx-1,by+3,C.BRGHT);p(bx+1,by+5,C.FLAME);p(bx-2,by+6,C.BRGHT);p(bx+2,by+4,C.FLAME);
        p(bx,by+7,C.WHITE);
        // Head — eyes blazing white
        b(bx-3,by-2,6,4,C.ORNG);b(bx-2,by-2,4,3,C.FLAME);
        p(bx-2,by-1,C.WHITE);p(bx+1,by-1,C.WHITE);
        // Horns glowing
        p(bx-4,by-3,C.ORNG);p(bx-5,by-4,C.FLAME);p(bx+3,by-3,C.ORNG);p(bx+4,by-4,C.FLAME);
        // Aura glow
        for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(bx+Math.round(Math.cos(a)*6),by+4+Math.round(Math.sin(a)*6),i%2?C.ORNG:C.FLAME);
          p(bx+Math.round(Math.cos(a)*7),by+4+Math.round(Math.sin(a)*7),i%3===0?C.FLAME:C.EMBR);
        }
        // Legs — braced
        b(bx-3,by+10,3,4,C.ORNG);b(bx+1,by+10,3,4,C.ORNG);
        p(bx-2,by+12,C.FLAME);p(bx+2,by+12,C.FLAME);
        // Ground glow
        b(bx-5,by+15,10,1,C.EMBR);b(bx-4,by+16,8,1,C.DPRED);
      } else {
        // EXPLOSION — massive blast ring
        const bx=16,by=16;
        // Explosion rings
        for(let r=12;r>0;r--){
          for(let i=0;i<24;i++){
            const a=i*Math.PI/12;
            const x=bx+Math.round(Math.cos(a)*r);
            const y=by+Math.round(Math.sin(a)*r);
            if(x>=0&&x<32&&y>=0&&y<32){
              const cl=r>10?C.DPRED:r>8?C.EMBR:r>6?C.HELL:r>4?C.ORNG:r>2?C.FLAME:C.WHITE;
              p(x,y,cl);
            }
          }
        }
        // Core
        b(bx-2,by-2,4,4,C.WHITE);b(bx-1,by-1,2,2,C.BRGHT);
        // Debris
        p(3,4,C.DKASH);p(28,3,C.CHAR);p(5,27,C.ASH);p(27,26,C.DKASH);
        p(2,14,C.EMBR);p(29,12,C.EMBR);p(8,2,C.ORNG);p(24,28,C.ORNG);
      }
    },
    // 5. Immolate — Self-immolating figure in flame cage
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      iBase(p,b,24,20,s===1?1:s===2?2:0);const br=s>=1,fl=s===2;
      // Figure — humanoid shape in center
      b(14,8,4,10,C.DPRED);b(15,8,2,9,C.EMBR);
      // Head
      b(14,5,4,3,C.DPRED);b(15,5,2,2,C.EMBR);
      // Eyes — glowing
      p(14,6,br?C.FLAME:C.ORNG);p(17,6,br?C.FLAME:C.ORNG);
      // Arms raised
      b(11,8,3,2,C.DPRED);b(18,8,3,2,C.DPRED);
      p(10,7,C.DPRED);p(21,7,C.DPRED);
      p(10,6,br?C.EMBR:C.DPRED);p(21,6,br?C.EMBR:C.DPRED);
      // Legs
      b(13,18,3,4,C.DPRED);b(17,18,3,4,C.DPRED);
      // Flame cage — vertical bars of fire
      const cageH=fl?18:br?14:10;
      const cageW=fl?10:br?8:6;
      for(let side=-1;side<=1;side+=2){
        const cx_=16+side*(cageW);
        for(let i=0;i<cageH;i++){
          const jitter=Math.round(Math.sin(i*1.2)*0.8);
          const cl=i<cageH*0.2?C.EMBR:i<cageH*0.5?(fl?C.ORNG:C.HELL):i<cageH*0.8?C.ORNG:C.FLAME;
          p(cx_+jitter,22-i,br&&i%2===0?C.FLAME:cl);
        }
      }
      // Horizontal flame bars
      if(br){
        for(let x=16-cageW;x<=16+cageW;x++){
          p(x,22-cageH,fl?C.BRGHT:C.FLAME);
          if(fl)p(x,22-cageH+1,C.ORNG);
        }
      }
      // Self-immolation flames on body
      iFlame(p,16,2,6,3,fl);
      if(br){p(13,7,C.FLAME);p(19,7,C.FLAME);p(12,10,C.ORNG);p(20,10,C.ORNG);}
      // Sacrifice state = massive glow
      if(fl){
        for(let i=0;i<16;i++){const a=i*Math.PI/8;
          p(16+Math.round(Math.cos(a)*12),14+Math.round(Math.sin(a)*10),i%2?C.ORNG:C.FLAME);
        }
        p(16,0,C.BRGHT);p(15,1,C.FLAME);p(17,1,C.FLAME);
      }
      if(s===3){b(14,8,4,10,C.DKASH);p(15,6,C.DPRED);p(16,6,C.DPRED);}
    },
    // 6. Apocalypse (Ultimate) — Demonic gate/portal with flames
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      // Gate pillars
      b(4,4,4,24,C.CHAR);b(5,4,2,24,C.DKASH);b(4,4,4,1,C.ASH);
      b(24,4,4,24,C.CHAR);b(25,4,2,24,C.DKASH);b(24,4,4,1,C.ASH);
      // Archway top
      for(let i=0;i<6;i++){
        const aw=20-i*2,sx=16-Math.floor(aw/2);
        b(sx,4-i,aw,1,i<2?C.DKASH:i<4?C.CHAR:C.OBSID);
      }
      b(8,4,16,1,fl?C.EMBR:C.ASH);
      // Runes on pillars
      for(let y=6;y<26;y+=3){
        p(5,y,br?C.ORNG:C.EMBR);p(26,y,br?C.ORNG:C.EMBR);
        if(fl){p(6,y+1,C.FLAME);p(25,y+1,C.FLAME);}
      }
      // Skull keystone
      b(14,0,4,3,C.SKULL);b(15,0,2,2,C.BONE);
      p(14,1,C.HELL);p(17,1,C.HELL);
      p(15,2,C.DKBLD);p(16,2,C.DKBLD);
      // Portal interior — hellfire void
      const pw=fl?14:br?12:10;
      for(let y=5;y<26;y++){
        const w=Math.min(pw,pw-Math.abs(y-15)*0.3);
        const sw=Math.max(2,Math.round(w));
        b(16-Math.floor(sw/2),y,sw,1,C.DKBLD);
      }
      // Fire pouring out of portal
      for(let y=6;y<25;y++){
        const x=14+Math.round(Math.sin(y*0.5)*2);
        p(x,y,fl?C.FLAME:br?C.ORNG:C.HELL);
        p(x+1,y,fl?C.ORNG:C.EMBR);
        if(fl)p(x-1,y,C.BRGHT);
      }
      // Lava eyes in the void
      p(13,12,br?C.FLAME:C.ORNG);p(18,12,br?C.FLAME:C.ORNG);
      if(fl){p(13,12,C.BRGHT);p(18,12,C.BRGHT);p(14,13,C.ORNG);p(17,13,C.ORNG);}
      // Flames pouring from top
      if(br){
        iFlame(p,10,0,6,3,false);iFlame(p,22,0,6,3,false);
      }
      if(fl){
        iFlame(p,8,-1,8,4,true);iFlame(p,24,-1,8,4,true);
        iFlame(p,16,-2,6,3,true);
      }
      // Base — charred ground
      b(3,27,26,4,C.CHAR);b(4,27,24,1,C.DKASH);
      // Lava cracks in base
      iLavaCrack(p,8,28,12,30,C.EMBR,fl);
      iLavaCrack(p,20,27,24,30,C.EMBR,fl);
      if(fl){p(10,28,C.LAVA);p(22,28,C.LAVA);p(16,29,C.ORNG);}
      if(s===3){
        for(let y=6;y<25;y++)b(10,y,12,1,C.OBSID);
        p(14,12,C.DPRED);p(17,12,C.DPRED);
      }
    },
  ];
  const cols=6,rows=4;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*T_CELL,row*T_CELL],row);
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (6×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:any){
  const fns=[
    // 1. Imp: small fireball → fire puff
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
    // 2. Hellfire: flame wave → fire burst
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
    // 3. Soul Drain: green soul wisp → soul absorbed flash
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
    // 4. Fiend: running fire trail → massive explosion ring
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
    // 5. Immolate: flame pillar → immolation nova
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
    // 6. Apocalypse: apocalyptic meteor → hellfire explosion (biggest, most dramatic)
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
        // Fill with explosion
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

// ===== HERO (8×5 at 64×128) =====
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
const T_STATES=['Idle','Charge','Fire','Cooldown'];
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
    // Towers
    const tc=tRef.current!;tc.width=6*T_CELL;tc.height=4*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=66,tLH=13;
    tpv.width=tLW+6*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a0000';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#cc4400';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
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

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'infernal_towers_animated.png',
      info:{sz:'384×256',cell:'64×64',loader:"this.load.spritesheet('infernal_towers','infernal_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'6 cols (towers) × 4 rows (idle, charge, fire, cooldown). Fiend col uses rows as: idle, run, glow, explode'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'infernal_projectiles_animated.png',
      info:{sz:'192×192',cell:'32×32',loader:"this.load.spritesheet('infernal_proj','infernal_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'6 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Berserker',ref:hRef,pvRef:hPv,dl:'berserker_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('berserker','berserker_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities (Cleave, Rage, Leap, Rampage) · Row 4: States'}},
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
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?6*P_CELL*3:6*T_CELL*2,border:'1px solid #1a0800'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#885544',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#cc6633'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#cc6633'}}>Phaser:</b> <code style={{color:C.FLAME}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#cc6633'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
