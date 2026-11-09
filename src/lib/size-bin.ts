import type {Bin,Settings} from "./layout.ts";
import {physicalBin,validateLayout,validateSettings} from "./layout.ts";
import {moveCellSide, type CellSideName} from "./corners.ts";

export type SizingAxis="width"|"depth";
export type SizeResult={
 bins:Bin[];
 requested:number;
 actual:number;
 adjusted:boolean;
 changed:boolean;
 side:CellSideName|null;
};

/** Fit a requested OUTER STL dimension by moving one adjacent wall.
 * The existing boundary solver handles minimum dimensions, other bins and
 * topology. Compare both possible sides, selecting the closest valid answer.
 * No candidate can ever leave a partially invalid layout behind. */
export function fitBinSize(bins:Bin[],cellId:string,axis:SizingAxis,requested:number,settings:Settings):SizeResult{
 const error=validateSettings(settings)||validateLayout(bins,settings);
 if(error)throw new Error(error);
 const selected=bins.find(bin=>bin.id===cellId);
 if(!selected)throw new Error("Dit bakje bestaat niet meer.");
 if(!Number.isFinite(requested)||requested<0)throw new Error("Voer een geldige maat van 0 mm of groter in.");
 const target=Math.round(requested*10)/10;
 const current=physicalBin(selected,settings)[axis];
 const delta=target-current;
 const sides:CellSideName[]=axis==="width"?["right","left"]:["bottom","top"];
 if(Math.abs(delta)<.0001)return {bins,requested:target,actual:current,adjusted:false,changed:false,side:null};

 let best:{bins:Bin[];actual:number;error:number;side:CellSideName|null}={
  bins,actual:current,error:Math.abs(target-current),side:null
 };
 for(const side of sides){
  const displacement=(side==="left"||side==="top")?-delta:delta;
  const candidate=moveCellSide(bins,cellId,side,displacement,settings);
  if(candidate===bins)continue;
  if(validateLayout(candidate,settings))continue;
  const bin=candidate.find(b=>b.id===cellId);
  if(!bin)continue;
  const actual=physicalBin(bin,settings)[axis];
  const distance=Math.abs(target-actual);
  if(distance<best.error-.00001){
   best={bins:candidate,actual,error:distance,side};
  }
 }
 return {
  bins:best.bins,
  requested:target,
  actual:best.actual,
  adjusted:best.error>.051,
  changed:best.bins!==bins,
  side:best.side
 };
}
