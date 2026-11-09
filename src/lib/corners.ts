import type {Bin,Boundary,Settings} from "./layout.ts";
import {findBoundaries,moveBoundary,validateLayout} from "./layout.ts";

export type CornerName="tl"|"tr"|"bl"|"br";
export type CellCorner={
 name:CornerName;x:number;y:number;
 verticalId:string|null;horizontalId:string|null;
};
const near=(a:number,b:number)=>Math.abs(a-b)<.002;
function touches(edge:Boundary,position:number) {
 return edge.segments.some(segment=>segment.start-.002<=position&&segment.end+.002>=position);
}
/** The handles belong to a selected compartment, not to arbitrary global lines. */
export function getCellCorners(bins:Bin[],cellId:string):CellCorner[]{
 const bin=bins.find(b=>b.id===cellId);
 if(!bin)return [];
 const edges=findBoundaries(bins);
 const corners:CornerName[]=["tl","tr","bl","br"];
 return corners.map(name=>{
  const x=bin.x+(name.endsWith("r")?bin.width:0);
  const y=bin.y+(name.startsWith("b")?bin.depth:0);
  const belongs=(edge:Boundary)=>edge.firstIds.includes(bin.id)||edge.secondIds.includes(bin.id);
  const vertical=edges.find(edge=>edge.axis==="vertical"&&near(edge.x,x)&&belongs(edge)&&touches(edge,y));
  const horizontal=edges.find(edge=>edge.axis==="horizontal"&&near(edge.y,y)&&belongs(edge)&&touches(edge,x));
  return {name,x,y,verticalId:vertical?.id??null,horizontalId:horizontal?.id??null};
 });
}
/** Apply both axis displacements to the same snapshot; geometry checks happen
 * in the existing moveBoundary layout engine and never alter other axes. */
export function moveCellCorner(bins:Bin[],cellId:string,name:CornerName,dx:number,dy:number,s:Settings):Bin[]{
 if(!Number.isFinite(dx)||!Number.isFinite(dy))return bins;
 const corner=getCellCorners(bins,cellId).find(c=>c.name===name);
 if(!corner)return bins;
 let result=bins;
 if(corner.verticalId&&dx!==0){
  const edge=findBoundaries(result).find(e=>e.id===corner.verticalId);
  if(edge)result=moveBoundary(result,edge,dx,s);
 }
 if(corner.horizontalId&&dy!==0){
  const edge=findBoundaries(result).find(e=>e.id===corner.horizontalId);
  if(edge)result=moveBoundary(result,edge,dy,s);
 }
 return validateLayout(result,s)?bins:result;
}
