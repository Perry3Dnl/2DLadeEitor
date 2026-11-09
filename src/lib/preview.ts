import type {Bin,Settings} from "./layout.ts";
import {physicalBin} from "./layout";

/** Geometry for the actual printed object, in drawer mm (not pixels). */
export function previewBin(bin:Bin,s:Settings){
 const shape=physicalBin(bin,s);
 const left=bin.x<0.002?s.clearance:s.gap/2;
 const top=bin.y<0.002?s.clearance:s.gap/2;
 const x=bin.x+left,y=bin.y+top;
 const wall=shape.wall;
 return {
  id:bin.id,x,y,width:shape.width,depth:shape.depth,
  radius:shape.radius,wall,height:shape.height,floor:shape.floor,
  inner:{x:x+wall,y:y+wall,width:Math.max(0,shape.width-2*wall),
   depth:Math.max(0,shape.depth-2*wall),
   radius:shape.radius===0?0:Math.max(0,shape.radius-wall)}
 };
}
