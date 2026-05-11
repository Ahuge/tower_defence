import { createCanvas } from 'canvas';
import fs from 'fs';

// ══════════════════════════════ PALETTES ══════════════════════════════
const B = { // MechBase
  DKBRN:'#332211',DKSTL:'#666666',STEEL:'#888888',LTSTL:'#aaaaaa',WTSTL:'#cccccc',
  DKBRZ:'#995522',BRONZE:'#cc8833',LTBRZ:'#ddaa55',TAN:'#eebb66',
  RIVET:'#555555',DKRIV:'#444444',GEAR:'#997744',DKGEAR:'#775533',LTGEAR:'#bbaa66',
  SMOKE:'#665555',LTSMK:'#887777',
};
const T = { // MechTower
  FORG:'#ff4400',LFORG:'#ff6622',ORANGE:'#ff9944',LTORG:'#ffbb77',DKORG:'#cc6622',
  FLAME:'#ff6622',LTFLM:'#ffaa44',WFLM:'#ffdd88',DKFLM:'#cc3300',
  SPARK:'#ffff88',WSPARK:'#ffffff',LTSPARK:'#ffee66',
  TYELW:'#ffdd44',LTYELW:'#ffee88',
  RED:'#cc3333',LTRED:'#ff5555',DKRED:'#882222',
  DKBRN:'#332211',BRWN:'#553322',MDBRN:'#664433',
  DKTBRN:'#886633',TBRN:'#aa7744',LTTBRN:'#bb8855',
  DKSTL:'#666666',STEEL:'#888888',LTSTL:'#aaaaaa',WTSTL:'#cccccc',
  RIVET:'#555555',
  DKBRZ:'#995522',BRONZE:'#cc8833',LTBRZ:'#ddaa55',
  BLACK:'#111111',
};

// Throne palette — from mech_campaign_sprites.tsx
const TH = {
  STL_DK:'#444455',STL_MD:'#666677',STL_LT:'#888899',STL_HI:'#aaaabb',
  BRZ_DK:'#885522',BRZ_MD:'#aa7744',BRZ_HI:'#cc9955',OUTLINE:'#1a1a22',
  GOLD_DK:'#997744',GOLD_MD:'#bb9944',GOLD_HI:'#ddbb66',
  V_DK:'#220044',V_MD:'#552288',V_LT:'#8844bb',V_GLOW:'#bb66ee',V_PALE:'#ddaaff',
  ROBE_DK:'#333344',ROBE_MD:'#555566',ROBE_HI:'#777788',
  FLAME:'#ff6622',SMOKE:'#554444',
};

function px(ctx,x,y,c){ctx.fillStyle=c;ctx.fillRect(x,y,1,1);}
function rect(ctx,x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}
function wa(h,a){const r=h.replace('#','');return'rgba('+parseInt(r.slice(0,2),16)+','+parseInt(r.slice(2,4),16)+','+parseInt(r.slice(4,6),16)+','+a+')';}

