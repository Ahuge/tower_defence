// @ts-nocheck
import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTES =====

// Base/pedestal palette — used exclusively by tMilBase() and camoPatch shared helper
export const C_base={
  BLUE:'#4488ff',BROWN:'#5c4033',DKBLUE:'#2266cc',DKBRN:'#3a2820',
  DKOLV:'#1a2210',DKSAGE:'#6a9a6a',DKSAND:'#8a7a50',
  LTBLUE:'#66aaff',LTSAND:'#d4c8a0',OLIVE:'#556b2f',SAGE:'#8fbc8f',SAND:'#c2b280',
};

// Tower body palette — used by individual tower draw functions
export const C_tower={
  OLIVE:'#556b2f',SAGE:'#8fbc8f',BLUE:'#4488ff',DKOLV:'#1a2210',METAL:'#778899',
  LTSAGE:'#a8d8a8',DKSAGE:'#6a9a6a',SAND:'#c2b280',DKSAND:'#8a7a50',LTSAND:'#d4c8a0',
  KHAKI:'#bdb76b',DKKHAKI:'#8a8040',LTKHAKI:'#d4cf9a',
  BROWN:'#5c4033',DKBRN:'#3a2820',LTBRN:'#7a5a45',
  SKIN:'#d4a574',DKSKIN:'#b08050',LTSKIN:'#e8c8a0',
  RUST:'#8b4513',DKRUST:'#5a2d0e',
  BLACK:'#111111',DGRAY:'#333333',MGRAY:'#555555',LGRAY:'#999999',
  WHITE:'#ffffff',LTBLUE:'#66aaff',DKBLUE:'#2266cc',PALEBLUE:'#aaccff',
  RED:'#cc3333',DKRED:'#882222',LTRED:'#ee5555',
  GOLD:'#ffcc00',DKGOLD:'#aa8800',LTGOLD:'#ffee88',
  FLASH:'#ffff88',ORANGE:'#ff8844',DKORANGE:'#cc5522',
};

// Projectile palette — used by projectile draw functions
export const C_proj={
  SAND:'#c2b280',DKSAND:'#8a7a50',LTSAND:'#d4c8a0',
  BROWN:'#5c4033',DKBRN:'#3a2820',
  DGRAY:'#333333',MGRAY:'#555555',LGRAY:'#999999',
  WHITE:'#ffffff',BLUE:'#4488ff',LTBLUE:'#66aaff',DKBLUE:'#2266cc',
  METAL:'#778899',
  GOLD:'#ffcc00',DKGOLD:'#aa8800',LTGOLD:'#ffee88',
  FLASH:'#ffff88',ORANGE:'#ff8844',DKORANGE:'#cc5522',
  RED:'#cc3333',DKRED:'#882222',
};

// Unified palette (backward compat — union of all three)
export const C={
  OLIVE:'#556b2f',SAGE:'#8fbc8f',BLUE:'#4488ff',DKOLV:'#1a2210',METAL:'#778899',
  LTSAGE:'#a8d8a8',DKSAGE:'#6a9a6a',SAND:'#c2b280',DKSAND:'#8a7a50',LTSAND:'#d4c8a0',
  KHAKI:'#bdb76b',DKKHAKI:'#8a8040',LTKHAKI:'#d4cf9a',
  BROWN:'#5c4033',DKBRN:'#3a2820',LTBRN:'#7a5a45',
  SKIN:'#d4a574',DKSKIN:'#b08050',LTSKIN:'#e8c8a0',
  RUST:'#8b4513',DKRUST:'#5a2d0e',
  BLACK:'#111111',DGRAY:'#333333',MGRAY:'#555555',LGRAY:'#999999',
  WHITE:'#ffffff',LTBLUE:'#66aaff',DKBLUE:'#2266cc',PALEBLUE:'#aaccff',
  RED:'#cc3333',DKRED:'#882222',LTRED:'#ee5555',
  GOLD:'#ffcc00',DKGOLD:'#aa8800',LTGOLD:'#ffee88',
  FLASH:'#ffff88',ORANGE:'#ff8844',DKORANGE:'#cc5522',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

// Military sandbag base with camo netting
function tMilBase(p:any,b:any,topY:number,w:number,glow:number){
  const B=C_base,cx=16;
  // Sandbag stack
  for(let i=0;i<10;i++){
    const cw=w-4+Math.floor(i*0.6),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<3?B.SAND:i<6?B.DKSAND:i<8?B.BROWN:B.DKBRN);
  }
  // Sandbag top highlight
  b(cx-Math.floor((w-4)/2),topY,w-4,1,B.LTSAND);
  // Sandbag texture lines
  for(let i=2;i<8;i+=3){
    const cw=w-6+Math.floor(i*0.4);
    p(cx-Math.floor(cw/2)+2,topY+i,B.DKSAND);
    p(cx+Math.floor(cw/2)-3,topY+i,B.DKSAND);
  }
  // Military star insignia
  p(cx,topY+3,glow>1?B.LTBLUE:B.BLUE);
  p(cx-1,topY+4,glow>1?B.LTBLUE:B.BLUE);p(cx,topY+4,glow>0?B.BLUE:B.DKBLUE);p(cx+1,topY+4,glow>1?B.LTBLUE:B.BLUE);
  p(cx,topY+5,glow>0?B.BLUE:B.DKBLUE);
  // Chevron below star
  p(cx-2,topY+6,B.DKBLUE);p(cx+2,topY+6,B.DKBLUE);
  // Camo netting drape
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,B.DKOLV);
  if(glow>0){p(cx-3,topY+2,B.DKBLUE);p(cx+3,topY+3,B.DKBLUE);}
}

// Camo pattern helper
function camoPatch(p:any,x:number,y:number,s:number){
  p(x,y,C_base.OLIVE);p(x+1,y,C_base.DKOLV);
  if(s>0){p(x,y+1,C_base.DKSAGE);p(x+1,y+1,C_base.OLIVE);}
  if(s>1){p(x-1,y,C_base.SAGE);p(x+2,y+1,C_base.DKOLV);}
}

// ===== TOWER LEVEL COUNTS =====
const T_LEVELS=[2,4,5,5,3,3]; // Sandbag, Wire, Rifleman, Brawler, HeavyGunner, Commander
const T_MAX_LVL=5; // max across all towers
const T_ROWS_PER_LVL=4;
const T_ROWS=T_MAX_LVL*T_ROWS_PER_LVL; // 20 rows: 4 states per level
const T_COLS=6;

// Per-tower base parameters (tMilBase not called by towers, but drawBase provides pedestal-only rendering)
const baseYs=[22,22,22,22,22,22];
const baseWidths=[20,20,20,20,22,22];

export function drawBase(ctx:any,col:number,row:number){
  if(col<0||col>=T_COLS)return;
  const{p,b}=mk(ctx,[col*T_CELL,row*T_CELL],T_G,T_G,T_PX);
  const level=Math.floor(row/T_ROWS_PER_LVL)+1;
  const glow=level>=3?2:level>=2?1:0;
  tMilBase(p,b,baseYs[col],baseWidths[col],glow);
}

