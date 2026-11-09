import type {BinShape} from "./stl.ts";
import type {Bin,Settings} from "./layout.ts";
import {physicalBin} from "./layout.ts";

/** Reference material: standard PETG filament. Individual brands may vary. */
export const PETG_DENSITY_G_CM3=1.27;
export const MATERIAL_EUR_PER_GRAM=0.015;
export type MaterialEstimate={
 volumeMm3:number;
 volumeCm3:number;
 grams:number;
 euros:number;
};
export function roundedRectangleArea(width:number,depth:number,radius:number):number{
 if(![width,depth,radius].every(Number.isFinite)||width<=0||depth<=0||radius<0||radius>Math.min(width,depth)/2)
  throw new Error("Ongeldige afmetingen voor de volumeberekening.");
 return width*depth-(4-Math.PI)*radius*radius;
}
/** Solid material for an OPEN box, subtracting only the inner cavity above
 * the floor. Uses the same inner corner radius as the STL mesh generator.
 * This is a full-solid geometry estimate, not a slicer filament forecast. */
export function estimateBinMaterial(shape:BinShape,density=PETG_DENSITY_G_CM3,eurPerGram=MATERIAL_EUR_PER_GRAM):MaterialEstimate{
 const {width:w,depth:d,height:h,wall:t,floor:f,radius:r}=shape;
 if(![w,d,h,t,f,r,density,eurPerGram].every(Number.isFinite) ||
   w<=2*t||d<=2*t||h<=f||t<=0||f<=0||r<0||
   (r>0&&r<=t)||r>Math.min(w,d)/2||density<=0||eurPerGram<0)
  throw new Error("Ongeldige bakje- of materiaalinstellingen.");
 const outerArea=roundedRectangleArea(w,d,r);
 const innerRadius=r===0?0:r-t;
 const innerArea=roundedRectangleArea(w-2*t,d-2*t,innerRadius);
 const volumeMm3=outerArea*h-innerArea*(h-f);
 const volumeCm3=volumeMm3/1000;
 const grams=volumeCm3*density;
 return {volumeMm3,volumeCm3,grams,euros:grams*eurPerGram};
}
export function estimateDrawerMaterial(bins:Bin[],settings:Settings,density=PETG_DENSITY_G_CM3,eurPerGram=MATERIAL_EUR_PER_GRAM){
 const items=bins.map(bin=>estimateBinMaterial(physicalBin(bin,settings),density,eurPerGram));
 return {items,volumeCm3:items.reduce((v,item)=>v+item.volumeCm3,0),
  grams:items.reduce((v,item)=>v+item.grams,0),
  euros:items.reduce((v,item)=>v+item.euros,0)};
}
