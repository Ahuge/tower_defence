import { useRef, useEffect, useState, useCallback } from "react";

// ===== PALETTE =====
const C={
  CYAN:'#00ffcc',BCYN:'#44ffdd',LTCYN:'#88ffee',PLCYN:'#ccffee',
  MAG:'#ff00ff',LTMAG:'#ff66ff',PAMAG:'#ffaaff',DKMAG:'#aa00aa',DPMAG:'#660066',
  DARK:'#001a1a',SCRN:'#003333',TEAL:'#005544',DKTEAL:'#002a2a',
  NEON:'#00ff88',DKNEON:'#009955',LTNEON:'#66ffaa',
  GLD:'#ffcc00',DKGLD:'#aa8800',LTGLD:'#ffee88',
  WHITE:'#ffffff',GRAY:'#446666',DKGRAY:'#1a3333',
  RED:'#ff3344',DKRED:'#992233',
  BLK:'#000a0a',VOID:'#000000',
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
  // Server rack / circuit board base
  for(let i=0;i<10;i++){
    const cw=w-6+Math.floor(i*0.8),sx=cx-Math.floor(cw/2);
    b(sx,topY+i,cw,1,i<2?C.SCRN:i<5?C.DKTEAL:i<8?C.DARK:C.BLK);
  }
  b(cx-Math.floor((w-6)/2),topY,w-6,1,C.TEAL);
  // Circuit trace glow nodes
  p(cx-3,topY+3,glow>1?C.BCYN:C.CYAN);p(cx-2,topY+4,glow>1?C.BCYN:C.CYAN);
  p(cx-2,topY+5,glow>0?C.CYAN:C.DKNEON);p(cx-3,topY+6,C.DKTEAL);
  // Circuit traces on base
  b(cx-Math.floor((w-2)/2),topY+9,w-2,1,C.BLK);
  // Trace lines
  p(cx-5,topY+4,glow>0?C.CYAN:C.SCRN);p(cx+3,topY+5,glow>0?C.CYAN:C.SCRN);
  p(cx-4,topY+6,C.SCRN);p(cx+4,topY+4,C.SCRN);
  // Horizontal traces
  if(glow>0){b(cx-6,topY+7,3,1,C.DKNEON);b(cx+4,topY+7,3,1,C.DKNEON);}
  if(glow>1){p(cx-4,topY+2,C.DKTEAL);p(cx+2,topY+3,C.DKTEAL);}
}

function tCircuit(p,x1,y1,x2,y2,col,bright){
  // Draw circuit-trace style connections (right angles with glow)
  const dy=y2-y1,dx=x2-x1;
  const midY=y1+Math.round(dy/2);
  for(let y=y1;y!==midY;y+=Math.sign(dy))p(x1,y,bright?C.BCYN:col);
  for(let x=x1;x!==x2;x+=Math.sign(dx))p(x,midY,bright?C.BCYN:col);
  for(let y=midY;y!==y2;y+=Math.sign(dy))p(x2,y,bright?C.BCYN:col);
}

function tAntenna(p,b,x,y,h,w,c1,c2,ct){
  for(let i=0;i<h;i++){
    const pr=i/h,cw=Math.max(1,Math.round(w*(1-pr*0.85)));
    b(x+Math.floor((w-cw)/2),y+h-1-i,cw,1,pr<0.15?ct:pr<0.5?c2:c1);
  }
}