// ===== TOWERS (6x20 at 64x64) =====
export function drawTowers(ctx:any){
  const fns=[
    // 0: Sandbag — static tower, level progression = more bags, reinforced
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      // lv: 1=basic sandbag pile, 2=reinforced double-stack with metal plates
      const by=lv===1?20:16;
      const layers=lv===1?3:5;
      // Sandbag rows
      for(let row=0;row<layers;row++){
        const rw=18-row*2+(lv>=2?2:0),rx=16-Math.floor(rw/2),ry=by+row*3;
        b(rx,ry,rw,3,row<2?C.SAND:row<4?C.DKSAND:C.BROWN);
        b(rx+1,ry,rw-2,1,row<2?C.LTSAND:C.SAND);
        for(let i=0;i<rw;i+=4)p(rx+i,ry+1,C.DKSAND);
      }
      // Lv2: metal reinforcement plates on front
      if(lv>=2){
        b(10,by+6,12,2,C.METAL);b(11,by+6,10,1,C.LGRAY);
        // Corner rivets
        p(10,by+6,C.DGRAY);p(21,by+6,C.DGRAY);p(10,by+7,C.DGRAY);p(21,by+7,C.DGRAY);
        // Extra top bags
        b(8,by-2,16,2,C.SAND);b(9,by-2,14,1,C.LTSAND);
        // Ammo box behind
        b(6,by+2,4,3,C.DKOLV);b(7,by+2,2,2,C.OLIVE);
      }
      // Ground shadow
      b(5,30,22,1,C.DKBRN);
      // Texture
      p(8,by+2,C.BROWN);p(14,by+1,C.BROWN);p(20,by+2,C.BROWN);
      // Star insignia
      if(s>=1){p(16,by+4,C.BLUE);p(15,by+5,C.BLUE);p(16,by+5,C.DKBLUE);p(17,by+5,C.BLUE);}
      if(s===2){p(16,by+4,C.LTBLUE);p(15,by+5,C.LTBLUE);p(17,by+5,C.LTBLUE);
        p(5,by+1,C.DKBLUE);p(26,by+1,C.DKBLUE);p(4,by+4,C.DKBLUE);p(27,by+4,C.DKBLUE);
      }
      if(s===3){p(12,by-2,C.DGRAY);p(15,by+4,C.DGRAY);}
    },
    // 1: Barbed Wire — static tower, level progression = more coils/posts/electrification
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      const posts=lv>=3?3:2;
      const postXs=posts===3?[6,15,24]:[8,22];
      // Posts — taller and thicker at higher levels
      const postH=lv>=2?22:20, postW=lv>=4?3:2, postTop=lv>=2?6:8;
      for(const px_ of postXs){
        b(px_,postTop,postW,postH,C.DGRAY);b(px_+1,postTop,1,postH,C.MGRAY);
        // Post caps
        b(px_-1,postTop-1,postW+2,2,lv>=3?C.LGRAY:C.METAL);
      }
      // Horizontal wires — more at higher levels
      const wireYs=lv>=2?[10,14,18,22]:[12,17,22];
      const wireX0=postXs[0]+postW, wireX1=postXs[postXs.length-1];
      for(const wy of wireYs){
        for(let x=wireX0;x<wireX1;x++){
          p(x,wy,x%3===0?C.LGRAY:C.METAL);
          if(x%4===0){p(x,wy-1,C.LGRAY);p(x+1,wy+1,C.LGRAY);}
        }
      }
      // Coiled wire — more coils at higher levels
      const coilCount=lv>=3?12:lv>=2?10:8;
      for(let i=0;i<coilCount;i++){
        const wx=wireX0+i*((wireX1-wireX0)/coilCount),wy=postTop+1+Math.round(Math.sin(i*1.2)*2);
        p(Math.round(wx),Math.round(wy),fl?C.WHITE:C.LGRAY);
      }
      // Lv3+: razor wire coils at base
      if(lv>=3){
        for(let i=0;i<10;i++){
          const bx_=8+i*1.6,bby=25+Math.round(Math.sin(i*0.9)*1.5);
          p(Math.round(bx_),bby,C.LGRAY);
          if(i%2===0)p(Math.round(bx_)+1,bby-1,C.METAL);
        }
      }
      // Lv4: electrified — sparking insulators on posts
      if(lv>=4){
        for(const px_ of postXs){
          p(px_+1,postTop-2,C.LTBLUE);p(px_,postTop-2,C.FLASH);
          // Arcing between posts
          if(px_!==postXs[postXs.length-1]){
            const nx=postXs[postXs.indexOf(px_)+1];
            const mid=Math.round((px_+nx)/2);
            p(mid,postTop-1,C.LTBLUE);p(mid-1,postTop,C.FLASH);p(mid+1,postTop,C.FLASH);
          }
        }
      }
      // Wire glint on charge/fire
      if(br){
        p(12,12,C.WHITE);p(18,17,C.WHITE);p(14,22,C.WHITE);
        p(20,12,C.LTBLUE);p(16,17,C.LTBLUE);
      }
      if(fl){
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          p(16+Math.round(Math.cos(a)*3),15+Math.round(Math.sin(a)*3),i%2?C.FLASH:C.LTBLUE);
        }
        p(16,15,C.WHITE);
      }
      b(4,28,24,1,C.DKBRN);
      if(s===3){p(12,13,C.DGRAY);p(18,18,C.DGRAY);}
    },
    // 2: Rifleman — mobile unit, level = gear progression (1-5)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const bodyLean=s===2?1:0;
      const headY=6,torY=13,legY=22;

      // Helmet — improves with level
      const helmColor=lv>=4?C.DKSAGE:C.OLIVE;
      const helmLight=lv>=4?C.SAGE:C.SAGE;
      b(cx-3+bodyLean,headY,6,4,helmColor);b(cx-2+bodyLean,headY,4,3,helmLight);
      b(cx-4+bodyLean,headY+3,8,1,C.DKOLV);
      p(cx-2+bodyLean,headY+1,C.DKSAGE);p(cx+1+bodyLean,headY,C.DKOLV);
      // Lv3+: NVG mount on helmet
      if(lv>=3){p(cx+bodyLean,headY-1,C.DGRAY);p(cx+1+bodyLean,headY-1,C.DGRAY);}
      // Lv5: elite helmet stripe
      if(lv>=5){b(cx-1+bodyLean,headY,2,3,C.GOLD);}
      // Face
      b(cx-2+bodyLean,headY+4,4,2,C.SKIN);
      p(cx-1+bodyLean,headY+4,C.DKSKIN);p(cx+1+bodyLean,headY+4,C.DKSKIN);
      // Lv4+: face paint
      if(lv>=4){p(cx-2+bodyLean,headY+4,C.DKOLV);p(cx+2+bodyLean,headY+4,C.DKOLV);}

      // Torso
      b(cx-3+bodyLean,torY,6,8,C.OLIVE);b(cx-2+bodyLean,torY,4,7,C.SAGE);
      p(cx-2+bodyLean,torY+2,C.DKOLV);p(cx+1+bodyLean,torY+4,C.DKOLV);
      p(cx+bodyLean,torY+1,C.DKSAGE);
      // Lv2+: chest webbing/pouches
      if(lv>=2){
        b(cx-2+bodyLean,torY+1,4,1,C.BROWN);
        p(cx-1+bodyLean,torY+2,C.DKBRN);p(cx+1+bodyLean,torY+2,C.DKBRN);
      }
      // Lv4+: body armor vest overlay
      if(lv>=4){
        b(cx-2+bodyLean,torY+1,4,5,C.DKSAGE);b(cx-1+bodyLean,torY+2,2,3,C.OLIVE);
      }
      // Lv5: rank chevrons on sleeve
      if(lv>=5){p(cx-3+bodyLean,torY+2,C.GOLD);p(cx-3+bodyLean,torY+3,C.GOLD);}
      // Belt
      b(cx-3+bodyLean,torY+7,6,1,C.BROWN);p(cx+bodyLean,torY+7,C.DKGOLD);

      // Arms + Rifle — bigger weapon at higher levels
      if(s===2){
        b(cx+3,torY+1,4,2,C.OLIVE);b(cx+4,torY,1,2,C.SKIN);
        const rifleLen=lv>=3?8:6;
        b(cx+5,torY-1,rifleLen,1,C.DGRAY);b(cx+5,torY,rifleLen,1,C.BROWN);
        b(cx+5+rifleLen,torY-1,2,1,C.DGRAY);
        // Lv3+: scope
        if(lv>=3){p(cx+7,torY-2,C.DGRAY);p(cx+8,torY-2,C.LGRAY);}
        // Lv5: suppressor
        if(lv>=5){b(cx+5+rifleLen+2,torY-1,2,1,C.MGRAY);}
        // Muzzle flash
        const mzX=cx+5+rifleLen+(lv>=5?4:2);
        p(mzX,torY-2,C.FLASH);p(mzX,torY-1,C.ORANGE);p(mzX+1,torY-1,C.FLASH);p(mzX,torY,C.ORANGE);
        b(cx-5,torY+2,2,3,C.OLIVE);
      } else {
        b(cx+3,torY+1,2,5,C.OLIVE);p(cx+4,torY+5,C.SKIN);
        b(cx+4,torY-2,1,7,C.DGRAY);b(cx+4,torY+5,1,3,C.BROWN);
        // Lv3+: scope on idle rifle
        if(lv>=3){p(cx+5,torY-1,C.LGRAY);}
        b(cx-5,torY+1+(s===1?1:0),2,5,C.OLIVE);p(cx-5,torY+5+(s===1?1:0),C.SKIN);
      }
      // Lv2+: sidearm holster on leg
      if(lv>=2){b(cx+2+legOff2+bodyLean,legY+1,1,3,C.DGRAY);}

      // Legs
      b(cx-2+legOff+bodyLean,legY,2,7,C.OLIVE);
      b(cx+1+legOff2+bodyLean,legY,2,7,C.OLIVE);
      // Lv3+: knee pads
      if(lv>=3){p(cx-2+legOff+bodyLean,legY+4,C.DKSAGE);p(cx+2+legOff2+bodyLean,legY+4,C.DKSAGE);}
      // Boots — heavier at higher levels
      const bootW=lv>=4?4:3;
      b(cx-3+legOff+bodyLean,legY+7,bootW,2,lv>=4?C.BLACK:C.DKBRN);
      b(cx+legOff2+bodyLean,legY+7,bootW,2,lv>=4?C.BLACK:C.DKBRN);

      // Special effect
      if(s===3){
        p(cx-4,torY-1,C.BLUE);p(cx+5,torY-1,C.BLUE);
        b(cx-6,torY,2,1,C.DKBLUE);b(cx+5,torY,2,1,C.DKBLUE);
        p(cx+5,torY-3,C.WHITE);p(cx+6,torY-3,C.LTBLUE);
        // Lv5: elite scope glint brighter
        if(lv>=5){p(cx+7,torY-3,C.FLASH);}
      }
      b(cx-4,legY+9,8,1,C.DKBRN);
    },
    // 3: Brawler — mobile unit, level = muscle/armor progression (1-5)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const headY=5,torY=12,legY=22;
      const punchExt=s===2?4:0;

      // Head — beret improves
      const beretColor=lv>=4?C.BLACK:C.DKRED;
      const beretLight=lv>=4?C.DGRAY:C.RED;
      b(cx-3,headY,6,2,beretColor);b(cx-2,headY-1,5,1,beretLight);
      p(cx+2,headY-1,beretColor);
      // Lv3+: beret badge
      if(lv>=3){p(cx-1,headY,C.GOLD);}
      // Lv5: elite beret with gold trim
      if(lv>=5){b(cx-3,headY+1,6,1,C.GOLD);}
      // Face
      b(cx-2,headY+2,4,3,C.SKIN);
      p(cx-1,headY+2,C.DKSKIN);p(cx+1,headY+2,C.DKSKIN);
      p(cx,headY+4,C.DKSKIN);
      // Lv4+: war paint / scar
      if(lv>=4){p(cx+1,headY+3,C.DKRED);}

      // Torso — gets bulkier and more armored
      const torsoW=lv>=3?10:8, torsoOff=Math.floor(torsoW/2);
      b(cx-torsoOff,torY,torsoW,9,C.OLIVE);b(cx-torsoOff+1,torY,torsoW-2,8,C.SAGE);
      // Dog tags
      p(cx,torY+1,C.LGRAY);p(cx,torY+2,C.METAL);
      // Lv2+: tactical vest
      if(lv>=2){
        b(cx-3,torY+1,6,2,C.DKSAGE);
        p(cx-2,torY+1,C.BROWN);p(cx+2,torY+1,C.BROWN); // pouches
      }
      // Lv3+: shoulder pads
      if(lv>=3){
        b(cx-torsoOff-1,torY,2,3,C.DKSAGE);b(cx+torsoOff-1,torY,2,3,C.DKSAGE);
      }
      // Lv4+: armored plates on chest
      if(lv>=4){
        b(cx-2,torY+2,4,4,C.METAL);b(cx-1,torY+3,2,2,C.LGRAY);
      }
      // Lv5: gold championship belt
      if(lv>=5){
        b(cx-torsoOff,torY+8,torsoW,1,C.DKGOLD);p(cx,torY+8,C.GOLD);p(cx-1,torY+8,C.LTGOLD);p(cx+1,torY+8,C.LTGOLD);
      } else {
        b(cx-torsoOff,torY+8,torsoW,1,C.BROWN);
        p(cx-3,torY+8,C.DKGOLD);p(cx+2,torY+8,C.DKGOLD);
      }

      // Arms — bigger with level
      const armW=lv>=3?4:3;
      if(s===2){
        b(cx+4,torY+1,2+punchExt,2,C.SKIN);b(cx+4,torY,2,2,C.OLIVE);
        // Fist — bigger at high levels
        const fistSz=lv>=4?4:3;
        b(cx+7,torY,fistSz,fistSz,C.SKIN);b(cx+8,torY,fistSz-1,fistSz-1,C.LTSKIN);
        // Lv3+: brass knuckles
        if(lv>=3){b(cx+7,torY,fistSz,1,C.METAL);p(cx+8,torY,C.LGRAY);}
        // Lv5: spiked gauntlet
        if(lv>=5){p(cx+7+fistSz,torY-1,C.METAL);p(cx+7+fistSz,torY+1,C.METAL);}
        // Impact lines
        p(cx+11,torY-1,C.FLASH);p(cx+11,torY+1,C.FLASH);p(cx+12,torY,C.FLASH);
        b(cx-6,torY+2,2,4,C.SKIN);b(cx-6,torY+1,2,2,C.OLIVE);
      } else {
        b(cx-6,torY+1+(s===1?1:0),armW,6,C.SKIN);b(cx-6,torY+(s===1?1:0),2,2,C.OLIVE);
        b(cx+4,torY+1-(s===1?1:0),armW,6,C.SKIN);b(cx+4,torY-(s===1?1:0),2,2,C.OLIVE);
        p(cx-6,torY+6+(s===1?1:0),C.LTSKIN);p(cx+armW+1,torY+6-(s===1?1:0),C.LTSKIN);
      }

      // Legs — cargo pants, heavier boots at higher levels
      b(cx-3+legOff,legY,3,7,C.DKSAGE);
      b(cx+1+legOff2,legY,3,7,C.DKSAGE);
      p(cx-2+legOff,legY+3,C.OLIVE);p(cx+2+legOff2,legY+3,C.OLIVE);
      // Lv3+: shin guards
      if(lv>=3){p(cx-2+legOff,legY+5,C.METAL);p(cx+2+legOff2,legY+5,C.METAL);}
      const bootW=lv>=3?5:4;
      b(cx-4+legOff,legY+7,bootW,2,lv>=4?C.BLACK:C.DKBRN);
      b(cx+legOff2,legY+7,bootW,2,lv>=4?C.BLACK:C.DKBRN);

      // Special (s===3) — battle cry
      if(s===3){
        p(cx-5,torY-2,C.SKIN);p(cx-5,torY-3,C.SKIN);
        p(cx+5,torY-2,C.SKIN);p(cx+5,torY-3,C.SKIN);
        const cryRange=lv>=3?4:3;
        for(let i=0;i<cryRange;i++){p(cx+7+i,torY-4+i,C.LTRED);p(cx-7-i,torY-4+i,C.LTRED);}
        p(cx,headY-2,lv>=5?C.GOLD:C.RED);
        p(cx-1,headY-2,lv>=5?C.LTGOLD:C.DKRED);p(cx+1,headY-2,lv>=5?C.LTGOLD:C.DKRED);
      }
      b(cx-4,legY+9,9,1,C.DKBRN);
    },
    // 4: Tank — mobile armored vehicle (was Heavy Gunner), level = bigger hull/armor (1-3)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const treadAnim=s%2;

      // Tank hull — wider and heavier with level
      const hullW=16+Math.min(lv-1,2)*4;
      const hullH=8+Math.min(lv-1,2)*2;
      const hx=cx-Math.floor(hullW/2);
      const hy=12;

      // Treads
      const tY=hy+hullH;
      b(hx-2,tY,hullW+4,4,C.DGRAY);
      for(let i=0;i<hullW+3;i+=2)p(hx-2+i+treadAnim,tY+1,C.MGRAY);
      for(let i=0;i<hullW+3;i+=2)p(hx-2+i+(1-treadAnim),tY+2,C.MGRAY);
      // Drive wheels
      p(hx-2,tY,C.MGRAY);p(hx+hullW+1,tY,C.MGRAY);
      p(hx-2,tY+3,C.MGRAY);p(hx+hullW+1,tY+3,C.MGRAY);

      // Hull body
      b(hx,hy,hullW,hullH,C.DKOLV);
      b(hx+1,hy+1,hullW-2,hullH-2,C.OLIVE);
      b(hx+2,hy+2,hullW-4,hullH-4,C.SAGE);
      // Armor seams
      p(hx+3,hy+2,C.DKOLV);p(hx+hullW-4,hy+2,C.DKOLV);
      // Lv2+: reinforced top plate
      if(lv>=2){b(hx,hy,hullW,2,C.DKOLV);b(hx+1,hy,hullW-2,1,C.METAL);}
      // Lv3: reactive armor blocks on sides
      if(lv>=3){
        b(hx-2,hy+2,2,hullH-3,C.DGRAY);b(hx+hullW,hy+2,2,hullH-3,C.DGRAY);
        p(hx-1,hy+3,C.METAL);p(hx+hullW,hy+3,C.METAL);
      }

      // Turret
      const turrW=10+Math.min(lv-1,2)*2;
      const turrH=5;
      const ttx=cx-Math.floor(turrW/2);
      const tty=hy-turrH+2;
      b(ttx,tty,turrW,turrH,C.DKOLV);b(ttx+1,tty+1,turrW-2,turrH-2,C.DGRAY);
      b(ttx+2,tty+1,turrW-4,turrH-3,C.MGRAY);
      p(cx,tty,C.METAL); // hatch

      // Barrel — direction based on state
      const bLen=6+Math.min(lv-1,2)*2;
      if(s===0){ // idle: barrel right
        b(cx+Math.floor(turrW/2),tty+1,bLen,2,C.DGRAY);b(cx+Math.floor(turrW/2),tty+2,bLen,1,C.MGRAY);
      } else if(s===1){ // walk: barrel right, slight movement
        b(cx+Math.floor(turrW/2),tty+1+(treadAnim?0:1),bLen,2,C.DGRAY);
      } else if(s===2){ // fire: barrel right with muzzle flash
        b(cx+Math.floor(turrW/2),tty+1,bLen,2,C.DGRAY);
        const mz=cx+Math.floor(turrW/2)+bLen;
        p(mz,tty,C.FLASH);p(mz+1,tty+1,C.WHITE);p(mz,tty+2,C.FLASH);
        p(mz+1,tty,C.ORANGE);p(mz+1,tty+2,C.ORANGE);p(mz+2,tty+1,C.FLASH);
      } else { // cooldown: barrel with smoke
        b(cx+Math.floor(turrW/2),tty+1,bLen,2,C.DGRAY);
        const mz2=cx+Math.floor(turrW/2)+bLen;
        p(mz2,tty+1,C.MGRAY);p(mz2+1,tty,C.DGRAY);
      }

      // Star emblem on hull
      p(cx,hy+Math.floor(hullH/2),C.GOLD);
      if(lv>=2){p(cx-1,hy+Math.floor(hullH/2),C.DKGOLD);p(cx+1,hy+Math.floor(hullH/2),C.DKGOLD);}
    },
    // 5: Commander (Ultimate) — mobile unit, level = rank/decoration progression (1-3)
    (c:any,o:number[],s:number,lv:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const headY=4,torY=12,legY=22;

      // Officer cap — fancier with level
      b(cx-3,headY,6,3,C.OLIVE);b(cx-2,headY,4,2,C.SAGE);
      b(cx-4,headY+2,8,1,C.DKOLV);
      b(cx-1,headY,2,1,C.GOLD);p(cx,headY,C.LTGOLD);
      // Lv2+: peak cap with gold braid
      if(lv>=2){
        b(cx-4,headY+2,8,1,C.GOLD); // gold visor
        p(cx-2,headY-1,C.GOLD);p(cx+2,headY-1,C.GOLD); // side badges
      }
      // Lv3: ornate ceremonial cap
      if(lv>=3){
        b(cx-2,headY-1,4,1,C.GOLD); // full gold band
        p(cx,headY-2,C.LTGOLD); // crown pip
      }
      // Face
      b(cx-2,headY+3,4,3,C.SKIN);
      p(cx-1,headY+3,C.DKSKIN);p(cx+1,headY+3,C.DKSKIN);
      p(cx,headY+5,C.DKSKIN);

      // Torso — officer uniform
      b(cx-4,torY,8,9,C.OLIVE);b(cx-3,torY,6,8,C.SAGE);
      // Epaulettes — fancier with level
      const epColor=lv>=2?C.LTGOLD:C.GOLD;
      b(cx-5,torY,2,2,epColor);b(cx+4,torY,2,2,epColor);
      // Lv2+: epaulette fringe
      if(lv>=2){p(cx-5,torY+2,C.GOLD);p(cx+5,torY+2,C.GOLD);}
      // Lv3: ornate shoulder boards with stars
      if(lv>=3){
        b(cx-6,torY,3,2,C.GOLD);b(cx+4,torY,3,2,C.GOLD);
        p(cx-5,torY,C.WHITE);p(cx+5,torY,C.WHITE); // stars
      }
      // Medals — more with level
      p(cx-2,torY+2,C.RED);p(cx-1,torY+2,C.BLUE);p(cx,torY+2,C.GOLD);
      p(cx-2,torY+3,C.DKGOLD);p(cx-1,torY+3,C.METAL);
      if(lv>=2){p(cx+1,torY+2,C.RED);p(cx+1,torY+3,C.BLUE);}
      if(lv>=3){p(cx+2,torY+2,C.LTGOLD);p(cx+2,torY+3,C.GOLD);p(cx,torY+4,C.RED);}
      // Belt
      b(cx-4,torY+8,8,1,lv>=2?C.DKGOLD:C.BROWN);p(cx,torY+8,C.GOLD);
      b(cx+3,torY+6,2,3,C.BROWN);

      // Arms + weapons — sword gets fancier
      if(s===2){
        b(cx+4,torY,2,3,C.OLIVE);p(cx+5,torY+2,C.SKIN);
        const swordLen=lv>=2?10:8;
        for(let i=0;i<swordLen;i++)p(cx+6+i,torY-2-Math.floor(i*0.4),i===0?C.GOLD:i<3?C.LTGOLD:lv>=3?C.LGRAY:C.METAL);
        // Lv3: sword glow
        if(lv>=3){
          for(let i=3;i<swordLen;i++)p(cx+6+i,torY-3-Math.floor(i*0.4),C.FLASH);
        }
        for(let i=0;i<5;i++)p(cx+5+i,torY-1+Math.floor(i*0.6),C.FLASH);
        b(cx-6,torY+1,2,3,C.OLIVE);p(cx-6,torY+3,C.SKIN);
        b(cx-8,torY+1,2,1,C.DGRAY);p(cx-9,torY,C.FLASH);
      } else {
        b(cx-5,torY+1+(s===1?1:0),2,5,C.OLIVE);p(cx-5,torY+5+(s===1?1:0),C.SKIN);
        b(cx+4,torY+1-(s===1?1:0),2,5,C.OLIVE);p(cx+5,torY+5-(s===1?1:0),C.SKIN);
        const swordLen=lv>=2?8:6;
        for(let i=0;i<swordLen;i++)p(cx+6,torY+2-(s===1?1:0)+i,i===0?C.GOLD:i<2?C.LTGOLD:lv>=3?C.LGRAY:C.METAL);
      }

      // Legs
      b(cx-2+legOff,legY,2,7,C.DKSAGE);
      b(cx+1+legOff2,legY,2,7,C.DKSAGE);
      // Lv2+: pressed trouser stripes
      if(lv>=2){p(cx-2+legOff,legY+1,C.GOLD);p(cx+2+legOff2,legY+1,C.GOLD);}
      b(cx-3+legOff,legY+7,3,2,C.BLACK);b(cx-2+legOff,legY+7,2,1,C.DGRAY);
      b(cx+legOff2,legY+7,3,2,C.BLACK);b(cx+1+legOff2,legY+7,2,1,C.DGRAY);
      // Lv3: polished tall boots
      if(lv>=3){
        b(cx-3+legOff,legY+5,3,4,C.BLACK);b(cx-2+legOff,legY+5,2,1,C.DGRAY);
        b(cx+legOff2,legY+5,3,4,C.BLACK);b(cx+1+legOff2,legY+5,2,1,C.DGRAY);
      }

      // Special (s===3) — command aura
      if(s===3){
        const auraR=lv>=2?12:10;
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*auraR),torY+4+Math.round(Math.sin(a)*(auraR-2)),i%2?C.LTBLUE:C.BLUE);
          p(cx+Math.round(Math.cos(a)*(auraR-1)),torY+4+Math.round(Math.sin(a)*(auraR-3)),C.DKBLUE);
        }
        // Lv3: double aura ring
        if(lv>=3){
          for(let i=0;i<8;i++){
            const a=i*Math.PI/4;
            p(cx+Math.round(Math.cos(a)*(auraR+2)),torY+4+Math.round(Math.sin(a)*auraR),C.GOLD);
          }
        }
        p(cx,headY-3,C.GOLD);p(cx-1,headY-2,C.LTGOLD);p(cx+1,headY-2,C.LTGOLD);
        p(cx,headY-4,C.LTGOLD);
        // Lv2+: extra star
        if(lv>=2){p(cx-2,headY-3,C.GOLD);p(cx+2,headY-3,C.GOLD);}
      }
      b(cx-4,legY+9,8,1,C.DKBRN);
    },
  ];
  const cols=T_COLS,rows=T_ROWS;
  for(let col=0;col<cols;col++){
    const maxLv=T_LEVELS[col];
    for(let row=0;row<rows;row++){
      const lvIdx=Math.floor(row/4); // 0-based level index (0..4)
      const state=row%4;             // 0=idle,1=walk,2=attack,3=special
      const lv=lvIdx+1;              // 1-based level
      if(lv>maxLv) continue;         // skip rows beyond this tower's max level
      fns[col](ctx,[col*T_CELL,row*T_CELL],state,lv);
    }
  }
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (6x6 at 32x32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

export function drawProjectiles(ctx:any){
  const fns=[
    // 0: Sandbag — pebble -> dust puff
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Tiny pebble traveling
        const bob=[0,-1,1][f];
        b(cx-1,cy+bob,2,2,C.BROWN);p(cx,cy+bob,C.SAND);p(cx-1,cy+1+bob,C.DKBRN);
        // Trail dust
        if(f>0){p(cx-3,cy+1,C.DKSAND);p(cx-4,cy,C.DKSAND);}
      } else if(f===3){
        // Dust puff initial
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.SAND:C.DKSAND);}
        b(cx-1,cy-1,2,2,C.SAND);p(cx,cy,C.LTSAND);
      } else if(f===4){
        // Dust cloud expanding
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=4+i%2;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DKSAND);}
        for(let i=0;i<4;i++){const a=i*Math.PI/2;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.SAND);}
      } else {
        // Dust settling
        [[4,10],[11,9],[7,12],[9,7],[13,11]].forEach(([x,y],i)=>p(x,y,i%2?C.DKSAND:C.SAND));
      }
    },
    // 1: Wire — spark -> spark fade
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Electric spark traveling
        const frame=[0,1,-1][f];
        p(cx,cy+frame,C.WHITE);p(cx-1,cy+frame-1,C.FLASH);p(cx+1,cy+frame+1,C.FLASH);
        p(cx-1,cy+frame+1,C.LTBLUE);p(cx+1,cy+frame-1,C.LTBLUE);
        if(f>0){p(cx+2,cy+frame,C.BLUE);p(cx-2,cy+frame,C.BLUE);}
      } else if(f===3){
        // Spark burst
        p(cx,cy,C.WHITE);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.FLASH:C.LTBLUE);}
        for(let i=0;i<4;i++){const a=i*Math.PI/2;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.WHITE);}
      } else if(f===4){
        // Spark dissipating
        for(let i=0;i<6;i++){const a=i*Math.PI/3,r=4;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DKBLUE);}
        p(cx,cy,C.LTBLUE);p(cx-1,cy,C.BLUE);p(cx+1,cy,C.BLUE);
      } else {
        // Faded sparks
        [[5,7],[10,9],[8,5],[12,8]].forEach(([x,y],i)=>p(x,y,i%2?C.DKBLUE:C.BLUE));
      }
    },
    // 2: Rifleman — bullet tracer -> small impact
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Bullet tracer
        const len=[4,5,4][f];
        for(let i=0;i<len;i++)p(cx-Math.floor(len/2)+i,cy,i===0?C.FLASH:i===1?C.GOLD:C.DKGOLD);
        p(cx+Math.floor(len/2),cy,C.WHITE); // bright tip
        // Tracer trail
        if(f>0)for(let i=1;i<3;i++)p(cx-Math.floor(len/2)-i,cy,C.DKGOLD);
      } else if(f===3){
        // Impact spark
        p(cx,cy,C.WHITE);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),i%2?C.FLASH:C.GOLD);}
        p(cx,cy-1,C.FLASH);p(cx,cy+1,C.FLASH);
      } else if(f===4){
        // Impact dissipating
        for(let i=0;i<4;i++){const a=i*Math.PI/2,r=3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DKGOLD);}
        p(cx-1,cy,C.GOLD);p(cx+1,cy,C.GOLD);
      } else {
        // Smoke wisps
        [[6,7],[10,8],[8,6],[9,10]].forEach(([x,y],i)=>p(x,y,i%2?C.MGRAY:C.DGRAY));
      }
    },
    // 3: Brawler — fist impact wave -> shockwave ring
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Fist impact wave
        const size=[2,3,2][f];
        b(cx-1,cy-1,2+size,2,C.LTSAND);b(cx,cy,size,1,C.SAND);
        // Motion lines
        for(let i=0;i<size+1;i++){p(cx-3-i,cy-1+i,C.DKSAND);p(cx-3-i,cy+i,C.DKSAND);}
      } else if(f===3){
        // Shockwave ring initial
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.SAND:C.LTSAND);}
        b(cx-1,cy-1,2,2,C.FLASH);p(cx,cy,C.WHITE);
      } else if(f===4){
        // Ring expanding
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=5;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.SAND:C.DKSAND);}
        for(let i=0;i<4;i++){const a=i*Math.PI/2,r=3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.LTSAND);}
      } else {
        // Dust settling
        [[4,6],[11,10],[6,11],[10,5],[8,8]].forEach(([x,y],i)=>p(x,y,i%2?C.DKSAND:C.SAND));
      }
    },
    // 4: Tank — explosive shell -> AoE explosion
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Bullet stream (multiple tracers)
        const off=[0,1,-1][f];
        for(let r=0;r<3;r++){
          const by=cy-2+r*2+off;
          for(let i=0;i<4;i++)p(cx-2+i,by,i===3?C.WHITE:i===2?C.FLASH:i===1?C.GOLD:C.DKGOLD);
        }
        // Shell casings
        p(cx-4,cy-3+off,C.DKGOLD);p(cx-5,cy+2+off,C.GOLD);
      } else if(f===3){
        // Explosion initial
        b(cx-2,cy-2,4,4,C.ORANGE);b(cx-1,cy-1,2,2,C.FLASH);p(cx,cy,C.WHITE);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.ORANGE:C.DKORANGE);}
        for(let i=0;i<4;i++){const a=i*Math.PI/2;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.FLASH);}
      } else if(f===4){
        // Explosion expanding
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=5+i%2;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.ORANGE:i%3===1?C.DKORANGE:C.DGRAY);}
        b(cx-2,cy-2,4,4,C.DKORANGE);b(cx-1,cy-1,2,2,C.ORANGE);
        // Smoke
        p(cx-3,cy-4,C.DGRAY);p(cx+4,cy-3,C.MGRAY);
      } else {
        // Smoke cloud
        for(let i=0;i<8;i++){const a=i*Math.PI/4,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.DGRAY:C.MGRAY);}
        p(cx,cy,C.DGRAY);p(cx-1,cy+1,C.DGRAY);
      }
    },
    // 5: Commander — golden slash -> command burst
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Golden slash arc
        const phase=f;
        for(let i=0;i<6;i++){
          const x_=cx-3+i,y_=cy-2+Math.round(Math.sin((i+phase)*0.8)*2);
          p(x_,y_,i<2?C.GOLD:i<4?C.LTGOLD:C.FLASH);
          if(i>0)p(x_,y_+1,C.DKGOLD);
        }
        // Trail sparkle
        if(phase>0){p(cx-4,cy+1,C.DKGOLD);p(cx-5,cy,C.DKGOLD);}
      } else if(f===3){
        // Command burst — star pattern
        p(cx,cy,C.WHITE);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.GOLD:C.LTGOLD);
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.BLUE:C.LTBLUE);
        }
        b(cx-1,cy-1,2,2,C.LTGOLD);
      } else if(f===4){
        // Command aura wave
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=6;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.LTBLUE:i%3===1?C.BLUE:C.DKBLUE);}
        for(let i=0;i<6;i++){const a=i*Math.PI/3,r=3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.GOLD);}
        p(cx,cy,C.LTGOLD);
      } else {
        // Fading glow
        [[5,6,C.DKBLUE],[10,5,C.DKGOLD],[7,11,C.DKBLUE],[11,9,C.DKGOLD],[8,7,C.BLUE]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
      }
    },
  ];
  const cols=6,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8x5 at 64x128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

