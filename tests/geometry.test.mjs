import {test} from "node:test";
import assert from "node:assert/strict";
import {makeGrid,splitBin,mergeBins,physicalBin,defaults,validateLayout,validateSettings,findBoundaries,moveBoundary} from "../src/lib/layout.ts";
import {createBinTriangles,binarySTL} from "../src/lib/stl.ts";
import {previewBin} from "../src/lib/preview.ts";
test("grid covers drawer without overlap",()=>{const bins=makeGrid(600,400);assert.equal(bins.length,6);assert.equal(validateLayout(bins,defaults),null);assert.ok(Math.abs(bins.reduce((a,b)=>a+b.width*b.depth,0)-240000)<.2)});
test("split and merge preserve coverage",()=>{const original=makeGrid(600,400,1,1);const s=splitBin(original,original[0].id,"vertical");assert.ok(s);assert.equal(validateLayout(s,defaults),null);const m=mergeBins(s,s[0].id,s[1].id);assert.ok(m);assert.equal(validateLayout(m,defaults),null)});
test("physical dimensions account for clearance and gap",()=>{const b=makeGrid(600,400);const p=physicalBin(b[0],defaults);assert.equal(p.width,198.7);assert.equal(p.depth,198.7)});
test("binary STL triangle size and correct bounding box",()=>{const shape={width:150,depth:100,height:50,wall:2,floor:2.4,radius:5};const tris=createBinTriangles(shape);assert.ok(tris.length>100);const data=binarySTL(tris);assert.equal(data.byteLength,84+tris.length*50);const vertices=tris.flat();for(let axis=0;axis<3;axis++){assert.equal(Math.min(...vertices.map(v=>v[axis])),0);assert.equal(Math.max(...vertices.map(v=>v[axis])),[150,100,50][axis])}});
test("invalid dimensions are rejected",()=>assert.throws(()=>createBinTriangles({width:10,depth:10,height:5,wall:6,floor:2,radius:7})));

test("0 mm corner radius means square edges and valid STL",()=>{const shape={width:150,depth:100,height:50,wall:10,floor:2.4,radius:0};const settings={...defaults,wall:10,radius:0};assert.equal(validateSettings(settings),null);const triangles=createBinTriangles(shape);assert.equal(triangles.length,32);assert.equal(binarySTL(triangles).byteLength,84+32*50);});
test("specific validation errors guide users",()=>{assert.match(validateSettings({...defaults,radius:1})||"",/Hoekradius/);assert.match(validateSettings({...defaults,wall:0})||"",/Wanddikte/);assert.match(validateSettings({...defaults,gap:-1})||"",/Tussenruimte/);});
test("drag horizontal and vertical boundaries preserve total area",()=>{const original=makeGrid(600,400,3,2),edges=findBoundaries(original);assert.equal(edges.filter(e=>e.axis==="vertical").length,4);assert.equal(edges.filter(e=>e.axis==="horizontal").length,3);for(const edge of edges){const result=moveBoundary(original,edge,25,defaults);assert.equal(validateLayout(result,defaults),null);assert.deepEqual(result.filter(b=>![edge.firstId,edge.secondId].includes(b.id)),original.filter(b=>![edge.firstId,edge.secondId].includes(b.id)));const one=result.find(b=>b.id===edge.firstId);assert.ok(one);assert.notDeepEqual(one,original.find(b=>b.id===edge.firstId));}});
test("drag limits clamp and never create negative or overlapping bins",()=>{const original=makeGrid(600,400);const edge=findBoundaries(original)[0];const result=moveBoundary(original,edge,100000,defaults);assert.equal(validateLayout(result,defaults),null);assert.ok(result.every(b=>b.width>=30&&b.depth>=30));assert.equal(moveBoundary(original,edge,Number.NaN,defaults),original);});