// ══════════════════════════════ WORKSHOP ══════════════════════════════
const WS_W=32,WS_H=32,WS_F=1;
function drWS(ctx){
  const S=B.DKBRN,D=B.DKSTL,M=B.STEEL,L=B.LTSTL,W=B.WTSTL,Z=B.DKBRZ,Br=B.BRONZE,Tr=B.LTBRZ,R=B.RIVET,G=B.GEAR,DG=B.DKGEAR,LG=B.LTGEAR,F=T.FORG,LF=T.LFORG,O=T.ORANGE,SM=B.SMOKE;
  rect(ctx,4,29,24,2,S);rect(ctx,5,28,22,1,S);
  rect(ctx,5,26,22,2,D);rect(ctx,6,26,20,1,M);rect(ctx,7,25,18,1,L);
  rect(ctx,7,23,18,2,D);rect(ctx,8,23,16,1,M);
  rect(ctx,9,21,14,2,D);rect(ctx,10,21,12,1,M);
  rect(ctx,5,27,22,1,Z);rect(ctx,6,27,20,1,Br);
  for(const[x,y]of[[6,25],[25,25],[7,26],[24,26],[6,27],[25,27]])px(ctx,x,y,R);
  rect(ctx,8,7,16,14,D);rect(ctx,9,7,14,14,M);rect(ctx,10,7,12,14,L);
  for(const[x,y]of[[8,7],[23,7],[8,13],[23,13],[8,19],[23,19]])px(ctx,x,y,R);
  rect(ctx,7,7,18,1,Z);rect(ctx,8,6,16,1,Br);rect(ctx,9,6,14,1,Tr);
  rect(ctx,13,2,6,5,D);rect(ctx,14,2,4,5,M);rect(ctx,15,2,2,5,L);
  rect(ctx,12,2,8,1,Br);rect(ctx,13,1,6,1,Tr);rect(ctx,14,0,4,1,Br);
  px(ctx,13,0,SM);px(ctx,17,0,SM);
  for(const[x,y]of[[14,9],[18,9],[14,11],[18,11],[13,10],[19,10],[14,10],[15,10],[17,10],[18,10],[15,9],[16,9],[17,9],[15,11],[16,11],[17,11],[16,8],[16,12],[12,10],[20,10]])
    px(ctx,x,y,(y===8||y===12||x===12||x===20)?LG:G);
  px(ctx,16,10,S);px(ctx,15,10,DG);px(ctx,17,10,DG);
  for(let i=0;i<4;i++)px(ctx,12+i,12+i,Br);
  for(let i=0;i<4;i++)px(ctx,20-i,12+i,Br);
  rect(ctx,14,15,3,2,D);px(ctx,15,15,M);
  rect(ctx,15,15,3,2,D);px(ctx,17,15,M);
  rect(ctx,12,16,8,4,S);
  rect(ctx,12,15,8,1,D);rect(ctx,12,16,1,4,D);rect(ctx,19,16,1,4,D);
  rect(ctx,12,20,8,1,M);
  rect(ctx,13,17,6,2,LF);rect(ctx,14,18,4,1,F);
  rect(ctx,15,17,2,1,'#ffaa44');px(ctx,16,18,'#ffaa44');
  px(ctx,13,16,O);px(ctx,18,16,O);
  px(ctx,14,15,wa(F,0.5));px(ctx,18,15,wa(F,0.5));
  rect(ctx,13,21,6,1,W);rect(ctx,14,20,4,1,L);
  rect(ctx,14,22,4,1,D);rect(ctx,13,23,6,1,M);
  px(ctx,12,21,L);px(ctx,12,22,M);px(ctx,19,21,L);px(ctx,19,22,M);
}

// ══════════════════════════════ RAIDER ══════════════════════════════
const R_W=24,R_H=24,R_F=5;
function drRD(ctx){
  for(let f=0;f<R_F;f++){
    const oy=f*R_H,leg=f===1?-1:f===3?1:0;
    rect(ctx,9,oy+21,6,2,B.DKBRN);
    rect(ctx,9+leg,oy+18,3,3,B.DKBRN);px(ctx,10+leg,oy+18,B.BRWN);
    rect(ctx,12-leg,oy+18,3,3,B.DKBRN);px(ctx,13-leg,oy+18,B.BRWN);
    px(ctx,9+leg,oy+18,B.STEEL);px(ctx,12-leg,oy+18,B.STEEL);
    rect(ctx,10+leg,oy+13,2,5,B.DKSTL);rect(ctx,10+leg,oy+13,1,5,B.STEEL);
    rect(ctx,12-leg,oy+13,2,5,B.DKSTL);rect(ctx,13-leg,oy+13,1,5,B.STEEL);
    px(ctx,11,oy+13,B.DKBRN);
    rect(ctx,8,oy+11,8,2,T.DKTBRN);rect(ctx,9,oy+11,6,2,T.TBRN);rect(ctx,8,oy+12,8,1,B.DKBRN);
    rect(ctx,8,oy+10,8,1,B.DKBRN);px(ctx,11,oy+10,B.GEAR);px(ctx,12,oy+10,B.GEAR);
    px(ctx,11,oy+9,B.DKGEAR);px(ctx,12,oy+9,B.DKGEAR);
    rect(ctx,8,oy+5,8,5,T.DKTBRN);rect(ctx,9,oy+5,6,5,T.TBRN);rect(ctx,8,oy+5,1,5,T.LTTBRN);
    rect(ctx,16,oy+6,3,4,B.DKBRZ);rect(ctx,17,oy+6,1,4,B.BRONZE);
    px(ctx,15,oy+6,B.DKBRN);px(ctx,16,oy+10,B.DKBRZ);
    rect(ctx,7,oy+4,10,1,T.DKTBRN);rect(ctx,8,oy+4,8,1,T.TBRN);
    rect(ctx,9,oy+1,6,3,T.DKTBRN);rect(ctx,9,oy+1,5,3,T.TBRN);
    px(ctx,11,oy+0,T.LTTBRN);px(ctx,12,oy+0,T.LTTBRN);
    px(ctx,9,oy+1,T.LTTBRN);px(ctx,14,oy+1,T.LTTBRN);
    rect(ctx,10,oy+2,4,2,'#0e0a14');
    const ec=f===0?'#ffcc44':wa('#ffcc44',0.3);
    px(ctx,10,oy+2,ec);px(ctx,13,oy+2,ec);
  }
}

