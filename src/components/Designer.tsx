"use client";
import { useMemo,useState,useRef } from "react";
import type {PointerEvent as ReactPointerEvent,KeyboardEvent as ReactKeyboardEvent} from "react";
import {Bin,Settings,defaults,makeGrid,splitBin,mergeBins,physicalBin,validateSettings,validateLayout} from "@/lib/layout";
import {downloadSTL,createBinTriangles} from "@/lib/stl";
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
 const [message,setMessage]=useState("Klik op een vak om het te selecteren. Met Shift+klik selecteer je een tweede vak.");
 const [secondary,setSecondary]=useState("");
 const [dragging,setDragging]=useState(false);
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
 const corners=useMemo(()=>getCellCorners(bins,current?.id||""),[bins,current?.id]);
 const sides=useMemo(()=>getCellSides(bins,current?.id||""),[bins,current?.id]);
 const physicalPreviews=useMemo(()=>bins.map(b=>previewBin(b,settings)),[bins,settings]);
 const scale=900/Math.max(settings.width,settings.depth,1);
 const active=useMemo(()=>new Set(selected),[selected]);
 function field(key:keyof Settings,value:number){setSettings(prev=>({...prev,[key]:value}));if(key==="width"||key==="depth"){const w=key==="width"?value:settings.width,d=key==="depth"?value:settings.depth;if(Number.isFinite(w)&&Number.isFinite(d)&&w>0&&d>0){setBins(makeGrid(w,d));setSelected(["bin-0"]);setSecondary("")}}}
 function select(id:string,multi=false){setSelected(old=>multi?(old.includes(id)?old.filter(v=>v!==id):[old[0],id].filter(Boolean)):[id]);setSecondary("")}
 function split(axis:"vertical"|"horizontal"){const changed=splitBin(bins,current.id,axis);if(!changed){setMessage("Vak te klein om te splitsen.");return;}const err=validateLayout(changed,settings);if(err){setMessage(err);return;}setBins(changed);setSelected([changed.find(v=>!bins.some(o=>o.id===v.id))?.id||changed[0].id]);setMessage("Vak gesplitst.")}
 function merge(){const ids=secondary?[current.id,secondary]:selected;if(ids.length!==2){setMessage("Kies twee vakken om samen te voegen.");return;}const changed=mergeBins(bins,ids[0],ids[1]);if(!changed){setMessage("Deze twee vakken vormen samen geen rechthoek.");return;}const err=validateLayout(changed,settings);if(err){setMessage(err);return;}const combined=changed.find(v=>!bins.some(o=>o.id===v.id));setBins(changed);setSelected([combined?.id||changed[0].id]);setSecondary("");setMessage("Vakken samengevoegd.")}
 function exportSTL(){if(!shape||error)return;try{createBinTriangles(shape);downloadSTL(shape,`${current.id}_${fmt(shape.width)}x${fmt(shape.depth)}x${fmt(shape.height)}.stl`);setMessage("STL gedownload. Controleer het model in je slicer.")}catch(e){setMessage(e instanceof Error?e.message:"STL-export mislukt.")}}
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
  <div className="actions"><button onClick={()=>split("vertical")} disabled={!!error}>↔ Verticaal splitsen</button><button onClick={()=>split("horizontal")} disabled={!!error}>↕ Horizontaal splitsen</button><button onClick={merge} disabled={!!error||(!secondary&&selected.length!==2)}>Vakken samenvoegen</button><button onClick={()=>{setBins(makeGrid(settings.width,settings.depth));setSelected(["bin-0"]);setSecondary("");setMessage("3 × 2 raster hersteld.")}} disabled={!!validateSettings(settings)}>Herstel 3 × 2</button></div>
  <p className="hint">Tik of klik een vak. Sleep de turquoise randen om één richting te wijzigen, of de hoekpunten om twee richtingen tegelijk te wijzigen. De buitenranden van de lade blijven vast. Op mobiel werkt dit met je vinger. Gebruik de pijltjestoetsen voor 1 mm (Shift: 5 mm). Op desktop: Shift+klik om twee vakken te selecteren. Op telefoon: selecteer een vak en kies een tweede hieronder.</p>
  <label className="field">Tweede vak selecteren (mobiel)<select value={secondary} onChange={e=>setSecondary(e.target.value)} style={{background:"#0b1b2a",color:"white",padding:10,borderRadius:8,border:"1px solid #405d70"}}><option value="">Geen</option>{bins.filter(v=>v.id!==current.id).map(v=><option key={v.id} value={v.id}>Vak {bins.indexOf(v)+1}</option>)}</select></label></section>
  <aside className="side"><section className="panel"><h2>Afmetingen en printinstellingen</h2><div className="fields">{fields.map(f=><label className="field" key={f.key}>{f.label} (mm)<input type="number" value={settings[f.key]} step={f.step} min="0" onChange={e=>field(f.key,e.target.valueAsNumber)}/></label>)}</div><p className="hint">Wanneer je de ladematen wijzigt wordt de 3 × 2 indeling opnieuw berekend. Selecteer een vak en versleep de randen of hoekpunten. De tekening toont de echte buitenmaten, wanddikte, ronde hoeken en vrije ruimtes van de te printen bakjes.</p></section>
  <section className="panel"><h2>Geselecteerd bakje</h2>{shape&&<><div className="metrics"><span>Breedte</span><strong>{fmt(shape.width)} mm</strong></div><div className="metrics"><span>Diepte</span><strong>{fmt(shape.depth)} mm</strong></div><div className="metrics"><span>Hoogte</span><strong>{fmt(shape.height)} mm</strong></div><div className="metrics"><span>Wand / bodem</span><strong>{fmt(shape.wall)} / {fmt(shape.floor)} mm</strong></div>
  <div className="metrics"><span>Hoekradius</span><strong>{fmt(shape.radius)} mm</strong></div>
  <div className="metrics"><span>Binnenmaat</span><strong>{fmt(Math.max(0,shape.width-2*shape.wall))} × {fmt(Math.max(0,shape.depth-2*shape.wall))} mm</strong></div>
  <button className="primary" onClick={exportSTL} disabled={!!error}>↓ Download STL van dit bakje</button></>}<button style={{width:"100%"}} onClick={save} disabled={!!error}>Bewaar project als JSON</button><p className="alert" role="status">{error||message}</p></section></aside></div>
  <footer>Versie 0.1 · Build {process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0,8)||"lokaal"} · STL's controleren in de slicer vóór het printen.</footer>
 </main>
}