test("T-junction: dragging middle vertical boundary updates all touching bins",()=>{
 const s={...defaults,width:600,depth:400};
 const b=[
  {id:"A",x:0,y:0,width:200,depth:247.4},
  {id:"B",x:200,y:0,width:259.3,depth:200},
  {id:"C",x:459.3,y:0,width:140.7,depth:200},
  {id:"D",x:0,y:247.4,width:200,depth:152.6},
  {id:"E",x:200,y:200,width:125.4,depth:200},
  {id:"F",x:325.4,y:200,width:274.6,depth:200}
 ];
 assert.equal(validateLayout(b,s),null);
 const edges=findBoundaries(b);
 const central=edges.find(e=>e.axis==="vertical"&&Math.abs(e.x-200)<.002);
 assert.ok(central);
 assert.deepEqual(central.firstIds,["A","D"]);
 assert.deepEqual(central.secondIds,["B","E"]);
 assert.equal(central.length,400);
 const updated=moveBoundary(b,central,25,s);
 assert.equal(validateLayout(updated,s),null);
 assert.equal(updated.find(v=>v.id==="A").width,225);
 assert.equal(updated.find(v=>v.id==="D").width,225);
 assert.equal(updated.find(v=>v.id==="B").x,225);
 assert.equal(updated.find(v=>v.id==="E").x,225);
 assert.deepEqual(updated.find(v=>v.id==="C"),b[2]);
 assert.deepEqual(updated.find(v=>v.id==="F"),b[5]);
 const after=findBoundaries(updated);
 assert.ok(after.some(e=>e.id===central.id&&Math.abs(e.x-225)<.002));
});
test("T-junction: horizontal boundary resizes mismatched columns together",()=>{
 const s={...defaults,width:600,depth:400};
 const b=[
  {id:"A",x:0,y:0,width:200,depth:247.4},
  {id:"B",x:200,y:0,width:259.3,depth:200},
  {id:"C",x:459.3,y:0,width:140.7,depth:200},
  {id:"D",x:0,y:247.4,width:200,depth:152.6},
  {id:"E",x:200,y:200,width:125.4,depth:200},
  {id:"F",x:325.4,y:200,width:274.6,depth:200}
 ];
 const edge=findBoundaries(b).find(e=>e.axis==="horizontal"&&Math.abs(e.y-200)<.002);
 assert.ok(edge);
 assert.deepEqual(edge.firstIds,["B","C"]);
 assert.deepEqual(edge.secondIds,["E","F"]);
 assert.equal(edge.length,400);
 const next=moveBoundary(b,edge,40,s);
 assert.equal(validateLayout(next,s),null);
 for(const id of ["B","C"])assert.equal(next.find(v=>v.id===id).depth,240);
 for(const id of ["E","F"])assert.equal(next.find(v=>v.id===id).y,240);
 assert.deepEqual(next.find(v=>v.id==="A"),b[0]);
 assert.deepEqual(next.find(v=>v.id==="D"),b[3]);
});
test("T-junction: all discovered handles preserve valid layouts under extreme moves",()=>{
 const s={...defaults,width:600,depth:400};
 const first=makeGrid(600,400);
 const top=moveBoundary(first,findBoundaries(first).find(e=>e.axis==="horizontal"&&e.x===0),47.4,s);
 const right=moveBoundary(top,findBoundaries(top).find(e=>e.axis==="vertical"&&e.x===400&&e.y===0),59.3,s);
 assert.equal(validateLayout(right,s),null);
 for(const edge of findBoundaries(right)){
  for(const delta of [-10000,-28,28,10000]){
   const updated=moveBoundary(right,edge,delta,s);
   assert.equal(validateLayout(updated,s),null,edge.id+" delta "+delta);
   assert.equal(updated.length,right.length);
  }
 }
});

test("preview reflects exact print footprint, gap and margin, not compartment dimensions",()=>{
 const bins=makeGrid(600,400),first=previewBin(bins[0],defaults);
 assert.equal(first.x,1);assert.equal(first.y,1);
 assert.equal(first.width,198.7);assert.equal(first.depth,198.7);
 assert.equal(first.inner.width,194.7);assert.equal(first.inner.depth,194.7);
 const other=previewBin(bins[1],defaults);
 assert.equal(other.x,200.3);
 assert.ok(Math.abs(other.x-(first.x+first.width)-defaults.gap)<1e-5);
});
test("preview changes with every relevant geometry setting",()=>{
 const bin=makeGrid(600,400)[0],a=previewBin(bin,defaults);
 assert.equal(previewBin(bin,{...defaults,radius:35}).radius,35);
 assert.equal(previewBin(bin,{...defaults,radius:0}).inner.radius,0);
 assert.equal(previewBin(bin,{...defaults,wall:10}).inner.width,a.inner.width-16);
 assert.equal(previewBin(bin,{...defaults,gap:20}).width,a.width-9.7);
 assert.equal(previewBin(bin,{...defaults,clearance:5}).x,5);
 assert.equal(previewBin(bin,{...defaults,height:80}).height,80);
 assert.equal(previewBin(bin,{...defaults,floor:4}).floor,4);
});
test("preview stays accurate after dragging and splitting",()=>{
 const bins=makeGrid(600,400);
 const boundary=findBoundaries(bins).find(e=>e.axis==="vertical"&&e.x===200);
 assert.ok(boundary);
 const moved=moveBoundary(bins,boundary,20,defaults);
 assert.equal(validateLayout(moved,defaults),null);
 const preview=previewBin(moved[0],defaults),physical=physicalBin(moved[0],defaults);
 assert.equal(preview.width,physical.width);
 assert.equal(preview.depth,physical.depth);
 assert.equal(preview.radius,physical.radius);
});


