// Procedural horror audio: drone + wind + heartbeat + spatial creaks/whispers + scare stingers. Voice lines (optional) loaded from /audio.
const SC=[523.25,587.33,659.25,783.99,880,1046.5],rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)]
export class GameAudio{
 constructor(){this.ctx=null;this.muted=false;this.vol=.7;this.busy=0;this.lastW=0;this.L={x:0,z:0,yaw:0};this.voices={}}
 start(cfg={}){if(this.ctx)return;const c=this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.cfg=cfg
  this.master=c.createGain();this.master.gain.value=this.muted?0:this.vol;this.comp=c.createDynamicsCompressor();this.comp.threshold.value=-14;this.comp.ratio.value=5
  this.an=c.createAnalyser();this.an.fftSize=256;this.master.connect(this.comp);this.comp.connect(this.an);this.an.connect(c.destination)
  const len=c.sampleRate*2.8,ir=c.createBuffer(2,len,c.sampleRate);for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
  this.verb=c.createConvolver();this.verb.buffer=ir;const vg=c.createGain();vg.gain.value=.55;this.verb.connect(vg);vg.connect(this.master)
  const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=nb
  // drone: detuned sub + dissonant pad with slow filter sweep
  const dl=c.createBiquadFilter();dl.type='lowpass';dl.frequency.value=260;dl.Q.value=3;const dg=c.createGain();dg.gain.value=.11;dl.connect(dg);dg.connect(this.master);dg.connect(this.verb)
  ;[41.2,55,82.4,58.3].forEach((f,i)=>{const o=c.createOscillator();o.type=i%2?'sawtooth':'triangle';o.frequency.value=f*(1+(Math.random()-.5)*.004);const g=c.createGain();g.gain.value=[.7,.5,.25,.18][i];o.connect(g);g.connect(dl);o.start()})
  const lf=c.createOscillator(),lg=c.createGain();lf.frequency.value=.07;lg.gain.value=140;lf.connect(lg);lg.connect(dl.frequency);lf.start()
  const hi=c.createOscillator(),hg=c.createGain(),hf=c.createBiquadFilter();hi.type='sine';hi.frequency.value=466.2;hg.gain.value=.0035;hf.type='bandpass';hf.frequency.value=466;const tr=c.createOscillator(),trg=c.createGain();tr.frequency.value=.23;trg.gain.value=.0035;tr.connect(trg);trg.connect(hg.gain);hi.connect(hf);hf.connect(hg);hg.connect(this.master);hi.start();tr.start()
  // wind through the window
  const w=c.createBufferSource();w.buffer=nb;w.loop=true;const wb=c.createBiquadFilter();wb.type='bandpass';wb.Q.value=1.2;wb.frequency.value=420;const wg=c.createGain();wg.gain.value=.08;const wp=c.createStereoPanner();wp.pan.value=-.6;w.connect(wb);wb.connect(wg);wg.connect(wp);wp.connect(this.master)
  const wl=c.createOscillator(),wlg=c.createGain(),wl2=c.createOscillator(),wlg2=c.createGain();wl.frequency.value=.11;wlg.gain.value=220;wl.connect(wlg);wlg.connect(wb.frequency);wl2.frequency.value=.17;wlg2.gain.value=.05;wl2.connect(wlg2);wlg2.connect(wg.gain);w.start();wl.start();wl2.start()
  this.loadVoices(cfg.voices||[])
  if(cfg.tick)this.iv=setInterval(()=>this.tick(),1000);this.sched()}
 async loadVoices(names){const base=(import.meta.env?.BASE_URL||'/')+'audio/';for(const n of names){try{const r=await fetch(base+'voice_'+n+'.mp3');if(!r.ok)continue;this.voices[n]=await this.ctx.decodeAudioData(await r.arrayBuffer())}catch{}}}
 listen(x,z,yaw){this.L.x=x;this.L.z=z;this.L.yaw=yaw}
 spat(x,z,v=1){const c=this.ctx,L=this.L,dx=x-L.x,dz=z-L.z,d=Math.hypot(dx,dz)||.01,pan=Math.max(-1,Math.min(1,(dx*Math.cos(L.yaw)+dz*-Math.sin(L.yaw))/d)),g=c.createGain();g.gain.value=v/(1+d*.5);const p=c.createStereoPanner();p.pan.value=pan*.9;g.connect(p);p.connect(this.master);const s=c.createGain();s.gain.value=.4;p.connect(s);s.connect(this.verb);return g}
 sched(){const [a,b]=this.cfg.every||[18,45];this.st=setTimeout(()=>{this.event();this.sched()},rnd(a,b)*1000)}
 burst(f,q,dur,v,dest,sweep,type='bandpass'){const c=this.ctx,s=c.createBufferSource();s.buffer=this.noise;const bp=c.createBiquadFilter();bp.type=type;bp.Q.value=q;const t=c.currentTime;bp.frequency.setValueAtTime(f,t);if(sweep)bp.frequency.linearRampToValueAtTime(sweep,t+dur)
  const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+Math.min(.02,dur*.3));g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(bp);bp.connect(g);g.connect(dest);s.start(t,rnd(0,1),dur+.05)}
 osc(type,f0,f1,dur,v,dest,t0=0){const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime+t0;o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);return o}
 dist(a=40){const c=this.ctx,w=c.createWaveShaper(),k=new Float32Array(256);for(let i=0;i<256;i++){const x=i/128-1;k[i]=Math.tanh(x*a/10)}w.curve=k;return w}
 tick(){if(!this.ctx)return;const [x,z]=this.cfg.clock||[0,0],d=this.spat(x,z,.9);this.burst(2400,9,.035,.7,d);this.osc('sine',180,120,.05,.12,d)}
 step(v=1){if(!this.ctx)return;const o=this.master;this.burst(260,1,.09,.07*v,o,180,'lowpass');if(Math.random()<.12)this.osc('sawtooth',120,70,.35,.012,this.verb)}
 creak(x,z,v=.5){const d=this.spat(x,z,v),f=rnd(110,190);const bp=this.ctx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=700;bp.Q.value=5;bp.connect(d);this.osc('sawtooth',f,f*rnd(.55,1.5),rnd(.5,.9),.14,bp)}
 whisper(name,x,z){if(!this.ctx)return;const now=Date.now()/1000,d=this.spat(x,z,name&&this.voices[name]?1.5:.6);const b=this.voices[name];if(b){const s=this.ctx.createBufferSource();s.buffer=b;s.connect(d);s.start();return}
  for(let i=0;i<7;i++)setTimeout(()=>this.burst(rnd(1400,3200),3,rnd(.15,.4),.18,d,rnd(900,3200)),i*rnd(180,380))}
 event(){if(!this.ctx)return;const r=Math.random(),ax=rnd(-4,4),az=rnd(-3,3)
  if(r<.28)this.creak(ax,az,.55)
  else if(r<.5&&Date.now()/1000-this.lastW>(this.cfg.whisperCooldown||50)){this.lastW=Date.now()/1000;const n=pick(this.cfg.voices||['x']);this.whisper(this.voices[n]?n:null,ax,az)}
  else if(r<.62){const d=this.spat(ax,az,.6);for(let i=0;i<3;i++)setTimeout(()=>{this.osc('sine',150,70,.14,.7,d);this.burst(500,2,.1,.5,d)},i*rnd(260,420))}
  else if(r<.78){const d=this.spat(-3.5,rnd(-3,3),.5);this.osc('sine',rnd(300,380),rnd(140,200),2.4,.1,d)}
  else if(r<.9){const d=this.spat(rnd(-4,4),rnd(-3,3),.35);[0,2,4,5,4,2,0].forEach((k,i)=>this.note(SC[k]*(i%2?1:.5)*(1+(Math.random()-.5)*.012),this.ctx.currentTime+i*.55,.5,.07,d))}
  else{const d=this.spat(rnd(-3,3),rnd(-3,3),.4);for(let i=0;i<3;i++)setTimeout(()=>this.burst(3200,12,.03,.5,d),i*rnd(500,1300))}}
 note(f,t,d,v=.15,dest){const c=this.ctx;dest=dest||this.master;[1,2].forEach((m,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f*m;g.gain.setValueAtTime(v/(i+1),t);g.gain.linearRampToValueAtTime(0.0001,t+d+.06);o.connect(g);g.connect(dest);o.start(t);o.stop(t+d+.1)})}
 playMorse(m,unit,done){if(!this.ctx)return;let t=this.ctx.currentTime+.1,i=0,u=unit/1000
  for(const ch of m){if(ch===' '){t+=4*u;continue}const d=(ch==='.'?1:3)*u;this.note(SC[i++%6],t,d);t+=d+u}return setTimeout(done,(t-this.ctx.currentTime)*1000)}
 // ---- scare sounds ----
 thump(x,z){if(!this.ctx)return;const d=this.spat(x,z,1.6);this.osc('sine',90,38,.35,1,d);this.burst(700,.7,.18,.9,d,300,'lowpass');this.burst(3600,6,.4,.18,d)}
 bang(x,z){if(!this.ctx)return;const d=this.spat(x,z,1.7),w=this.dist(60);w.connect(d);this.burst(400,.5,.7,1.2,w,120,'lowpass');this.osc('sine',70,26,.9,1.1,d);this.burst(2000,1,.15,.7,d);setTimeout(()=>this.osc('sine',46,30,2.2,.2,this.verb),50)}
 slam(x,z){if(!this.ctx)return;const d=this.spat(x,z,1.8);this.burst(300,.6,.5,1.3,d,100,'lowpass');this.osc('sine',110,40,.5,1,d);this.burst(1200,3,.2,.8,d);this.burst(5000,8,.25,.25,d)}
 screech(x,z){if(!this.ctx)return;const c=this.ctx,d=this.spat(x,z,1.5),w=this.dist(35),bp=c.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1500;bp.Q.value=.9;w.connect(bp);bp.connect(d)
  const o=this.osc('sawtooth',520,1450,.8,.55,w),o2=this.osc('sawtooth',540,1700,.8,.4,w),lf=c.createOscillator(),lg=c.createGain();lf.frequency.value=28;lg.gain.value=60;lf.connect(lg);lg.connect(o.frequency);lg.connect(o2.frequency);lf.start();lf.stop(c.currentTime+1)}
 stinger(v=1){if(!this.ctx)return;const c=this.ctx,g=c.createGain();g.gain.value=.36*v;g.connect(this.master);g.connect(this.verb);const w=this.dist(25);w.connect(g)
  ;[233.1,246.9,311.1,370,466.2].forEach((f,i)=>this.osc('sawtooth',f*1.0,f*(i%2?.97:1.03),1.5,.35,w));this.osc('sine',48,30,1.6,1.1,g);this.burst(900,.7,1,.7,g,200,'lowpass')}
 footsteps(x0,z0,x1,z1){if(!this.ctx)return;for(let i=0;i<9;i++)setTimeout(()=>{const k=i/8,d=this.spat(x0+(x1-x0)*k,z0+(z1-z0)*k,1.4);this.osc('sine',85,45,.12,1,d);this.burst(500,1,.08,.8,d,200,'lowpass')},i*95)}
 heartbeat(on){clearInterval(this.hb);if(!on||!this.ctx)return;const beat=()=>{if(!this.ctx)return;this.osc('sine',62,38,.16,.9,this.master);setTimeout(()=>this.ctx&&this.osc('sine',55,34,.18,.7,this.master),150)};beat();this.hb=setInterval(beat,820)}
 click(){if(this.ctx)this.note(900,this.ctx.currentTime,.03,.08)}
 good(){if(this.ctx)[660,880,1320].forEach((f,i)=>this.note(f,this.ctx.currentTime+i*.12,.2,.1))}
 bad(){if(!this.ctx)return;this.osc('sawtooth',110,70,.3,.1,this.master);this.burst(300,1,.25,.3,this.master)}
 apply(){if(this.master)this.master.gain.value=this.muted?0:this.vol}
 setMuted(m){this.muted=m;this.apply()} setVol(v){this.vol=v;this.apply()}
 dispose(){clearInterval(this.iv);clearInterval(this.hb);clearTimeout(this.st);this.ctx?.close();this.ctx=null;this.busy=0}}
