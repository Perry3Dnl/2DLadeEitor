"use client";
import { useMemo,useState } from "react";
import {Bin,Settings,defaults,makeGrid,splitBin,mergeBins,physicalBin,validateSettings,validateLayout} from "@/lib/layout";
import {downloadSTL,createBinTriangles} from "@/lib/stl";
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
 const error=validateSettings(settings)||validateLayout(bins,settings);
 const current=bins.find(b=>b.id===selected[0])||bins[0];
 const shape=current?physicalBin(current,settings):null;
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
  <div className="canvas">{!error?<svg role="group" aria-label="Indeling van de lade" viewBox={`-18 -18 ${settings.width*scale+36} ${settings.depth*scale+36}`}>
    <rect className="outline" x="0" y="0" width={settings.width*scale} height={settings.depth*scale} rx="5"/>
    {bins.map((b,i)=><g key={b.id} className={active.has(b.id)?"bin active":"bin"} role="button" tabIndex={0} aria-label={`Selecteer vak ${i+1}`} onClick={e=>select(b.id,e.shiftKey)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();select(b.id,e.shiftKey)}}}>
      <rect x={b.x*scale+2} y={b.y*scale+2} width={Math.max(1,b.width*scale-4)} height={Math.max(1,b.depth*scale-4)} rx="5"/>
      <text x={(b.x+b.width/2)*scale} y={(b.y+b.depth/2)*scale-7} textAnchor="middle">B{i+1}</text>
      <text x={(b.x+b.width/2)*scale} y={(b.y+b.depth/2)*scale+15} textAnchor="middle" style={{fontSize:13,fontWeight:400}}>{fmt(b.width)} × {fmt(b.depth)}</text>
    </g>)}</svg>:<p className="error" role="alert">{error}</p>}</div>
  <div className="actions"><button onClick={()=>split("vertical")} disabled={!!error}>↔ Verticaal splitsen</button><button onClick={()=>split("horizontal")} disabled={!!error}>↕ Horizontaal splitsen</button><button onClick={merge} disabled={!!error||(!secondary&&selected.length!==2)}>Vakken samenvoegen</button><button onClick={()=>{setBins(makeGrid(settings.width,settings.depth));setSelected(["bin-0"]);setSecondary("");setMessage("3 × 2 raster hersteld.")}} disabled={!!validateSettings(settings)}>Herstel 3 × 2</button></div>
  <p className="hint">Op desktop: Shift+klik om twee vakken te selecteren. Op telefoon: selecteer een vak en kies een tweede hieronder.</p>
  <label className="field">Tweede vak selecteren (mobiel)<select value={secondary} onChange={e=>setSecondary(e.target.value)} style={{background:"#0b1b2a",color:"white",padding:10,borderRadius:8,border:"1px solid #405d70"}}><option value="">Geen</option>{bins.filter(v=>v.id!==current.id).map(v=><option key={v.id} value={v.id}>Vak {bins.indexOf(v)+1}</option>)}</select></label></section>
  <aside className="side"><section className="panel"><h2>Afmetingen en printinstellingen</h2><div className="fields">{fields.map(f=><label className="field" key={f.key}>{f.label} (mm)<input type="number" value={settings[f.key]} step={f.step} min="0" onChange={e=>field(f.key,e.target.valueAsNumber)}/></label>)}</div><p className="hint">Wanneer je de ladematen wijzigt wordt de 3 × 2 indeling opnieuw berekend. Dit is een eerste MVP: het slepen van scheidingslijnen volgt later.</p></section>
  <section className="panel"><h2>Geselecteerd bakje</h2>{shape&&<><div className="metrics"><span>Breedte</span><strong>{fmt(shape.width)} mm</strong></div><div className="metrics"><span>Diepte</span><strong>{fmt(shape.depth)} mm</strong></div><div className="metrics"><span>Hoogte</span><strong>{fmt(shape.height)} mm</strong></div><div className="metrics"><span>Wand / bodem</span><strong>{fmt(shape.wall)} / {fmt(shape.floor)} mm</strong></div><button className="primary" onClick={exportSTL} disabled={!!error}>↓ Download STL van dit bakje</button></>}<button style={{width:"100%"}} onClick={save} disabled={!!error}>Bewaar project als JSON</button><p className="alert" role="status">{error||message}</p></section></aside></div>
  <footer>Versie 0.1 · Build {process.env.NEXT_PUBLIC_COMMIT_SHA?.slice(0,8)||"lokaal"} · STL's controleren in de slicer vóór het printen.</footer>
 </main>
}