// ===== TOWERS (7×4 at 64×64) =====
function drawTowers(ctx){
  const fns=[
    // 0: Ping — Small antenna/radar dish with pulse rings
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,18,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Antenna pole
      b(15,8,2,14,C.DKTEAL);b(15,8,2,1,C.SCRN);p(16,8,C.TEAL);
      // Dish at top
      b(11,5,10,3,C.SCRN);b(12,4,8,1,C.TEAL);b(13,3,6,1,fl?C.BCYN:C.TEAL);
      b(12,5,8,2,C.DKTEAL);b(13,5,6,1,C.SCRN);
      // Dish highlight
      p(14,4,br?C.BCYN:C.CYAN);p(15,3,fl?C.WHITE:C.BCYN);p(17,4,br?C.CYAN:C.DKNEON);
      // Dish tip node
      p(16,2,fl?C.WHITE:br?C.LTCYN:C.CYAN);p(15,2,fl?C.LTCYN:C.SCRN);
      // Pulse rings (grow with state)
      if(s===0){
        // Idle: faint ring
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(16+Math.round(Math.cos(a)*4),4+Math.round(Math.sin(a)*2),C.DKNEON);}
      }
      if(s===1){
        // Charge: brighter ring
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(16+Math.round(Math.cos(a)*5),4+Math.round(Math.sin(a)*3),C.CYAN);}
      }
      if(s===2){
        // Fire: expanding rings
        for(let r=4;r<=8;r+=2)for(let i=0;i<10;i++){const a=i*Math.PI/5;p(16+Math.round(Math.cos(a)*r),4+Math.round(Math.sin(a)*(r-1)),r===4?C.BCYN:r===6?C.CYAN:C.DKNEON);}
        p(16,2,C.WHITE);b(15,1,3,1,C.LTCYN);
      }
      // Circuit connections to base
      tCircuit(p,13,8,10,22,C.SCRN,fl);
      tCircuit(p,19,8,22,22,C.SCRN,fl);
      p(10,24,br?C.CYAN:C.SCRN);p(22,24,br?C.CYAN:C.SCRN);
      if(s===3){p(15,4,C.DKTEAL);p(17,5,C.DKTEAL);for(let i=0;i<6;i++){const a=i*Math.PI/3;p(16+Math.round(Math.cos(a)*3),4+Math.round(Math.sin(a)*2),C.DKTEAL);}}
    },

    // 1: Firewall — Twin barrier pillars with beam between
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,23,22,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Left pillar
      b(6,6,4,17,C.DARK);b(7,6,2,17,C.DKTEAL);b(6,6,4,1,C.TEAL);b(7,6,2,1,C.SCRN);
      p(7,8,br?C.CYAN:C.DKNEON);p(7,12,br?C.CYAN:C.DKNEON);p(7,16,br?C.CYAN:C.DKNEON);
      p(8,10,C.SCRN);p(8,14,C.SCRN);
      // Right pillar
      b(22,6,4,17,C.DARK);b(23,6,2,17,C.DKTEAL);b(22,6,4,1,C.TEAL);b(23,6,2,1,C.SCRN);
      p(24,8,br?C.CYAN:C.DKNEON);p(24,12,br?C.CYAN:C.DKNEON);p(24,16,br?C.CYAN:C.DKNEON);
      p(23,10,C.SCRN);p(23,14,C.SCRN);
      // Beam between pillars
      const beamCol=fl?C.BCYN:br?C.CYAN:C.DKNEON;
      const beamW=fl?3:br?2:1;
      for(let y=8;y<20;y+=2){
        const yc=13;
        b(10,y,12,beamW,y===yc-1||y===yc+1?C.DKNEON:beamCol);
      }
      if(fl){
        // Bright fire beam
        b(10,10,12,4,C.CYAN);b(11,11,10,2,C.BCYN);b(12,11,8,2,C.LTCYN);
        b(13,12,6,1,C.WHITE);
        // Beam sparks
        p(9,10,C.LTCYN);p(22,11,C.LTCYN);p(10,14,C.BCYN);p(21,13,C.BCYN);
      }
      if(br&&!fl){
        b(10,11,12,2,C.CYAN);b(11,11,10,2,C.BCYN);
      }
      // Top caps with LED nodes
      p(7,5,fl?C.WHITE:br?C.LTCYN:C.CYAN);p(8,5,C.TEAL);
      p(23,5,fl?C.WHITE:br?C.LTCYN:C.CYAN);p(24,5,C.TEAL);
      // Pillar accents
      p(6,10,C.SCRN);p(9,10,C.SCRN);p(22,10,C.SCRN);p(25,10,C.SCRN);
      if(s===3){b(10,11,12,2,C.DKTEAL);p(7,8,C.DKTEAL);p(24,8,C.DKTEAL);}
    },

    // 2: Virus — Corrupt data node with spreading tendrils
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,23,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Central corrupt node
      b(13,8,6,8,C.DARK);b(14,9,4,6,C.DKTEAL);b(14,9,4,1,fl?C.NEON:C.DKNEON);
      b(15,10,2,4,fl?C.NEON:br?C.DKNEON:C.SCRN);
      p(16,11,fl?C.WHITE:br?C.LTNEON:C.NEON);p(15,12,br?C.NEON:C.DKNEON);
      // Corruption pattern on node
      p(14,10,C.DKMAG);p(17,11,fl?C.MAG:C.DKMAG);p(14,13,C.DKMAG);p(18,10,C.DPMAG);
      // Spreading tendrils
      const tc=fl?C.NEON:br?C.DKNEON:C.SCRN;
      // Left tendril
      p(12,10,tc);p(11,9,tc);p(10,9,br?C.NEON:tc);p(9,8,tc);p(8,8,fl?C.NEON:tc);
      p(7,7,fl?C.LTNEON:tc);p(6,7,fl?C.NEON:C.SCRN);
      // Right tendril
      p(19,11,tc);p(20,12,tc);p(21,12,br?C.NEON:tc);p(22,13,tc);p(23,13,fl?C.NEON:tc);
      p(24,14,fl?C.LTNEON:tc);p(25,14,fl?C.NEON:C.SCRN);
      // Upper tendril
      p(15,7,tc);p(14,6,tc);p(15,5,br?C.NEON:tc);p(16,4,fl?C.LTNEON:tc);
      // Lower tendrils
      p(16,16,tc);p(17,17,tc);p(16,18,br?C.NEON:tc);
      p(14,16,tc);p(13,17,tc);p(12,18,fl?C.NEON:tc);
      // Infection particles (fire state)
      if(fl){
        [[5,5,C.NEON],[26,10,C.NEON],[8,15,C.LTNEON],[24,6,C.LTNEON],
         [4,12,C.DKNEON],[27,16,C.DKNEON],[3,8,C.NEON],[28,12,C.NEON]].forEach(([x,y,cl])=>p(x,y,cl));
        // Glitch magenta particles
        p(7,4,C.MAG);p(25,8,C.MAG);p(6,14,C.DKMAG);p(26,5,C.DKMAG);
      }
      if(br&&!fl){
        p(6,6,C.DKNEON);p(24,13,C.DKNEON);p(8,16,C.SCRN);p(22,5,C.SCRN);
      }
      // Base circuit nodes
      p(11,24,br?C.NEON:C.DKNEON);p(20,24,br?C.NEON:C.DKNEON);
      if(s===3){p(15,10,C.DKTEAL);p(16,12,C.DKTEAL);p(12,10,C.SCRN);p(19,11,C.SCRN);}
    },

    // 3: Backdoor — Hidden terminal/console with screen flicker
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,22,20,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Terminal body
      b(9,8,14,14,C.DARK);b(10,8,12,13,C.DKTEAL);b(10,8,12,1,C.TEAL);
      // Screen
      b(11,10,10,8,C.BLK);b(12,11,8,6,fl?C.SCRN:C.BLK);
      // Screen content - hack symbols
      if(s===0){
        // Idle: cursor blink
        p(13,13,C.CYAN);p(14,13,C.DKNEON);p(15,13,C.CYAN);
        p(13,15,C.SCRN);p(14,15,C.SCRN);p(15,15,C.SCRN);p(16,15,C.SCRN);
        p(13,14,C.DKNEON);
      }
      if(s===1){
        // Charge: loading
        b(13,12,6,1,C.CYAN);b(13,14,4,1,C.DKNEON);
        p(13,13,C.BCYN);p(15,13,C.CYAN);p(17,13,C.DKNEON);
        p(19,12,C.BCYN);
      }
      if(fl){
        // Fire: skull/hack symbol
        p(14,11,C.CYAN);p(17,11,C.CYAN);  // eyes
        b(14,12,4,1,C.BCYN);  // nose
        p(13,13,C.CYAN);p(15,13,C.BCYN);p(17,13,C.CYAN);p(18,13,C.CYAN);  // mouth
        b(13,14,6,1,C.DKNEON);
        p(14,15,C.BCYN);p(16,15,C.BCYN);p(18,15,C.BCYN);
        // Screen glow
        b(11,10,10,1,C.DKTEAL);b(11,17,10,1,C.DKTEAL);
        p(11,11,C.DKTEAL);p(20,11,C.DKTEAL);p(11,16,C.DKTEAL);p(20,16,C.DKTEAL);
        // External glow
        p(9,11,C.DKNEON);p(22,11,C.DKNEON);p(9,16,C.DKNEON);p(22,16,C.DKNEON);
      }
      // Terminal edges
      p(9,8,C.SCRN);p(22,8,C.SCRN);p(9,21,C.SCRN);p(22,21,C.SCRN);
      // Keyboard area
      b(11,19,10,2,C.DKTEAL);b(12,19,8,1,br?C.SCRN:C.DKTEAL);
      for(let x=12;x<20;x+=2)p(x,19,br?C.TEAL:C.SCRN);
      // Status LEDs
      p(10,9,fl?C.NEON:br?C.CYAN:C.DKNEON);p(20,9,fl?C.RED:br?C.DKNEON:C.DARK);
      // Circuit traces
      tCircuit(p,12,21,10,22,C.SCRN,fl);tCircuit(p,20,21,22,22,C.SCRN,fl);
      if(s===3){b(12,11,8,6,C.BLK);p(14,13,C.DKTEAL);p(17,13,C.DKTEAL);}
    },

    // 4: DDoS — Overloaded server tower with multiple screens
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,24,22,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Main server rack
      b(10,4,12,20,C.DARK);b(11,4,10,19,C.DKTEAL);b(11,4,10,1,C.TEAL);
      // Screen 1 (top)
      b(12,6,8,4,C.BLK);b(13,7,6,2,fl?C.BCYN:br?C.CYAN:C.DKNEON);
      // Screen 2 (middle)
      b(12,11,8,4,C.BLK);b(13,12,6,2,fl?C.BCYN:br?C.CYAN:C.DKNEON);
      // Screen 3 (bottom)
      b(12,16,8,4,C.BLK);b(13,17,6,2,fl?C.BCYN:br?C.CYAN:C.DKNEON);
      // Screen contents - data streams
      if(br){
        for(let y=7;y<9;y++){p(13,y,C.LTCYN);p(15,y,C.CYAN);p(17,y,C.LTCYN);}
        for(let y=12;y<14;y++){p(14,y,C.CYAN);p(16,y,C.LTCYN);p(18,y,C.CYAN);}
        for(let y=17;y<19;y++){p(13,y,C.LTCYN);p(15,y,C.CYAN);p(17,y,C.LTCYN);}
      }
      if(fl){
        // Overflow - data flooding out
        b(13,7,6,2,C.WHITE);b(13,12,6,2,C.WHITE);b(13,17,6,2,C.WHITE);
        // Data flood particles
        [[7,5,C.CYAN],[24,6,C.BCYN],[6,10,C.CYAN],[25,11,C.BCYN],
         [5,14,C.LTCYN],[26,15,C.LTCYN],[8,18,C.CYAN],[23,17,C.BCYN],
         [4,8,C.DKNEON],[27,9,C.DKNEON],[3,13,C.DKNEON],[28,13,C.DKNEON]].forEach(([x,y,cl])=>p(x,y,cl));
        // Glitch blocks
        b(5,7,3,2,C.MAG);b(24,12,3,2,C.MAG);
        p(7,16,C.DKMAG);p(24,18,C.DKMAG);
      }
      // Server rack details
      for(let y=5;y<23;y+=5){p(11,y,C.SCRN);p(20,y,C.SCRN);}
      // Status LEDs on each unit
      p(19,6,fl?C.RED:br?C.NEON:C.DKNEON);p(19,11,fl?C.RED:br?C.NEON:C.DKNEON);p(19,16,fl?C.RED:br?C.NEON:C.DKNEON);
      // Side vents
      b(8,6,2,16,C.DKTEAL);b(22,6,2,16,C.DKTEAL);
      for(let y=7;y<21;y+=2){p(8,y,C.SCRN);p(23,y,C.SCRN);}
      // Top exhaust
      p(14,3,fl?C.BCYN:C.DKNEON);p(16,3,fl?C.BCYN:C.DKNEON);p(18,3,fl?C.LTCYN:C.SCRN);
      if(fl){p(14,2,C.CYAN);p(16,2,C.CYAN);p(15,1,C.DKNEON);}
      if(s===3){for(let y=7;y<19;y+=5)b(13,y,6,2,C.DKTEAL);p(19,6,C.DARK);p(19,11,C.DARK);p(19,16,C.DARK);}
    },

    // 5: Rootkit — Sleek stealth device, nearly invisible idle, reveals on fire
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,23,18,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // At idle: very faint outline only
      if(s===0){
        // Ghost outline
        for(let y=8;y<22;y++){
          p(12,y,y%3===0?C.DKTEAL:undefined);
          p(19,y,y%3===1?C.DKTEAL:undefined);
        }
        p(14,7,C.DKTEAL);p(17,7,C.DKTEAL);
        b(14,15,4,1,C.DKTEAL);
        // Single faint LED
        p(16,12,C.DKNEON);
      }
      if(s===1){
        // Charge: shimmer/partial reveal
        b(12,8,8,14,C.BLK);
        for(let y=8;y<22;y++){
          p(12,y,y%2===0?C.DKTEAL:C.BLK);
          p(19,y,y%2===1?C.DKTEAL:C.BLK);
        }
        b(14,10,4,6,C.DARK);b(15,11,2,4,C.DKTEAL);
        p(16,13,C.CYAN);p(15,12,C.DKNEON);
        // Scanlines
        for(let y=9;y<21;y+=2)b(13,y,6,1,C.DKTEAL);
      }
      if(fl){
        // Fire: full reveal — sleek angular device
        b(12,6,8,16,C.DARK);b(13,7,6,14,C.DKTEAL);b(14,8,4,12,C.SCRN);
        // Angular top
        p(15,5,C.TEAL);p(16,5,C.TEAL);b(14,6,4,1,C.SCRN);
        // Central eye
        b(14,12,4,3,C.BLK);b(15,12,2,3,C.CYAN);p(15,13,C.WHITE);p(16,13,C.BCYN);
        // Active circuits
        p(13,9,C.CYAN);p(18,9,C.CYAN);p(13,16,C.CYAN);p(18,16,C.CYAN);
        tCircuit(p,13,9,12,6,C.CYAN,true);tCircuit(p,18,9,19,6,C.CYAN,true);
        // Reveal flash
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(16+Math.round(Math.cos(a)*7),13+Math.round(Math.sin(a)*5),C.DKNEON);}
        p(10,10,C.DKNEON);p(21,10,C.DKNEON);p(10,16,C.DKNEON);p(21,16,C.DKNEON);
      }
      if(s===3){
        // Cooldown: fading back to invisible
        b(13,8,6,13,C.DARK);
        for(let y=8;y<21;y+=3)p(15,y,C.DKTEAL);
        p(16,13,C.DKTEAL);
      }
    },

    // 6: Zero Day (Ultimate) — Massive mainframe, all screens active, digital chaos
    (c,o,s)=>{const{p,b}=mk(c,o,T_G,T_G,T_PX);
      tBase(p,b,25,26,s===1?1:s===2?2:0);
      const br=s>=1,fl=s===2;
      // Massive mainframe body
      b(5,3,22,22,C.DARK);b(6,3,20,21,C.DKTEAL);b(6,3,20,1,C.TEAL);
      // Left screen bank
      b(7,5,8,6,C.BLK);b(8,6,6,4,fl?C.BCYN:br?C.CYAN:C.DKNEON);
      // Right screen bank
      b(17,5,8,6,C.BLK);b(18,6,6,4,fl?C.BCYN:br?C.CYAN:C.DKNEON);
      // Center large screen
      b(10,12,12,8,C.BLK);b(11,13,10,6,fl?C.BCYN:br?C.CYAN:C.DKNEON);
      // Screen data patterns
      if(br){
        // Top screens data cascade
        for(let x=8;x<14;x+=2){p(x,6,C.LTCYN);p(x,8,C.CYAN);}
        for(let x=18;x<24;x+=2){p(x,7,C.LTCYN);p(x,9,C.CYAN);}
        // Main screen matrix
        for(let y=13;y<19;y++)for(let x=11;x<21;x+=2)p(x,y,x%3===0?C.LTCYN:(x+y)%2===0?C.CYAN:C.DKNEON);
      }
      if(fl){
        // Total digital chaos — all screens white/cyan
        b(8,6,6,4,C.WHITE);b(18,6,6,4,C.WHITE);
        b(11,13,10,6,C.WHITE);b(12,14,8,4,C.LTCYN);
        // Massive data flood
        for(let i=0;i<12;i++){
          const a=i*Math.PI/6;
          const r1=12+i%3;
          p(16+Math.round(Math.cos(a)*r1),14+Math.round(Math.sin(a)*r1),i%2?C.CYAN:C.BCYN);
          p(16+Math.round(Math.cos(a)*(r1+2)),14+Math.round(Math.sin(a)*(r1+2)),C.DKNEON);
        }
        // Glitch blocks everywhere
        b(2,4,3,2,C.MAG);b(27,6,3,2,C.MAG);b(3,16,2,3,C.DKMAG);b(27,18,2,3,C.DKMAG);
        b(1,10,2,2,C.MAG);b(29,12,2,2,C.MAG);
        // Top emission
        b(13,1,6,2,C.CYAN);b(14,0,4,1,C.BCYN);p(16,0,C.WHITE);
      }
      // Rack detail bars
      b(7,11,18,1,C.SCRN);b(7,20,18,1,C.SCRN);
      // LED strip
      for(let x=7;x<25;x+=3){p(x,4,fl?C.WHITE:br?C.CYAN:C.DKNEON);}
      // Status LEDs
      p(7,5,fl?C.RED:br?C.NEON:C.DKNEON);p(24,5,fl?C.RED:br?C.NEON:C.DKNEON);
      p(7,12,fl?C.RED:C.DKNEON);p(24,12,fl?C.RED:C.DKNEON);
      // Side panels
      b(4,5,1,18,C.DKTEAL);b(27,5,1,18,C.DKTEAL);
      for(let y=6;y<22;y+=3){p(4,y,C.SCRN);p(27,y,C.SCRN);}
      // Top exhaust ports
      p(10,2,fl?C.LTCYN:C.DKNEON);p(13,2,fl?C.BCYN:C.DKNEON);p(19,2,fl?C.BCYN:C.DKNEON);p(22,2,fl?C.LTCYN:C.DKNEON);
      if(s===3){
        // Cooldown: screens dimming
        b(8,6,6,4,C.DKTEAL);b(18,6,6,4,C.DKTEAL);b(11,13,10,6,C.DKTEAL);
        for(let x=7;x<25;x+=3)p(x,4,C.DARK);
      }
    },
  ];
  const cols=7,rows=4;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*T_CELL,row*T_CELL],row);
  return{cols,rows,cell:T_CELL};
}

