import type {Bin,Settings} from "./layout.ts";
import {physicalBin,validateLayout,validateSettings} from "./layout.ts";
import {binarySTL,createBinTriangles} from "./stl.ts";
import {createZip} from "./zip.ts";

/** One individually printable, independently sliced STL per compartment. */
export function exportAllBins(bins:Bin[],settings:Settings):{zip:ArrayBuffer;names:string[]}{
 const error=validateSettings(settings)||validateLayout(bins,settings);
 if(error)throw new Error(error);
 const count=String(bins.length).length;
 const entries=bins.map((bin,index)=>{
  const shape=physicalBin(bin,settings);
  const fileId=String(index+1).padStart(count,"0");
  const dims=[shape.width,shape.depth,shape.height].map(v=>v.toFixed(1)).join("x");
  const name=`Bakje-${fileId}_${dims}mm.stl`;
  return {name,data:binarySTL(createBinTriangles(shape))};
 });
 return {zip:createZip(entries),names:entries.map(e=>e.name)};
}
