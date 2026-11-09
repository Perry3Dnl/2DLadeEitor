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
  // The first axis may create a T junction and change the horizontal edge
  // membership/ID. Resolve it again at the selected corner.
  const next=getCellCorners(result,cellId).find(c=>c.name===name);
  const edge=findBoundaries(result).find(e=>e.id===next?.horizontalId);
  if(edge)result=moveBoundary(result,edge,dy,s);
 }
 return validateLayout(result,s)?bins:result;
}

export type CellSideName="top"|"right"|"bottom"|"left";
export type CellSide={name:CellSideName;axis:"vertical"|"horizontal";x:number;y:number;length:number;edgeId:string|null};
/** A side is movable only when a complete connected divider covers it.
 * Outside drawer edges stay fixed; never adjust only part of one cell wall. */
export function getCellSides(bins:Bin[],cellId:string):CellSide[]{
 const bin=bins.find(b=>b.id===cellId);
 if(!bin)return [];
 const edges=findBoundaries(bins);
 const definitions:Omit<CellSide,"edgeId">[]=[
  {name:"top",axis:"horizontal",x:bin.x,y:bin.y,length:bin.width},
  {name:"right",axis:"vertical",x:bin.x+bin.width,y:bin.y,length:bin.depth},
  {name:"bottom",axis:"horizontal",x:bin.x,y:bin.y+bin.depth,length:bin.width},
  {name:"left",axis:"vertical",x:bin.x,y:bin.y,length:bin.depth}
 ];
 return definitions.map(side=>{
  const position=side.axis==="vertical"?side.x:side.y;
  const begin=side.axis==="vertical"?side.y:side.x;
  const end=begin+side.length;
  const edge=edges.find(edge=>{
   if(edge.axis!==side.axis||!near(side.axis==="vertical"?edge.x:edge.y,position))return false;
   if(!edge.firstIds.includes(cellId)&&!edge.secondIds.includes(cellId))return false;
   // A single connected boundary must cover the complete side.
   const spans=edge.segments.slice().sort((a,b)=>a.start-b.start);
   let covered=begin;
   for(const span of spans){
    if(span.end<=covered+.002)continue;
    if(span.start>covered+.002)return false;
    covered=Math.max(covered,span.end);
    if(covered>=end-.002)return true;
   }
   return false;
  });
  return {...side,edgeId:edge?.id??null};
 });
}
/** Resize only the selected side, perpendicular to its orientation.
 * The existing partition engine enforces clearances, minimum dimensions and
 * forbids crossing other dividers. */
export function moveCellSide(bins:Bin[],cellId:string,name:CellSideName,delta:number,s:Settings):Bin[]{
 if(!Number.isFinite(delta))return bins;
 const side=getCellSides(bins,cellId).find(item=>item.name===name);
 if(!side?.edgeId)return bins;
 const edge=findBoundaries(bins).find(item=>item.id===side.edgeId);
 return edge?moveBoundary(bins,edge,delta,s):bins;
}
