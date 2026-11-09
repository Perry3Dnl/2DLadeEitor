import type {Bin,Settings} from "./layout.ts";
import {physicalBin,validateLayout,validateSettings} from "./layout.ts";
import {binarySTL,createBinTriangles} from "./stl.ts";
import {createZip} from "./zip.ts";

export type STLFile={name:string;data:ArrayBuffer};
function requireValid(bins:Bin[],settings:Settings){
 const error=validateSettings(settings)||validateLayout(bins,settings);
 if(error)throw new Error(error);
}
function makeSTL(bin:Bin,index:number,total:number,settings:Settings):STLFile{
 const shape=physicalBin(bin,settings);
 const fileId=String(index+1).padStart(String(total).length,"0");
 const dims=[shape.width,shape.depth,shape.height].map(v=>v.toFixed(1)).join("x");
 const name=`Bakje-${fileId}_${dims}mm.stl`;
 return {name,data:binarySTL(createBinTriangles(shape))};
}
/** Download one bin or all of them from exactly the same STL geometry source. */
export function exportOneBin(bins:Bin[],settings:Settings,index:number):STLFile{
 requireValid(bins,settings);
 if(!Number.isInteger(index)||index<0||index>=bins.length)
  throw new Error("Dit bakje bestaat niet meer.");
 return makeSTL(bins[index],index,bins.length,settings);
}
export function exportAllBins(bins:Bin[],settings:Settings):{zip:ArrayBuffer;names:string[]}{
 requireValid(bins,settings);
 const entries=bins.map((bin,index)=>makeSTL(bin,index,bins.length,settings));
 return {zip:createZip(entries),names:entries.map(e=>e.name)};
}