// ══════════════════════════════ GENERATOR ══════════════════════════════
const G_W=32,G_H=32,G_F=4;
function drGN(ctx){
  for(let f=0;f<G_F;f++){
    const oy=f*G_H,d=f/(G_F-1);
    rect(ctx,6,oy+24,20,2,B.DKBRN);rect(ctx,7,oy+23,18,3,B.DKSTL);rect(ctx,8,oy+23,16,3,B.STEEL);
    rect(ctx,7,oy+26,18,2,B.DKBRN);rect(ctx,9,oy+25,14,2,B.LTSTL);
    rect(ctx,11,oy+21,10,2,B.DKSTL);rect(ctx,12,oy+21,8,1,B.STEEL);
    rect(ctx,6,oy+28,20,4,B.DKBRN);
    const coilH=Math.floor(13-d*12);
    const coilY=oy+6+(13-coilH);
    rect(ctx,11,coilY,10,coilH,T.DKSTL);rect(ctx,12,coilY,8,coilH,T.STEEL);rect(ctx,13,coilY,6,coilH,T.LTSTL);
    const bands=Math.floor(coilH/4);
    for(let b=0;b<bands;b++){
      const by=coilY+2+b*4;if(by>=coilY+coilH)break;
      rect(ctx,10,by,12,1,B.BRONZE);rect(ctx,11,by,10,1,B.LTBRZ);
      if(d<0.98){const brn=`rgb(${Math.round(255-85*Math.abs(b/bands-0.5)*2)},${Math.round(68+68*Math.abs(b/bands-0.5)*2)},${Math.round(0+68*Math.abs(b/bands-0.5)*2)})`;rect(ctx,12,by,6,1,brn);}
    }
    if(d<0.98){
      for(let s=0;s<3;s++){
        const sx=10+Math.floor(Math.sin(f*2+s*2.1)*4+6),sy=coilY+2+Math.floor(Math.sin(f*3+s*1.7+1)*coilH*0.3+coilH*0.3);
        px(ctx,sx,sy,Math.random()<0.5?'#ff6600':'#ffff66');
      }
    }
    const ltH=Math.min(4,Math.floor(4-d*4));
    if(ltH>0){rect(ctx,15,coilY-1,2,ltH,T.LTSTL);rect(ctx,16,coilY-1,1,ltH,'#ffffff');}
    const ec=f<2?'#44ff44':f<3?'#ffcc44':'#ff4444';
    rect(ctx,19,oy+24,3,2,B.DKSTL);px(ctx,20,oy+24,ec);px(ctx,21,oy+24,ec);
    rect(ctx,19,oy+22,1,2,B.STEEL);
  }
}

