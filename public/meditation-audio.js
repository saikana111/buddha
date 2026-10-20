// Original synthesized bell and grove breeze. No third-party recording or chant.
export class MeditationAudio {
  async arm(){
    if(!this.context){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.25;const limiter=this.context.createDynamicsCompressor();this.master.connect(limiter);limiter.connect(this.context.destination);}
    await this.context.resume();
  }
  volume(value){if(this.master)this.master.gain.setTargetAtTime(value,this.context.currentTime,.1);}
  bell(delay=0){
    if(!this.context||this.context.state!=='running')return;
    const ctx=this.context,time=ctx.currentTime+delay;
    for(const [ratio,level,decay] of [[1,.34,9],[2.01,.12,7],[2.76,.07,5],[4.07,.025,3],[5.43,.012,2]]){
      for(const offset of [-.4,.4]){const tone=ctx.createOscillator(),gain=ctx.createGain();tone.type='sine';tone.frequency.value=196*ratio+offset;
        gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level/2,time+.012);gain.gain.exponentialRampToValueAtTime(.00001,time+decay);tone.connect(gain);gain.connect(this.master);tone.start(time);tone.stop(time+decay+.1);tone.onended=()=>{tone.disconnect();gain.disconnect();};}
    }
  }
  ambient(mode){
    this.stop();if(!this.context||mode==='silent')return;
    this.interval=setInterval(()=>this.bell(),120000);
    if(mode!=='grove')return;
    const ctx=this.context,buffer=ctx.createBuffer(1,ctx.sampleRate*8,ctx.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+.025*(Math.random()*2-1))/1.025;data[i]=last*2;}
    const noise=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();noise.buffer=buffer;noise.loop=true;filter.type='lowpass';filter.frequency.value=750;gain.gain.setValueAtTime(0,ctx.currentTime);gain.gain.linearRampToValueAtTime(.24,ctx.currentTime+3);noise.connect(filter);filter.connect(gain);gain.connect(this.master);noise.start();this.wind={noise,filter,gain};
  }
  stop(){clearInterval(this.interval);this.interval=null;if(this.wind){const {noise,filter,gain}=this.wind,time=this.context.currentTime;gain.gain.cancelScheduledValues(time);gain.gain.setTargetAtTime(0,time,.3);noise.stop(time+1);noise.onended=()=>{noise.disconnect();filter.disconnect();gain.disconnect();};this.wind=null;}}
  mute(){this.stop();if(this.context)this.context.suspend();}
}