export function drawHero(ctx:any){
  // dir: 0=down,1=side,2=up | type: idle/walk/atk | frame: variant
  function drawWarden(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,shieldBash=false,warCry=false,groundSlam=false,fortress=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Fortress mode ground glow
    if(fortress){
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8;
        p(cx+Math.round(Math.cos(a)*10),50+Math.round(Math.sin(a)*4),i%2?C.LTBLUE:C.BLUE);
        p(cx+Math.round(Math.cos(a)*8),50+Math.round(Math.sin(a)*3),C.DKBLUE);
      }
    }

    // War cry effects
    if(warCry){
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        const r=12+i%3;
        p(cx+Math.round(Math.cos(a)*r),30+Math.round(Math.sin(a)*r*0.6),i%2?C.LTBLUE:C.BLUE);
        p(cx+Math.round(Math.cos(a)*(r-2)),30+Math.round(Math.sin(a)*(r-2)*0.6),C.PALEBLUE);
      }
    }

    const lean=shieldBash?2:atk&&atkFrame>0?1:0;
    const headY=8;
    const torY=headY+8;
    const legY=torY+12;
    const bx=cx+lean;

    // CAPE (blue tabard over armor — behind body)
    if(dir===2||dir===0){
      const cY=torY+3;
      for(let i=0;i<16;i++){
        const w=8+Math.floor(i*0.4), sx_=bx-Math.floor(w/2)+Math.round(Math.sin(i*0.25)*0.8);
        const cl=i<3?C.DKBLUE:i<8?C.BLUE:i<12?C.DKBLUE:C.DGRAY;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Cape edge highlights
      for(let i=0;i<12;i++){
        const w=8+Math.floor(i*0.4), sx_=bx-Math.floor(w/2);
        if(cY+i<62){p(sx_,cY+i,C.LTBLUE);if(sx_+w-1<32)p(sx_+w-1,cY+i,i%3===0?C.LTBLUE:C.BLUE);}
      }
      // Tattered bottom
      const bY_=Math.min(cY+14,61);
      for(let x=-5;x<6;x++){const px_=bx+x;if(px_>=0&&px_<32&&(px_+bY_)%3!==0)p(px_,bY_,C.DGRAY);}
    }

    // HELMET (heavy plate with visor)
    if(dir===0){
      // Front — full helm with visor slit
      b(bx-4,headY-1,8,6,C.METAL);b(bx-3,headY-1,6,5,C.LGRAY);
      b(bx-5,headY+1,10,1,C.METAL); // brow ridge
      b(bx-2,headY-2,4,1,C.LGRAY); // top crest
      p(bx,headY-3,C.BLUE); // plume base
      p(bx,headY-4,C.LTBLUE); // plume tip
      p(bx-1,headY-3,C.DKBLUE);p(bx+1,headY-3,C.DKBLUE);
      // Visor slit — glowing eyes
      b(bx-3,headY+2,6,1,C.DGRAY);
      p(bx-2,headY+2,fortress?C.LTBLUE:C.BLUE);p(bx+1,headY+2,fortress?C.LTBLUE:C.BLUE);
      // Chin guard
      b(bx-3,headY+4,6,1,C.DGRAY);b(bx-2,headY+4,4,1,C.METAL);
    } else if(dir===1){
      // Side profile helm
      b(bx-3,headY-1,7,6,C.METAL);b(bx-2,headY-1,5,5,C.LGRAY);
      b(bx-4,headY+1,9,1,C.METAL);
      b(bx-1,headY-2,3,1,C.LGRAY);
      p(bx,headY-3,C.BLUE);p(bx,headY-4,C.LTBLUE);
      // Visor slit
      b(bx-2,headY+2,5,1,C.DGRAY);
      p(bx+1,headY+2,fortress?C.LTBLUE:C.BLUE);
      // Chin
      b(bx-2,headY+4,5,1,C.DGRAY);
    } else {
      // Back of helm
      b(bx-4,headY-1,8,6,C.METAL);b(bx-3,headY-1,6,5,C.LGRAY);
      b(bx-2,headY-2,4,1,C.LGRAY);
      p(bx,headY-3,C.BLUE);p(bx,headY-4,C.LTBLUE);
      p(bx-1,headY-3,C.DKBLUE);p(bx+1,headY-3,C.DKBLUE);
      // Neck guard
      b(bx-3,headY+4,6,2,C.METAL);b(bx-2,headY+4,4,1,C.LGRAY);
      p(bx,headY+1,C.LGRAY);p(bx-1,headY+2,C.LGRAY);
    }

    // TORSO — plate armor with blue tabard
    b(bx-4,torY,8,11,C.METAL);b(bx-3,torY,6,10,C.LGRAY);
    // Blue tabard front (only visible from front/side)
    if(dir===0){
      b(bx-2,torY+1,4,8,C.BLUE);b(bx-1,torY+2,2,6,C.LTBLUE);
      // Gold trim on tabard
      b(bx-2,torY+1,4,1,C.GOLD);b(bx-2,torY+8,4,1,C.GOLD);
      // Cross/insignia on chest
      p(bx,torY+4,C.GOLD);p(bx-1,torY+5,C.GOLD);p(bx,torY+5,C.LTGOLD);p(bx+1,torY+5,C.GOLD);p(bx,torY+6,C.GOLD);
    } else if(dir===1){
      b(bx-1,torY+1,3,8,C.BLUE);b(bx,torY+2,2,6,C.LTBLUE);
      b(bx-1,torY+1,3,1,C.GOLD);b(bx-1,torY+8,3,1,C.GOLD);
    } else {
      // Back — cape attachment points
      p(bx-2,torY+1,C.GOLD);p(bx+2,torY+1,C.GOLD);
      p(bx,torY+2,C.LGRAY);
    }
    // Armor trim
    b(bx-4,torY,8,1,C.LGRAY);b(bx-4,torY+10,8,1,C.DGRAY);
    // Belt
    b(bx-4,torY+10,8,1,C.BROWN);p(bx,torY+10,C.GOLD);

    // SHIELD (left arm — always visible except from behind during attack)
    const shY=torY+1;
    if(dir===0||dir===1){
      const shX=bx-7+(shieldBash?3:0);
      // Shield body
      b(shX,shY+armSwing,4,8,C.BLUE);b(shX+1,shY+1+armSwing,2,6,C.LTBLUE);
      // Shield rim
      b(shX,shY+armSwing,4,1,C.GOLD);b(shX,shY+7+armSwing,4,1,C.GOLD);
      b(shX,shY+armSwing,1,8,C.GOLD);b(shX+3,shY+armSwing,1,8,C.GOLD);
      // Shield boss
      p(shX+1,shY+3+armSwing,C.GOLD);p(shX+2,shY+4+armSwing,C.LTGOLD);
      // Arm behind shield
      b(shX+3,shY+1+armSwing,2,4,C.METAL);
      if(fortress){
        // Shield glow
        p(shX-1,shY+2+armSwing,C.LTBLUE);p(shX-1,shY+5+armSwing,C.LTBLUE);
        p(shX+4,shY+2+armSwing,C.LTBLUE);p(shX+4,shY+5+armSwing,C.LTBLUE);
      }
    } else {
      // From behind — shield on back
      b(bx-6,shY+armSwing,3,7,C.DKBLUE);b(bx-5,shY+1+armSwing,1,5,C.BLUE);
    }

    // MACE (right arm)
    if(atk){
      if(dir===0){
        // Mace swing down
        if(atkFrame===0){
          b(bx+4,torY-1,2,4,C.METAL); // arm up
          p(bx+4,torY-1,C.LGRAY);
          // Mace head (up)
          for(let i=0;i<5;i++)p(bx+4+(i<2?0:i<4?1:0),torY-6+i,i<2?C.DGRAY:i<4?C.METAL:C.LGRAY);
          b(bx+3,torY-7,3,2,C.METAL);p(bx+4,torY-8,C.LGRAY); // flanges
        } else {
          b(bx+4,torY+2,2,4,C.METAL); // arm down
          // Mace head (down, impact)
          b(bx+3,torY+7,3,3,C.METAL);b(bx+4,torY+7,2,2,C.LGRAY);
          p(bx+2,torY+8,C.METAL);p(bx+6,torY+8,C.METAL); // flanges
          // Impact sparks
          p(bx+3,torY+10,C.FLASH);p(bx+5,torY+10,C.FLASH);p(bx+4,torY+11,C.GOLD);
        }
      } else if(dir===1){
        if(atkFrame===0){
          b(bx+4,torY-2,2,5,C.METAL);
          b(bx+3,torY-7,3,3,C.METAL);p(bx+4,torY-8,C.LGRAY);
        } else {
          b(bx+4,torY+2,2,4,C.METAL);
          b(bx+3,torY+7,3,3,C.METAL);b(bx+4,torY+8,2,1,C.LGRAY);
          p(bx+3,torY+10,C.FLASH);p(bx+5,torY+10,C.FLASH);
        }
      } else {
        if(atkFrame===0){
          b(bx+4,torY-2,2,4,C.METAL);
          b(bx+3,torY-6,3,2,C.METAL);p(bx+4,torY-7,C.LGRAY);
        } else {
          b(bx+4,torY+3,2,4,C.METAL);
          b(bx+3,torY+8,3,2,C.METAL);p(bx+4,torY+10,C.FLASH);
        }
      }
    } else {
      // Mace at side
      const aY=torY+1;
      b(bx+4,aY-armSwing,2,5,C.METAL);p(bx+5,aY-armSwing,C.LGRAY);
      // Mace head hanging
      for(let i=0;i<3;i++)p(bx+5,aY+5-armSwing+i,i===0?C.METAL:i===1?C.LGRAY:C.DGRAY);
      b(bx+4,aY+5-armSwing,3,2,C.METAL);p(bx+5,aY+5-armSwing,C.LGRAY);
    }

    // Ground slam effect
    if(groundSlam){
      for(let x=-10;x<=10;x++){
        const px_=bx+x;
        if(px_>=0&&px_<32){
          p(px_,56,C.DKSAND);
          if(Math.abs(x)%2===0)p(px_,55,C.SAND);
          if(Math.abs(x)%3===0&&Math.abs(x)>3)p(px_,54,C.BROWN);
        }
      }
      // Debris
      p(bx-6,52,C.BROWN);p(bx+7,51,C.BROWN);p(bx-3,50,C.SAND);p(bx+4,49,C.SAND);
    }

    // LEGS — heavy plate greaves
    const lh=10;
    b(bx-3+lOff,legY,3,lh,C.METAL);b(bx-2+lOff,legY,2,lh,C.LGRAY);
    b(bx+1+rOff,legY,3,lh,C.METAL);b(bx+2+rOff,legY,2,lh,C.LGRAY);
    // Knee plates
    b(bx-3+lOff,legY+Math.floor(lh*0.4),3,2,C.LGRAY);p(bx-2+lOff,legY+Math.floor(lh*0.4),C.WHITE);
    b(bx+1+rOff,legY+Math.floor(lh*0.4),3,2,C.LGRAY);p(bx+2+rOff,legY+Math.floor(lh*0.4),C.WHITE);
    // Sabatons (armored boots)
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx-4+lOff,lfy,5,2,C.DGRAY);b(bx-3+lOff,lfy,3,1,C.METAL);
    b(bx+rOff,rfy,5,2,C.DGRAY);b(bx+1+rOff,rfy,3,1,C.METAL);
    // Ground shadow
    if(lfy+2<63){p(bx-4+lOff,lfy+2,C.DGRAY);p(bx+4+rOff,rfy+2,C.DGRAY);}

    // Hurt flash
    if(hurt){
      p(bx+5,headY+1,C.RED);p(bx+6,headY,C.LTRED);p(bx+7,headY+1,C.RED);p(bx+6,headY+2,C.LTRED);
    }

    // Shield bash forward motion
    if(shieldBash){
      // Motion lines behind
      for(let y=torY;y<torY+8;y+=2){p(bx-10,y,C.LGRAY);p(bx-11,y+1,C.DGRAY);}
    }
  }

  // Layout: 8 cols x 5 rows at 64x128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities shieldBash1,shieldBash2,warCry1,warCry2,groundSlam1,groundSlam2,fortress1,fortress2
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
    {dir:1,opts:{shieldBash:true,lOff:2,rOff:1}},
    {dir:1,opts:{shieldBash:true,lOff:3,rOff:2}},
    {dir:0,opts:{warCry:true}},
    {dir:0,opts:{warCry:true,armSwing:1,lOff:1,rOff:-1}},
    {dir:0,opts:{groundSlam:true,atk:true,atkFrame:0,lOff:1}},
    {dir:0,opts:{groundSlam:true,atk:true,atkFrame:1,lOff:2,rOff:-1}},
    {dir:0,opts:{fortress:true}},
    {dir:0,opts:{fortress:true,armSwing:1,lOff:1,rOff:-1}},
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
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Fallen knight — collapsed on side
        // Helmet on ground
        b(6,32,6,4,C.METAL);b(7,33,4,2,C.LGRAY);p(7,33,C.DGRAY); // visor
        p(9,33,C.BLUE); // eye glow fading
        // Body collapsed
        b(11,34,12,4,C.METAL);b(12,35,10,2,C.LGRAY);
        // Tabard visible
        b(14,35,4,2,C.BLUE);p(15,35,C.LTBLUE);
        // Shield fallen beside
        b(4,36,4,6,C.DKBLUE);b(5,37,2,4,C.BLUE);p(5,38,C.GOLD);
        // Cape draped
        b(20,36,6,3,C.DKBLUE);b(22,38,4,2,C.BLUE);
        // Mace dropped
        b(24,32,1,5,C.DGRAY);b(23,30,3,2,C.METAL);p(24,29,C.LGRAY);
        // Legs
        b(10,38,4,3,C.METAL);b(14,39,4,3,C.METAL);
        // Ground
        for(let x=4;x<26;x++){if(x%3!==0)p(x,42,C.DKBRN);if(x%4===0)p(x,43,C.DGRAY);}
        // Blood-like scratches on armor
        p(14,34,C.DKRED);p(16,35,C.DKRED);
      } else if(frame.opts.custom==='death2'){
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Dissolving/fading — armor pieces scattered
        [[8,36,C.METAL],[12,34,C.LGRAY],[18,37,C.METAL],[22,35,C.DGRAY]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
        // Shield fragment
        p(6,38,C.BLUE);p(7,39,C.DKBLUE);p(5,39,C.GOLD);
        // Scattered pixels dissolving
        [[10,32],[14,28],[18,34],[12,24],[20,30],[8,30],[16,22],[22,28],[11,20],[15,18],[19,36],[13,40],[17,42],[9,38],[21,34],[14,16],[16,14],[12,12],[18,20],[10,26]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.BLUE:i%4===0?C.LGRAY:i%3===0?C.METAL:i%2===0?C.DGRAY:C.DKBLUE);
        });
        // Ground
        for(let x=6;x<24;x++){if(x%2===0)p(x,44,C.DKBRN);if(x%3===0)p(x,43,C.DGRAY);}
        // Last glow from helm
        p(14,44,C.BLUE);p(15,44,C.DKBLUE);
      } else if(frame.opts.custom==='portrait'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Portrait frame
        b(2,2,28,60,C.DGRAY);b(3,3,26,58,C.BLACK);
        // Helm — front view, large
        b(6,5,20,10,C.METAL);b(7,6,18,8,C.LGRAY);
        b(6,5,20,2,C.LGRAY);b(7,4,18,2,C.METAL);b(8,3,16,1,C.LGRAY);
        // Plume
        b(14,1,4,3,C.BLUE);b(15,1,2,2,C.LTBLUE);p(15,0,C.LTBLUE);
        // Visor slit
        b(8,11,16,2,C.DGRAY);b(9,11,14,1,C.BLACK);
        // Eyes through visor
        b(10,11,3,1,C.BLUE);b(19,11,3,1,C.BLUE);
        p(11,11,C.LTBLUE);p(20,11,C.LTBLUE);
        // Chin guard
        b(8,14,16,2,C.DGRAY);b(9,14,14,1,C.METAL);
        // Neck/gorget
        b(10,16,12,3,C.METAL);b(11,17,10,1,C.LGRAY);
        // Pauldrons
        b(4,19,6,5,C.METAL);b(5,20,4,3,C.LGRAY);
        b(22,19,6,5,C.METAL);b(23,20,4,3,C.LGRAY);
        // Tabard/chest
        b(10,19,12,16,C.METAL);b(11,19,10,14,C.LGRAY);
        b(12,21,8,10,C.BLUE);b(13,22,6,8,C.LTBLUE);
        // Cross on chest
        p(16,24,C.GOLD);p(15,25,C.GOLD);p(16,25,C.LTGOLD);p(17,25,C.GOLD);p(16,26,C.GOLD);
        p(16,23,C.GOLD);p(16,27,C.GOLD);
        // Gold trim
        b(12,21,8,1,C.GOLD);b(12,30,8,1,C.GOLD);
        // Shield glimpse (left side)
        b(4,25,4,8,C.DKBLUE);b(5,26,2,6,C.BLUE);p(5,28,C.GOLD);
        // Mace glimpse (right side)
        b(25,24,2,8,C.DGRAY);b(24,22,4,3,C.METAL);p(25,21,C.LGRAY);
        // Frame border
        b(2,2,28,1,C.GOLD);b(2,61,28,1,C.GOLD);b(2,2,1,60,C.GOLD);b(29,2,1,60,C.GOLD);
        // Corner accents
        p(3,3,C.BLUE);p(28,3,C.BLUE);p(3,60,C.BLUE);p(28,60,C.BLUE);
      } else {
        drawWarden(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Sandbag','Barbed Wire','Rifleman','Brawler','Tank','Commander'];
const T_STATE_NAMES=['Idle','Walk/Charge','Attack/Fire','Special/Cooldown'];
const P_NAMES=['Pebble','Spark','Bullet','Fist Wave','Burst','Gold Slash'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Shield Bash 1','Shield Bash 2','War Cry 1','War Cry 2','Ground Slam 1','Ground Slam 2','Fortress 1','Fortress 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// Build tower row labels: "Lv1 Idle", "Lv1 Walk", ... "Lv5 Special"
const T_ROW_LABELS:string[]=[];
for(let lv=1;lv<=T_MAX_LVL;lv++){
  for(let si=0;si<4;si++) T_ROW_LABELS.push(`Lv${lv} ${T_STATE_NAMES[si]}`);
}

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=T_COLS*T_CELL;tc.height=T_ROWS*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=100,tLH=13;
    tpv.width=tLW+T_COLS*T_CELL*tS;tpv.height=T_ROWS*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a0f06';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<T_ROWS;r++){
      const by=r*(T_CELL*tS+tLH)+5;
      tpc.fillStyle='#8fbc8f';tpc.font='bold 9px monospace';tpc.fillText(T_ROW_LABELS[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<T_COLS;cc++){
        const bx_=tLW+cc*T_CELL*tS;
        // Check if this tower has this level
        const lvIdx=Math.floor(r/4);
        const lv=lvIdx+1;
        const maxLv=T_LEVELS[cc];
        tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();
        tpc.strokeStyle=lv>maxLv?'#331111':'#1a2a1a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);
        // Mark empty cells
        if(lv>maxLv){
          tpc.fillStyle='rgba(50,20,20,0.6)';tpc.fillRect(bx_+1,by+1,T_CELL*tS-2,T_CELL*tS-2);
          tpc.fillStyle='#553333';tpc.font='8px monospace';tpc.fillText('--',bx_+T_CELL*tS/2-6,by+T_CELL*tS/2+3);
        }
        if(r===0){tpc.fillStyle='#8a9a6a';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc]+` (${maxLv}lv)`,bx_+2,by-2);}
      }
    }

    // Projectiles
    const pc_=pRef.current!;pc_.width=6*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+6*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#0a0f06';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#8fbc8f';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<6;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#1a2a1a';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#8a9a6a';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=86,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#0a0f06';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#8fbc8f';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#1a2a1a';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#8a9a6a';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'military_towers_animated.png',
      info:{sz:`${T_COLS*T_CELL}x${T_ROWS*T_CELL}`,cell:'64x64',loader:"this.load.spritesheet('military_towers','military_towers_animated.png',{frameWidth:64,frameHeight:64})",note:`${T_COLS} cols (towers) x ${T_ROWS} rows (${T_MAX_LVL} levels x 4 states). Levels: ${T_NAMES.map((n,i)=>`${n}=${T_LEVELS[i]}`).join(', ')}`}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'military_projectiles_animated.png',
      info:{sz:'192x192',cell:'32x32',loader:"this.load.spritesheet('military_proj','military_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'6 cols x 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Warden',ref:hRef,pvRef:hPv,dl:'warden_hero_directional.png',
      info:{sz:'512x640',cell:'64x128',loader:"this.load.spritesheet('warden','warden_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle x2, walk x4, atk x2) - Row 3: Abilities - Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#0a0f06',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.SAGE,margin:0,fontSize:15}}>MILITARY FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.OLIVE,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#2a3a1a':'#111',color:tab===t.id?C.SAGE:'#556644',border:`1px solid ${tab===t.id?'#446622':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {(['preview','actual'] as const).map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#1a2a1a':'#111',color:view===v?C.BLUE:'#445566',border:`1px solid ${view===v?'#334':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'85vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}} data-label={`Military ${t.label} (Preview)`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'}/>
            <canvas ref={t.ref} data-label={`Military ${t.label}`} data-frame-size={t.id==='projectiles'?'32x32':t.id==='hero'?'64x128':'64x64'} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?6*P_CELL*3:T_COLS*T_CELL*2,border:'1px solid #1a2a1a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#556644',fontSize:9,marginTop:10,maxWidth:700}}>
        <p style={{margin:'2px 0'}}><b style={{color:C.SAGE}}>Sheet:</b> {cur.info.sz}px - {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:C.SAGE}}>Phaser:</b> <code style={{color:C.BLUE}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:C.SAGE}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