// ══════════════════════════════ SUPPRESSION PYLON ══════════════════════════════
const P_W=32,P_H=32,P_F=8;
function drPY(ctx){
  for(let f=0;f<P_F;f++){
    const oy=f*P_H,active=f>=2&&f<6,channel=f>=1&&f<7,muted=f>=6;
    const pulse=f>=0&&f<=2?f/2:1-(f-2)/5;
    rect(ctx,8,oy+24,16,3,B.DKSTL);rect(ctx,9,oy+24,14,3,B.STEEL);
    rect(ctx,6,oy+27,20,5,B.DKBRN);rect(ctx,7,oy+27,18,5,B.BRWN);
    rect(ctx,8,oy+26,16,1,B.STEEL);
    rect(ctx,10,oy+22,12,2,B.DKSTL);rect(ctx,11,oy+22,10,2,B.STEEL);
    rect(ctx,12,oy+20,8,2,TH.V_DK);rect(ctx,13,oy+20,6,1,TH.V_MD);
    const pH=10+Math.floor(4*Math.sin(f*Math.PI/4));
    const py=oy+9+(14-pH);
    rect(ctx,13,py,6,pH,TH.V_DK);rect(ctx,14,py,4,pH,TH.V_MD);
    const glowH=Math.floor(pH*0.7);const gy=py+Math.floor((pH-glowH)/2);
    const gc=active?`rgb(${Math.round(102+68*pulse)},${Math.round(51+119*pulse)},${Math.round(204+51*pulse)})`:channel?(muted?`rgb(153,153,68)`:`rgb(85,34,136)`):TH.V_DK;
    rect(ctx,15,gy,2,glowH,gc);
    const ringW=active?10+Math.floor(2*Math.sin(f*1.5)):8;
    const rx=16-Math.floor(ringW/2);
    if(active){rect(ctx,rx,oy+16,ringW,1,`rgb(${Math.round(102+68*pulse)},${Math.round(51+119*pulse)},${Math.round(204+51*pulse)})`);rect(ctx,rx,oy+17,ringW,1,`rgb(${Math.round(136+34*pulse)},${Math.round(68+102*pulse)},${Math.round(238+17*pulse)})`);}
    else{rect(ctx,rx,oy+16,ringW,1,TH.V_MD);rect(ctx,rx,oy+17,ringW,1,TH.V_DK);}
    for(let i=0;i<3;i++){const sx=13+i*3;rect(ctx,sx,py-1,1,2,TH.V_MD);px(ctx,sx,py-2,TH.V_MD);}
    if(active){const ac=`rgb(${Math.round(102+68*pulse)},${Math.round(51+119*pulse)},${Math.round(204+51*pulse)})`;rect(ctx,14,py-3,4,1,ac);px(ctx,15,py-4,ac);px(ctx,16,py-4,TH.V_LT);px(ctx,17,py-4,ac);}
    const runeC=active?`rgb(${Math.round(102-102*pulse)},${Math.round(204-153*pulse)},${Math.round(204-153*pulse)})`:`rgb(34,17,68)`;
    px(ctx,16,oy+12,runeC);px(ctx,15,oy+13,runeC);px(ctx,17,oy+13,runeC);
    px(ctx,16,oy+14,runeC);
    if(active){const gC=`rgb(${Math.round(102+68*pulse)},${Math.round(51+119*pulse)},${Math.round(204+51*pulse)})`;for(let i=0;i<3;i++)px(ctx,10+i*2,oy+17,gC);px(ctx,16,oy+14,wa(gC,pulse*0.5));}
    rect(ctx,9,oy+13,2,3,B.DKSTL);rect(ctx,21,oy+13,2,3,B.DKSTL);
    px(ctx,9,oy+12,B.STEEL);px(ctx,22,oy+12,B.STEEL);
    if(active||muted){const vc=muted?`rgb(51,34,68)`:`rgb(136,68,204)`;px(ctx,10,oy+14,vc);px(ctx,21,oy+14,vc);}
  }
}

