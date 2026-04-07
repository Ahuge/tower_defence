import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
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
  const cx=16;
  // Sandbag stack
  for(let i=0;i<10;i++){
    const cw=w-4+Math.floor(i*0.6),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<3?C.SAND:i<6?C.DKSAND:i<8?C.BROWN:C.DKBRN);
  }
  // Sandbag top highlight
  b(cx-Math.floor((w-4)/2),topY,w-4,1,C.LTSAND);
  // Sandbag texture lines
  for(let i=2;i<8;i+=3){
    const cw=w-6+Math.floor(i*0.4);
    p(cx-Math.floor(cw/2)+2,topY+i,C.DKSAND);
    p(cx+Math.floor(cw/2)-3,topY+i,C.DKSAND);
  }
  // Military star insignia
  p(cx,topY+3,glow>1?C.LTBLUE:C.BLUE);
  p(cx-1,topY+4,glow>1?C.LTBLUE:C.BLUE);p(cx,topY+4,glow>0?C.BLUE:C.DKBLUE);p(cx+1,topY+4,glow>1?C.LTBLUE:C.BLUE);
  p(cx,topY+5,glow>0?C.BLUE:C.DKBLUE);
  // Chevron below star
  p(cx-2,topY+6,C.DKBLUE);p(cx+2,topY+6,C.DKBLUE);
  // Camo netting drape
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.DKOLV);
  if(glow>0){p(cx-3,topY+2,C.DKBLUE);p(cx+3,topY+3,C.DKBLUE);}
}

// Camo pattern helper
function camoPatch(p:any,x:number,y:number,s:number){
  p(x,y,C.OLIVE);p(x+1,y,C.DKOLV);
  if(s>0){p(x,y+1,C.DKSAGE);p(x+1,y+1,C.OLIVE);}
  if(s>1){p(x-1,y,C.SAGE);p(x+2,y+1,C.DKOLV);}
}