// ===== PROJECTILES (7×6 at 32×32) =====
const P_PX=2,P_G=16,P_CELL=P_G*P_PX;

function drawProjectiles(ctx){
  const fns=[
    // 0: Ping — cyan pulse ring → ring dissipate
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        const r=[3,4,5][f];
        for(let i=0;i<12;i++){const a=i*Math.PI/6;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2===0?C.CYAN:C.BCYN);}
        if(f>0)for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*(r-2)),cy+Math.round(Math.sin(a)*(r-2)),C.DKNEON);}
        p(cx,cy,f===0?C.WHITE:f===1?C.LTCYN:C.CYAN);
      }
      else if(f===3){
        // Impact: ring flash
        for(let r=3;r<=6;r++)for(let i=0;i<10;i++){const a=i*Math.PI/5;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r<5?C.BCYN:C.CYAN);}
        p(cx,cy,C.WHITE);b(cx-1,cy-1,2,2,C.LTCYN);
      }
      else if(f===4){
        // Dissipating
        for(let i=0;i<10;i++){const a=i*Math.PI/5;p(cx+Math.round(Math.cos(a)*6),cy+Math.round(Math.sin(a)*6),C.DKNEON);p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.CYAN:C.DKNEON);}
      }
      else{
        // Final fade
        [[4,4],[12,5],[6,11],[10,3],[3,8],[13,9]].forEach(([x,y],i)=>p(x,y,i%2?C.DKNEON:C.DKTEAL));
      }
    },

    // 1: Firewall — beam segment → beam flash
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Beam segment traveling
        const w=[1,2,2][f],len=[8,10,10][f];
        b(cx-Math.floor(w/2),cy-Math.floor(len/2),w,len,f===2?C.BCYN:C.CYAN);
        b(cx-Math.floor(w/2),cy-Math.floor(len/2),w,2,C.WHITE);
        b(cx-Math.floor(w/2),cy+Math.floor(len/2)-1,w,1,C.DKNEON);
        if(f>0){p(cx-2,cy,C.DKNEON);p(cx+2,cy,C.DKNEON);}
      }
      else if(f===3){
        // Beam flash impact
        b(cx-1,cy-5,2,10,C.BCYN);b(cx-3,cy-1,6,2,C.BCYN);
        b(cx,cy-4,1,8,C.WHITE);b(cx-2,cy,4,1,C.WHITE);
        p(cx,cy,C.WHITE);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.CYAN);}
      }
      else if(f===4){
        // Dissipating beam
        for(let y=cy-4;y<=cy+4;y++)p(cx,y,y%2===0?C.CYAN:C.DKNEON);
        for(let x=cx-3;x<=cx+3;x++)p(x,cy,x%2===0?C.DKNEON:C.DKTEAL);
      }
      else{
        p(cx,cy,C.DKNEON);p(cx,cy-2,C.DKTEAL);p(cx,cy+2,C.DKTEAL);p(cx-1,cy,C.DKTEAL);p(cx+1,cy,C.DKTEAL);
      }
    },

    // 2: Virus — corrupted data packet → virus spread
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Corrupted packet
        const sz=[3,4,4][f];
        b(cx-Math.floor(sz/2),cy-Math.floor(sz/2),sz,sz,C.DKTEAL);
        b(cx-Math.floor(sz/2)+1,cy-Math.floor(sz/2)+1,sz-2,sz-2,C.NEON);
        // Corruption pixels
        p(cx-1,cy-1,C.MAG);p(cx+1,cy+1,f>0?C.MAG:C.DKMAG);
        if(f>0){p(cx+2,cy-2,C.DKNEON);p(cx-2,cy+2,C.NEON);}
        if(f===2){p(cx-3,cy,C.DKMAG);p(cx+3,cy,C.DKMAG);}
        p(cx,cy,C.LTNEON);
      }
      else if(f===3){
        // Virus spread - burst
        b(cx-2,cy-2,4,4,C.NEON);b(cx-1,cy-1,2,2,C.LTNEON);p(cx,cy,C.WHITE);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),i%2?C.NEON:C.MAG);
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DKNEON);
        }
      }
      else if(f===4){
        // Spreading infection
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3+i%3;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.NEON:i%3===1?C.DKMAG:C.DKNEON);
        }
        p(cx,cy,C.DKNEON);
      }
      else{
        [[4,5],[11,4],[6,12],[9,3],[3,9],[13,10]].forEach(([x,y],i)=>p(x,y,i%2?C.DKNEON:C.DKMAG));
      }
    },

    // 3: Backdoor — hack symbol/skull → system takeover flash
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Hack symbol traveling
        const bob=[0,-1,1][f];
        b(cx-2,cy-2+bob,4,4,C.DARK);b(cx-1,cy-1+bob,2,2,C.SCRN);
        // Skull face
        p(cx-1,cy-1+bob,C.CYAN);p(cx+1,cy-1+bob,C.CYAN);  // eyes
        p(cx,cy+1+bob,C.BCYN);  // nose
        b(cx-1,cy+2+bob,3,1,C.DKNEON);  // mouth
        // Bracket frame
        p(cx-3,cy-2+bob,C.CYAN);p(cx-3,cy+2+bob,C.CYAN);
        p(cx+3,cy-2+bob,C.CYAN);p(cx+3,cy+2+bob,C.CYAN);
        if(f>0)p(cx,cy-4+bob,C.DKNEON);
      }
      else if(f===3){
        // System takeover flash
        b(cx-3,cy-3,6,6,C.SCRN);b(cx-2,cy-2,4,4,C.CYAN);b(cx-1,cy-1,2,2,C.WHITE);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),i%2?C.BCYN:C.CYAN);}
        // Data lines radiating
        for(let d=0;d<4;d++){const a=d*Math.PI/2;for(let r=2;r<6;r++)p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r<4?C.BCYN:C.DKNEON);}
      }
      else if(f===4){
        // Takeover settling
        b(cx-2,cy-2,4,4,C.DKTEAL);b(cx-1,cy-1,2,2,C.CYAN);p(cx,cy,C.BCYN);
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*4),cy+Math.round(Math.sin(a)*4),C.DKNEON);}
      }
      else{
        p(cx,cy,C.DKTEAL);p(cx-1,cy,C.DARK);p(cx+1,cy,C.DARK);p(cx,cy-1,C.DARK);p(cx,cy+1,C.DARK);
      }
    },

    // 4: DDoS — data stream flood → overflow burst
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Data stream flood
        const density=[4,6,8][f];
        for(let i=0;i<density;i++){
          const x=cx-2+i%4,y=cy-4+Math.floor(i*1.5);
          if(y>=0&&y<16)p(x,y,i%3===0?C.BCYN:i%3===1?C.CYAN:C.LTCYN);
        }
        // Stream core
        b(cx-1,cy-3,2,6,f===2?C.BCYN:C.CYAN);
        p(cx,cy-3,C.WHITE);p(cx-1,cy+2,C.DKNEON);
        if(f>0){p(cx-3,cy-1,C.DKNEON);p(cx+3,cy,C.DKNEON);}
        if(f===2){p(cx-4,cy-2,C.CYAN);p(cx+4,cy+1,C.CYAN);b(cx-2,cy-2,4,1,C.LTCYN);}
      }
      else if(f===3){
        // Overflow burst
        b(cx-2,cy-2,4,4,C.BCYN);b(cx-1,cy-1,2,2,C.WHITE);
        for(let i=0;i<12;i++){const a=i*Math.PI/6,r=4+i%2;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%3===0?C.WHITE:i%3===1?C.BCYN:C.CYAN);}
        // Glitch squares
        p(cx-5,cy-3,C.MAG);p(cx+5,cy+2,C.MAG);p(cx-4,cy+4,C.DKMAG);p(cx+3,cy-5,C.DKMAG);
      }
      else if(f===4){
        // Dissipating flood
        for(let i=0;i<10;i++){const a=i*Math.PI/5,r=3+i%3;p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),i%2?C.CYAN:C.DKNEON);}
        p(cx,cy,C.DKNEON);p(cx-1,cy+1,C.DKTEAL);p(cx+1,cy-1,C.DKTEAL);
      }
      else{
        [[3,5],[12,3],[5,11],[10,13],[7,2],[8,14]].forEach(([x,y],i)=>p(x,y,i%2?C.DKTEAL:C.DKNEON));
        p(cx,cy,C.DKTEAL);
      }
    },

    // 5: Rootkit — stealth dart (nearly invisible) → reveal flash
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Stealth dart — almost invisible, faint shimmer
        const vis=[1,2,2][f];
        if(vis>=1){
          p(cx,cy-2,C.DKTEAL);p(cx,cy-1,C.DKTEAL);p(cx,cy,C.DKNEON);p(cx,cy+1,C.DKTEAL);p(cx,cy+2,C.DKTEAL);
        }
        if(vis>=2){
          p(cx-1,cy,C.DKTEAL);p(cx+1,cy,C.DKTEAL);p(cx,cy,C.SCRN);
        }
        if(f===2)p(cx,cy-3,C.DKTEAL);
      }
      else if(f===3){
        // Reveal flash — sudden visibility burst
        b(cx-1,cy-1,2,2,C.CYAN);p(cx,cy,C.WHITE);
        for(let i=0;i<8;i++){const a=i*Math.PI/4;
          p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),i%2?C.BCYN:C.CYAN);
          p(cx+Math.round(Math.cos(a)*5),cy+Math.round(Math.sin(a)*5),C.DKNEON);
        }
      }
      else if(f===4){
        // Fading reveal
        for(let i=0;i<6;i++){const a=i*Math.PI/3;p(cx+Math.round(Math.cos(a)*3),cy+Math.round(Math.sin(a)*3),C.DKNEON);}
        p(cx,cy,C.DKTEAL);p(cx-1,cy,C.DKTEAL);p(cx+1,cy,C.DKTEAL);
      }
      else{
        p(cx,cy,C.DARK);p(cx-1,cy,C.BLK);p(cx+1,cy,C.BLK);
      }
    },

    // 6: Zero Day — massive data sphere → total system crash (glitch squares)
    (c,o,f)=>{const{p,b}=mk(c,o,P_G,P_G,P_PX);const cx=8,cy=8;
      if(f<3){
        // Massive data sphere growing
        const r=[3,4,5][f];
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r){
            const d=Math.sqrt(x*x+y*y);
            const cl=d<1?C.WHITE:d<r*0.4?C.LTCYN:d<r*0.7?C.BCYN:C.CYAN;
            p(cx+x,cy+y,cl);
          }
        }
        // Data matrix overlay
        for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){
          if(x*x+y*y<=r*r&&(x+y)%3===0)p(cx+x,cy+y,C.DKNEON);
        }
        // Glitch sparks
        if(f>0){p(cx-r-1,cy,C.MAG);p(cx+r+1,cy,C.MAG);}
        if(f===2){p(cx,cy-r-1,C.MAG);p(cx,cy+r+1,C.MAG);p(cx-r-2,cy+1,C.DKMAG);p(cx+r+2,cy-1,C.DKMAG);}
      }
      else if(f===3){
        // Total system crash — massive explosion
        for(let r=6;r>0;r--)for(let i=0;i<12;i++){const a=i*Math.PI/6;
          p(cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),r>4?C.DKNEON:r>2?C.CYAN:C.WHITE);
        }
        b(cx-2,cy-2,4,4,C.WHITE);b(cx-1,cy-1,2,2,C.PLCYN);
        // Glitch blocks
        b(cx-6,cy-5,2,2,C.MAG);b(cx+5,cy+3,2,2,C.MAG);b(cx-5,cy+4,2,2,C.DKMAG);b(cx+4,cy-6,2,2,C.DKMAG);
        b(cx-7,cy+1,2,1,C.MAG);b(cx+6,cy-2,1,2,C.MAG);
      }
      else if(f===4){
        // Crash settling — glitch squares scatter
        [[2,2,2,2,C.MAG],[11,3,2,2,C.DKMAG],[4,10,2,2,C.DKMAG],[12,11,2,2,C.MAG],
         [7,5,2,2,C.CYAN],[6,8,1,1,C.DKNEON],[10,7,1,1,C.DKNEON]].forEach(([x,y,w,h,cl])=>b(x,y,w,h,cl));
        p(cx,cy,C.CYAN);p(cx-1,cy+1,C.DKNEON);p(cx+1,cy-1,C.DKNEON);
      }
      else{
        // Final fade — scattered debris
        [[3,4],[12,3],[5,12],[10,11],[7,2],[8,13],[2,8],[14,7]].forEach(([x,y],i)=>p(x,y,i%3===0?C.DKMAG:i%2?C.DKTEAL:C.DKNEON));
        p(cx,cy,C.DARK);
      }
    },
  ];
  const cols=7,rows=6;
  for(let col=0;col<cols;col++)for(let row=0;row<rows;row++)fns[col](ctx,[col*P_CELL,row*P_CELL],row);
  return{cols,rows,cell:P_CELL};
}