// ══════════════════════════════ VOSS'S THRONE ══════════════════════════════
const TH_W=84,TH_H=84,TH_F=5;

function dmgT(fi){return fi/(TH_F-1);}

function b3d(ctx,x,y,w,h,dk,md,lt,hi,outline=TH.OUTLINE){
  rect(ctx,x,y,w,h,dk);rect(ctx,x,y,w,1,md);rect(ctx,x+1,y,w-2,1,hi);
  rect(ctx,x,y+1,1,h-1,md);rect(ctx,x+1,y+1,1,h-2,lt);
  rect(ctx,x+w-1,y+1,1,h-2,outline);rect(ctx,x+w-2,y+2,1,h-3,dk);
  rect(ctx,x+1,y+h-1,w-1,1,outline);rect(ctx,x+1,y+h-2,w-2,1,dk);
}

function gb(ctx,x,y,w,h,dim=false){
  if(h<1)return;
  const top=dim?TH.GOLD_MD:TH.GOLD_HI,mid=dim?TH.GOLD_DK:TH.GOLD_MD,bot=dim?'#775533':TH.GOLD_DK;
  rect(ctx,x,y,w,h,mid);rect(ctx,x,y,w,1,top);
  if(h>1)rect(ctx,x,y+h-1,w,1,bot);
  if(w>2&&h>1){rect(ctx,x+1,y+1,1,h-2,top);rect(ctx,x+w-1,y+1,1,h-2,bot);}
}

function drOB(ctx,sx,sy,h,dmg,fracFrac){
  const W=6,broken=dmg>=0.85,fractured=dmg>=fracFrac&&!broken,cropTop=broken?Math.floor(h*0.35):0;
  const sDk=dmg<0.6?TH.STL_DK:'#333344',sHi=dmg<0.3?TH.STL_HI:TH.STL_LT,sLt=dmg<0.5?TH.STL_LT:TH.STL_MD;
  rect(ctx,sx,sy+cropTop,W,h-cropTop,sDk);rect(ctx,sx,sy+cropTop,W,1,sHi);
  rect(ctx,sx,sy+cropTop,1,h-cropTop,sLt);rect(ctx,sx+1,sy+cropTop,1,h-cropTop-2,sHi);
  rect(ctx,sx+2,sy+cropTop+1,W-4,h-cropTop-2,sLt);rect(ctx,sx+W-2,sy+cropTop+1,1,h-cropTop-1,sDk);
  rect(ctx,sx+W-1,sy+cropTop,1,h-cropTop,TH.OUTLINE);rect(ctx,sx,sy+h-1,W,1,TH.OUTLINE);
  if(!broken){
    const capY=sy-4;
    if(!fractured){
      px(ctx,sx+2,capY,TH.BRZ_HI);px(ctx,sx+3,capY,TH.GOLD_HI);px(ctx,sx+2,capY+1,TH.GOLD_HI);px(ctx,sx+3,capY+1,TH.STL_HI);
      px(ctx,sx+1,capY+2,TH.STL_MD);px(ctx,sx+4,capY+2,TH.STL_DK);rect(ctx,sx+2,capY+2,2,2,TH.BRZ_MD);px(ctx,sx+1,capY+3,TH.BRZ_DK);
    }else{rect(ctx,sx+1,capY+1,4,3,TH.STL_DK);px(ctx,sx+2,capY+1,TH.STL_MD);}
  }
  for(const by of[sy+8,sy+16,sy+24]){if(by<sy+cropTop)continue;rect(ctx,sx,by,W,1,TH.OUTLINE);rect(ctx,sx+1,by,W-2,1,dmg<0.5?TH.GOLD_MD:TH.GOLD_DK);}
  gb(ctx,sx-1,sy+h-4,W+2,2,dmg>=0.7);rect(ctx,sx-1,sy+h-1,W+2,1,TH.OUTLINE);
  if(fractured){rect(ctx,sx,sy+Math.floor(h*0.5),W,1,TH.OUTLINE);rect(ctx,sx+2,sy+Math.floor(h*0.65),1,2,TH.OUTLINE);}
  if(broken){px(ctx,sx+1,sy+cropTop,TH.OUTLINE);px(ctx,sx+3,sy+cropTop-1,TH.OUTLINE);}
  const rivetCol=dmg<0.5?B.RIVET:B.DKRIV;
  for(let ry=sy+4;ry<sy+h-2;ry+=6){if(ry<sy+cropTop)continue;px(ctx,sx+1,ry,rivetCol);px(ctx,sx+4,ry,rivetCol);}
}