// ===== TOWERS (6×4 at 64×64) =====
function drawTowers(ctx:any){
  const fns=[
    // 0: Sandbag — low sandbag wall emplacement
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      // Base sandbag pile
      const by=18;
      // Bottom row of bags
      for(let row=0;row<4;row++){
        const rw=20-row*2,rx=16-Math.floor(rw/2),ry=by+row*3;
        b(rx,ry,rw,3,row<2?C.SAND:C.DKSAND);
        b(rx+1,ry,rw-2,1,row<2?C.LTSAND:C.SAND);
        // Bag seam lines
        for(let i=0;i<rw;i+=4)p(rx+i,ry+1,C.DKSAND);
      }
      // Ground shadow
      b(5,30,22,1,C.DKBRN);
      // Sandbag texture
      p(8,20,C.BROWN);p(14,19,C.BROWN);p(20,20,C.BROWN);p(11,22,C.BROWN);p(17,23,C.BROWN);
      // Star insignia on front bag
      if(s>=1){p(16,22,C.BLUE);p(15,23,C.BLUE);p(16,23,C.DKBLUE);p(17,23,C.BLUE);}
      if(s===2){p(16,22,C.LTBLUE);p(15,23,C.LTBLUE);p(17,23,C.LTBLUE);
        // Glow around bags
        p(5,19,C.DKBLUE);p(26,19,C.DKBLUE);p(4,22,C.DKBLUE);p(27,22,C.DKBLUE);
      }
      if(s===3){p(16,21,C.DGRAY);p(15,22,C.DGRAY);}
    },
    // 1: Barbed Wire — wire fence with glint
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const br=s>=1,fl=s===2;
      // Posts
      b(8,8,2,20,C.DGRAY);b(9,8,1,20,C.MGRAY);
      b(22,8,2,20,C.DGRAY);b(23,8,1,20,C.MGRAY);
      // Post caps
      b(7,7,4,2,C.METAL);b(21,7,4,2,C.METAL);
      // Horizontal wires
      for(let wy of [12,17,22]){
        for(let x=10;x<22;x++){
          p(x,wy,x%3===0?C.LGRAY:C.METAL);
          // Barbs
          if(x%4===0){p(x,wy-1,C.LGRAY);p(x+1,wy+1,C.LGRAY);}
        }
      }
      // Coiled wire on top
      for(let i=0;i<8;i++){
        const wx=10+i*1.5,wy=9+Math.round(Math.sin(i*1.2)*2);
        p(Math.round(wx),Math.round(wy),fl?C.WHITE:C.LGRAY);
      }
      // Wire glint on charge/fire
      if(br){
        p(12,12,C.WHITE);p(18,17,C.WHITE);p(14,22,C.WHITE);
        p(20,12,C.LTBLUE);p(16,17,C.LTBLUE);
      }
      if(fl){
        // Spark effect
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          p(16+Math.round(Math.cos(a)*3),15+Math.round(Math.sin(a)*3),i%2?C.FLASH:C.LTBLUE);
        }
        p(16,15,C.WHITE);
      }
      // Ground
      b(6,28,20,1,C.DKBRN);
      if(s===3){p(12,13,C.DGRAY);p(18,18,C.DGRAY);}
    },
    // 2: Rifleman — soldier with rifle (mobile unit, walk frames)
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      // s: 0=idle, 1=walk, 2=attack(shooting), 3=special
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const bodyLean=s===2?1:0;
      const headY=6,torY=13,legY=22;

      // Helmet
      b(cx-3+bodyLean,headY,6,4,C.OLIVE);b(cx-2+bodyLean,headY,4,3,C.SAGE);
      b(cx-4+bodyLean,headY+3,8,1,C.DKOLV); // brim
      p(cx-2+bodyLean,headY+1,C.DKSAGE); // camo spot
      p(cx+1+bodyLean,headY,C.DKOLV);
      // Face
      b(cx-2+bodyLean,headY+4,4,2,C.SKIN);
      p(cx-1+bodyLean,headY+4,C.DKSKIN); // eye
      p(cx+1+bodyLean,headY+4,C.DKSKIN); // eye

      // Torso (olive drab uniform)
      b(cx-3+bodyLean,torY,6,8,C.OLIVE);b(cx-2+bodyLean,torY,4,7,C.SAGE);
      // Camo patches
      p(cx-2+bodyLean,torY+2,C.DKOLV);p(cx+1+bodyLean,torY+4,C.DKOLV);
      p(cx+bodyLean,torY+1,C.DKSAGE);
      // Belt
      b(cx-3+bodyLean,torY+7,6,1,C.BROWN);p(cx+bodyLean,torY+7,C.DKGOLD);

      // Arms + Rifle
      if(s===2){
        // Shooting pose — arms forward with rifle
        b(cx+3,torY+1,4,2,C.OLIVE); // right arm extended
        b(cx+4,torY,1,2,C.SKIN); // hand
        // Rifle
        b(cx+5,torY-1,6,1,C.DGRAY);b(cx+5,torY,6,1,C.BROWN);
        b(cx+11,torY-1,2,1,C.DGRAY); // barrel
        // Muzzle flash
        p(cx+13,torY-2,C.FLASH);p(cx+13,torY-1,C.ORANGE);p(cx+14,torY-1,C.FLASH);p(cx+13,torY,C.ORANGE);
        // Left arm support
        b(cx-5,torY+2,2,3,C.OLIVE);
      } else {
        // Rifle at side
        b(cx+3,torY+1,2,5,C.OLIVE);p(cx+4,torY+5,C.SKIN);
        b(cx+4,torY-2,1,7,C.DGRAY);b(cx+4,torY+5,1,3,C.BROWN);
        // Left arm
        b(cx-5,torY+1+(s===1?1:0),2,5,C.OLIVE);p(cx-5,torY+5+(s===1?1:0),C.SKIN);
      }

      // Legs
      b(cx-2+legOff+bodyLean,legY,2,7,C.OLIVE);
      b(cx+1+legOff2+bodyLean,legY,2,7,C.OLIVE);
      // Boots
      b(cx-3+legOff+bodyLean,legY+7,3,2,C.DKBRN);
      b(cx+legOff2+bodyLean,legY+7,3,2,C.DKBRN);

      // Special effect (s===3)
      if(s===3){
        // Prone/crouch — lower everything
        p(cx-4,torY-1,C.BLUE);p(cx+5,torY-1,C.BLUE);
        b(cx-6,torY,2,1,C.DKBLUE);b(cx+5,torY,2,1,C.DKBLUE);
        // Scope glint
        p(cx+5,torY-3,C.WHITE);p(cx+6,torY-3,C.LTBLUE);
      }
      // Ground shadow
      b(cx-4,legY+9,8,1,C.DKBRN);
    },
    // 3: Brawler — muscular melee soldier
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const headY=5,torY=12,legY=22;
      const punchExt=s===2?4:0;

      // Head — beret
      b(cx-3,headY,6,2,C.DKRED);b(cx-2,headY-1,5,1,C.RED);
      p(cx+2,headY-1,C.DKRED); // beret fold
      // Face
      b(cx-2,headY+2,4,3,C.SKIN);
      p(cx-1,headY+2,C.DKSKIN);p(cx+1,headY+2,C.DKSKIN); // eyes
      p(cx,headY+4,C.DKSKIN); // chin

      // Torso — wider, muscular, tank top
      b(cx-4,torY,8,9,C.OLIVE);b(cx-3,torY,6,8,C.SAGE);
      // Dog tags
      p(cx,torY+1,C.LGRAY);p(cx,torY+2,C.METAL);
      // Belt with ammo pouches
      b(cx-4,torY+8,8,1,C.BROWN);
      p(cx-3,torY+8,C.DKGOLD);p(cx+2,torY+8,C.DKGOLD);

      // Arms — big and beefy
      if(s===2){
        // Punch forward
        b(cx+4,torY+1,2+punchExt,2,C.SKIN);b(cx+4,torY,2,2,C.OLIVE);
        // Fist
        b(cx+7,torY,3,3,C.SKIN);b(cx+8,torY,2,2,C.LTSKIN);
        // Impact lines
        p(cx+11,torY-1,C.FLASH);p(cx+11,torY+1,C.FLASH);p(cx+12,torY,C.FLASH);
        // Left arm back
        b(cx-6,torY+2,2,4,C.SKIN);b(cx-6,torY+1,2,2,C.OLIVE);
      } else {
        // Arms at sides, massive
        b(cx-6,torY+1+(s===1?1:0),3,6,C.SKIN);b(cx-6,torY+(s===1?1:0),2,2,C.OLIVE);
        b(cx+4,torY+1-(s===1?1:0),3,6,C.SKIN);b(cx+4,torY-(s===1?1:0),2,2,C.OLIVE);
        // Fists
        p(cx-6,torY+6+(s===1?1:0),C.LTSKIN);p(cx+5,torY+6-(s===1?1:0),C.LTSKIN);
      }

      // Legs — cargo pants
      b(cx-3+legOff,legY,3,7,C.DKSAGE);
      b(cx+1+legOff2,legY,3,7,C.DKSAGE);
      // Cargo pockets
      p(cx-2+legOff,legY+3,C.OLIVE);p(cx+2+legOff2,legY+3,C.OLIVE);
      // Boots
      b(cx-4+legOff,legY+7,4,2,C.DKBRN);
      b(cx+legOff2,legY+7,4,2,C.DKBRN);

      // Special (s===3) — battle cry
      if(s===3){
        // Arms raised
        p(cx-5,torY-2,C.SKIN);p(cx-5,torY-3,C.SKIN);
        p(cx+5,torY-2,C.SKIN);p(cx+5,torY-3,C.SKIN);
        // Shout lines
        for(let i=0;i<3;i++){p(cx+7+i,torY-4+i,C.LTRED);p(cx-7-i,torY-4+i,C.LTRED);}
        // Red aura
        p(cx,headY-2,C.RED);p(cx-1,headY-2,C.DKRED);p(cx+1,headY-2,C.DKRED);
      }
      b(cx-4,legY+9,9,1,C.DKBRN);
    },
    // 4: Heavy Gunner — large soldier with machine gun
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const headY=4,torY=11,legY=21;

      // Helmet — heavy, with visor
      b(cx-4,headY,8,4,C.OLIVE);b(cx-3,headY,6,3,C.SAGE);
      b(cx-5,headY+3,10,1,C.DKOLV); // wide brim
      p(cx-3,headY+1,C.DKOLV);p(cx+2,headY,C.DKOLV); // camo
      // Visor
      b(cx-3,headY+4,6,1,C.DGRAY);
      // Face peeking below visor
      b(cx-2,headY+5,4,2,C.SKIN);
      p(cx-1,headY+5,C.DKSKIN);p(cx+1,headY+5,C.DKSKIN);

      // Torso — bulky body armor
      b(cx-5,torY,10,9,C.OLIVE);b(cx-4,torY,8,8,C.SAGE);
      // Body armor plates
      b(cx-3,torY+1,6,5,C.DKSAGE);b(cx-2,torY+2,4,3,C.OLIVE);
      // Ammo belt across chest
      for(let i=0;i<6;i++)p(cx-3+i,torY+1+Math.floor(i*0.5),i%2?C.DKGOLD:C.BROWN);
      // Belt
      b(cx-5,torY+8,10,1,C.BROWN);p(cx,torY+8,C.METAL);

      // Machine gun
      if(s===2){
        // Firing — gun forward with muzzle flash
        b(cx+5,torY+2,8,2,C.DGRAY);b(cx+5,torY+3,8,1,C.MGRAY);
        b(cx+13,torY+1,3,1,C.DGRAY); // barrel
        b(cx+13,torY+2,3,1,C.MGRAY);
        // Muzzle flash (big!)
        p(cx+16,torY,C.FLASH);p(cx+16,torY+1,C.ORANGE);p(cx+17,torY+1,C.FLASH);
        p(cx+16,torY+2,C.ORANGE);p(cx+17,torY+2,C.FLASH);p(cx+16,torY+3,C.FLASH);
        p(cx+15,torY,C.ORANGE);p(cx+15,torY+3,C.ORANGE);
        // Arms holding
        b(cx+4,torY+1,2,3,C.OLIVE);p(cx+5,torY+4,C.SKIN);
        b(cx-6,torY+2,2,3,C.OLIVE);
        // Shell casings
        p(cx+8,torY-1,C.DKGOLD);p(cx+9,torY-2,C.GOLD);
      } else {
        // Gun at side / carried
        b(cx+5,torY+1,2,6,C.DGRAY);b(cx+5,torY+2,2,4,C.MGRAY);
        b(cx+5,torY-1,1,3,C.DGRAY); // barrel up
        // Arms
        b(cx+4,torY+1+(s===1?1:0),2,5,C.OLIVE);p(cx+5,torY+5+(s===1?1:0),C.SKIN);
        b(cx-6,torY+1-(s===1?1:0),2,5,C.OLIVE);p(cx-6,torY+5-(s===1?1:0),C.SKIN);
      }

      // Legs — heavy boots
      b(cx-3+legOff,legY,3,8,C.DKSAGE);
      b(cx+1+legOff2,legY,3,8,C.DKSAGE);
      // Heavy boots
      b(cx-4+legOff,legY+8,4,2,C.DKBRN);b(cx-4+legOff,legY+8,3,1,C.BROWN);
      b(cx+legOff2,legY+8,4,2,C.DKBRN);b(cx+1+legOff2,legY+8,3,1,C.BROWN);

      // Special (s===3) — deploy stance
      if(s===3){
        // Bipod deployed, crouching
        b(cx+6,torY+6,1,4,C.METAL);b(cx+8,torY+6,1,4,C.METAL);
        // Shield effect
        for(let i=0;i<5;i++)p(cx-7,torY+i,C.BLUE);
        p(cx-8,torY+2,C.LTBLUE);
      }
      b(cx-5,legY+10,10,1,C.DKBRN);
    },
    // 5: Commander (Ultimate) — officer with sword + pistol
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16;
      const legOff=s===1?1:0, legOff2=s===1?-1:0;
      const headY=4,torY=12,legY=22;

      // Officer cap
      b(cx-3,headY,6,3,C.OLIVE);b(cx-2,headY,4,2,C.SAGE);
      b(cx-4,headY+2,8,1,C.DKOLV); // visor
      b(cx-1,headY,2,1,C.GOLD); // gold badge on cap
      p(cx,headY,C.LTGOLD);
      // Face
      b(cx-2,headY+3,4,3,C.SKIN);
      p(cx-1,headY+3,C.DKSKIN);p(cx+1,headY+3,C.DKSKIN);
      // Jaw
      p(cx,headY+5,C.DKSKIN);

      // Torso — officer uniform, decorated
      b(cx-4,torY,8,9,C.OLIVE);b(cx-3,torY,6,8,C.SAGE);
      // Epaulettes
      b(cx-5,torY,2,2,C.GOLD);b(cx+4,torY,2,2,C.GOLD);
      // Medals/ribbons
      p(cx-2,torY+2,C.RED);p(cx-1,torY+2,C.BLUE);p(cx,torY+2,C.GOLD);
      p(cx-2,torY+3,C.DKGOLD);p(cx-1,torY+3,C.METAL);
      // Belt with holster
      b(cx-4,torY+8,8,1,C.BROWN);p(cx,torY+8,C.GOLD);
      b(cx+3,torY+6,2,3,C.BROWN); // holster

      // Arms + weapons
      if(s===2){
        // Attack — sword slash + pistol
        // Sword arm (right) — sweeping arc
        b(cx+4,torY,2,3,C.OLIVE);p(cx+5,torY+2,C.SKIN);
        for(let i=0;i<8;i++)p(cx+6+i,torY-2-Math.floor(i*0.4),i===0?C.GOLD:i<3?C.LTGOLD:C.METAL);
        // Slash trail
        for(let i=0;i<5;i++)p(cx+5+i,torY-1+Math.floor(i*0.6),C.FLASH);
        // Pistol arm (left)
        b(cx-6,torY+1,2,3,C.OLIVE);p(cx-6,torY+3,C.SKIN);
        b(cx-8,torY+1,2,1,C.DGRAY); // pistol
        p(cx-9,torY,C.FLASH); // muzzle
      } else {
        // Sword at side, pistol holstered
        b(cx-5,torY+1+(s===1?1:0),2,5,C.OLIVE);p(cx-5,torY+5+(s===1?1:0),C.SKIN);
        b(cx+4,torY+1-(s===1?1:0),2,5,C.OLIVE);p(cx+5,torY+5-(s===1?1:0),C.SKIN);
        // Sword at right side
        for(let i=0;i<6;i++)p(cx+6,torY+2-(s===1?1:0)+i,i===0?C.GOLD:i<2?C.LTGOLD:C.METAL);
      }

      // Legs — pressed trousers
      b(cx-2+legOff,legY,2,7,C.DKSAGE);
      b(cx+1+legOff2,legY,2,7,C.DKSAGE);
      // Officer boots (polished)
      b(cx-3+legOff,legY+7,3,2,C.BLACK);b(cx-2+legOff,legY+7,2,1,C.DGRAY);
      b(cx+legOff2,legY+7,3,2,C.BLACK);b(cx+1+legOff2,legY+7,2,1,C.DGRAY);

      // Special (s===3) — command aura glow
      if(s===3){
        // Blue command aura ring
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*10),torY+4+Math.round(Math.sin(a)*8),i%2?C.LTBLUE:C.BLUE);
          p(cx+Math.round(Math.cos(a)*9),torY+4+Math.round(Math.sin(a)*7),C.DKBLUE);
        }
        // Star burst above
        p(cx,headY-3,C.GOLD);p(cx-1,headY-2,C.LTGOLD);p(cx+1,headY-2,C.LTGOLD);
        p(cx,headY-4,C.LTGOLD);
      }
      b(cx-4,legY+9,8,1,C.DKBRN);
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
    // 0: Sandbag — pebble → dust puff
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
    // 1: Wire — spark → spark fade
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
    // 2: Rifleman — bullet tracer → small impact
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
    // 3: Brawler — fist impact wave → shockwave ring
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
    // 4: Heavy Gunner — large bullet stream → explosion
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
    // 5: Commander — golden slash → command burst
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

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx:any){
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
const T_NAMES=['Sandbag','Barbed Wire','Rifleman','Brawler','Heavy Gunner','Commander'];
const T_STATES=['Idle','Walk/Charge','Attack/Fire','Special/Cooldown'];
const P_NAMES=['Pebble','Spark','Bullet','Fist Wave','Burst','Gold Slash'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Shield Bash 1','Shield Bash 2','War Cry 1','War Cry 2','Ground Slam 1','Ground Slam 2','Fortress 1','Fortress 2'];
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
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+6*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#0a0f06';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#8fbc8f';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<6;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#1a2a1a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#8a9a6a';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

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
      info:{sz:'384×256',cell:'64×64',loader:"this.load.spritesheet('military_towers','military_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'6 cols (towers) × 4 rows (idle/walk/attack/special)'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'military_projectiles_animated.png',
      info:{sz:'192×192',cell:'32×32',loader:"this.load.spritesheet('military_proj','military_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'6 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Warden',ref:hRef,pvRef:hPv,dl:'warden_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('warden','warden_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
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
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?6*P_CELL*3:6*T_CELL*2,border:'1px solid #1a2a1a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#556644',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:C.SAGE}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:C.SAGE}}>Phaser:</b> <code style={{color:C.BLUE}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:C.SAGE}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