// ===== HERO (8×5 at 64×128) =====
const H_PX=2,H_GW=32,H_GH=64,H_CW=H_GW*H_PX,H_CH=H_GH*H_PX;

function drawHero(ctx){
  // Duelist — sleek cyber-ninja with glowing blade, fitted bodysuit with circuit patterns, visor/mask
  // dir: 0=down,1=side,2=up | type: idle/walk/atk | frame: variant
  function drawChar(c,o,dir,opts={}){
    const{p,b}=mk(c,o,H_GW,H_GH,H_PX);
    const{lOff=0,rOff=0,atk=false,atkFrame=0,dash=false,parry=false,riposte=false,storm=false,hurt=false,armSwing=0}=opts;
    const cx=16;

    // Dash afterimage (digital trail)
    if(dash){
      for(let y=0;y<22;y++){const w=y<4?3:y<8?5:y<14?4:3,sx=cx-9-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,6+y,y%2?C.BLK:C.DARK);}}
      for(let y=0;y<16;y++){const w=y<3?2:y<10?3:2,sx=cx-16-Math.floor(w/2);for(let x=0;x<w;x++){const px_=sx+x;if(px_>=0)p(px_,9+y,C.BLK);}}
      // Digital dissolve trail
      p(cx-8,10,C.DKNEON);p(cx-12,13,C.DKTEAL);p(cx-10,8,C.CYAN);p(cx-14,11,C.DKNEON);
    }

    // Storm vortex marks (blade whirlwind)
    if(storm){
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6,r=8+i%4;
        const mx=cx+Math.round(Math.cos(a)*r),my=20+Math.round(Math.sin(a)*r);
        if(mx>=0&&mx<32&&my>=0&&my<64){p(mx,my,i%3===0?C.BCYN:i%3===1?C.CYAN:C.DKNEON);}
      }
      // Blade trail arcs
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8,r=6;
        const mx=cx+Math.round(Math.cos(a)*r),my=18+Math.round(Math.sin(a)*r);
        if(mx>=0&&mx<32&&my>=0&&my<64)p(mx,my,C.LTCYN);
      }
    }

    const lean=dash?2:parry?-1:atk&&atkFrame>0?1:0;
    const headY=dash?5:parry?8:7;
    const torY=headY+7;
    const legY=torY+9;
    const bx_=cx+lean;

    // BODYSUIT BASE (fitted, behind details)
    if(dir===2||dir===0){
      const cY=torY+2;
      // Slim fitted suit tail/coat
      for(let i=0;i<12;i++){
        const w=4+Math.floor(i*0.3), sx_=bx_-Math.floor(w/2);
        const cl=i<3?C.DARK:i<7?C.DKTEAL:i<10?C.DARK:C.BLK;
        for(let x=0;x<w;x++){const px_=sx_+x;if(px_>=0&&px_<32&&cY+i<62)p(px_,cY+i,cl);}
      }
      // Circuit pattern on suit back
      for(let i=2;i<10;i+=2){
        const sx_=bx_-1;
        if(cY+i<62)p(sx_,cY+i,C.CYAN);
      }
    }

    // VISOR/MASK HEAD
    if(dir===0){
      // Down - front of visor mask
      b(bx_-4,headY,8,6,C.DARK);b(bx_-3,headY,6,5,C.DKTEAL);
      b(bx_-2,headY-1,4,1,C.DKTEAL);b(bx_-1,headY-2,2,1,C.SCRN);
      // Visor band (glowing)
      b(bx_-4,headY+2,8,2,C.SCRN);b(bx_-3,headY+2,6,2,storm||riposte?C.LTCYN:C.CYAN);
      b(bx_-2,headY+2,4,2,storm||riposte?C.BCYN:C.LTCYN);
      // Visor highlight
      p(bx_-1,headY+2,C.WHITE);p(bx_+2,headY+3,C.WHITE);
      // Mask lower
      b(bx_-3,headY+4,6,2,C.DARK);b(bx_-2,headY+5,4,1,C.DKTEAL);
      // Top of head
      b(bx_-3,headY-1,6,1,C.SCRN);p(bx_-4,headY,C.SCRN);p(bx_+4,headY,C.SCRN);
      // Ear nodes
      p(bx_-5,headY+2,C.DKNEON);p(bx_+5,headY+2,C.DKNEON);
    } else if(dir===1){
      // Side - profile visor
      b(bx_-3,headY,6,6,C.DARK);b(bx_-2,headY,5,5,C.DKTEAL);
      b(bx_-1,headY-1,3,1,C.DKTEAL);p(bx_,headY-2,C.SCRN);
      // Visor side
      b(bx_-2,headY+2,6,2,C.SCRN);b(bx_-1,headY+2,5,2,storm||riposte?C.LTCYN:C.CYAN);
      b(bx_,headY+2,3,2,storm||riposte?C.BCYN:C.LTCYN);
      p(bx_+1,headY+2,C.WHITE);
      // Mask lower
      b(bx_-2,headY+4,5,2,C.DARK);
      b(bx_-2,headY,5,1,C.SCRN);
      p(bx_+4,headY+2,C.DKNEON);
    } else {
      // Up - back of head/mask
      b(bx_-4,headY,8,6,C.DARK);b(bx_-3,headY,6,5,C.DKTEAL);
      b(bx_-2,headY-1,4,1,C.DKTEAL);b(bx_-1,headY-2,2,1,C.SCRN);
      b(bx_-3,headY,6,1,C.SCRN);
      // Back circuit detail
      p(bx_-1,headY+1,C.DKNEON);p(bx_,headY+2,C.CYAN);p(bx_+1,headY+1,C.DKNEON);
      // Back panel line
      b(bx_-2,headY+3,4,1,C.SCRN);
      p(bx_-5,headY+2,C.DKNEON);p(bx_+5,headY+2,C.DKNEON);
    }

    // TORSO — fitted bodysuit
    b(bx_-3,torY,6,8,C.DARK);b(bx_-2,torY,4,8,C.DKTEAL);
    // Circuit patterns on torso
    if(dir===0){
      // V-pattern circuit traces
      p(bx_-2,torY+1,C.CYAN);p(bx_-1,torY+2,C.CYAN);p(bx_,torY+3,C.BCYN);p(bx_+1,torY+2,C.CYAN);p(bx_+2,torY+1,C.CYAN);
      // Chest node
      p(bx_,torY+1,storm?C.WHITE:C.LTCYN);
    } else if(dir===1){
      p(bx_,torY+1,C.CYAN);p(bx_+1,torY+2,C.BCYN);p(bx_,torY+3,C.CYAN);
      p(bx_+1,torY+1,storm?C.WHITE:C.LTCYN);
    } else {
      p(bx_-1,torY+1,C.CYAN);p(bx_,torY+2,C.BCYN);p(bx_+1,torY+1,C.CYAN);
      // Spine circuit
      p(bx_,torY+4,C.DKNEON);p(bx_,torY+6,C.DKNEON);
    }
    // Belt — utility with data chip
    b(bx_-3,torY+7,6,1,C.GRAY);b(bx_-2,torY+7,4,1,C.DKGRAY);p(bx_,torY+7,C.CYAN);
    if(riposte){p(bx_-4,torY+1,C.DKNEON);p(bx_+4,torY+1,C.DKNEON);p(bx_-4,torY+6,C.CYAN);p(bx_+4,torY+6,C.CYAN);}

    // ARMS & BLADE
    if(atk){
      if(dir===0){
        // Slash down — blade with cyan trail
        if(atkFrame===0){
          b(bx_+3,torY-2,2,3,C.DARK);
          // Blade raised
          for(let i=0;i<10;i++)p(bx_+5,torY-3-i,i===0?C.WHITE:i<3?C.LTCYN:i<6?C.CYAN:C.DKNEON);
          b(bx_+4,torY,3,1,C.GRAY);p(bx_+5,torY,C.CYAN);
          // Trail glow
          p(bx_+6,torY-4,C.DKNEON);p(bx_+4,torY-6,C.DKNEON);
        } else {
          b(bx_+3,torY+2,2,3,C.DARK);
          // Blade slashed down with trail
          for(let i=0;i<10;i++)p(bx_+5,torY+6+i,i===0?C.WHITE:i<3?C.LTCYN:i<6?C.CYAN:C.DKNEON);
          b(bx_+4,torY+5,3,1,C.GRAY);p(bx_+5,torY+5,C.CYAN);
          // Cyan slash trail
          for(let i=0;i<6;i++)p(bx_+4+i,torY+2+Math.floor(i*0.6),i<2?C.BCYN:C.DKNEON);
        }
        b(bx_-5,torY+2,2,4,C.DARK);
      } else if(dir===1){
        if(atkFrame===0){
          b(bx_+3,torY-1,3,2,C.DARK);
          for(let i=0;i<10;i++)p(bx_+6,torY-2-i,i===0?C.WHITE:i<3?C.LTCYN:i<6?C.CYAN:C.DKNEON);
          b(bx_+5,torY+1,3,1,C.GRAY);p(bx_+6,torY+1,C.CYAN);
        } else {
          b(bx_+3,torY+1,3,2,C.DARK);
          for(let i=0;i<10;i++){const x_=bx_+6+Math.floor(i*0.3),y_=torY+4+i;if(x_<32&&y_<63)p(x_,y_,i===0?C.WHITE:i<3?C.LTCYN:i<6?C.CYAN:C.DKNEON);}
          b(bx_+5,torY+3,3,1,C.GRAY);p(bx_+6,torY+3,C.CYAN);
          // Trail
          for(let i=0;i<4;i++)p(bx_+5+i,torY+2+i,C.DKNEON);
        }
      } else {
        if(atkFrame===0){
          b(bx_+3,torY-2,2,3,C.DARK);
          for(let i=0;i<8;i++)p(bx_+5,torY-3-i,i===0?C.WHITE:i<2?C.LTCYN:i<5?C.CYAN:C.DKNEON);
          b(bx_+4,torY,2,1,C.GRAY);
        } else {
          b(bx_+3,torY+3,2,3,C.DARK);
          for(let i=0;i<8;i++)p(bx_+5,torY+7+i,i<2?C.LTCYN:i<5?C.CYAN:C.DKNEON);
          b(bx_+4,torY+6,2,1,C.GRAY);
        }
      }
    } else {
      // Idle/walk arms
      const aY=torY+1;
      if(dir===0){
        b(bx_-5,aY+armSwing,2,5,C.DARK);p(bx_-5,aY+armSwing,C.DKTEAL);
        b(bx_+3,aY-armSwing,2,5,C.DARK);p(bx_+4,aY-armSwing,C.DKTEAL);
        // Blade at side
        for(let i=0;i<7;i++)p(bx_+5,aY-armSwing+2+i,i===0?C.LTCYN:i<3?C.CYAN:C.DKNEON);
        // Arm circuit accents
        p(bx_-5,aY+armSwing+2,C.DKNEON);p(bx_+4,aY-armSwing+2,C.DKNEON);
      } else if(dir===1){
        b(bx_+3,aY-armSwing,2,5,C.DARK);p(bx_+4,aY-armSwing,C.DKTEAL);
        for(let i=0;i<7;i++)p(bx_+5,aY-armSwing+2+i,i===0?C.LTCYN:i<3?C.CYAN:C.DKNEON);
        p(bx_+4,aY-armSwing+2,C.DKNEON);
      } else {
        b(bx_-5,aY+armSwing,2,5,C.DARK);p(bx_-5,aY+armSwing,C.DKTEAL);
        b(bx_+3,aY-armSwing,2,5,C.DARK);p(bx_+4,aY-armSwing,C.DKTEAL);
        p(bx_-5,aY+armSwing+2,C.DKNEON);p(bx_+4,aY-armSwing+2,C.DKNEON);
      }
    }

    // LEGS — fitted suit with circuit lines
    const lh=10;
    b(bx_-2+lOff,legY,2,lh,C.DARK);p(bx_-1+lOff,legY,C.DKTEAL);
    b(bx_+1+rOff,legY,2,lh,C.DARK);p(bx_+2+rOff,legY,C.DKTEAL);
    // Circuit lines on legs
    p(bx_-1+lOff,legY+3,C.DKNEON);p(bx_-1+lOff,legY+6,C.DKNEON);
    p(bx_+2+rOff,legY+3,C.DKNEON);p(bx_+2+rOff,legY+6,C.DKNEON);
    // Knee guards
    b(bx_-2+lOff,legY+Math.floor(lh*0.5),2,1,C.GRAY);
    b(bx_+1+rOff,legY+Math.floor(lh*0.5),2,1,C.GRAY);
    // Boots — sleek cyber
    const lfy=Math.min(legY+lh,61),rfy=Math.min(legY+lh,61);
    b(bx_-3+lOff,lfy,4,2,C.DKTEAL);b(bx_-3+lOff,lfy,3,1,C.SCRN);
    b(bx_+rOff,rfy,4,2,C.DKTEAL);b(bx_+1+rOff,rfy,3,1,C.SCRN);
    // Boot glow strips
    p(bx_-2+lOff,lfy+1,C.DKNEON);p(bx_+1+rOff,rfy+1,C.DKNEON);
    // Ground shadow
    if(!dash&&lfy+2<63){p(bx_-3+lOff,lfy+2,C.BLK);p(bx_+3+rOff,rfy+2,C.BLK);}

    // Hurt flash — digital glitch
    if(hurt){p(bx_+4,headY+1,C.MAG);p(bx_+5,headY,C.LTMAG);p(bx_+6,headY+1,C.MAG);p(bx_+5,headY+2,C.DKMAG);}

    // Parry shield lines
    if(parry){
      for(let y=headY-2;y<legY+8;y+=2){p(bx_-7,y,C.DKTEAL);p(bx_+7,y+1,C.DKTEAL);}
      // Parry barrier
      for(let y=headY;y<legY+4;y++){p(bx_+6,y,y%2===0?C.CYAN:C.DKNEON);}
    }

    // Riposte ground marker
    if(riposte){b(bx_-6,55,14,2,C.DKNEON);b(bx_-5,54,12,1,C.DKTEAL);b(bx_-4,57,10,1,C.DARK);}
  }

  // Layout: 8 cols × 5 rows at 64×128
  // R0: Down  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R1: Side  idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R2: Up    idle1,idle2,walk1,walk2,walk3,walk4,atk1,atk2
  // R3: Abilities riposte1,riposte2,parry1,parry2,lunge1,lunge2,storm1,storm2
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
  // Abilities row
  frames.push([
    {dir:0,opts:{riposte:true,atk:true,atkFrame:0,lOff:1}},       // Riposte counter-stance 1
    {dir:0,opts:{riposte:true,atk:true,atkFrame:1,lOff:2,rOff:-1}}, // Riposte counter-stance 2
    {dir:0,opts:{parry:true,lOff:-1,rOff:-1}},                      // Parry deflect 1
    {dir:0,opts:{parry:true,lOff:1,rOff:1,armSwing:1}},             // Parry deflect 2
    {dir:1,opts:{dash:true,lOff:2,rOff:1}},                          // Lunge dash 1
    {dir:1,opts:{dash:true,lOff:3,rOff:2}},                          // Lunge dash 2
    {dir:0,opts:{storm:true}},                                        // Perfect storm 1
    {dir:0,opts:{storm:true,lOff:1,rOff:-1,armSwing:1}},             // Perfect storm 2
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
  frames.forEach((row,ry)=>{
    row.forEach((frame,rx)=>{
      if(!frame)return;
      const o=[rx*H_CW,ry*H_CH];
      if(frame.opts.custom==='death1'){
        // Digital dissolve / derez — body collapsing into data fragments
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Collapsing body shape
        b(6,30,5,4,C.DARK);b(7,31,3,2,C.DKTEAL);b(6,30,5,1,C.SCRN);p(8,32,C.CYAN);p(9,32,C.DKNEON);
        b(10,32,10,4,C.DARK);b(11,32,8,3,C.DKTEAL);
        // Visor fragment
        b(4,33,3,2,C.CYAN);b(3,34,2,1,C.DKNEON);p(2,35,C.DKTEAL);
        // Blade fragment
        b(20,34,6,2,C.DARK);b(22,36,4,2,C.DARK);b(24,29,1,6,C.DKNEON);p(24,28,C.CYAN);
        // Body dissolving
        b(8,36,14,3,C.DARK);b(7,37,16,2,C.BLK);
        // Digital dissolve pixels
        for(let x=6;x<24;x++){if(x%3!==0)p(x,39,C.BLK);if(x%4===0)p(x,40,C.DKTEAL);}
        // Floating data fragments above
        [[8,26,C.CYAN],[14,24,C.DKNEON],[20,27,C.DKTEAL],[11,22,C.BCYN],[17,25,C.CYAN],
         [9,20,C.DKNEON],[16,18,C.DKTEAL],[13,16,C.CYAN],[19,21,C.DKNEON]].forEach(([x,y,cl])=>p(x,y,cl));
        // Glitch squares
        b(5,28,2,2,C.MAG);b(22,26,2,2,C.DKMAG);p(15,20,C.MAG);
      } else if(frame.opts.custom==='death2'){
        // Further dissolved — mostly data particles
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Ground residue
        for(let x=8;x<24;x++){if(x%2===0)p(x,42,C.BLK);if(x%3===0)p(x,41,C.DARK);}
        // Blade shard
        p(22,36,C.DKNEON);p(22,35,C.CYAN);p(22,41,C.DKNEON);
        // Visor shard
        p(7,40,C.CYAN);p(8,41,C.DKNEON);p(6,41,C.DKTEAL);
        // Scattered derez particles (floating upward)
        [[10,35],[14,32],[18,37],[12,28],[20,30],[8,33],[16,26],[22,28],[11,24],[15,22],[19,34],[13,38],[17,40],[9,36],[21,32],[14,20],[16,18],[12,16],[18,24],[10,30]].forEach(([x,y],i)=>{
          p(x,y,i%5===0?C.CYAN:i%4===0?C.BCYN:i%3===0?C.DKNEON:i%2===0?C.DKTEAL:C.DARK);
        });
        // Final visor glow
        p(14,42,C.CYAN);p(15,42,C.DKNEON);
        // Glitch fragments
        b(6,24,2,1,C.MAG);b(20,20,1,2,C.DKMAG);p(12,14,C.MAG);
      } else if(frame.opts.custom==='portrait'){
        // Close-up portrait — cyber-ninja with visor
        const{p,b}=mk(ctx,o,H_GW,H_GH,H_PX);
        // Background
        b(2,2,28,60,C.BLK);b(3,3,26,58,C.DARK);
        // Head/mask
        b(6,6,20,10,C.DKTEAL);b(7,7,18,8,C.DARK);b(6,6,20,2,C.SCRN);b(7,5,18,2,C.DKTEAL);b(8,4,16,2,C.SCRN);b(10,3,12,1,C.TEAL);
        // Side of head
        p(26,8,C.DKTEAL);p(27,9,C.DARK);p(28,10,C.DARK);p(27,10,C.DKTEAL);
        // Visor — large glowing band
        b(8,10,16,4,C.BLK);b(9,10,14,4,C.SCRN);
        b(9,11,14,2,C.CYAN);b(10,11,12,2,C.BCYN);b(11,11,10,2,C.LTCYN);
        p(12,11,C.WHITE);p(13,11,C.WHITE);p(18,12,C.WHITE);p(19,12,C.WHITE);
        // Visor edge glow
        p(8,11,C.DKNEON);p(7,12,C.DKTEAL);p(23,11,C.DKNEON);p(24,12,C.DKTEAL);
        // Mask lower
        b(8,14,16,4,C.DARK);b(9,15,14,2,C.DKTEAL);b(10,14,12,1,C.SCRN);
        // Chin/jaw
        b(12,17,8,2,C.DARK);b(13,18,6,1,C.DKTEAL);
        // Neck
        b(12,19,8,2,C.DKTEAL);
        // Shoulders/torso
        b(7,21,18,6,C.DARK);b(8,22,16,4,C.DKTEAL);
        // Suit circuit patterns
        b(10,22,2,4,C.DKNEON);b(18,22,2,4,C.DKNEON);b(14,22,1,4,C.CYAN);
        // Shoulder pads
        b(4,20,4,6,C.DARK);b(5,20,2,5,C.DKTEAL);b(24,20,4,6,C.DARK);b(25,20,2,5,C.DKTEAL);
        // Lower torso
        b(8,27,16,14,C.DARK);b(9,27,14,12,C.DKTEAL);
        // V-circuit on chest
        p(10,29,C.CYAN);p(12,30,C.BCYN);p(14,31,C.LTCYN);p(16,30,C.BCYN);p(18,29,C.CYAN);
        p(14,29,C.WHITE);  // Chest node
        // Blade hint on side
        b(24,28,2,10,C.DKGRAY);p(25,27,C.CYAN);p(24,26,C.DKNEON);
        // Border
        b(2,2,28,1,C.SCRN);b(2,61,28,1,C.SCRN);b(2,2,1,60,C.SCRN);b(29,2,1,60,C.SCRN);
        // Corner accent nodes
        p(3,3,C.CYAN);p(28,3,C.CYAN);p(3,60,C.CYAN);p(28,60,C.CYAN);
        // Circuit trace border detail
        p(10,2,C.DKNEON);p(22,2,C.DKNEON);p(10,61,C.DKNEON);p(22,61,C.DKNEON);
      } else {
        drawChar(ctx,o,frame.dir,frame.opts);
      }
    });
  });
  return{cols,rows,cw:H_CW,ch:H_CH};
}

// ===== LABELS =====
const T_NAMES=['Ping','Firewall','Virus','Backdoor','DDoS','Rootkit','Zero Day'];
const T_STATES=['Idle','Charge','Fire','Cooldown'];
const P_NAMES=['Ping','Firewall','Virus','Backdoor','DDoS','Rootkit','Zero Day'];
const P_STATES=['Travel 1','Travel 2','Travel 3','Impact 1','Impact 2','Impact 3'];
const H_COL_LABELS=['Idle 1','Idle 2','Walk 1','Walk 2','Walk 3','Walk 4','Atk 1','Atk 2'];
const H_ROW_LABELS=['Down','Side','Up','Abilities','States'];
const H_R3=['Riposte 1','Riposte 2','Parry 1','Parry 2','Lunge 1','Lunge 2','Storm 1','Storm 2'];
const H_R4=['Hurt','Death 1','Death 2','Portrait','','','',''];

// ===== COMPONENT =====
export default function App(){
  const tRef=useRef<HTMLCanvasElement>(null),tPv=useRef<HTMLCanvasElement>(null),pRef=useRef<HTMLCanvasElement>(null),pPv=useRef<HTMLCanvasElement>(null),hRef=useRef<HTMLCanvasElement>(null),hPv=useRef<HTMLCanvasElement>(null);
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('towers');
  const [view,setView]=useState('preview');

  useEffect(()=>{
    // Towers
    const tc=tRef.current!;tc.width=7*T_CELL;tc.height=4*T_CELL;
    const tCtx=tc.getContext('2d')!;tCtx.imageSmoothingEnabled=false;
    drawTowers(tCtx);
    // Tower preview
    const tpv=tPv.current!;const tS=2,tLW=66,tLH=13;
    tpv.width=tLW+7*T_CELL*tS;tpv.height=4*(T_CELL*tS+tLH)+10;
    const tpc=tpv.getContext('2d')!;tpc.imageSmoothingEnabled=false;
    tpc.fillStyle='#000a0a';tpc.fillRect(0,0,tpv.width,tpv.height);
    for(let r=0;r<4;r++){const by=r*(T_CELL*tS+tLH)+5;tpc.fillStyle='#00aa88';tpc.font='bold 9px monospace';tpc.fillText(T_STATES[r],3,by+T_CELL*tS/2+3);
      for(let cc=0;cc<7;cc++){const bx_=tLW+cc*T_CELL*tS;tpc.save();tpc.translate(bx_,by);tpc.scale(tS,tS);tpc.drawImage(tc,cc*T_CELL,r*T_CELL,T_CELL,T_CELL,0,0,T_CELL,T_CELL);tpc.restore();tpc.strokeStyle='#0a2a2a';tpc.strokeRect(bx_,by,T_CELL*tS,T_CELL*tS);if(r===0){tpc.fillStyle='#66aa99';tpc.font='9px monospace';tpc.fillText(T_NAMES[cc],bx_+2,by-2);}}}

    // Projectiles
    const pc_=pRef.current!;pc_.width=7*P_CELL;pc_.height=6*P_CELL;
    const pCtx=pc_.getContext('2d')!;pCtx.imageSmoothingEnabled=false;
    drawProjectiles(pCtx);
    const ppv=pPv.current!;const pS=3;
    ppv.width=tLW+7*P_CELL*pS;ppv.height=6*(P_CELL*pS+tLH)+10;
    const ppc=ppv.getContext('2d')!;ppc.imageSmoothingEnabled=false;
    ppc.fillStyle='#000a0a';ppc.fillRect(0,0,ppv.width,ppv.height);
    for(let r=0;r<6;r++){const by=r*(P_CELL*pS+tLH)+5;ppc.fillStyle='#00aa88';ppc.font='bold 9px monospace';ppc.fillText(P_STATES[r],3,by+P_CELL*pS/2+3);
      for(let cc=0;cc<7;cc++){const bx_=tLW+cc*P_CELL*pS;ppc.save();ppc.translate(bx_,by);ppc.scale(pS,pS);ppc.drawImage(pc_,cc*P_CELL,r*P_CELL,P_CELL,P_CELL,0,0,P_CELL,P_CELL);ppc.restore();ppc.strokeStyle='#0a2a2a';ppc.strokeRect(bx_,by,P_CELL*pS,P_CELL*pS);if(r===0){ppc.fillStyle='#66aa99';ppc.font='9px monospace';ppc.fillText(P_NAMES[cc],bx_+2,by-2);}}}

    // Hero
    const hc=hRef.current!;hc.width=8*H_CW;hc.height=5*H_CH;
    const hCtx=hc.getContext('2d')!;hCtx.imageSmoothingEnabled=false;
    drawHero(hCtx);
    const hpv=hPv.current!;const hS=1.4,hLW=72,hLH=13;
    hpv.width=hLW+8*H_CW*hS;hpv.height=5*(H_CH*hS+hLH)+10;
    const hpc=hpv.getContext('2d')!;hpc.imageSmoothingEnabled=false;
    hpc.fillStyle='#000a0a';hpc.fillRect(0,0,hpv.width,hpv.height);
    for(let r=0;r<5;r++){const by=r*(H_CH*hS+hLH)+5;hpc.fillStyle='#00aa88';hpc.font='bold 9px monospace';hpc.fillText(H_ROW_LABELS[r],3,by+H_CH*hS/2+3);
      for(let cc=0;cc<8;cc++){const bx_=hLW+cc*H_CW*hS;hpc.save();hpc.translate(bx_,by);hpc.scale(hS,hS);hpc.drawImage(hc,cc*H_CW,r*H_CH,H_CW,H_CH,0,0,H_CW,H_CH);hpc.restore();hpc.strokeStyle='#0a2a2a';hpc.strokeRect(bx_,by,H_CW*hS,H_CH*hS);
        hpc.fillStyle='#66aa99';hpc.font='8px monospace';
        const lbl=r<3?H_COL_LABELS[cc]:r===3?H_R3[cc]:H_R4[cc];
        if(lbl)hpc.fillText(lbl,bx_+2,by+H_CH*hS+10);}}

    setReady(true);
  },[]);

  const dl=(ref,name)=>()=>{const a=document.createElement('a');a.download=name;a.href=ref.current!.toDataURL('image/png');a.click();};

  const tabs=[
    {id:'towers',label:'Towers',ref:tRef,pvRef:tPv,dl:'cypherpunk_towers_animated.png',
      info:{sz:'448×256',cell:'64×64',loader:"this.load.spritesheet('cyber_towers','cypherpunk_towers_animated.png',{frameWidth:64,frameHeight:64})",note:'7 cols (towers) × 4 rows (idle, charge, fire, cooldown)'}},
    {id:'projectiles',label:'Projectiles',ref:pRef,pvRef:pPv,dl:'cypherpunk_projectiles_animated.png',
      info:{sz:'224×192',cell:'32×32',loader:"this.load.spritesheet('cyber_proj','cypherpunk_projectiles_animated.png',{frameWidth:32,frameHeight:32})",note:'7 cols × 6 rows (3 travel + 3 impact)'}},
    {id:'hero',label:'Hero: Duelist',ref:hRef,pvRef:hPv,dl:'duelist_hero_directional.png',
      info:{sz:'512×640',cell:'64×128',loader:"this.load.spritesheet('duelist','duelist_hero_directional.png',{frameWidth:64,frameHeight:128})",note:'Row 0-2: Down/Side/Up (idle×2, walk×4, atk×2) · Row 3: Abilities · Row 4: States'}},
  ];
  const cur=tabs.find(t=>t.id===tab)!;

  return(
    <div style={{background:'#000a0a',minHeight:'100vh',padding:12,fontFamily:'monospace'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexWrap:'wrap'}}>
        <h2 style={{color:C.CYAN,margin:0,fontSize:15}}>CYPHERPUNK FACTION — Complete Sheets</h2>
        {ready&&<button onClick={dl(cur.ref,cur.dl)} style={{background:C.CYAN,color:'#000',border:'none',padding:'5px 14px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontWeight:'bold',fontSize:11}}>
          Download {cur.label} PNG
        </button>}
      </div>
      <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?'#003333':'#111',color:tab===t.id?C.CYAN:'#336655',border:`1px solid ${tab===t.id?'#005544':'#222'}`,padding:'4px 10px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10}}>{t.label}</button>
        ))}
        <span style={{borderLeft:'1px solid #222',margin:'0 2px'}}/>
        {['preview','actual'].map(v=>(
          <button key={v} onClick={()=>setView(v)} style={{background:view===v?'#0a2a2a':'#111',color:view===v?C.MAG:'#445566',border:`1px solid ${view===v?'#334':'#222'}`,padding:'4px 8px',borderRadius:3,cursor:'pointer',fontFamily:'monospace',fontSize:10,textTransform:'capitalize'}}>{v==='actual'?'Actual Size':v}</button>
        ))}
      </div>
      <div style={{overflowX:'auto',overflowY:'auto',maxHeight:'70vh'}}>
        {tabs.map(t=>(
          <div key={t.id} style={{display:tab===t.id?'block':'none'}}>
            <canvas ref={t.pvRef} style={{display:view==='preview'?'block':'none',maxWidth:'100%'}}/>
            <canvas ref={t.ref} style={{display:view==='actual'?'block':'none',imageRendering:'pixelated',width:t.id==='hero'?8*H_CW*1.5:t.id==='projectiles'?7*P_CELL*3:7*T_CELL*2,border:'1px solid #0a2a2a'}}/>
          </div>
        ))}
      </div>
      {cur&&<div style={{color:'#337766',fontSize:9,marginTop:10,maxWidth:600}}>
        <p style={{margin:'2px 0'}}><b style={{color:'#55aa88'}}>Sheet:</b> {cur.info.sz}px · {cur.info.cell} cells</p>
        <p style={{margin:'2px 0'}}><b style={{color:'#55aa88'}}>Phaser:</b> <code style={{color:C.MAG}}>{cur.info.loader}</code></p>
        <p style={{margin:'2px 0'}}><b style={{color:'#55aa88'}}>Layout:</b> {cur.info.note}</p>
      </div>}
    </div>
  );
}
