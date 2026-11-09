import type {BinShape} from "./stl.ts";
import type {Bin,Settings} from "./layout.ts";
import {physicalBin,validateLayout,validateSettings} from "./layout.ts";
import {estimateBinMaterial} from "./material-estimate.ts";

/** One known PETG print: 200×200×55 mm, 2 mm walls, 2.4 mm floor,
 * 5 mm outer radius, 6h 30m in the slicer. All times are estimates. */
export const REFERENCE_PRINT_MINUTES=390;
export const REFERENCE_BIN:BinShape={
 width:200,depth:200,height:55,wall:2,floor:2.4,radius:5
};
export const REFERENCE_PRINT_VOLUME_MM3=estimateBinMaterial(REFERENCE_BIN).volumeMm3;

/** Scale a known reference print's duration by solid geometry volume.
 * Keep density out: print time is tied to geometry, not filament density. */
export function estimateBinPrintMinutes(shape:BinShape):number{
 const material=estimateBinMaterial(shape);
 return material.volumeMm3/REFERENCE_PRINT_VOLUME_MM3*REFERENCE_PRINT_MINUTES;
}
export function estimateDrawerPrintTime(bins:Bin[],settings:Settings){
 const invalid=validateSettings(settings)||validateLayout(bins,settings);
 if(invalid)throw new Error(invalid);
 const items=bins.map(bin=>estimateBinPrintMinutes(physicalBin(bin,settings)));
 return {items,minutes:items.reduce((sum,minutes)=>sum+minutes,0)};
}
export function formatPrintMinutes(minutes:number):string{
 if(!Number.isFinite(minutes)||minutes<0)throw new Error("Ongeldige printtijd.");
 const rounded=Math.round(minutes);
 const hours=Math.floor(rounded/60);
 const mins=rounded%60;
 return hours>0?`${hours}u ${String(mins).padStart(2,"0")}m`:`${mins}m`;
}
