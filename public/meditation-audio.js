// Recorded temple bell and bowls: attribution/license details in AUDIO-SOURCES.md.
export class MeditationAudio {
  constructor(){this.voices=new Set();this.timers=[];this.buffers={};}
  async arm(){
    if(!this.context){
      this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.25;
      const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=6;
      this.master.connect(limiter);limiter.connect(this.context.destination);
    }
    // Resume within the user's gesture, before awaiting network/decode.
    await this.context.resume();
    if(!this.loading)this.loading=Promise.all(Object.entries({bell:'temple-bell',struck:'singing-bowl-struck',rubbed:'singing-bowl-rubbed'}).map(async([key,name])=>{
      const r=await fetch(`/assets/${name}.ogg`);if(!r.ok)throw Error('Audio recording unavailable');
      const buffer=await this.context.decodeAudioData(await r.arrayBuffer());
      let peak=0;for(let c=0;c<buffer.numberOfChannels;c++)for(const value of buffer.getChannelData(c))peak=Math.max(peak,Math.abs(value));
      this.buffers[key]={buffer,scale:peak>.001?.8/peak:0};
    })).catch(error=>{this.loading=null;throw error;});
    await this.loading;
  }
  volume(value){if(this.master)this.master.gain.setTargetAtTime(value,this.context.currentTime,.2);}
  sample(key,level=1,delay=0,fade=.025){
    if(this.context?.state!=='running'||!this.buffers[key])return;
    const ctx=this.context,{buffer,scale}=this.buffers[key],source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=buffer;const time=ctx.currentTime+delay,end=time+buffer.duration;
    gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level*scale,time+fade);
    gain.gain.setValueAtTime(level*scale,Math.max(time+fade,end-1.5));gain.gain.linearRampToValueAtTime(0,end);
    source.connect(gain);gain.connect(this.master);source.start(time);this.track(source,gain);return source;
  }
  track(source,...nodes){const voice={source,nodes};this.voices.add(voice);source.onended=()=>{source.disconnect();nodes.forEach(n=>n.disconnect());this.voices.delete(voice);};}
  bell(delay=0){this.sample('bell',.65,delay);}
  flutePhrase(){
    if(this.context?.state!=='running')return;
    const ctx=this.context,start=ctx.currentTime;
    // Sparse original pentatonic phrase; breath-like attacks, not a liturgical melody.
    const phrase=[[0,293.66,5],[7,349.23,6],[16,440,5],[24,392,7],[34,293.66,8]];
    for(const [delay,freq,duration] of phrase){
      const tone=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),vibrato=ctx.createOscillator(),depth=ctx.createGain();
      tone.type='triangle';tone.frequency.value=freq;filter.type='lowpass';filter.frequency.value=950;
      vibrato.frequency.value=4.3;depth.gain.value=2.1;vibrato.connect(depth);depth.connect(tone.detune);
      const t=start+delay;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.022,t+1.3);gain.gain.setValueAtTime(.018,t+duration-1.8);gain.gain.linearRampToValueAtTime(0,t+duration);
      tone.connect(filter);filter.connect(gain);gain.connect(this.master);
      tone.start(t);vibrato.start(t);tone.stop(t+duration);vibrato.stop(t+duration);this.track(tone,filter,gain);this.track(vibrato,depth);
    }
  }
  ambient(mode){
    this.stop();if(!this.context||mode==='silent')return;
    this.timers.push(setInterval(()=>this.bell(),120000));
    if(mode!=='grove')return;
    const ctx=this.context,buffer=ctx.createBuffer(1,ctx.sampleRate*8,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+.025*(Math.random()*2-1))/1.025;data[i]=last*2;}
    const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=750;
    gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.24,ctx.currentTime+3);
    noise.connect(filter);filter.connect(gain);gain.connect(this.master);noise.start();this.track(noise,filter,gain);
    const bowls=()=>{this.sample('rubbed',.12,0,2);this.sample('struck',.16,12,.08);};
    bowls();this.flutePhrase();this.timers.push(setInterval(bowls,31000),setInterval(()=>this.flutePhrase(),57000));
  }
  stop(){
    this.timers.forEach(clearInterval);this.timers=[];
    for(const {source,nodes} of this.voices){
      const gain=nodes.find(n=>n.gain);if(gain){gain.gain.cancelScheduledValues(this.context.currentTime);gain.gain.setTargetAtTime(0,this.context.currentTime,.15);}
      try{source.stop(this.context.currentTime+.5);}catch{}
    }
  }
  mute(){this.stop();if(this.context)this.context.suspend();}
}