function drVF(ctx,mX,mY,dmg){
  if(dmg>=1)return;
  const robeH=14,robeDk=dmg<0.85?TH.ROBE_DK:TH.STL_DK,robeMd=dmg<0.6?TH.ROBE_MD:TH.ROBE_DK,robeHi=dmg<0.3?TH.ROBE_HI:TH.ROBE_MD;
  for(let i=0;i<robeH;i++){const w=8+Math.floor(i*0.5);rect(ctx,mX-Math.floor(w/2),mY+i,w,1,i<5?robeDk:i<10?robeMd:robeHi);}
  for(let i=0;i<robeH;i++){const w=8+Math.floor(i*0.5);px(ctx,mX-Math.floor(w/2),mY+i,TH.OUTLINE);px(ctx,mX-Math.floor(w/2)+w-1,mY+i,TH.OUTLINE);}
  rect(ctx,mX-4,mY-8,8,8,TH.STL_DK);rect(ctx,mX-3,mY-8,6,8,TH.STL_MD);rect(ctx,mX-3,mY-8,1,8,TH.STL_LT);
  if(dmg<0.5){px(ctx,mX-1,mY-5,TH.V_LT);px(ctx,mX,mY-5,TH.V_GLOW);px(ctx,mX+1,mY-5,TH.V_LT);px(ctx,mX,mY-6,TH.V_PALE);px(ctx,mX,mY-4,TH.V_MD);}
  if(dmg<0.85){rect(ctx,mX-6,mY-8,2,3,TH.BRZ_DK);rect(ctx,mX+4,mY-8,2,3,TH.BRZ_DK);px(ctx,mX-6,mY-8,TH.BRZ_HI);px(ctx,mX+5,mY-8,TH.BRZ_HI);}
  if(dmg<0.85){rect(ctx,mX-3,mY-13,6,5,TH.STL_DK);rect(ctx,mX-2,mY-13,4,5,TH.STL_MD);rect(ctx,mX-2,mY-13,1,5,TH.STL_LT);px(ctx,mX,mY-14,TH.BRZ_MD);px(ctx,mX-1,mY-14,TH.BRZ_DK);px(ctx,mX+1,mY-14,TH.BRZ_DK);rect(ctx,mX-2,mY-10,4,2,'#0a0a12');if(dmg<0.5){px(ctx,mX-1,mY-10,TH.V_GLOW);px(ctx,mX+1,mY-10,TH.V_GLOW);}}
  if(dmg<0.7){px(ctx,mX-5,mY-2,TH.GOLD_MD);px(ctx,mX+5,mY-2,TH.GOLD_MD);rect(ctx,mX-6,mY-1,2,2,TH.STL_DK);rect(ctx,mX+4,mY-1,2,2,TH.STL_DK);if(dmg<0.3){px(ctx,mX-5,mY-1,TH.V_LT);px(ctx,mX+5,mY-1,TH.V_LT);}}
}

function drTE(ctx,ox,cyBottom,dmg){
  if(dmg<0.5)return;
  const count=Math.floor((dmg-0.5)*20);
  for(let i=0;i<count;i++){const ex=ox+14+((i*13)%(TH_W-28)),ey=cyBottom-14-((i*7)%28);px(ctx,ex,ey,i%3===0?TH.FLAME:i%2===0?T.DKORG:TH.SMOKE);}
}

function drSV(ctx,sx,sy,dmg){
  if(dmg>0.9)return;
  const intensity=dmg<0.35?3:dmg<0.66?2:1;
  for(let i=0;i<intensity;i++){const dx=Math.round(Math.sin(i*1.5)*1.5);px(ctx,sx+dx,sy-i,i<1?B.LTSMK:B.SMOKE);}
}

