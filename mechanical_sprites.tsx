import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
  BRONZE:'#cc8833',DKBRZ:'#995522',LTBRZ:'#ddaa55',
  TAN:'#eebb66',LTTAN:'#ffdd88',DKTAN:'#bb9944',
  ORANGE:'#ff9944',LTORG:'#ffbb77',DKORG:'#cc6622',
  DKBRN:'#332211',BRWN:'#553322',MDBRN:'#664433',
  STEEL:'#888888',LTSTL:'#aaaaaa',DKSTL:'#666666',WTSTL:'#cccccc',
  RIVET:'#555555',DKRIV:'#444444',
  FLAME:'#ff6622',LTFLM:'#ffaa44',WFLM:'#ffdd88',DKFLM:'#cc3300',
  BLUE:'#4488ff',LTBLU:'#88bbff',WBLU:'#bbddff',DKBLU:'#2255aa',
  SPARK:'#ffff88',WSPARK:'#ffffff',LTSPARK:'#ffee66',
  BLACK:'#111111',VOID:'#000000',
  WHITE:'#ffffff',GRAY:'#777777',DKGRAY:'#333333',
  SMOKE:'#665555',LTSMK:'#887777',DKSMK:'#443333',
  GEAR:'#997744',DKGEAR:'#775533',LTGEAR:'#bbaa66',
  RED:'#cc3333',LTRED:'#ff5555',DKRED:'#882222',
};

// ===== DRAWING HELPERS =====
const mk=(c:any,o:number[],gw:number,gh:number,ps:number)=>{
  const p=(x:number,y:number,cl:string)=>{if(!cl||x<0||x>=gw||y<0||y>=gh)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,ps,ps);};
  const b=(x:number,y:number,w:number,h:number,cl:string)=>{if(!cl)return;c.fillStyle=cl;c.fillRect(o[0]+x*ps,o[1]+y*ps,w*ps,h*ps);};
  return{p,b};
};

// ===== TOWER HELPERS =====
const T_PX=2,T_G=32,T_CELL=T_G*T_PX;

// Mechanical base: stacked metal platform with gear teeth and rivets
function mBase(p:any,b:any,topY:number,w:number,glow:number){
  const cx=16;
  // Main platform layers
  for(let i=0;i<10;i++){
    const cw=w-4+Math.floor(i*0.6),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.LTBRZ:i<4?C.BRONZE:i<7?C.DKBRZ:C.DKBRN);
  }
  // Top edge highlight
  b(cx-Math.floor((w-4)/2),topY,w-4,1,C.TAN);
  // Gear teeth pattern along top edge
  const gw=w-6,gsx=cx-Math.floor(gw/2);
  for(let i=0;i<gw;i++){
    if(i%3===0){p(gsx+i,topY-1,glow>1?C.LTGEAR:C.GEAR);p(gsx+i,topY,C.LTGEAR);}
  }
  // Gear teeth on sides
  for(let i=0;i<6;i+=2){
    p(cx-Math.floor(w/2)+1,topY+2+i,glow>0?C.LTGEAR:C.GEAR);
    p(cx+Math.floor(w/2)-2,topY+2+i,glow>0?C.LTGEAR:C.GEAR);
  }
  // Rivets
  p(cx-4,topY+2,glow>1?C.WTSTL:C.LTSTL);p(cx+3,topY+2,glow>1?C.WTSTL:C.LTSTL);
  p(cx-3,topY+5,C.RIVET);p(cx+2,topY+5,C.RIVET);
  p(cx-5,topY+7,C.DKRIV);p(cx+4,topY+7,C.DKRIV);
  // Bottom shadow
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.DKBRN);
  // Steam vent (small)
  if(glow>0){p(cx-2,topY+3,C.SMOKE);p(cx-2,topY+2,C.LTSMK);}
}

// Piston helper
function mPiston(p:any,b:any,x:number,y:number,h:number,ext:number){
  // Outer cylinder
  b(x,y,3,h,C.DKSTL);b(x+1,y,1,h,C.STEEL);
  // Inner rod
  b(x+1,y-ext,1,ext+2,C.LTSTL);
  // Cap
  b(x,y-ext-1,3,1,C.WTSTL);
  // Base mount
  b(x-1,y+h-1,5,1,C.DKBRN);
}

// Gear helper
function mGear(p:any,cx:number,cy:number,r:number,col:string,teeth:number){
  // Core circle
  for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
    if(x*x+y*y<=r*r)p(cx+x,cy+y,col);
  }
  // Teeth
  for(let i=0;i<teeth;i++){
    const a=i*Math.PI*2/teeth;
    const tx=Math.round(Math.cos(a)*(r+1)),ty=Math.round(Math.sin(a)*(r+1));
    p(cx+tx,cy+ty,col);
  }
  // Center hole
  if(r>1)p(cx,cy,C.DKBRN);
}

// Steam puff helper
function mSteam(p:any,x:number,y:number,size:number){
  for(let i=0;i<size;i++){
    const ox=Math.round(Math.sin(i*1.2)*2),oy=-i;
    p(x+ox,y+oy,i<size/2?C.LTSMK:C.SMOKE);
    if(i>0)p(x+ox+1,y+oy,C.SMOKE);
  }
}

