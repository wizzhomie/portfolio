// Hero ribbon artwork generator: per-pixel rasterised 2.5D glass ribbon.
// Usage: NODE_PATH=<playwright> node tools/gen-ribbon.js preview|final
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] || 'preview';
const OUT_W = MODE === 'final' ? 2800 : (MODE === 'mid' ? 1600 : 1000);
const DW = 1400, DH = 1150;
const SS = OUT_W / DW;
const DARK_PREVIEW = MODE === 'preview';

const html = `<!doctype html><html><body style="margin:0;background:${MODE==='preview'?'#05060b':'transparent'}">
<canvas id="c" width="${OUT_W}" height="${Math.round(OUT_W * DH / DW)}" style="width:${Math.round(OUT_W / 2)}px"></canvas>
<script>
const c = document.getElementById('c'), g = c.getContext('2d');
const DW=${DW}, DH=${DH}, SS=${SS}, BAKE_FADE=${MODE !== 'preview'};
const W=c.width, H=c.height;

const L=(()=>{const v=[-0.45,-0.62,0.66];const l=Math.hypot(...v);return v.map(x=>x/l);})();
const Hh=(()=>{const v=[L[0],L[1],L[2]+1];const l=Math.hypot(...v);return v.map(x=>x/l);})();

const ctrl=[
  {x:  60, y:1270, w:300, tw:0.35},
  {x: 120, y: 980, w:305, tw:0.75},
  {x: 200, y: 650, w:300, tw:1.15},
  {x: 320, y: 380, w:265, tw:1.55},
  {x: 560, y: 250, w:225, tw:1.95},
  {x: 790, y: 330, w:205, tw:2.35},
  {x: 800, y: 500, w:215, tw:2.75},
  {x: 640, y: 610, w:250, tw:3.15},
  {x: 570, y: 720, w:290, tw:3.55},
  {x: 760, y: 810, w:320, tw:3.95},
  {x:1080, y: 845, w:340, tw:4.35},
  {x:1480, y: 860, w:345, tw:4.75},
];
const cr=(p0,p1,p2,p3,t)=>{const t2=t*t,t3=t2*t;return 0.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);};

const N=1100, sm=[];
for(let i=0;i<N;i++){
  const f=(i/(N-1))*(ctrl.length-1), seg=Math.min(ctrl.length-2,Math.floor(f)), t=f-seg;
  const p0=ctrl[Math.max(0,seg-1)],p1=ctrl[seg],p2=ctrl[seg+1],p3=ctrl[Math.min(ctrl.length-1,seg+2)];
  sm.push({x:cr(p0.x,p1.x,p2.x,p3.x,t),y:cr(p0.y,p1.y,p2.y,p3.y,t),
           w:cr(p0.w,p1.w,p2.w,p3.w,t),tw:cr(p0.tw,p1.tw,p2.tw,p3.tw,t)});
}
for(let i=0;i<N;i++){
  const a=sm[Math.max(0,i-1)],b=sm[Math.min(N-1,i+1)];
  const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
  sm[i].tx=dx/l; sm[i].ty=dy/l; sm[i].nx=-dy/l; sm[i].ny=dx/l;
}

// ---------- per pixel rasteriser ----------
const img=g.createImageData(W,H), D=img.data;
function px(x,y, r,gg,b,a){
  if(x<0||y<0||x>=W||y>=H||a<=0.001) return;
  const i=(y*W+x)*4, sa=a*255, da=D[i+3];
  if(da===0){ D[i]=r; D[i+1]=gg; D[i+2]=b; D[i+3]=sa; return; }
  const oa=sa + da*(255-sa)/255;
  const k=da*(255-sa)/255;
  D[i]=(r*sa + D[i]*k)/oa;
  D[i+1]=(gg*sa + D[i+1]*k)/oa;
  D[i+2]=(b*sa + D[i+2]*k)/oa;
  D[i+3]=oa;
}

function tri(x0,y0,x1,y1,x2,y2, ctx){
  const minX=Math.max(0,Math.floor(Math.min(x0,x1,x2))), maxX=Math.min(W-1,Math.ceil(Math.max(x0,x1,x2)));
  const minY=Math.max(0,Math.floor(Math.min(y0,y1,y2))), maxY=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
  const d=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
  if(Math.abs(d)<1e-9) return;
  const inv=1/d;
  for(let y=minY;y<=maxY;y++){
    for(let x=minX;x<=maxX;x++){
      const pxc=x+0.5, pyc=y+0.5;
      let w0=((x1-pxc)*(y2-pyc)-(x2-pxc)*(y1-pyc))*inv;
      let w1=((x2-pxc)*(y0-pyc)-(x0-pxc)*(y2-pyc))*inv;
      let w2=1-w0-w1;
      if(w0<-0.002||w1<-0.002||w2<-0.002) continue;
      ctx(x,y,w0,w1,w2);
    }
  }
}

const A0=sm[0];
for(let i=0;i<N-1;i++){
  const s0=sm[i], s1=sm[i+1];
  const h0=s0.w*0.5, h1=s1.w*0.5;
  // corners in device px
  const L0x=(s0.x-s0.nx*h0)*SS, L0y=(s0.y-s0.ny*h0)*SS;
  const R0x=(s0.x+s0.nx*h0)*SS, R0y=(s0.y+s0.ny*h0)*SS;
  const L1x=(s1.x-s1.nx*h1)*SS, L1y=(s1.y-s1.ny*h1)*SS;
  const R1x=(s1.x+s1.nx*h1)*SS, R1y=(s1.y+s1.ny*h1)*SS;

  function paint(x,y,u,t){
    const tw=s0.tw+(s1.tw-s0.tw)*t;
    const tx=s0.tx+(s1.tx-s0.tx)*t, ty=s0.ty+(s1.ty-s0.ty)*t;
    const phi=tw+u*0.55;
    const sn=Math.sin(phi), cs=Math.cos(phi);
    const nx3=ty*sn, ny3=-tx*sn, nz3=cs;
    let diff=nx3*L[0]+ny3*L[1]+nz3*L[2]; if(diff<0) diff=0;
    const rim=Math.pow(1-Math.abs(nz3),1.7);
    let sp=nx3*Hh[0]+ny3*Hh[1]+nz3*Hh[2]; if(sp<0) sp=0;
    sp=Math.pow(sp,110);
    const au=u<0?-u:u;
    const edge=Math.pow(au,9);

    // base palette: deep navy -> electric blue, iridescent violet sheen
    const dd=Math.pow(diff,2.0);
    let r=5+ 30*dd, gg=9+ 52*dd, b=38+ 150*dd;
    // violet sheen where the surface turns away
    r+= (120-r)*rim*0.55; gg+=(70-gg)*rim*0.55; b+=(235-b)*rim*0.55;
    // iridescent film (thin-film look) drifting along the twist
    const irid=0.5+0.5*Math.sin(tw*1.35+u*1.1);
    const ik=0.20*irid;
    r+=(168-r)*ik; gg+=(96-gg)*ik; b+=(255-b)*ik;
    // ice rim on the glass edges
    r+=(110-r)*(rim*0.18+edge*0.12); gg+=(180-gg)*(rim*0.18+edge*0.12); b+=(255-b)*(rim*0.18+edge*0.12);
    // tight specular
    const spw=Math.min(0.9, sp*1.45 + edge*0.10);
    r+=(240-r)*spw; gg+=(248-gg)*spw; b+=(255-b)*spw;

    let a=0.76+0.12*rim+0.06*sp+0.06*edge;
    if(a>0.97) a=0.97;
    px(x,y, r|0, gg|0, b|0, a);
  }

  // triangle 1: L0, R0, R1  (u across)
  tri(L0x,L0y,R0x,R0y,R1x,R1y, (x,y,w0,w1,w2)=>{
    paint(x,y, -w0+w1+w2, w2);
  });
  // triangle 2: L0, R1, L1
  tri(L0x,L0y,R1x,R1y,L1x,L1y, (x,y,w0,w1,w2)=>{
    paint(x,y, -w0+w1-w2, w1+w2);
  });
}

g.putImageData(img,0,0);

// soft environmental reflection, clipped to the ribbon
g.globalCompositeOperation='source-atop';
const eg=g.createLinearGradient(0,0,W*0.35,H);
eg.addColorStop(0.00,'rgba(150,190,255,0.30)');
eg.addColorStop(0.22,'rgba(110,150,255,0.10)');
eg.addColorStop(0.52,'rgba(20,26,80,0.10)');
eg.addColorStop(0.78,'rgba(6,8,30,0.28)');
eg.addColorStop(1.00,'rgba(2,3,12,0.42)');
g.fillStyle=eg; g.fillRect(0,0,W,H);
g.globalCompositeOperation='source-over';

// ---------- bloom from the alpha mask ----------
const mask=document.createElement('canvas'); mask.width=W; mask.height=H;
const mc=mask.getContext('2d');
mc.drawImage(c,0,0);
mc.globalCompositeOperation='source-in';
mc.fillStyle='rgba(52,86,235,0.85)';
mc.fillRect(0,0,W,H);

g.globalCompositeOperation='lighter';
g.globalAlpha=0.5;
g.filter='blur(46px)';
g.drawImage(mask,0,0);
g.globalAlpha=0.35;
g.filter='blur(10px)';
g.drawImage(mask,0,0);
g.globalAlpha=1;
g.filter='none';
g.globalCompositeOperation='source-over';

// ---------- baked edge fades (so the hero can crop freely) ----------
if (BAKE_FADE) {
  g.globalCompositeOperation = 'destination-in';
  const fh = g.createLinearGradient(0, 0, W * 0.42, 0);
  fh.addColorStop(0, 'rgba(0,0,0,0)');
  fh.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  fh.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fh; g.fillRect(0, 0, W, H);

  const fv = g.createLinearGradient(0, H, 0, H * 0.72);
  fv.addColorStop(0, 'rgba(0,0,0,0)');
  fv.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = fv; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';
}

// ---------- glass sphere ----------
(function sphere(cx,cy,r){
  const halo=g.createRadialGradient(cx,cy,r*0.4,cx,cy,r*5);
  halo.addColorStop(0,'rgba(70,120,255,0.40)');
  halo.addColorStop(1,'rgba(70,120,255,0)');
  g.fillStyle=halo; g.beginPath(); g.arc(cx,cy,r*5,0,7); g.fill();
  const grd=g.createRadialGradient(cx-r*0.4,cy-r*0.45,r*0.05,cx,cy,r);
  grd.addColorStop(0,'rgba(244,250,255,0.98)');
  grd.addColorStop(0.4,'rgba(150,195,255,0.95)');
  grd.addColorStop(0.78,'rgba(46,88,215,0.95)');
  grd.addColorStop(1,'rgba(14,24,78,0.95)');
  g.fillStyle=grd; g.beginPath(); g.arc(cx,cy,r,0,7); g.fill();
  g.strokeStyle='rgba(220,238,255,0.45)'; g.lineWidth=1; g.beginPath(); g.arc(cx,cy,r,0,7); g.stroke();
})(1110*SS,372*SS,21*SS);

// ---------- orbit lines ----------
function orbit(pts,alpha,wdt){
  g.beginPath(); g.moveTo(pts[0][0]*SS,pts[0][1]*SS);
  for(let i=1;i<pts.length-1;i++){
    const xc=(pts[i][0]+pts[i+1][0])/2*SS, yc=(pts[i][1]+pts[i+1][1])/2*SS;
    g.quadraticCurveTo(pts[i][0]*SS,pts[i][1]*SS,xc,yc);
  }
  g.strokeStyle='rgba(120,168,255,'+alpha+')'; g.lineWidth=wdt*SS; g.stroke();
}
orbit([[30,250],[280,70],[600,40],[820,130],[1260,530]],0.24,1.1);
orbit([[140,1060],[540,600],[1000,650],[1290,830]],0.18,1);
orbit([[900,70],[1190,300],[1180,540],[990,1000]],0.13,1);
</script></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Math.round(OUT_W / 2) + 50, height: Math.round(OUT_W * DH / DW / 2) + 50 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  if (errs.length) console.error('ERRORS:', errs);
  const canvas = await page.$('#c');
  const out = path.join(__dirname, '..', 'assets', MODE === 'final' ? 'ribbon.png' : (MODE === 'mid' ? 'ribbon.png' : 'ribbon-preview.png'));
  await canvas.screenshot({ path: out, omitBackground: MODE !== 'preview' });
  await browser.close();
  console.log('wrote', out, fs.statSync(out).size);
})();
