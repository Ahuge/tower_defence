import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
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

// Organic hive base with hex cell texture
function aBase(p:any,b:any,topY:number,w:number,glow:number){
  const cx=16;
  // Mound shape
  for(let i=0;i<10;i++){
    const cw=w-6+Math.floor(i*0.8),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.CHLT:i<5?C.CHIT:i<8?C.DKOLV:C.DKBIO);
  }
  b(cx-Math.floor((w-6)/2),topY,w-6,1,C.OLIV);
  // Hexagonal cell pattern
  const hx=[[cx-4,topY+2],[cx-2,topY+3],[cx,topY+2],[cx+2,topY+3],[cx-3,topY+5],[cx-1,topY+5],[cx+1,topY+5]];
  hx.forEach(([x,y])=>{p(x,y,glow>1?C.LIME:C.NGRN);p(x+1,y,glow>1?C.BGRN:C.DGRN);});
  // Acid drips
  if(glow>0){p(cx-3,topY+7,C.LIME);p(cx-3,topY+8,C.NGRN);p(cx+2,topY+8,C.SLIME);}
  if(glow>1){p(cx-4,topY+9,C.DGRN);p(cx+3,topY+7,C.LIME);p(cx+3,topY+8,C.NGRN);p(cx+3,topY+9,C.DGRN);}
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.DKBIO);
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