function drTH(ctx,ox,oy,fi){
  const cx=ox+TH_W/2,cyB=oy+TH_H-2,dmg=dmgT(fi);
  // Dais
  b3d(ctx,ox+6,cyB-8,TH_W-12,8,TH.STL_DK,TH.STL_MD,TH.STL_LT,TH.STL_HI);
  gb(ctx,ox+6,cyB-8,TH_W-12,1,dmg>=0.5);
  b3d(ctx,ox+14,cyB-14,TH_W-28,6,TH.BRZ_DK,TH.BRZ_MD,TH.BRZ_HI,TH.BRZ_HI);
  b3d(ctx,ox+26,cyB-20,TH_W-52,6,TH.STL_DK,TH.STL_MD,TH.STL_LT,TH.STL_HI);
  gb(ctx,ox+26,cyB-20,TH_W-52,1,dmg>=0.5);
  if(dmg>=0.5){rect(ctx,ox+20,cyB-8,1,8,TH.OUTLINE);rect(ctx,ox+60,cyB-8,1,8,TH.OUTLINE);}
  if(dmg>=0.75){rect(ctx,ox+30,cyB-14,1,6,TH.OUTLINE);rect(ctx,ox+50,cyB-20,4,1,TH.OUTLINE);}
  // Obelisks
  drOB(ctx,ox+10,cyB-62,42,dmg,0.35);
  drOB(ctx,ox+68,cyB-62,42,dmg>=0.75?Math.min(dmg+0.15,1):dmg,0.5);
  // Pipes
  if(dmg<0.75){rect(ctx,ox+8,cyB-58,2,36,TH.STL_DK);rect(ctx,ox+9,cyB-58,1,36,TH.STL_MD);rect(ctx,ox+74,cyB-58,2,36,TH.STL_DK);rect(ctx,ox+74,cyB-58,1,36,TH.STL_MD);for(let jy=cyB-50;jy<cyB-10;jy+=12){rect(ctx,ox+7,jy,4,1,TH.BRZ_MD);rect(ctx,ox+73,jy,4,1,TH.BRZ_MD);}drSV(ctx,ox+9,cyB-60,dmg);drSV(ctx,ox+75,cyB-60,dmg);}
  // Canopy
  const canopyY=cyB-64,lintelW=58,lintelX=cx-lintelW/2,peakH=12,partial=dmg>=0.7&&dmg<0.85,collapsed=dmg>=0.85;
  if(!collapsed){
    if(partial){const breakX=lintelX+Math.floor(lintelW*0.6);rect(ctx,lintelX,canopyY,breakX-lintelX,3,TH.STL_DK);rect(ctx,lintelX,canopyY,breakX-lintelX,1,TH.BRZ_DK);px(ctx,breakX,canopyY+1,TH.OUTLINE);const stubX=lintelX+lintelW-6;rect(ctx,stubX,canopyY,6,3,TH.STL_DK);px(ctx,stubX-1,canopyY+1,TH.OUTLINE);}
    else{rect(ctx,lintelX,canopyY,lintelW,3,TH.STL_DK);rect(ctx,lintelX,canopyY,lintelW,1,dmg<0.5?TH.BRZ_MD:TH.GOLD_DK);rect(ctx,lintelX,canopyY+2,lintelW,1,TH.OUTLINE);}
    for(let i=0;i<peakH;i++){const w=lintelW-i*3;if(w<=0)break;const sxx=cx-Math.floor(w/2),y=canopyY-i-1;if(partial){const halfW=Math.floor(w/2);rect(ctx,sxx,y,halfW,1,i<2?TH.STL_DK:i<5?TH.STL_MD:TH.STL_LT);px(ctx,sxx,y,TH.OUTLINE);if(i<peakH-2)px(ctx,sxx+halfW,y,TH.OUTLINE);}else{rect(ctx,sxx,y,w,1,i<2?TH.STL_DK:i<5?TH.STL_MD:TH.STL_LT);px(ctx,sxx,y,TH.OUTLINE);px(ctx,sxx+w-1,y,TH.OUTLINE);if(w>4)px(ctx,sxx+2,y,TH.STL_HI);}}
    if(!partial){for(let rx=lintelX+4;rx<lintelX+lintelW-4;rx+=8)px(ctx,rx,canopyY+1,B.RIVET);}
    if(dmg<0.35){for(let i=0;i<6;i++){const gx=cx-6+i*2;px(ctx,gx,canopyY+2,wa(TH.V_GLOW,0.4));px(ctx,gx,canopyY+3,wa(TH.V_LT,0.3));}px(ctx,cx,canopyY+3,TH.V_PALE);px(ctx,cx-1,canopyY+4,TH.V_GLOW);px(ctx,cx+1,canopyY+4,TH.V_GLOW);px(ctx,cx,canopyY+5,TH.V_LT);}
  }else{rect(ctx,ox+20,cyB-20,6,2,TH.STL_DK);rect(ctx,ox+36,cyB-18,4,2,TH.STL_DK);rect(ctx,ox+52,cyB-22,6,1,TH.STL_DK);px(ctx,ox+30,cyB-24,TH.OUTLINE);px(ctx,ox+58,cyB-26,TH.OUTLINE);}
  // Throne back
  if(dmg<0.85){const tbX=ox+30,tbY=cyB-44,tbW=24,tbH=24,heavyDmg=dmg>=0.7;if(heavyDmg){const cropY=tbY+10;b3d(ctx,tbX,cropY,tbW,tbH-10,TH.STL_DK,TH.STL_MD,TH.STL_LT,TH.STL_HI);gb(ctx,tbX,cropY,2,tbH-10,true);gb(ctx,tbX+tbW-2,cropY,2,tbH-10,true);}else{b3d(ctx,tbX,tbY,tbW,tbH,TH.STL_DK,TH.STL_MD,TH.STL_LT,TH.STL_HI);gb(ctx,tbX,tbY,2,tbH,dmg>=0.5);gb(ctx,tbX+tbW-2,tbY,2,tbH,dmg>=0.5);if(dmg>=0.5)rect(ctx,tbX+6,tbY+4,1,12,TH.OUTLINE);}}
  // Voss
  drVF(ctx,cx,cyB-28,dmg);
  // Embers
  drTE(ctx,ox,cyB,dmg);
  // Frame 0 glow
  if(fi===0){for(let i=0;i<6;i++){px(ctx,cx,cyB-76-i,wa(TH.V_GLOW,0.5));px(ctx,cx-1,cyB-76-i,wa(TH.V_LT,0.3));px(ctx,cx+1,cyB-76-i,wa(TH.V_LT,0.3));}}
}

// ══════════════════════════════ MAIN ══════════════════════════════
const dir='public/assets/arena';
const sheets=[
  {fn:drWS, w:WS_W, h:WS_H, f:WS_F, file:'struct_workshop.png'},
  {fn:drRD, w:R_W, h:R_H, f:R_F, file:'raider.png'},
  {fn:drGN, w:G_W, h:G_H, f:G_F, file:'struct_generator.png'},
  {fn:drPY, w:P_W, h:P_H, f:P_F, file:'struct_suppression_pylon.png'},
  {fn:(ctx)=>{for(let i=0;i<TH_F;i++)drTH(ctx,0,i*TH_H,i);}, w:TH_W, h:TH_H, f:TH_F, file:'struct_voss_throne.png'},
];

for(const s of sheets){
  const W=s.w,H=s.h*s.f;
  const c=createCanvas(W,H);const ctx=c.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  ctx.clearRect(0,0,W,H);
  s.fn(ctx);
  const out=dir+'/'+s.file;
  fs.writeFileSync(out,c.toBuffer('image/png'));
  const st=fs.statSync(out);
  console.log(s.file+'\t'+W+'x'+H+'\t'+st.size+' bytes\tok');
}
console.log('All generated.');
