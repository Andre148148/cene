import { simulate, lineV, DOWN, BW, BH, HU } from './radiosity.mjs';
const t=Date.now();
const xs=[...Array(8)].map((_,i)=>60+i*(BW-120)/7), g=30, zbar=HU-g-8, leds=[],bars=[];
for(const x of xs){leds.push(...lineV(x,444,zbar-1.2,DOWN));bars.push([x-5,x+5,0,BH,zbar,zbar+8]);}
const r=simulate({leds,bars,masks:[]});console.log(BW,r.minmax.toFixed(3),r.cv.toFixed(3),r.eta.toFixed(3),r.balance.toFixed(3),((Date.now()-t)/1000)+'s');