// ===== TOWERS (8×4 at 64×64) =====
function drawTowers(ctx:any){
  const fns=[
    // 1. Spitter — small bug mouth spitting acid
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,22,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Bug body
      b(13,10,6,8,C.CHIT);b(14,10,4,7,C.CHLT);b(14,9,4,1,C.OLIV);
      // Head with mandibles
      b(14,6,4,4,C.CHLT);b(15,5,2,1,C.OLIV);
      // Eyes
      p(14,7,fl?C.ACID:C.LIME);p(17,7,fl?C.ACID:C.LIME);
      // Mandibles
      p(13,6,br?C.LIME:C.CHLT);p(18,6,br?C.LIME:C.CHLT);
      p(12,5,C.CHIT);p(19,5,C.CHIT);
      // Legs
      p(12,12,C.CHIT);p(11,13,C.DKOLV);p(19,12,C.CHIT);p(20,13,C.DKOLV);
      p(12,15,C.CHIT);p(11,16,C.DKOLV);p(19,15,C.CHIT);p(20,16,C.DKOLV);
      // Acid spit (fire state)
      if(s===2){
        p(15,4,C.ACID);p(16,3,C.LIME);p(15,2,C.BGRN);p(16,1,C.NGRN);
        p(14,3,C.YGRN);p(17,2,C.YGRN);
      }
      if(s===1){p(15,5,C.LIME);p(16,4,C.NGRN);}
      // Bioluminescent spots
      p(14,12,br?C.LIME:C.NGRN);p(17,14,br?C.LIME:C.NGRN);
      if(s===3){p(15,7,C.DGRN);p(16,8,C.DGRN);}
    },
    // 2. Stinger — scorpion tail strikes down
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,23,22,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Scorpion body
      b(12,14,8,6,C.CHIT);b(13,14,6,5,C.CHLT);
      // Pincers
      b(9,15,3,2,C.CHIT);b(20,15,3,2,C.CHIT);
      p(8,15,C.OLIV);p(22,15,C.OLIV);
      p(8,14,C.CHLT);p(22,14,C.CHLT);
      // Tail - curving up and over
      const tailFire=fl;
      p(16,13,C.CHIT);p(17,12,C.CHIT);p(18,11,C.CHLT);p(19,10,C.CHLT);
      p(20,9,C.CHIT);p(20,8,C.CHLT);p(19,7,C.OLIV);p(18,6,C.OLIV);
      p(17,5,C.CHLT);p(16,4,C.CHIT);
      // Stinger tip
      if(tailFire){
        // Striking down
        p(16,4,C.ACID);p(16,5,C.ACID);p(16,6,C.LIME);
        for(let i=0;i<5;i++)p(16,7+i,i<2?C.ACID:C.LIME);
        p(15,10,C.YGRN);p(17,9,C.YGRN);
      } else {
        p(15,4,fl?C.ACID:C.LIME);p(16,3,br?C.ACID:C.LIME);p(15,3,C.NGRN);
      }
      // Eyes
      p(13,15,br?C.ACID:C.LIME);p(18,15,br?C.ACID:C.LIME);
      // Legs
      [[10,18],[11,19],[21,18],[20,19],[10,20],[21,20]].forEach(([x,y])=>p(x,y,C.DKOLV));
      if(s===3){p(17,6,C.DGRN);p(18,7,C.DGRN);}
    },
    // 3. Swarm Node — pulsing hive node, no attack but glows
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,23,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Organic node sphere
      const r=fl?7:br?6:5;
      const cy=13,cxx=16;
      for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
        if(x*x+y*y<=r*r){
          const d=Math.sqrt(x*x+y*y);
          p(cxx+x,cy+y,d<r*0.3?C.LIME:d<r*0.6?C.NGRN:d<r*0.85?C.DGRN:C.VDGRN);
        }
      }
      // Hex pattern on surface
      [[cxx-2,cy-2],[cxx+1,cy-1],[cxx-1,cy+1],[cxx+2,cy],[cxx,cy-3],[cxx-2,cy+2]].forEach(([x,y])=>{
        p(x,y,fl?C.ACID:br?C.LIME:C.BGRN);
      });
      // Pulse rings
      if(fl){
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          p(cxx+Math.round(Math.cos(a)*(r+2)),cy+Math.round(Math.sin(a)*(r+2)),i%2?C.LIME:C.BGRN);
        }
      }
      if(br){
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(cxx+Math.round(Math.cos(a)*(r+1)),cy+Math.round(Math.sin(a)*(r+1)),C.NGRN);
        }
      }
      // Glow center
      p(cxx,cy,fl?C.WHITE:br?C.ACID:C.LIME);
      p(cxx-1,cy,fl?C.ACID:C.LIME);p(cxx+1,cy,fl?C.ACID:C.LIME);
      // Tendrils to base
      aTendril(p,cxx-2,cy+r,cxx-3,23,C.DGRN,fl);
      aTendril(p,cxx+2,cy+r,cxx+3,23,C.DGRN,fl);
      if(s===3){p(cxx,cy-1,C.DGRN);p(cxx+1,cy+1,C.DGRN);}
    },
    // 4. Acid Sprayer — acid gland spraying green cloud
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,23,22,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Gland body - bulbous
      b(12,12,8,8,C.CHIT);b(13,11,6,9,C.CHLT);b(14,10,4,1,C.OLIV);
      // Nozzle
      b(14,8,4,3,C.CHIT);b(15,7,2,2,C.CHLT);b(15,6,2,1,C.OLIV);
      // Acid veins on gland
      p(13,13,C.NGRN);p(14,15,C.LIME);p(17,14,C.NGRN);p(18,16,C.LIME);
      p(15,17,C.DGRN);p(16,12,C.NGRN);
      // Acid spray cloud
      if(fl){
        // Big spray
        for(let i=0;i<6;i++){
          p(14+Math.round(Math.sin(i)*2),3+i,i<2?C.ACID:i<4?C.LIME:C.BGRN);
          p(16+Math.round(Math.cos(i)*2),2+i,i<2?C.YGRN:i<4?C.LIME:C.NGRN);
        }
        p(13,2,C.BGRN);p(18,1,C.LIME);p(12,4,C.NGRN);p(19,3,C.NGRN);
        p(15,0,C.ACID);p(16,1,C.YGRN);
      } else if(br){
        p(15,5,C.LIME);p(16,4,C.NGRN);p(14,5,C.BGRN);
      }
      // Support tubes
      p(11,14,C.DKOLV);p(10,15,C.CHIT);p(20,14,C.DKOLV);p(21,15,C.CHIT);
      // Dripping acid
      p(15,20,br?C.LIME:C.NGRN);p(16,21,C.DGRN);
      if(s===3){p(14,10,C.DGRN);p(17,11,C.DGRN);}
    },
    // 5. Hive Spire — tall spore-releasing tower
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,24,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Main spire - tall organic column
      aSpire(p,b,14,2,22,4,C.CHIT,C.CHLT,C.OLIV);
      // Smaller side spires
      aSpire(p,b,9,8,14,3,C.DKOLV,C.CHIT,C.CHLT);
      aSpire(p,b,21,6,16,3,C.DKOLV,C.CHIT,C.CHLT);
      // Hex pattern on spires
      p(15,6,C.NGRN);p(16,10,C.NGRN);p(15,14,C.NGRN);p(16,18,C.NGRN);
      p(10,12,C.DGRN);p(22,10,C.DGRN);
      // Spore caps at top
      b(14,2,4,2,fl?C.LIME:C.NGRN);b(15,1,2,1,br?C.ACID:C.LIME);
      p(9,8,br?C.LIME:C.NGRN);p(22,6,br?C.LIME:C.NGRN);
      // Floating spores
      if(fl){
        [[12,0,C.ACID],[19,1,C.LIME],[8,2,C.BGRN],[23,0,C.LIME],[10,3,C.YGRN],[21,2,C.ACID]].forEach(([x,y,cl])=>p(x as number,y as number,cl as string));
      }
      if(br){
        p(13,1,C.LIME);p(18,2,C.NGRN);p(8,5,C.BGRN);
      }
      // Bioluminescent nodes
      p(15,5,br?C.ACID:C.LIME);p(10,10,br?C.LIME:C.NGRN);p(22,8,br?C.LIME:C.NGRN);
      if(s===3){p(15,3,C.DGRN);p(10,9,C.DGRN);}
    },
    // 6. Brood Mother — bloated egg-laying creature
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,24,24,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Bloated abdomen
      for(let y=-5;y<=5;y++)for(let x=-7;x<=7;x++){
        if((x*x)/(7*7)+(y*y)/(5*5)<=1){
          const d=Math.sqrt(x*x+y*y);
          p(16+x,15+y,d<3?C.CHLT:d<5?C.CHIT:C.DKOLV);
        }
      }
      // Head
      b(14,7,4,4,C.CHLT);b(15,6,2,1,C.OLIV);
      p(14,8,fl?C.ACID:C.LIME);p(17,8,fl?C.ACID:C.LIME);
      // Mandibles
      p(13,7,C.CHIT);p(18,7,C.CHIT);p(12,6,C.OLIV);p(19,6,C.OLIV);
      // Legs (multiple)
      [[9,14],[8,16],[9,18],[23,14],[24,16],[23,18]].forEach(([x,y])=>{
        p(x,y,C.CHIT);p(x+(x<16?-1:1),y+1,C.DKOLV);
      });
      // Eggs on/around body
      const eggPos=[[11,20],[13,21],[15,22],[18,21],[20,20],[16,20]];
      eggPos.forEach(([x,y],i)=>{
        b(x,y,2,2,fl?C.LTYEL:br?C.ACID:C.YGRN);
        p(x,y,fl?C.WHITE:C.ACID);
      });
      // Egg launching (fire state)
      if(fl){
        p(16,5,C.ACID);p(15,3,C.YGRN);p(17,2,C.LTYEL);
        p(14,4,C.LIME);p(18,3,C.LIME);
      }
      // Pulsing abdomen veins
      p(12,13,br?C.LIME:C.NGRN);p(20,13,br?C.LIME:C.NGRN);
      p(14,17,br?C.NGRN:C.DGRN);p(18,17,br?C.NGRN:C.DGRN);
      if(s===3){p(15,12,C.DGRN);p(17,16,C.DGRN);}
    },
    // 7. Swarmling (MOBILE UNIT) — Row0=idle, Row1=walk, Row2=attack, Row3=death
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      const cx=16,cy=16;
      if(s===0){
        // IDLE — small bug standing still
        b(cx-3,cy-2,6,4,C.CHIT);b(cx-2,cy-2,4,3,C.CHLT);
        // Head
        b(cx-2,cy-5,4,3,C.CHLT);b(cx-1,cy-6,2,1,C.OLIV);
        p(cx-2,cy-4,C.LIME);p(cx+1,cy-4,C.LIME);
        // Antennae
        p(cx-3,cy-7,C.CHIT);p(cx-4,cy-8,C.NGRN);
        p(cx+2,cy-7,C.CHIT);p(cx+3,cy-8,C.NGRN);
        // Mandibles
        p(cx-3,cy-5,C.CHIT);p(cx+2,cy-5,C.CHIT);
        // Legs (3 pairs)
        p(cx-4,cy-1,C.CHIT);p(cx-5,cy,C.DKOLV);
        p(cx+3,cy-1,C.CHIT);p(cx+4,cy,C.DKOLV);
        p(cx-4,cy+1,C.CHIT);p(cx-5,cy+2,C.DKOLV);
        p(cx+3,cy+1,C.CHIT);p(cx+4,cy+2,C.DKOLV);
        p(cx-3,cy+2,C.DKOLV);p(cx+2,cy+2,C.DKOLV);
        // Glow spots
        p(cx-1,cy-1,C.NGRN);p(cx+1,cy,C.NGRN);
      } else if(s===1){
        // WALK — legs extended, slight forward lean
        b(cx-3,cy-1,6,4,C.CHIT);b(cx-2,cy-1,4,3,C.CHLT);
        b(cx-1,cy-4,4,3,C.CHLT);b(cx,cy-5,2,1,C.OLIV);
        p(cx-1,cy-3,C.LIME);p(cx+2,cy-3,C.LIME);
        // Antennae forward
        p(cx-1,cy-6,C.CHIT);p(cx,cy-7,C.NGRN);
        p(cx+3,cy-6,C.CHIT);p(cx+4,cy-7,C.NGRN);
        // Walking legs - alternating
        p(cx-4,cy,C.CHIT);p(cx-5,cy-1,C.DKOLV);
        p(cx+3,cy+1,C.CHIT);p(cx+4,cy+2,C.DKOLV);
        p(cx-4,cy+2,C.CHIT);p(cx-5,cy+3,C.DKOLV);
        p(cx+3,cy-1,C.CHIT);p(cx+4,cy-2,C.DKOLV);
        p(cx-3,cy+3,C.DKOLV);p(cx+2,cy+3,C.DKOLV);
        p(cx,cy,C.NGRN);
      } else if(s===2){
        // ATTACK (bite) — mandibles wide, lunging
        b(cx-3,cy-1,6,4,C.CHIT);b(cx-2,cy-1,4,3,C.CHLT);
        // Head forward and down
        b(cx-1,cy-4,4,3,C.CHLT);b(cx,cy-5,2,1,C.OLIV);
        // Eyes glow bright
        p(cx-1,cy-3,C.ACID);p(cx+2,cy-3,C.ACID);
        // Mandibles wide open
        p(cx-3,cy-4,C.CHIT);p(cx-4,cy-5,C.OLIV);p(cx-5,cy-5,C.LIME);
        p(cx+4,cy-4,C.CHIT);p(cx+5,cy-5,C.OLIV);p(cx+6,cy-5,C.LIME);
        // Bite effect
        p(cx,cy-6,C.ACID);p(cx+1,cy-7,C.YGRN);
        // Legs braced
        p(cx-4,cy,C.CHIT);p(cx-5,cy+1,C.DKOLV);
        p(cx+3,cy,C.CHIT);p(cx+4,cy+1,C.DKOLV);
        p(cx-4,cy+2,C.CHIT);p(cx-5,cy+3,C.DKOLV);
        p(cx+3,cy+2,C.CHIT);p(cx+4,cy+3,C.DKOLV);
        p(cx-1,cy,C.LIME);p(cx+1,cy+1,C.LIME);
      } else {
        // DEATH — crumpled, dissolving
        b(cx-3,cy+1,6,3,C.DKOLV);b(cx-2,cy+1,4,2,C.CHIT);
        p(cx-1,cy,C.CHLT);p(cx+1,cy,C.CHLT);
        // Collapsed legs
        p(cx-4,cy+2,C.DKOLV);p(cx+3,cy+2,C.DKOLV);
        p(cx-5,cy+3,C.DKBIO);p(cx+4,cy+3,C.DKBIO);
        // Acid pool
        b(cx-3,cy+3,6,2,C.DGRN);b(cx-2,cy+4,4,1,C.NGRN);
        p(cx,cy+3,C.LIME);p(cx-1,cy+4,C.SLIME);
        // Fading glow
        p(cx,cy+1,C.DGRN);p(cx-2,cy+2,C.VDGRN);
      }
    },
    // 8. Overmind (Ultimate) — giant alien brain/eye on organic throne
    (c:any,o:number[],s:number)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      aBase(p,b,24,26,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Organic throne structure
      b(6,16,20,8,C.CHIT);b(7,15,18,8,C.CHLT);
      b(5,18,2,6,C.DKOLV);b(25,18,2,6,C.DKOLV);
      // Throne spires
      aSpire(p,b,6,10,8,2,C.CHIT,C.CHLT,C.OLIV);
      aSpire(p,b,24,10,8,2,C.CHIT,C.CHLT,C.OLIV);
      // Brain dome
      for(let y=-5;y<=3;y++)for(let x=-6;x<=6;x++){
        if((x*x)/(6*6)+(y*y)/(5*5)<=1){
          const d=Math.sqrt(x*x+y*y);
          p(16+x,10+y,d<2?C.LGRN:d<4?C.NGRN:d<5.5?C.DGRN:C.VDGRN);
        }
      }
      // Brain folds
      for(let i=0;i<5;i++){
        const x=12+i*2,y=8+Math.round(Math.sin(i*1.2)*1.5);
        p(x,y,C.DDGRN);p(x+1,y+1,C.DGRN);
      }
      // Central eye
      b(14,9,4,3,C.DKBIO);b(15,9,2,3,fl?C.RED:C.ORED);
      p(15,10,fl?C.WHITE:C.ACID);p(16,10,fl?C.LTYEL:C.LIME);
      // Eye glow
      if(br){p(13,10,C.LIME);p(18,10,C.LIME);}
      // Psychic waves
      if(fl){
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6,r1=8,r2=10;
          p(16+Math.round(Math.cos(a)*r1),10+Math.round(Math.sin(a)*r1),C.ACID);
          p(16+Math.round(Math.cos(a)*r2),10+Math.round(Math.sin(a)*r2),C.LIME);
        }
      }
      if(br){
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4;
          p(16+Math.round(Math.cos(a)*9),10+Math.round(Math.sin(a)*9),C.NGRN);
        }
      }
      // Nerve tendrils from brain to throne
      aTendril(p,12,13,8,20,C.DGRN,fl);
      aTendril(p,20,13,24,20,C.DGRN,fl);
      aTendril(p,16,13,16,18,C.NGRN,fl);
      // Hex cells on throne
      [[8,18],[12,19],[20,18],[24,19],[10,21],[22,21]].forEach(([x,y])=>{
        p(x,y,br?C.NGRN:C.DGRN);
      });
      if(s===3){p(15,8,C.VDGRN);p(17,11,C.VDGRN);}
    },
  ];
  const cols=8,rows=4;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*T_CELL,row*T_CELL],row);
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (8×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx:any){
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

function drawHero(ctx:any){
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
    const tc=tRef.current!;tc.width=8*T_CELL;tc.height=4*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=80,tLH=13;
    tpv.width=tLW+8*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#060d02';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#66aa22';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
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
      info:{sz:'512×256',cell:'64×64',loader:"this.load.spritesheet('aliens_towers','aliens_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'8 cols (7 towers + 1 mobile) × 4 rows (idle/charge/fire/cooldown — mobile: idle/walk/attack/death)'}},
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
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?8*P_CELL*3:8*T_CELL*2,border:'1px solid #1a2a0a'}}/>
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