test("dragging past another horizontal T-junction stops at the boundary, without reordering",()=>{
 const s={...defaults,width:600,depth:400};
 const bins=[
 {id:"A",x:0,y:0,width:200,depth:249.3},
 {id:"B",x:200,y:0,width:303.2,depth:329.5},
 {id:"C",x:503.2,y:0,width:96.8,depth:329.5},
 {id:"D",x:0,y:249.3,width:200,depth:150.7},
 {id:"E",x:200,y:329.5,width:199.4,depth:70.5},
 {id:"F",x:399.4,y:329.5,width:200.6,depth:70.5}
 ];
 assert.equal(validateLayout(bins,s),null);
 const edges=findBoundaries(bins);
 const left=edges.find(e=>e.axis==="horizontal"&&Math.abs(e.y-249.3)<.002);
 const right=edges.find(e=>e.axis==="horizontal"&&Math.abs(e.y-329.5)<.002);
 assert.ok(left);assert.ok(right);
 const moved=moveBoundary(bins,left,500,s);
 assert.equal(validateLayout(moved,s),null);
 const leftAfter=findBoundaries(moved).find(e=>e.id===left.id);
 assert.ok(leftAfter,"dragged handle remains continuous");
 assert.ok(leftAfter.y<right.y,"divider must not cross next divider");
 assert.equal(moved.length,6);
 assert.equal(moved.find(b=>b.id==="B").depth,329.5);
 const movedBack=moveBoundary(bins,right,-500,s);
 assert.equal(validateLayout(movedBack,s),null);
 assert.ok(findBoundaries(movedBack).find(e=>e.id===right.id).y>left.y);
});
test("crossing vertical edges at a sideways T junction is blocked",()=>{
 const s={...defaults,width:600,depth:400};
 const bins=[
 {id:"A",x:0,y:0,width:200,depth:249.3},
 {id:"B",x:200,y:0,width:303.2,depth:329.5},
 {id:"C",x:503.2,y:0,width:96.8,depth:329.5},
 {id:"D",x:0,y:249.3,width:200,depth:150.7},
 {id:"E",x:200,y:329.5,width:199.4,depth:70.5},
 {id:"F",x:399.4,y:329.5,width:200.6,depth:70.5}
 ];
 const edges=findBoundaries(bins);
 const left=edges.find(e=>e.axis==="vertical"&&Math.abs(e.x-399.4)<.002);
 const right=edges.find(e=>e.axis==="vertical"&&Math.abs(e.x-503.2)<.002);
 assert.ok(left);assert.ok(right);
 const moved=moveBoundary(bins,left,300,s);
 assert.equal(validateLayout(moved,s),null);
 const after=findBoundaries(moved).find(e=>e.id===left.id);
 assert.ok(after);
 assert.ok(after.x<right.x);
});
test("visible guide segments only follow actual adjoining bin edges",()=>{
 const b=[
 {id:"A",x:0,y:0,width:200,depth:249.3},
 {id:"B",x:200,y:0,width:303.2,depth:329.5},
 {id:"C",x:503.2,y:0,width:96.8,depth:329.5},
 {id:"D",x:0,y:249.3,width:200,depth:150.7},
 {id:"E",x:200,y:329.5,width:199.4,depth:70.5},
 {id:"F",x:399.4,y:329.5,width:200.6,depth:70.5}
 ];
 for(const edge of findBoundaries(b)){
  for(const segment of edge.segments){
   assert.ok(segment.end>segment.start);
   const mid=(segment.start+segment.end)/2;
   const left=b.some(v=>edge.axis==="vertical"?Math.abs(v.x+v.width-edge.x)<.002&&v.y<=mid&&v.y+v.depth>=mid:Math.abs(v.y+v.depth-edge.y)<.002&&v.x<=mid&&v.x+v.width>=mid);
   const right=b.some(v=>edge.axis==="vertical"?Math.abs(v.x-edge.x)<.002&&v.y<=mid&&v.y+v.depth>=mid:Math.abs(v.y-edge.y)<.002&&v.x<=mid&&v.x+v.width>=mid);
   assert.ok(left&&right,`misleading guide ${edge.id} ${segment.start}-${segment.end}`);
  }
 }
});
