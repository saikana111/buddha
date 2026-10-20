import fs from 'node:fs';
// Original synthesis: the same inharmonic partials as the live Web Audio bell.
const rate=44100,seconds=10,count=rate*seconds,samples=new Float64Array(count);
const partials=[[1,.34,9],[2.01,.12,7],[2.76,.07,5],[4.07,.025,3],[5.43,.012,2]];
for(let i=0;i<count;i++){
 const t=i/rate;let value=0;
 for(const [ratio,level,decay] of partials)for(const offset of [-.4,.4]){
  const amplitude=t<.012?(level/2)*t/.012:t<decay?(level/2)*Math.pow(.00001/(level/2),(t-.012)/(decay-.012)):0;
  value+=amplitude*Math.sin(2*Math.PI*(196*ratio+offset)*t);
 }
 samples[i]=value*.5;
}
const peak=samples.reduce((max,v)=>Math.max(max,Math.abs(v)),0);if(peak>=.95||peak<.01)throw Error('Unexpected bell peak');
const wav=Buffer.alloc(44+count*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
for(let i=0;i<count;i++)wav.writeInt16LE(Math.round(samples[i]*32767),44+i*2);
fs.writeFileSync('public/assets/meditation-bell.wav',wav);console.log(`Original bell: ${seconds}s mono PCM, peak ${peak.toFixed(3)}, no clipping.`);