// ===== TOWERS (8×4 at 64×64) =====
function drawTowers(ctx:CanvasRenderingContext2D){
  const fns=[
    // 0: Wall — Short solid armored metal block
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,22,22,s===1?1:s===2?2:0);
      // Main wall body - thick armored block
      b(6,8,20,14,C.DKSTL);b(7,8,18,13,C.STEEL);b(8,8,16,12,C.LTSTL);
      // Top armor plate
      b(7,7,18,2,C.BRONZE);b(8,7,16,1,C.LTBRZ);
      // Vertical armor seams
      b(11,9,1,10,C.DKSTL);b(16,9,1,10,C.DKSTL);b(21,9,1,10,C.DKSTL);
      // Horizontal plate line
      b(7,14,18,1,C.DKSTL);
      // Rivets on plates
      const rv=s>=1?C.WTSTL:C.LTSTL;
      p(9,10,rv);p(14,10,rv);p(19,10,rv);p(9,17,rv);p(14,17,rv);p(19,17,rv);
      p(24,11,C.RIVET);p(24,16,C.RIVET);
      // Side reinforcement brackets
      b(5,10,2,8,C.DKBRZ);b(25,10,2,8,C.DKBRZ);
      p(5,10,C.BRONZE);p(5,17,C.BRONZE);p(26,10,C.BRONZE);p(26,17,C.BRONZE);
      // State variations
      if(s===1){
        // Charge: slight glow on armor
        b(8,9,16,1,C.TAN);p(12,11,C.LTBRZ);p(17,11,C.LTBRZ);
      }
      if(s===2){
        // Fire: impact sparks on surface
        p(10,9,C.SPARK);p(15,12,C.SPARK);p(20,10,C.WSPARK);
        p(8,15,C.ORANGE);p(18,16,C.ORANGE);
      }
      if(s===3){
        // Cooldown: steam from top
        mSteam(p,10,7,4);mSteam(p,20,7,3);
        p(12,6,C.SMOKE);p(18,5,C.LTSMK);
      }
    },
    // 1: Turret — Rotating barrel on swivel mount
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,23,20,s===1?1:s===2?2:0);
      // Swivel mount base
      b(12,18,8,5,C.DKSTL);b(13,18,6,4,C.STEEL);
      b(14,18,4,1,C.LTSTL);
      // Rotation ring
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        p(16+Math.round(Math.cos(a)*5),20+Math.round(Math.sin(a)*2),C.BRONZE);
      }
      // Turret body
      const rot=s===1?1:s===2?-1:s===3?0:0;
      b(11+rot,11,10,7,C.DKSTL);b(12+rot,11,8,6,C.STEEL);b(13+rot,11,6,5,C.LTSTL);
      // Top plate
      b(12+rot,10,8,1,C.BRONZE);b(13+rot,10,6,1,C.LTBRZ);
      // Barrel
      const blen=s===2?12:10;
      b(21+rot,13,blen,2,C.DKSTL);b(21+rot,13,blen,1,C.STEEL);
      p(21+rot+blen-1,13,C.LTSTL);
      // Barrel muzzle
      b(21+rot+blen-1,12,1,4,C.DKBRN);
      // Rivets on turret
      p(13+rot,13,C.RIVET);p(18+rot,13,C.RIVET);
      // Ammo belt hint
      b(10+rot,15,3,2,C.DKBRZ);p(10+rot,15,C.BRONZE);p(11+rot,16,C.BRONZE);
      if(s===2){
        // Fire: muzzle flash
        const mx=21+rot+blen;
        p(mx,12,C.WSPARK);p(mx,14,C.WSPARK);p(mx+1,13,C.SPARK);
        p(mx-1,11,C.ORANGE);p(mx-1,15,C.ORANGE);
        b(mx,13,2,1,C.WHITE);
        mSteam(p,mx-2,11,3);
      }
      if(s===1){
        // Charge: barrel warming
        p(25+rot,13,C.ORANGE);p(26+rot,13,C.DKORG);
      }
      if(s===3){
        // Cooldown: smoke from barrel
        mSteam(p,28,11,4);p(27,12,C.SMOKE);
      }
    },
    // 2: Flamethrower — Nozzle/pipe with pilot flame
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,23,20,s===1?1:s===2?2:0);
      // Fuel tank (back)
      b(6,10,6,12,C.DKBRZ);b(7,10,4,11,C.BRONZE);b(8,10,2,10,C.LTBRZ);
      b(6,10,6,1,C.TAN);b(7,21,4,1,C.DKBRN);
      // Tank bands
      b(6,13,6,1,C.DKSTL);b(6,17,6,1,C.DKSTL);
      p(7,13,C.RIVET);p(11,13,C.RIVET);
      // Pipe from tank to nozzle
      b(12,14,4,2,C.DKSTL);b(12,14,4,1,C.STEEL);
      // Nozzle housing
      b(16,11,6,6,C.DKSTL);b(17,11,4,5,C.STEEL);b(18,11,2,4,C.LTSTL);
      b(16,11,6,1,C.BRONZE);
      // Nozzle opening
      b(22,12,3,4,C.DKBRN);b(22,13,3,2,C.BLACK);
      // Pilot flame (always on)
      p(25,13,s===0?C.ORANGE:C.FLAME);p(25,14,C.DKORG);
      if(s===1){
        // Charge: pilot flame grows
        p(26,12,C.FLAME);p(26,13,C.LTFLM);p(26,14,C.FLAME);p(27,13,C.ORANGE);
        p(24,11,C.DKORG);
      }
      if(s===2){
        // Fire: full flame cone!
        for(let i=0;i<8;i++){
          const w=1+Math.floor(i*0.8);
          const yc=13;
          for(let dy=-w;dy<=w;dy++){
            const px=25+i,py=yc+dy;
            if(px<32&&py>=0&&py<32){
              const d=Math.abs(dy);
              p(px,py,d===0?C.WFLM:d<=w/2?C.LTFLM:d<=w*0.7?C.FLAME:C.DKFLM);
            }
          }
        }
        p(26,13,C.WHITE);p(27,13,C.WSPARK);
        // Heat shimmer above
        p(22,9,C.DKORG);p(24,8,C.ORANGE);p(20,10,C.DKFLM);
      }
      if(s===3){
        // Cooldown: residual smoke
        mSteam(p,24,10,5);mSteam(p,22,9,3);
        p(25,13,C.DKORG);p(25,14,C.DKFLM);
      }
    },
    // 3: Tesla — Tesla coil with arcing electricity
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,23,20,s===1?1:s===2?2:0);
      // Coil base housing
      b(12,18,8,5,C.DKBRZ);b(13,18,6,4,C.BRONZE);b(14,18,4,1,C.TAN);
      // Coil stem
      b(15,6,2,12,C.DKSTL);b(15,6,1,12,C.STEEL);
      // Coil windings
      for(let i=0;i<6;i++){
        const y=8+i*2;
        b(13,y,6,1,C.DKBRZ);p(13,y,C.BRONZE);p(18,y,C.BRONZE);
      }
      // Top sphere/electrode
      for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++){
        if(x*x+y*y<=5){
          const d=Math.sqrt(x*x+y*y);
          p(16+x,5+y,d<1?C.WTSTL:d<2?C.LTSTL:C.STEEL);
        }
      }
      p(15,3,C.LTSTL);p(17,3,C.LTSTL);
      // Sparks based on state
      if(s===0){
        // Idle: tiny static sparks
        p(13,5,C.SPARK);p(19,6,C.SPARK);
      }
      if(s===1){
        // Charge: arcs building
        p(12,4,C.SPARK);p(20,5,C.SPARK);p(11,6,C.LTSPARK);p(21,4,C.LTSPARK);
        // Small arcs
        p(13,3,C.BLUE);p(14,2,C.LTBLU);p(18,3,C.BLUE);p(19,2,C.LTBLU);
      }
      if(s===2){
        // Fire: full lightning arcs
        // Left arc
        const larc=[[12,4],[11,3],[10,2],[9,3],[8,4],[7,3],[6,2],[5,3],[4,4]];
        larc.forEach(([x,y],i)=>p(x,y,i%2===0?C.LTBLU:C.WBLU));
        // Right arc
        const rarc=[[20,5],[21,4],[22,3],[23,4],[24,5],[25,4],[26,3]];
        rarc.forEach(([x,y],i)=>p(x,y,i%2===0?C.LTBLU:C.WBLU));
        // Top discharge
        p(16,1,C.WSPARK);p(15,0,C.SPARK);p(17,0,C.SPARK);
        p(16,2,C.WHITE);
        // Glow on coil
        p(14,5,C.LTBLU);p(18,5,C.LTBLU);
        // Ground sparks
        p(10,22,C.SPARK);p(22,21,C.SPARK);
      }
      if(s===3){
        // Cooldown: fading sparks
        p(14,4,C.DKBLU);p(18,6,C.DKBLU);p(12,7,C.DKBLU);p(20,8,C.DKBLU);
        mSteam(p,14,3,3);
      }
    },
    // 4: Mortar — Heavy cannon tilted upward
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,23,22,s===1?1:s===2?2:0);
      // Heavy base mount
      b(10,19,12,4,C.DKBRZ);b(11,19,10,3,C.BRONZE);b(12,19,8,1,C.TAN);
      // Elevation mechanism (side plates)
      b(9,16,3,4,C.DKSTL);b(10,16,1,3,C.STEEL);
      b(20,16,3,4,C.DKSTL);b(21,16,1,3,C.STEEL);
      // Barrel (angled upward) - thick mortar tube
      const recoil=s===2?2:0;
      for(let i=0;i<12;i++){
        const bx=12+Math.floor(i*0.5),by=15-i+recoil;
        if(by>=0&&by<32){
          b(bx,by,6,1,C.DKSTL);
          p(bx+1,by,C.STEEL);p(bx+4,by,C.STEEL);
          p(bx+2,by,C.LTSTL);p(bx+3,by,C.LTSTL);
        }
      }
      // Barrel mouth (top)
      b(17,3+recoil,4,2,C.DKBRN);b(18,3+recoil,2,2,C.BLACK);
      // Barrel reinforcing rings
      b(13,12+recoil,6,1,C.BRONZE);b(15,8+recoil,5,1,C.BRONZE);
      // Rivets
      p(10,17,C.RIVET);p(22,17,C.RIVET);p(14,13+recoil,C.RIVET);
      if(s===1){
        // Charge: loading
        p(18,4,C.ORANGE);p(17,5,C.DKORG);
        mSteam(p,11,15,3);
      }
      if(s===2){
        // Fire: muzzle blast + recoil
        b(17,0,4,3,C.SPARK);p(18,0,C.WSPARK);p(19,0,C.WSPARK);
        p(16,1,C.FLAME);p(21,1,C.FLAME);p(17,1,C.LTFLM);p(20,1,C.LTFLM);
        // Smoke cloud at muzzle
        p(15,2,C.SMOKE);p(22,2,C.SMOKE);p(16,0,C.LTSMK);p(21,0,C.LTSMK);
        // Recoil piston compression
        b(10,18,2,2,C.DKSTL);b(20,18,2,2,C.DKSTL);
      }
      if(s===3){
        // Cooldown: barrel smoking
        mSteam(p,18,2,6);mSteam(p,16,3,4);
        p(19,4,C.DKSMK);
      }
    },
    // 5: Shredder — Spinning blade array
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,24,20,s===1?1:s===2?2:0);
      // Central axle housing
      b(13,16,6,8,C.DKBRZ);b(14,16,4,7,C.BRONZE);b(15,16,2,1,C.TAN);
      // Motor housing
      b(11,18,10,4,C.DKSTL);b(12,18,8,3,C.STEEL);
      p(12,19,C.RIVET);p(19,19,C.RIVET);
      // Blade axle
      b(15,4,2,14,C.DKSTL);b(15,4,1,14,C.STEEL);
      // Spinning blades - position depends on state
      const bladePhase=s===2?1:s===1?0.5:0;
      const bladeAngles=s===2?[0,45,90,135]:[0,60,120,180];
      // Draw 4 blades as elongated shapes
      for(let bi=0;bi<4;bi++){
        const a=(bi*90+bladePhase*45)*Math.PI/180;
        for(let r=2;r<=7;r++){
          const bx=16+Math.round(Math.cos(a)*r);
          const by=10+Math.round(Math.sin(a)*r);
          if(bx>=0&&bx<32&&by>=0&&by<32){
            p(bx,by,r<4?C.LTSTL:r<6?C.STEEL:C.DKSTL);
          }
        }
        // Blade edge highlight
        const ex=16+Math.round(Math.cos(a)*7);
        const ey=10+Math.round(Math.sin(a)*7);
        if(ex>=0&&ex<32&&ey>=0&&ey<32)p(ex,ey,C.WTSTL);
      }
      // Center hub
      mGear(p,16,10,2,C.BRONZE,6);
      p(16,10,C.DKBRN);
      if(s===1){
        // Charge: blades start spinning, motion blur hint
        p(10,10,C.DKSTL);p(22,10,C.DKSTL);p(16,4,C.DKSTL);p(16,16,C.DKSTL);
      }
      if(s===2){
        // Fire: full spin, motion arcs
        for(let a=0;a<8;a++){
          const ang=a*Math.PI/4;
          for(let r=3;r<=7;r++){
            const bx=16+Math.round(Math.cos(ang)*r);
            const by=10+Math.round(Math.sin(ang)*r);
            if(bx>=0&&bx<32&&by>=0&&by<32)p(bx,by,r%2?C.LTSTL:C.STEEL);
          }
        }
        // Sparks flying off
        p(7,6,C.SPARK);p(25,8,C.SPARK);p(8,14,C.SPARK);p(24,12,C.SPARK);
        p(5,4,C.LTSPARK);p(27,15,C.LTSPARK);
      }
      if(s===3){
        // Cooldown: blades slowing, metal shavings
        p(9,11,C.RIVET);p(23,9,C.RIVET);p(11,7,C.DKSTL);
        mSteam(p,14,3,3);
      }
    },
    // 6: Railgun — Long sleek barrel with energy buildup
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,24,20,s===1?1:s===2?2:0);
      // Capacitor banks (sides)
      b(5,14,4,9,C.DKBRZ);b(6,14,2,8,C.BRONZE);b(6,14,2,1,C.TAN);
      b(23,14,4,9,C.DKBRZ);b(24,14,2,8,C.BRONZE);b(24,14,2,1,C.TAN);
      // Energy conduits to barrel
      b(9,17,3,1,C.DKBLU);b(20,17,3,1,C.DKBLU);
      if(s>=1){b(9,17,3,1,C.BLUE);b(20,17,3,1,C.BLUE);}
      // Main barrel - long and sleek
      b(8,12,18,4,C.DKSTL);b(9,12,16,3,C.STEEL);b(10,12,14,2,C.LTSTL);
      // Barrel extension (long)
      b(26,13,5,2,C.DKSTL);b(26,13,5,1,C.STEEL);
      // Barrel tip
      b(31,12,1,4,C.DKBRN);
      // Rail grooves along barrel
      b(10,12,16,1,C.DKSTL);b(10,15,16,1,C.DKSTL);
      // Barrel shroud
      b(8,11,4,6,C.DKBRZ);b(9,11,2,5,C.BRONZE);
      // Scope/sensor on top
      b(14,10,4,2,C.DKSTL);b(15,9,2,1,C.STEEL);
      p(15,9,s>=1?C.BLUE:C.DKBLU);
      // Rivets
      p(11,14,C.RIVET);p(18,14,C.RIVET);p(25,14,C.RIVET);
      if(s===1){
        // Charge: blue energy building along rails
        for(let i=0;i<12;i++){
          p(12+i,12,i%2?C.LTBLU:C.BLUE);
          p(12+i,15,i%2?C.BLUE:C.DKBLU);
        }
        p(15,9,C.LTBLU);
        // Capacitor glow
        p(7,16,C.BLUE);p(25,16,C.BLUE);
      }
      if(s===2){
        // Fire: beam discharge
        for(let i=0;i<12;i++){
          p(12+i,12,C.WBLU);p(12+i,15,C.WBLU);
          p(12+i,13,C.WHITE);p(12+i,14,C.LTBLU);
        }
        // Muzzle flash (blue)
        b(30,11,2,6,C.LTBLU);p(31,13,C.WHITE);p(31,14,C.WHITE);
        p(29,10,C.BLUE);p(29,17,C.BLUE);
        // Capacitor discharge
        p(7,15,C.LTBLU);p(7,17,C.LTBLU);p(25,15,C.LTBLU);p(25,17,C.LTBLU);
        p(15,9,C.WHITE);
      }
      if(s===3){
        // Cooldown: residual blue glow fading
        p(20,13,C.DKBLU);p(24,14,C.DKBLU);p(16,12,C.DKBLU);
        mSteam(p,28,10,4);
        p(7,16,C.DKBLU);p(25,16,C.DKBLU);
      }
    },
    // 7: Titan Cannon (Ultimate) — Massive multi-barrel artillery
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      mBase(p,b,24,26,s===1?1:s===2?2:0);
      // Massive base platform
      b(3,21,26,3,C.DKBRZ);b(4,21,24,2,C.BRONZE);b(5,21,22,1,C.TAN);
      // Side structural supports
      b(4,14,4,8,C.DKSTL);b(5,14,2,7,C.STEEL);
      b(24,14,4,8,C.DKSTL);b(25,14,2,7,C.STEEL);
      // Central turret housing - large
      b(8,10,16,12,C.DKSTL);b(9,10,14,11,C.STEEL);b(10,10,12,10,C.LTSTL);
      // Top armor
      b(8,9,16,2,C.DKBRZ);b(9,9,14,1,C.BRONZE);b(10,9,12,1,C.LTBRZ);
      // Triple barrel array
      const recoil=s===2?1:0;
      // Top barrel
      b(24,11+recoil,7,2,C.DKSTL);b(24,11+recoil,7,1,C.STEEL);
      // Middle barrel (main, largest)
      b(24,14+recoil,8,3,C.DKSTL);b(24,14+recoil,8,1,C.STEEL);b(25,15+recoil,6,1,C.LTSTL);
      // Bottom barrel
      b(24,18+recoil,7,2,C.DKSTL);b(24,18+recoil,7,1,C.STEEL);
      // Barrel reinforcing rings
      b(27,10+recoil,1,12,C.BRONZE);
      // Muzzle caps
      b(30,11+recoil,1,2,C.DKBRN);b(31,14+recoil,1,3,C.DKBRN);b(30,18+recoil,1,2,C.DKBRN);
      // Gear mechanism visible on side
      mGear(p,7,17,2,C.GEAR,6);
      mGear(p,25,17,2,C.GEAR,6);
      // Exhaust pipes (back/left side)
      b(3,11,3,2,C.DKSTL);b(3,11,3,1,C.STEEL);
      b(3,15,3,2,C.DKSTL);b(3,15,3,1,C.STEEL);
      // Rivets everywhere
      p(10,12,C.RIVET);p(15,12,C.RIVET);p(20,12,C.RIVET);
      p(10,18,C.RIVET);p(15,18,C.RIVET);p(20,18,C.RIVET);
      p(5,15,C.RIVET);p(27,15,C.RIVET);
      // Ammo feed
      b(8,19,5,3,C.DKBRZ);b(9,19,3,2,C.BRONZE);
      p(9,19,C.ORANGE);p(11,20,C.ORANGE);
      if(s===1){
        // Charge: barrels heating, energy building
        p(29,12,C.ORANGE);p(30,15,C.ORANGE);p(29,19,C.ORANGE);
        b(10,10,12,1,C.TAN);
        // Exhaust steam
        mSteam(p,2,10,4);mSteam(p,2,14,3);
        p(7,17,C.LTGEAR);p(25,17,C.LTGEAR);
      }
      if(s===2){
        // Fire: massive triple muzzle flash
        // Top barrel flash
        b(30,9,2,4,C.SPARK);p(31,10,C.WSPARK);p(30,8,C.FLAME);
        // Middle barrel flash (biggest)
        b(31,12,1,7,C.SPARK);p(31,14,C.WSPARK);p(31,15,C.WHITE);p(31,16,C.WSPARK);
        b(30,13,1,5,C.LTFLM);
        // Bottom barrel flash
        b(30,18,2,4,C.SPARK);p(31,19,C.WSPARK);p(30,22,C.FLAME);
        // Smoke clouds
        p(28,8,C.SMOKE);p(29,7,C.LTSMK);p(28,22,C.SMOKE);p(29,23,C.LTSMK);
        // Exhaust backblast
        b(1,10,2,3,C.SMOKE);b(1,14,2,3,C.SMOKE);
        p(0,11,C.LTSMK);p(0,15,C.LTSMK);
        // Recoil pistons visible
        b(5,16,2,1,C.WTSTL);b(26,16,2,1,C.WTSTL);
      }
      if(s===3){
        // Cooldown: heavy smoke, heat dissipation
        mSteam(p,29,8,6);mSteam(p,30,14,5);mSteam(p,29,18,6);
        mSteam(p,2,9,5);mSteam(p,2,13,4);
        p(28,11,C.DKSMK);p(28,15,C.DKSMK);p(28,19,C.DKSMK);
        // Gears cooling
        p(7,17,C.DKSTL);p(25,17,C.DKSTL);
      }
    },
  ];
  const cols=8,rows=4;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*T_CELL,row*T_CELL],row);
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (8×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:CanvasRenderingContext2D){
  const fns=[
    // 0: Wall — ricochet spark
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Spark traveling
        const size=[2,3,2][f],bob=[0,-1,1][f];
        for(let i=-size;i<=size;i++){
          p(cx+i,cy+bob,Math.abs(i)===size?C.DKORG:Math.abs(i)>0?C.ORANGE:C.SPARK);
        }
        p(cx,cy-1+bob,C.SPARK);p(cx,cy+1+bob,C.ORANGE);
        // Trail
        if(f>0){p(cx-3-f,cy,C.DKORG);p(cx-4-f,cy+1,C.DKBRN);}
      } else if(f===3){
        // Impact: spark burst
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.SPARK:C.ORANGE);
          p(cx+Math.round(Math.cos(a)*2),cy+Math.round(Math.sin(a)*2),C.WSPARK);
        }
        p(cx,cy,C.WHITE);
      } else if(f===4){
        // Fade
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKORG);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.ORANGE);
        }
        p(cx,cy,C.SPARK);
      } else {
        // Final fade
        p(cx,cy,C.DKORG);p(cx-2,cy-1,C.DKBRN);p(cx+2,cy+1,C.DKBRN);
      }
    },
    // 1: Turret — bullet tracer
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Bullet in flight
        const len=[4,5,4][f];
        b(cx-1,cy,len,1,C.LTSTL);b(cx,cy,len-1,1,C.WTSTL);
        p(cx+len-1,cy,C.SPARK);
        // Tracer trail
        for(let i=1;i<=3;i++)p(cx-1-i,cy,i===1?C.ORANGE:i===2?C.DKORG:C.DKBRN);
        if(f>0)p(cx-5,cy+1,C.SMOKE);
      } else if(f===3){
        // Hit spark
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.SPARK:C.ORANGE);
        }
        p(cx,cy,C.WSPARK);p(cx+1,cy,C.WHITE);
        b(cx-1,cy-1,2,2,C.SPARK);
      } else if(f===4){
        for(let i=0;i<4;i++){const a=i*Math.PI/2;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.DKORG);}
        p(cx,cy,C.ORANGE);
      } else {
        p(cx,cy,C.DKORG);p(cx-1,cy,C.DKBRN);p(cx+1,cy,C.DKBRN);
      }
    },
    // 2: Flamethrower — flame ball
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Fireball growing
        const r=[2,3,3][f];
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r){
            const d=Math.sqrt(x*x+y*y);
            p(cx+x,cy+y,d<1?C.WFLM:d<r*0.5?C.LTFLM:d<r*0.8?C.FLAME:C.DKFLM);
          }
        }
        p(cx,cy-r,C.SPARK);
        // Embers trail
        if(f>0){p(cx-r-1,cy+1,C.DKFLM);p(cx-r-2,cy,C.DKORG);}
        if(f===2){p(cx+1,cy-r-1,C.FLAME);p(cx-1,cy-r-1,C.ORANGE);}
      } else if(f===3){
        // Fire burst
        for(let i=0;i<10;i++){
          const a=i*Math.PI/5,r=4+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.FLAME:C.LTFLM);
          p(cx+Math.round(Math.cos(a)*(r-2)),cy+Math.round(Math.sin(a)*(r-2)),C.WFLM);
        }
        b(cx-1,cy-1,2,2,C.WHITE);p(cx,cy,C.WSPARK);
      } else if(f===4){
        // Expanding fire
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,r=5;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),C.DKFLM);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.FLAME);
        }
        p(cx,cy,C.ORANGE);p(cx-1,cy+1,C.DKORG);
      } else {
        // Smoke remains
        for(let i=0;i<5;i++){p(cx-2+i,cy+i%2,C.SMOKE);p(cx-1+i,cy-1+i%2,C.DKSMK);}
        p(cx,cy,C.DKFLM);
      }
    },
    // 3: Tesla — lightning arc
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Lightning bolt traveling
        const zigzag=[[0,0],[1,-1],[2,0],[3,-1],[4,0],[5,1],[6,0],[7,-1],[8,0]];
        const len=[5,7,9][f];
        for(let i=0;i<Math.min(len,zigzag.length);i++){
          const [dx,dy]=zigzag[i];
          p(cx-4+dx,cy+dy,i<2?C.WBLU:i<5?C.LTBLU:C.BLUE);
        }
        // Side sparks
        if(f>0){p(cx-2,cy-2,C.SPARK);p(cx+1,cy+2,C.SPARK);}
        if(f===2){p(cx-3,cy+2,C.LTBLU);p(cx+3,cy-2,C.LTBLU);}
      } else if(f===3){
        // Electrical pop
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          const r=3+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.LTBLU:C.WBLU);
          if(i%2===0)p(cx+Math.round(Math.cos(a)*(r+2)),cy+Math.round(Math.sin(a)*(r+2)),C.SPARK);
        }
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.WBLU);
      } else if(f===4){
        // Dissipating arcs
        for(let i=0;i<6;i++){
          const a=i*Math.PI/3;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKBLU);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.BLUE);
        }
        p(cx,cy,C.LTBLU);
      } else {
        // Final fade
        p(cx-1,cy,C.DKBLU);p(cx+1,cy,C.DKBLU);p(cx,cy-1,C.DKBLU);p(cx,cy+1,C.DKBLU);
        p(cx,cy,C.BLUE);
      }
    },
    // 4: Mortar — falling shell
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Shell in flight (angled down)
        const drop=[0,1,3][f];
        b(cx-1,cy-3+drop,2,5,C.DKSTL);b(cx-1,cy-3+drop,1,4,C.STEEL);
        p(cx-1,cy-3+drop,C.LTSTL);p(cx,cy-3+drop,C.LTSTL);
        // Nose cone
        p(cx,cy+2+drop,C.DKBRN);p(cx-1,cy+2+drop,C.DKBRN);
        // Fin stabilizers
        p(cx-2,cy-3+drop,C.DKSTL);p(cx+1,cy-3+drop,C.DKSTL);
        // Tracer
        if(f>0){p(cx,cy-4+drop,C.SMOKE);p(cx-1,cy-5+drop,C.LTSMK);}
      } else if(f===3){
        // Explosion cloud
        for(let y=-3;y<=3;y++)for(let x=-4;x<=4;x++){
          const d=Math.sqrt(x*x+y*y);
          if(d<=4){
            p(cx+x,cy+y,d<1?C.WHITE:d<2?C.WSPARK:d<3?C.FLAME:C.DKFLM);
          }
        }
        // Debris
        p(cx-5,cy-2,C.DKSTL);p(cx+5,cy-1,C.DKSTL);p(cx-3,cy-4,C.ORANGE);p(cx+4,cy-3,C.ORANGE);
      } else if(f===4){
        // Expanding explosion
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6,r=5+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.FLAME:i%3===1?C.DKFLM:C.SMOKE);
        }
        b(cx-2,cy-2,4,4,C.ORANGE);b(cx-1,cy-1,2,2,C.SPARK);
        p(cx,cy,C.WSPARK);
      } else {
        // Smoke cloud remains
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,r=3+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.SMOKE:C.DKSMK);
        }
        p(cx,cy,C.SMOKE);p(cx+1,cy-1,C.LTSMK);
      }
    },
    // 5: Shredder — spinning blade disc
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Spinning disc
        const phase=f*30;
        for(let i=0;i<6;i++){
          const a=(i*60+phase)*Math.PI/180;
          for(let r=1;r<=3;r++){
            p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r===3?C.WTSTL:r===2?C.LTSTL:C.STEEL);
          }
        }
        // Center
        p(cx,cy,C.DKSTL);p(cx-1,cy,C.STEEL);p(cx+1,cy,C.STEEL);
        // Motion blur
        if(f>0)for(let i=0;i<4;i++){const a=i*Math.PI/2;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.DKSTL);}
      } else if(f===3){
        // Shatter impact
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,r=4+i%2;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.LTSTL:C.STEEL);
        }
        p(cx,cy,C.SPARK);p(cx-1,cy-1,C.WTSTL);p(cx+1,cy+1,C.WTSTL);
        // Metal fragments
        p(cx-5,cy-3,C.DKSTL);p(cx+5,cy-2,C.DKSTL);p(cx-4,cy+4,C.RIVET);p(cx+4,cy+3,C.RIVET);
      } else if(f===4){
        // Fragments scattering
        const frags=[[3,3],[12,4],[5,12],[11,11],[2,7],[14,8],[7,2],[9,14]];
        frags.forEach(([x,y],i)=>p(x,y,i%2?C.STEEL:C.DKSTL));
        p(cx,cy,C.SPARK);
      } else {
        // Final pieces
        p(cx-3,cy-2,C.DKSTL);p(cx+3,cy+1,C.DKSTL);p(cx,cy,C.RIVET);
        p(cx-1,cy+3,C.DKSTL);p(cx+2,cy-3,C.DKSTL);
      }
    },
    // 6: Railgun — blue energy beam
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Energy projectile
        const len=[4,6,8][f];
        b(cx-Math.floor(len/2),cy,len,1,C.LTBLU);
        b(cx-Math.floor(len/2)+1,cy,len-2,1,C.WBLU);
        p(cx+Math.floor(len/2)-1,cy,C.WHITE);
        // Glow halo
        for(let i=0;i<len;i++){
          p(cx-Math.floor(len/2)+i,cy-1,C.DKBLU);
          p(cx-Math.floor(len/2)+i,cy+1,C.DKBLU);
        }
        // Core bright
        p(cx,cy,C.WHITE);
        if(f>0){p(cx-Math.floor(len/2)-1,cy,C.DKBLU);p(cx-Math.floor(len/2)-2,cy,C.DKBLU);}
      } else if(f===3){
        // Blue flash impact
        for(let r=4;r>0;r--)for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>3?C.DKBLU:r>2?C.BLUE:r>1?C.LTBLU:C.WHITE);
        }
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.WBLU);
      } else if(f===4){
        // Dissipating flash
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKBLU);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.BLUE);
        }
        p(cx,cy,C.LTBLU);
      } else {
        p(cx,cy,C.DKBLU);p(cx-2,cy,C.DKBLU);p(cx+2,cy,C.DKBLU);
        p(cx,cy-1,C.DKBLU);p(cx,cy+1,C.DKBLU);
      }
    },
    // 7: Titan — massive shell / huge explosion
    (c:any,o:number[],f:number)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Large artillery shell
        const drop=[0,1,2][f];
        b(cx-2,cy-4+drop,4,7,C.DKSTL);b(cx-1,cy-4+drop,2,6,C.STEEL);
        p(cx-1,cy-4+drop,C.LTSTL);p(cx,cy-4+drop,C.LTSTL);
        // Nose
        p(cx-1,cy+3+drop,C.DKBRN);p(cx,cy+3+drop,C.DKBRN);p(cx,cy+4+drop,C.DKBRN);
        // Driving bands
        b(cx-2,cy-2+drop,4,1,C.BRONZE);b(cx-2,cy+drop,4,1,C.BRONZE);
        // Fin
        p(cx-3,cy-4+drop,C.DKSTL);p(cx+2,cy-4+drop,C.DKSTL);
        p(cx-3,cy-3+drop,C.DKSTL);p(cx+2,cy-3+drop,C.DKSTL);
        // Trail smoke
        if(f>0){mSteam(p,cx,cy-5+drop,3);}
      } else if(f===3){
        // Huge explosion
        for(let y=-6;y<=6;y++)for(let x=-6;x<=6;x++){
          const d=Math.sqrt(x*x+y*y);
          if(d<=6){
            p(cx+x,cy+y,d<1.5?C.WHITE:d<2.5?C.WSPARK:d<3.5?C.LTFLM:d<4.5?C.FLAME:d<5.5?C.DKFLM:C.DKORG);
          }
        }
        // Debris ring
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*7),i%2?C.DKSTL:C.SMOKE);
        }
      } else if(f===4){
        // Expanding fireball
        for(let y=-7;y<=7;y++)for(let x=-7;x<=7;x++){
          const d=Math.sqrt(x*x+y*y);
          if(d<=7&&d>3){
            p(cx+x,cy+y,d<4.5?C.FLAME:d<5.5?C.DKFLM:C.SMOKE);
          }
        }
        b(cx-2,cy-2,4,4,C.ORANGE);p(cx,cy,C.SPARK);
        // Shrapnel
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*7),cy+Math.round(Math.sin(a)*7),C.DKSTL);
        }
      } else {
        // Massive smoke cloud
        for(let y=-5;y<=5;y++)for(let x=-5;x<=5;x++){
          const d=Math.sqrt(x*x+y*y);
          if(d<=5){
            p(cx+x,cy+y,d<2?C.LTSMK:d<3.5?C.SMOKE:C.DKSMK);
          }
        }
        p(cx,cy-3,C.DKFLM);p(cx+2,cy-2,C.DKORG);
      }
    },
  ];
  const cols=8,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx:CanvasRenderingContext2D){
  // Engineer hero: stocky figure with wrench, goggles, bronze armor, utility belt
  function drawChar(c:any,o:number[],dir:number,opts:any={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,stomp=false,grenade=false,tar=false,grapple=false,carpet=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Carpet bomb ground effect
    if(carpet){
      for(let i=0;i<6;i++){
        const bx_=4+i*4+Math.round(Math.sin(i)*2),by_=52+i%3;
        b(bx_,by_,3,2,C.FLAME);p(bx_+1,by_,C.LTFLM);p(bx_,by_+2,C.DKFLM);
        p(bx_+2,by_-1,C.SMOKE);
      }
    }

    const lean=stomp?0:atk&&atkFrame>0?1:0;
    const headY=stomp?9:8;
    const torY=headY+8;
    const legY=torY+10;
    const bx_=cx+lean;

    // GOGGLES + HELMET (head)
    if(dir===0){
      // Down - front face
      // Helmet
      b(bx_-4,headY,8,3,C.DKBRZ);b(bx_-3,headY,6,2,C.BRONZE);b(bx_-2,headY,4,1,C.LTBRZ);
      // Forehead plate
      b(bx_-3,headY-1,6,1,C.BRONZE);b(bx_-2,headY-2,4,1,C.DKBRZ);
      // Face
      b(bx_-3,headY+3,6,3,C.DKTAN);b(bx_-2,headY+3,4,3,C.TAN);
      // Goggles
      b(bx_-3,headY+2,3,2,C.DKSTL);b(bx_+1,headY+2,3,2,C.DKSTL);
      // Goggle lenses
      p(bx_-2,headY+3,C.ORANGE);p(bx_-1,headY+3,C.LTORG);
      p(bx_+1,headY+3,C.ORANGE);p(bx_+2,headY+3,C.LTORG);
      // Goggle strap
      p(bx_-4,headY+2,C.DKBRN);p(bx_+4,headY+2,C.DKBRN);
      // Chin/mouth
      p(bx_-1,headY+5,C.DKTAN);p(bx_,headY+5,C.MDBRN);p(bx_+1,headY+5,C.DKTAN);
      // Helmet rivets
      p(bx_-3,headY+1,C.RIVET);p(bx_+3,headY+1,C.RIVET);
    } else if(dir===1){
      // Side profile
      b(bx_-3,headY,6,3,C.DKBRZ);b(bx_-2,headY,4,2,C.BRONZE);b(bx_-1,headY,2,1,C.LTBRZ);
      b(bx_-2,headY-1,4,1,C.BRONZE);b(bx_-1,headY-2,2,1,C.DKBRZ);
      b(bx_-2,headY+3,5,3,C.DKTAN);b(bx_-1,headY+3,3,3,C.TAN);
      // Goggle (one side visible)
      b(bx_+1,headY+2,3,2,C.DKSTL);
      p(bx_+2,headY+3,C.ORANGE);p(bx_+3,headY+3,C.LTORG);
      p(bx_+4,headY+2,C.DKBRN);
      // Chin
      p(bx_+2,headY+5,C.DKTAN);
      p(bx_-2,headY+1,C.RIVET);
    } else {
      // Back of head
      b(bx_-4,headY,8,5,C.DKBRZ);b(bx_-3,headY,6,4,C.BRONZE);b(bx_-2,headY,4,3,C.LTBRZ);
      b(bx_-3,headY-1,6,1,C.BRONZE);b(bx_-2,headY-2,4,1,C.DKBRZ);
      // Back of helmet details
      p(bx_-1,headY+1,C.RIVET);p(bx_+1,headY+1,C.RIVET);
      p(bx_,headY+2,C.DKBRN);
      // Goggle strap (back)
      b(bx_-4,headY+2,8,1,C.DKBRN);
      // Neck
      b(bx_-2,headY+5,4,1,C.DKTAN);
    }

    // TORSO — Armored chestplate with rivets
    b(bx_-4,torY,8,9,C.DKBRZ);b(bx_-3,torY,6,8,C.BRONZE);b(bx_-2,torY,4,7,C.LTBRZ);
    // Shoulder plates
    b(bx_-5,torY,2,3,C.DKSTL);b(bx_-5,torY,1,2,C.STEEL);
    b(bx_+4,torY,2,3,C.DKSTL);b(bx_+5,torY,1,2,C.STEEL);
    // Chest rivets
    if(dir===0){
      p(bx_-2,torY+1,C.RIVET);p(bx_+2,torY+1,C.RIVET);
      p(bx_-2,torY+4,C.RIVET);p(bx_+2,torY+4,C.RIVET);
      // Chest plate seam
      b(bx_,torY+1,1,5,C.DKBRZ);
    } else if(dir===1){
      p(bx_+1,torY+1,C.RIVET);p(bx_+1,torY+4,C.RIVET);
      b(bx_,torY+1,1,5,C.DKBRZ);
    } else {
      p(bx_-1,torY+2,C.RIVET);p(bx_+1,torY+2,C.RIVET);
      // Back exhaust pipe
      b(bx_-1,torY+1,3,2,C.DKSTL);p(bx_,torY,C.STEEL);
    }

    // UTILITY BELT
    b(bx_-4,torY+8,8,2,C.DKBRN);b(bx_-3,torY+8,6,1,C.BRWN);
    // Belt pouches
    p(bx_-3,torY+8,C.MDBRN);p(bx_+3,torY+8,C.MDBRN);
    // Belt buckle (gear shaped)
    p(bx_,torY+8,C.GEAR);p(bx_,torY+9,C.DKGEAR);

    // ARMS & WRENCH
    if(atk){
      if(dir===0){
        // Wrench swing down
        if(atkFrame===0){
          b(bx_+4,torY-1,2,4,C.DKBRZ);b(bx_+4,torY-1,1,3,C.BRONZE);
          // Wrench raised
          for(let i=0;i<8;i++)p(bx_+6,torY-2-i,i<2?C.STEEL:i<5?C.DKSTL:C.LTSTL);
          p(bx_+5,torY-9,C.STEEL);p(bx_+7,torY-9,C.STEEL);// wrench head
          b(bx_+5,torY-10,3,1,C.LTSTL);
        } else {
          b(bx_+4,torY+2,2,4,C.DKBRZ);b(bx_+4,torY+2,1,3,C.BRONZE);
          // Wrench swung down
          for(let i=0;i<8;i++){
            const wy=torY+7+i;
            if(wy<63)p(bx_+6,wy,i<2?C.STEEL:i<5?C.DKSTL:C.LTSTL);
          }
          if(torY+14<63){p(bx_+5,torY+14,C.STEEL);p(bx_+7,torY+14,C.STEEL);b(bx_+5,torY+15,3,1,C.LTSTL);}
          // Impact sparks
          p(bx_+8,torY+6,C.SPARK);p(bx_+7,torY+5,C.ORANGE);
        }
        b(bx_-6,torY+2,2,4,C.DKBRZ);
      } else if(dir===1){
        if(atkFrame===0){
          b(bx_+4,torY,3,3,C.DKBRZ);b(bx_+4,torY,2,2,C.BRONZE);
          for(let i=0;i<7;i++)p(bx_+7,torY-1-i,i<2?C.STEEL:i<4?C.DKSTL:C.LTSTL);
          p(bx_+6,torY-7,C.STEEL);p(bx_+8,torY-7,C.STEEL);b(bx_+6,torY-8,3,1,C.LTSTL);
        } else {
          b(bx_+4,torY+1,3,3,C.DKBRZ);b(bx_+4,torY+1,2,2,C.BRONZE);
          for(let i=0;i<7;i++){const wy=torY+5+i;if(wy<63)p(bx_+7,wy,i<2?C.STEEL:i<4?C.DKSTL:C.LTSTL);}
          if(torY+11<63){p(bx_+6,torY+11,C.STEEL);p(bx_+8,torY+11,C.STEEL);}
          p(bx_+8,torY+4,C.SPARK);p(bx_+9,torY+5,C.ORANGE);
        }
      } else {
        if(atkFrame===0){
          b(bx_+4,torY-1,2,4,C.DKBRZ);
          for(let i=0;i<6;i++)p(bx_+6,torY-2-i,i<2?C.STEEL:C.DKSTL);
          b(bx_+5,torY-8,3,1,C.LTSTL);
        } else {
          b(bx_+4,torY+3,2,4,C.DKBRZ);
          for(let i=0;i<6;i++){const wy=torY+8+i;if(wy<63)p(bx_+6,wy,i<2?C.STEEL:C.DKSTL);}
        }
        b(bx_-6,torY+2,2,4,C.DKBRZ);
      }
    } else {
      // Idle/walk arms
      const aY=torY+1;
      if(dir===0){
        b(bx_-6,aY+armSwing,2,5,C.DKBRZ);p(bx_-6,aY+armSwing,C.BRONZE);
        b(bx_+4,aY-armSwing,2,5,C.DKBRZ);p(bx_+5,aY-armSwing,C.BRONZE);
        // Wrench at side
        for(let i=0;i<5;i++)p(bx_+6,aY-armSwing+2+i,i===0?C.LTSTL:i<3?C.STEEL:C.DKSTL);
      } else if(dir===1){
        b(bx_+4,aY-armSwing,2,5,C.DKBRZ);p(bx_+5,aY-armSwing,C.BRONZE);
        for(let i=0;i<5;i++)p(bx_+6,aY-armSwing+2+i,i===0?C.LTSTL:i<3?C.STEEL:C.DKSTL);
      } else {
        b(bx_-6,aY+armSwing,2,5,C.DKBRZ);p(bx_-6,aY+armSwing,C.BRONZE);
        b(bx_+4,aY-armSwing,2,5,C.DKBRZ);p(bx_+5,aY-armSwing,C.BRONZE);
      }
      // Gloves
      if(dir!==2){
        p(bx_-6,aY+armSwing+4,C.DKBRN);p(bx_-5,aY+armSwing+4,C.BRWN);
        p(bx_+4,aY-armSwing+4,C.DKBRN);p(bx_+5,aY-armSwing+4,C.BRWN);
      }
    }

    // LEGS — Heavy boots, stocky build
    const lh=10;
    // Pants
    b(bx_-3+lOff,legY,3,lh,C.DKBRN);b(bx_-2+lOff,legY,1,lh-1,C.BRWN);
    b(bx_+1+rOff,legY,3,lh,C.DKBRN);b(bx_+2+rOff,legY,1,lh-1,C.BRWN);
    // Knee pads (armored)
    b(bx_-3+lOff,legY+Math.floor(lh*0.4),3,2,C.DKSTL);p(bx_-2+lOff,legY+Math.floor(lh*0.4),C.STEEL);
    b(bx_+1+rOff,legY+Math.floor(lh*0.4),3,2,C.DKSTL);p(bx_+2+rOff,legY+Math.floor(lh*0.4),C.STEEL);
    // Heavy boots
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-4+lOff,lfy,5,2,C.DKBRZ);b(bx_-4+lOff,lfy,4,1,C.BRONZE);p(bx_-4+lOff,lfy,C.LTBRZ);
    b(bx_+rOff,rfy,5,2,C.DKBRZ);b(bx_+rOff,rfy,4,1,C.BRONZE);p(bx_+rOff,rfy,C.LTBRZ);
    // Boot rivets
    p(bx_-3+lOff,lfy+1,C.RIVET);p(bx_+1+rOff,rfy+1,C.RIVET);

    // Stomp effect (heavy footfall)
    if(stomp){
      b(bx_-6,lfy+2,14,1,C.DKBRN);
      for(let i=-5;i<=5;i++){
        if(Math.abs(i)%2===0&&lfy+3<63)p(bx_+i,lfy+3,C.SMOKE);
      }
    }

    // hurt flash
    if(hurt){
      p(bx_+5,headY+1,C.RED);p(bx_+6,headY,C.LTRED);p(bx_+7,headY+1,C.RED);p(bx_+6,headY+2,C.LTRED);
    }

    // Grenade throw effect
    if(grenade){
      // Grenade in air
      const gx=bx_+8,gy=headY-4;
      b(gx,gy,2,3,C.DKSTL);b(gx,gy,2,1,C.STEEL);p(gx,gy-1,C.DKBRN);
      // Arc trail
      p(gx-2,gy+2,C.SMOKE);p(gx-3,gy+3,C.LTSMK);p(gx-4,gy+5,C.SMOKE);
    }

    // Tar bomb deploy
    if(tar){
      // Tar puddle on ground
      b(bx_-5,lfy+2,12,2,C.DKBRN);b(bx_-4,lfy+2,10,1,C.BRWN);
      b(bx_-3,lfy+1,8,1,C.DKBRN);
      // Tar drips
      p(bx_-4,lfy,C.DKBRN);p(bx_+5,lfy-1,C.DKBRN);
    }

    // Grapple launch effect
    if(grapple){
      // Grapple hook flying out
      const ghx=bx_+10;
      for(let i=0;i<8;i++){
        p(bx_+3+i,torY-i,i<2?C.BRONZE:C.DKSTL);
      }
      // Hook head
      p(ghx,torY-7,C.LTSTL);p(ghx+1,torY-8,C.STEEL);p(ghx-1,torY-8,C.STEEL);
      // Chain
      for(let i=0;i<6;i++)p(bx_+3+i,torY-i+1,i%2?C.DKSTL:C.RIVET);
    }
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities grenade1,grenade2,tar1,tar2,grapple1,grapple2,carpet1,carpet2
  // R4: hurt,death1,death2,portrait,x,x,x,x

  const frames:any[]=[];
  // Per-direction rows (heavy stomping gait)
  for(let dir=0;dir<3;dir++){
    frames.push([
      {dir,opts:{}},
      {dir,opts:{armSwing:1}},
      {dir,opts:{lOff:1,rOff:-1,armSwing:1,stomp:true}},
      {dir,opts:{lOff:-1,rOff:1,armSwing:-1}},
      {dir,opts:{lOff:2,rOff:0,armSwing:1,stomp:true}},
      {dir,opts:{lOff:0,rOff:2,armSwing:-1}},
      {dir,opts:{atk:true,atkFrame:0,lOff:1}},
      {dir,opts:{atk:true,atkFrame:1,lOff:2,rOff:-1}},
    ]);
  }
  // Abilities (Row 3)
  frames.push([
    {dir:1,opts:{grenade:true,atk:true,atkFrame:0,lOff:1}},
    {dir:1,opts:{grenade:true,atk:true,atkFrame:1,lOff:2}},
    {dir:0,opts:{tar:true,lOff:-1,rOff:-1}},
    {dir:0,opts:{tar:true,lOff:1,rOff:1,armSwing:1}},
    {dir:1,opts:{grapple:true,lOff:1}},
    {dir:1,opts:{grapple:true,lOff:2,rOff:1}},
    {dir:0,opts:{carpet:true}},
    {dir:0,opts:{carpet:true,lOff:1,rOff:-1,armSwing:1}},
  ]);
  // States (Row 4)
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
        // Engineer collapsed sideways, wrench fallen beside
        // Body on ground
        b(6,32,14,5,C.DKBRZ);b(7,32,12,4,C.BRONZE);b(8,33,10,2,C.LTBRZ);
        // Helmet fallen
        b(4,30,5,3,C.DKBRZ);b(5,30,3,2,C.BRONZE);p(5,30,C.LTBRZ);
        // Goggle lens (cracked)
        p(7,31,C.ORANGE);p(8,31,C.DKORG);
        // Legs
        b(18,34,8,3,C.DKBRN);b(19,34,6,2,C.BRWN);
        // Boots
        b(24,33,4,3,C.DKBRZ);b(25,33,2,2,C.BRONZE);
        // Wrench on ground
        b(2,38,8,1,C.DKSTL);b(3,38,6,1,C.STEEL);p(1,38,C.LTSTL);p(0,37,C.STEEL);p(0,39,C.STEEL);
        // Utility belt debris
        p(12,37,C.DKBRN);p(14,37,C.GEAR);p(16,38,C.MDBRN);
        // Ground shadow
        b(5,37,18,2,C.DKBRN);
        for(let x=4;x<24;x++){if(x%3!==0)p(x,39,C.DKBRN);if(x%4===0)p(x,40,C.DKBRN);}
        // Smoke/steam from exhaust
        p(10,28,C.SMOKE);p(12,27,C.LTSMK);p(8,29,C.SMOKE);
      } else if(frame.opts.custom==='death2'){
        const{p}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Mostly dissolved, scattered parts
        for(let x=6;x<26;x++){if(x%2===0)p(x,42,C.DKBRN);if(x%3===0)p(x,41,C.DKBRZ);}
        // Scattered gear pieces
        p(8,38,C.GEAR);p(14,36,C.DKGEAR);p(20,39,C.RIVET);
        // Wrench fragment
        p(5,40,C.STEEL);p(6,40,C.DKSTL);
        // Goggle lens
        p(22,37,C.ORANGE);p(23,38,C.DKORG);
        // Scattered debris
        [[10,34],[14,30],[18,36],[12,28],[20,32],[8,35],[16,26],[22,30],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,33],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.ORANGE:i%4===0?C.BRONZE:i%3===0?C.DKBRZ:i%2===0?C.DKSTL:C.DKBRN);
        });
        // Smoke wisps
        p(12,34,C.SMOKE);p(18,33,C.LTSMK);p(14,32,C.SMOKE);
      } else if(frame.opts.custom==='portrait'){
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Portrait frame
        b(2,2,28,60,C.DKBRN);b(3,3,26,58,C.BRWN);
        // Background
        b(4,4,24,56,C.DKBRN);
        // Helmet
        b(7,6,18,6,C.DKBRZ);b(8,6,16,5,C.BRONZE);b(9,6,14,3,C.LTBRZ);
        b(8,5,16,2,C.BRONZE);b(10,4,12,1,C.DKBRZ);b(11,3,10,1,C.DKBRZ);
        // Helmet ridge
        b(9,6,14,1,C.TAN);
        // Helmet side drape
        p(25,8,C.DKBRZ);p(26,9,C.BRWN);p(27,10,C.BRWN);
        // Face
        b(9,12,14,8,C.TAN);b(10,12,12,7,C.LTTAN);
        // Goggles
        b(9,11,6,3,C.DKSTL);b(17,11,6,3,C.DKSTL);
        b(10,12,4,2,C.DKSTL);b(18,12,4,2,C.DKSTL);
        // Lenses
        b(10,12,3,2,C.ORANGE);b(11,12,1,1,C.LTORG);p(11,12,C.WHITE);
        b(19,12,3,2,C.ORANGE);b(20,12,1,1,C.LTORG);p(20,12,C.WHITE);
        // Goggle bridge
        b(15,12,2,1,C.DKSTL);
        // Goggle strap
        p(8,12,C.DKBRN);p(23,12,C.DKBRN);p(7,13,C.DKBRN);p(24,13,C.DKBRN);
        // Mouth area
        b(12,17,8,2,C.DKTAN);b(13,17,6,1,C.MDBRN);
        // Thick jaw/chin
        b(10,19,12,1,C.DKTAN);
        // Armor chestplate
        b(7,21,18,14,C.DKBRZ);b(8,21,16,13,C.BRONZE);b(9,22,14,11,C.LTBRZ);
        // Chest plate seam
        b(15,22,2,10,C.DKBRZ);
        // Rivets on chest
        p(10,24,C.RIVET);p(12,27,C.RIVET);p(19,24,C.RIVET);p(17,27,C.RIVET);
        // Shoulder plates
        b(5,21,3,5,C.DKSTL);b(6,21,1,4,C.STEEL);
        b(24,21,3,5,C.DKSTL);b(25,21,1,4,C.STEEL);
        // Utility belt
        b(8,34,16,2,C.DKBRN);b(9,34,14,1,C.BRWN);
        p(12,34,C.MDBRN);p(19,34,C.MDBRN);p(16,34,C.GEAR);
        // Wrench (held at side)
        b(25,28,1,8,C.DKSTL);b(25,28,1,6,C.STEEL);p(25,27,C.LTSTL);p(24,27,C.STEEL);p(26,27,C.STEEL);
        // Frame border
        b(2,2,28,1,C.BRONZE);b(2,61,28,1,C.BRONZE);b(2,2,1,60,C.BRONZE);b(29,2,1,60,C.BRONZE);
        // Corner rivets
        p(3,3,C.RIVET);p(28,3,C.RIVET);p(3,60,C.RIVET);p(28,60,C.RIVET);
        // Corner gear accents
        p(4,4,C.GEAR);p(27,4,C.GEAR);p(4,59,C.GEAR);p(27,59,C.GEAR);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Wall','Turret','Flamethrower','Tesla','Mortar','Shredder','Railgun','Titan Cannon'];
const T_STATES=['Idle','Charge','Fire','Cooldown'];
const P_NAMES=['Ricochet','Bullet','Flame','Lightning','Shell','Blade','Rail Beam','Titan Shell'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Grenade 1','Grenade 2','Tar 1','Tar 2','Grapple 1','Grapple 2','Carpet 1','Carpet 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=8*T_CELL;tc.height=4*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+8*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#1a1008';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#cc8833';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#332211';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#eebb66';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=8*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+8*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#1a1008';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#cc8833';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#332211';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#eebb66';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#1a1008';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#cc8833';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#332211';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#eebb66';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref:any,name:string)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'mechanical_towers_animated.png',
      info:{sz:'512×256',cell:'64×64',loader:"this.load.spritesheet('mech_towers','mechanical_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'8 cols (towers) × 4 rows (idle, charge, fire, cooldown)'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'mechanical_projectiles_animated.png',
      info:{sz:'256×192',cell:'32×32',loader:"this.load.spritesheet('mech_proj','mechanical_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'8 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Engineer',ref:hRef,pvRef:hPv,dl:'engineer_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('engineer','engineer_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#1a1008',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.ORANGE,margin:0,fontSize:15}}>MECHANICAL FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.ORANGE,color:'#fff',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#332211':'#111',color:tab===t.id?C.ORANGE:'#886644',border:`1px solid ${tab===t.id?'#cc8833':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #332211',margin:'0 2px'}}/>
        {['preview','actual'].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#221108':'#111',color:view===v?C.TAN:'#665533',border:`1px solid ${view===v?'#553311':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?8*P_CELL*3:8*T_CELL*2,border:'1px solid #332211'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#886644',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:C.BRONZE}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:C.BRONZE}}>Phaser:</b> <code style={{color:C.TAN}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:C.BRONZE}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
