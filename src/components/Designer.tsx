"use client";
import { useMemo,useState,useRef,useEffect } from "react";
import type {PointerEvent as ReactPointerEvent,KeyboardEvent as ReactKeyboardEvent} from "react";
import {Bin,Settings,defaults,makeGrid,splitBin,mergeBins,physicalBin,validateSettings,validateLayout} from "@/lib/layout";
import {exportAllBins,exportOneBin} from "@/lib/export-all";
import {fitBinSize,type SizingAxis} from "@/lib/size-bin";
import {previewBin} from "@/lib/preview";
import {getCellCorners,moveCellCorner,CornerName,getCellSides,moveCellSide,CellSideName} from "@/lib/corners";
const fmt=(v:number)=>Number.isFinite(v)?v.toFixed(1).replace(".0",""):"–";
const fields:{key:keyof Settings;label:string;step:number}[]=[
 {key:"width",label:"Ladebreedte",step:1},{key:"depth",label:"Ladediepte",step:1},
 {key:"height",label:"Bakjehoogte",step:1},{key:"wall",label:"Wanddikte",step:.1},
 {key:"floor",label:"Bodemdikte",step:.1},{key:"radius",label:"Hoekradius",step:.5},
 {key:"clearance",label:"Buitenmarge",step:.1},{key:"gap",label:"Tussenruimte",step:.1}
];
export default function Designer(){
 const [settings,setSettings]=useState<Settings>(defaults);
 const [bins,setBins]=useState<Bin[]>(()=>makeGrid(defaults.width,defaults.depth));
 const [selected,setSelected]=useState<string[]>(["bin-0"]);
 const [message,setMessage]=useState("Selecteer een bakje om de afmetingen te bekijken.");
 const [mergeMode,setMergeMode]=useState(false);
 const [dragging,setDragging]=useState(false);
 const [widthDraft,setWidthDraft]=useState("");
 const [depthDraft,setDepthDraft]=useState("");
 const dragRef=useRef<{name:CornerName;cellId:string;startX:number;startY:number;bins:Bin[];pointerId:number}|null>(null);
 const sideDragRef=useRef<{side:CellSideName;cellId:string;start:number;bins:Bin[];pointerId:number}|null>(null);
 const svgRef=useRef<SVGSVGElement>(null);
 const error=validateSettings(settings)||validateLayout(bins,settings);
 function pointMm(e:ReactPointerEvent<SVGCircleElement|SVGLineElement>){
  const matrix=svgRef.current?.getScreenCTM();
  if(!matrix)return null;
  const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
  return {x:point.x/scale,y:point.y/scale};
 }
 function startCorner(e:ReactPointerEvent<SVGCircleElement>,name:CornerName){
  if(error||!current)return;
  const point=pointMm(e);
  if(!point)return;
  e.preventDefault();e.stopPropagation();
  e.currentTarget.setPointerCapture(e.pointerId);
  dragRef.current={name,cellId:current.id,startX:point.x,startY:point.y,bins,pointerId:e.pointerId};
  setDragging(true);
  setMessage("Versleep de hoekpunt-handgreep om de aangrenzende vakken aan te passen.");
 }
 function moveCorner(e:ReactPointerEvent<SVGCircleElement>){
  const drag=dragRef.current;
  if(!drag||drag.pointerId!==e.pointerId)return;
  const point=pointMm(e);
  if(!point)return;
  const dx=Math.round((point.x-drag.startX)*10)/10;
  const dy=Math.round((point.y-drag.startY)*10)/10;
  setBins(moveCellCorner(drag.bins,drag.cellId,drag.name,dx,dy,settings));
 }
 function endCorner(e:ReactPointerEvent<SVGCircleElement>){
  if(dragRef.current?.pointerId!==e.pointerId)return;
  dragRef.current=null;setDragging(false);
 }
 function startSide(e:ReactPointerEvent<SVGLineElement>,name:CellSideName){
  if(error||!current)return;
  const point=pointMm(e);
  if(!point)return;
  e.preventDefault();e.stopPropagation();
  e.currentTarget.setPointerCapture(e.pointerId);
  const axis=name==="top"||name==="bottom"?"y":"x";
  sideDragRef.current={side:name,cellId:current.id,start:point[axis],bins,pointerId:e.pointerId};
  setDragging(true);
  setMessage("Sleep de geselecteerde rand. De aangrenzende bakjes passen zich aan.");
 }
 function moveSide(e:ReactPointerEvent<SVGLineElement>){
  const drag=sideDragRef.current;
  if(!drag||drag.pointerId!==e.pointerId)return;
  const point=pointMm(e);
  if(!point)return;
  const axis=drag.side==="top"||drag.side==="bottom"?"y":"x";
  const delta=Math.round((point[axis]-drag.start)*10)/10;
  setBins(moveCellSide(drag.bins,drag.cellId,drag.side,delta,settings));
 }
 function endSide(e:ReactPointerEvent<SVGLineElement>){
  if(sideDragRef.current?.pointerId!==e.pointerId)return;
  sideDragRef.current=null;setDragging(false);
 }
 function nudgeSide(e:ReactKeyboardEvent<SVGLineElement>,name:CellSideName){
  const step=e.shiftKey?5:1;
  const vertical=name==="left"||name==="right";
  const delta=vertical?(e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0):
   (e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0);
  if(!delta)return;
  e.preventDefault();e.stopPropagation();
  setBins(old=>moveCellSide(old,current.id,name,delta,settings));
 }
 function nudgeCorner(e:ReactKeyboardEvent<SVGCircleElement>,name:CornerName){
  const step=e.shiftKey?5:1;
  const dx=e.key==="ArrowLeft"?-step:e.key==="ArrowRight"?step:0;
  const dy=e.key==="ArrowUp"?-step:e.key==="ArrowDown"?step:0;
  if(!dx&&!dy)return;
  e.preventDefault();e.stopPropagation();
  setBins(old=>moveCellCorner(old,current.id,name,dx,dy,settings));
 }
 const current=bins.find(b=>b.id===selected[0])||bins[0];
 const shape=current?physicalBin(current,settings):null;
 useEffect(()=>{setWidthDraft(shape?fmt(shape.width):"");},[current?.id,shape?.width]);
 useEffect(()=>{setDepthDraft(shape?fmt(shape.depth):"");},[current?.id,shape?.depth]);
 const corners=useMemo(()=>getCellCorners(bins,current?.id||""),[bins,current?.id]);
 const sides=useMemo(()=>getCellSides(bins,current?.id||""),[bins,current?.id]);
 const physicalPreviews=useMemo(()=>bins.map(b=>previewBin(b,settings)),[bins,settings]);
 const scale=900/Math.max(settings.width,settings.depth,1);
 const active=useMemo(()=>new Set(selected),[selected]);
 function field(key:keyof Settings,value:number){setSettings(prev=>({...prev,[key]:value}));if(key==="width"||key==="depth"){const w=key==="width"?value:settings.width,d=key==="depth"?value:settings.depth;if(Number.isFinite(w)&&Number.isFinite(d)&&w>0&&d>0){setBins(makeGrid(w,d));setSelected(["bin-0"]);setMergeMode(false)}}}
 function select(id:string,multi=false){
  if(mergeMode){
   if(id===current.id){setMessage("Selecteer een tweede, aangrenzend vak.");return;}
   completeMerge([current.id,id]);return;
  }
  setSelected(old=>multi?(old.includes(id)?old.filter(v=>v!==id):[old[0],id].filter(Boolean)):[id]);
 }
 function split(axis:"vertical"|"horizontal"){const changed=splitBin(bins,current.id,axis);if(!changed){setMessage("Vak te klein om te splitsen.");return;}const err=validateLayout(changed,settings);if(err){setMessage(err);return;}setBins(changed);setSelected([changed.find(v=>!bins.some(o=>o.id===v.id))?.id||changed[0].id]);setMergeMode(false);setMessage("Vak gesplitst.")}
 function completeMerge(ids:string[]){
  const changed=mergeBins(bins,ids[0],ids[1]);
  if(!changed){setMessage("Deze vakken kunnen niet samengevoegd worden. Kies een aangrenzend vak waarmee een rechthoek ontstaat.");return;}
  const err=validateLayout(changed,settings);
  if(err){setMessage(err);return;}
  const combined=changed.find(v=>!bins.some(o=>o.id===v.id));
  setBins(changed);setSelected([combined?.id||changed[0].id]);
  setMergeMode(false);setMessage("Vakken samengevoegd.");
 }
 function merge(){
  if(mergeMode){setMergeMode(false);setMessage("Samenvoegen geannuleerd.");return;}
  if(selected.length===2){completeMerge(selected);return;}
  setMergeMode(true);
  setMessage("Tik of klik op het tweede vak om samen te voegen.");
 }
 function commitBinSize(axis:SizingAxis,draft:string){
  const value=draft.trim().replace(",",".");
  const reset=()=>{const currentShape=physicalBin(current,settings);
   if(axis==="width")setWidthDraft(fmt(currentShape.width));
   else setDepthDraft(fmt(currentShape.depth));
  };
  if(!/^\\d+(?:\\.\\d+)?$/.test(value)){
   reset();setMessage("Vul een geldige maat in millimeters in, bijvoorbeeld 175,5.");return;
  }
  const requested=Number(value);
  try{
   const result=fitBinSize(bins,current.id,axis,requested,settings);
   if(result.changed)setBins(result.bins);
   const actual=fmt(result.actual);
   if(axis==="width")setWidthDraft(actual);else setDepthDraft(actual);
   const label=axis==="width"?"breedte":"diepte";
   setMessage(result.adjusted?
    `De gewenste ${label} van ${fmt(requested)} mm past niet precies. De dichtstbijzijnde geldige maat is ${actual} mm.`:
    `De ${label} is ingesteld op ${actual} mm.`);
  }catch(e){reset();setMessage(e instanceof Error?e.message:"De maat kon niet worden aangepast.");}
 }
 function downloadFile(buffer:ArrayBuffer,name:string,mime:string){
  const url=URL.createObjectURL(new Blob([buffer],{type:mime}));
  const link=document.createElement("a");link.href=url;link.download=name;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function downloadOne(index:number){
  if(error)return;
  try{
   const {name,data}=exportOneBin(bins,settings,index);
   downloadFile(data,name,"model/stl");
   setMessage(`${name} gedownload. Controleer het bestand in je slicer.`);
  }catch(e){setMessage(e instanceof Error?e.message:"STL-download mislukt.");}
 }
 function exportZIP(){
  if(error)return;
  try{
   const {zip,names}=exportAllBins(bins,settings);
   downloadFile(zip,"lade-bakjes.zip","application/zip");
   setMessage(`${names.length} losse STL-bestanden zitten in lade-bakjes.zip. Controleer ze in je slicer.`);
  }catch(e){
   setMessage(e instanceof Error?e.message:"ZIP-export mislukt.");
  }
 }
 function save(){const data=new Blob([JSON.stringify({version:1,settings,bins},null,2)],{type:"application/json"}),url=URL.createObjectURL(data),a=document.createElement("a");a.href=url;a.download="lade-project.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 return <main className="wrap">
  <header><div><div className="eyebrow">PERRY3D / 3D PRINT TOOL</div><h1>2D Lade Editor</h1><p className="muted">Ontwerp losse bakjes op maat en download elk vak als STL.</p></div><span className="eyebrow">● PRIVÉ IN JE BROWSER</span></header>
  <div className="workspace"><section className="panel"><h2>Jouw lade <small className="muted">· {bins.length} bakjes</small></h2>
  <div className={dragging?"canvas is-dragging":"canvas"}><svg ref={svgRef} role="group" aria-label="Indeling van de lade" viewBox={`-18 -18 ${settings.width*scale+36} ${settings.depth*scale+36}`}>
    <rect className="outline" x="0" y="0" width={settings.width*scale} height={settings.depth*scale} rx="5"/>
    {physicalPreviews.map((p,i)=><g key={p.id} className={active.has(p.id)?"bin actual-bin active":"bin actual-bin"} role="button" tabIndex={0} aria-label={`Selecteer bakje ${i+1}, buitenmaat ${fmt(p.width)} bij ${fmt(p.depth)} millimeter`} onClick={e=>select(p.id,e.shiftKey)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(p.id,e.shiftKey)}}}>
      <rect className="bin-outer" x={p.x*scale} y={p.y*scale} width={Math.max(0,p.width*scale)} height={Math.max(0,p.depth*scale)} rx={Math.max(0,p.radius*scale)} ry={Math.max(0,p.radius*scale)}/>
      <rect className="bin-inside" x={p.inner.x*scale} y={p.inner.y*scale} width={Math.max(0,p.inner.width*scale)} height={Math.max(0,p.inner.depth*scale)} rx={Math.max(0,p.inner.radius*scale)} ry={Math.max(0,p.inner.radius*scale)}/>
      <text x={(p.x+p.width/2)*scale} y={(p.y+p.depth/2)*scale-7} textAnchor="middle">B{i+1}</text>
      <text x={(p.x+p.width/2)*scale} y={(p.y+p.depth/2)*scale+15} textAnchor="middle" style={{fontSize:13,fontWeight:400}}>{fmt(p.width)} × {fmt(p.depth)}</text>
    </g>)}
    {current&&<rect className="selected-cell-outline" pointerEvents="none"
      x={current.x*scale} y={current.y*scale}
      width={current.width*scale} height={current.depth*scale}/>}
    {sides.map(side=>{
      const vertical=side.axis==="vertical";
      const span=side.length*scale;
      const inset=Math.min(24,span/3);
      const x1=vertical?side.x*scale:side.x*scale+inset;
      const y1=vertical?side.y*scale+inset:side.y*scale;
      const x2=vertical?side.x*scale:side.x*scale+span-inset;
      const y2=vertical?side.y*scale+span-inset:side.y*scale;
      return <g key={side.name}>
        <line className={side.edgeId?"selected-side-line":"selected-side-fixed"} pointerEvents="none"
          x1={x1} y1={y1} x2={x2} y2={y2}/>
        {side.edgeId&&<line className="selected-side-hit"
          x1={x1} y1={y1} x2={x2} y2={y2}
          role="slider" tabIndex={0}
          aria-label={`Rand ${side.name} van geselecteerd bakje verplaatsen`}
          aria-valuemin={0} aria-valuemax={vertical?settings.width:settings.depth}
          aria-valuenow={Math.round(vertical?side.x:side.y)}
          onPointerDown={e=>startSide(e,side.name)}
          onPointerMove={moveSide} onPointerUp={endSide} onPointerCancel={endSide}
          onLostPointerCapture={()=>{sideDragRef.current=null;setDragging(false);}}
          onKeyDown={e=>nudgeSide(e,side.name)}
          onClick={e=>e.stopPropagation()}/>}
      </g>;
    })}
    {corners.map(corner=>{
      const enabled=Boolean(corner.verticalId||corner.horizontalId);
      return <g key={corner.name}>
        <circle className={enabled?"corner-handle":"corner-handle corner-locked"}
          cx={corner.x*scale} cy={corner.y*scale} r={8} pointerEvents="none" aria-hidden="true"/>
        {enabled&&<circle className="corner-hit"
          cx={corner.x*scale} cy={corner.y*scale} r={19}
          role="slider" tabIndex={0}
          aria-label={`Hoekpunt ${corner.name} van geselecteerd bakje verplaatsen`}
          aria-valuemin={0} aria-valuemax={settings.width+settings.depth}
          aria-valuenow={Math.round(corner.x+corner.y)}
          onPointerDown={e=>startCorner(e,corner.name)}
          onPointerMove={moveCorner}
          onPointerUp={endCorner}
          onPointerCancel={endCorner}
          onLostPointerCapture={()=>{dragRef.current=null;setDragging(false);}}
          onKeyDown={e=>nudgeCorner(e,corner.name)}
          onClick={e=>e.stopPropagation()}/>}
      </g>;
    })}
</svg></div>
    {error&&<p className="validation-error" role="alert"><strong>Controleer je instellingen:</strong> {error}</p>}
  <div className="preview-legend"><span><i className="legend-outline"/> Bakjes met echte buitenmaat, hoekradius en wanddikte</span><span><i className="legend-gap"/> Vrije ruimte door buitenmarge en tussenruimte</span></div>
  <div className="actions"><button onClick={()=>split("vertical")} disabled={!!error}>↔ Verticaal splitsen</button><button onClick={()=>split("horizontal")} disabled={!!error}>↕ Horizontaal splitsen</button><button onClick={merge} disabled={!!error}>{mergeMode?"Annuleer samenvoegen":"Vakken samenvoegen"}</button><button onClick={()=>{setBins(makeGrid(settings.width,settings.depth));setSelected(["bin-0"]);setMergeMode(false);setMessage("3 × 2 raster hersteld.")}} disabled={!!validateSettings(settings)}>Herstel 3 × 2</button></div>
  </section>
  <aside className="side"><section className="panel"><h2>Afmetingen en printinstellingen</h2><div className="fields">{fields.map(f=><label className="field" key={f.key}>{f.label} (mm)<input type="number" value={settings[f.key]} step={f.step} min="0" onChange={e=>field(f.key,e.target.valueAsNumber)}/></label>)}</div><p className="hint">Wanneer je de ladematen wijzigt wordt de 3 × 2 indeling opnieuw berekend. Selecteer een vak en versleep de randen of hoekpunten. De tekening toont de echte buitenmaten, wanddikte, ronde hoeken en vrije ruimtes van de te printen bakjes.</p></section>
  <section className="panel"><h2>Geselecteerd bakje {current?(`B${bins.findIndex(b=>b.id===current.id)+1}`):""}</h2>
  {shape&&<><div className="fields size-fields">
    <label className="field">Breedte (mm)
      <input type="text" inputMode="decimal" aria-label="Breedte van geselecteerd bakje in millimeters"
        value={widthDraft} onChange={e=>setWidthDraft(e.target.value)}
        onBlur={()=>commitBinSize("width",widthDraft)}
        onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/>
    </label>
    <label className="field">Diepte (mm)
      <input type="text" inputMode="decimal" aria-label="Diepte van geselecteerd bakje in millimeters"
        value={depthDraft} onChange={e=>setDepthDraft(e.target.value)}
        onBlur={()=>commitBinSize("depth",depthDraft)}
        onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/>
    </label>
  </div>
  <p className="hint">Voer de buitenmaat van je bakje in. Als die niet precies past, gebruiken we automatisch de dichtstbijzijnde geldige maat.</p>
  <div className="metrics"><span>Hoogte</span><strong>{fmt(shape.height)} mm</strong></div>
  <div className="metrics"><span>Wand / bodem</span><strong>{fmt(shape.wall)} / {fmt(shape.floor)} mm</strong></div>
  <div className="metrics"><span>Hoekradius</span><strong>{fmt(shape.radius)} mm</strong></div>
  <div className="metrics"><span>Binnenmaat</span><strong>{fmt(Math.max(0,shape.width-2*shape.wall))} × {fmt(Math.max(0,shape.depth-2*shape.wall))} mm</strong></div></>}
  <p className="alert" role="status">{error||message}</p>
  </section>
  <section className="panel"><h2>Bakjes downloaden</h2>
    <p className="hint">Download één bakje tegelijk, handig op je telefoon, of download alles als ZIP.</p>
    <div className="bin-download-list">
      {bins.map((bin,index)=>{
        const dimensions=physicalBin(bin,settings);
        return <div className={current.id===bin.id?"bin-download-row is-selected":"bin-download-row"} key={bin.id}>
          <div className="bin-download-info">
            <strong>Bakje B{index+1}</strong>
            <span>{fmt(dimensions.width)} × {fmt(dimensions.depth)} × {fmt(dimensions.height)} mm</span>
          </div>
          <button type="button" aria-label={`Download STL van bakje B${index+1}`}
            onClick={()=>downloadOne(index)} disabled={!!error}>STL ↓</button>
        </div>;
      })}
    </div>
    <button className="primary" onClick={exportZIP} disabled={!!error}>↓ Download alle bakjes als ZIP ({bins.length} STL)</button>
    <button style={{width:"100%"}} onClick={save} disabled={!!error}>Bewaar project als JSON</button>
  </section></aside></div>
  <footer>Versie 0.1 · Build {process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0,8)||"lokaal"} · STL's controleren in de slicer vóór het printen.</footer>
 </main>
}