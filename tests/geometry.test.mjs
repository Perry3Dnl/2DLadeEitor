import {test} from "node:test";
import assert from "node:assert/strict";
import {makeGrid,splitBin,mergeBins,physicalBin,defaults,validateLayout} from "../src/lib/layout.ts";
import {createBinTriangles,binarySTL} from "../src/lib/stl.ts";
test("grid covers drawer without overlap",()=>{const bins=makeGrid(600,400);assert.equal(bins.length,6);assert.equal(validateLayout(bins,defaults),null);assert.ok(Math.abs(bins.reduce((a,b)=>a+b.width*b.depth,0)-240000)<.2)});
test("split and merge preserve coverage",()=>{const original=makeGrid(600,400,1,1);const s=splitBin(original,original[0].id,"vertical");assert.ok(s);assert.equal(validateLayout(s,defaults),null);const m=mergeBins(s,s[0].id,s[1].id);assert.ok(m);assert.equal(validateLayout(m,defaults),null)});
test("physical dimensions account for clearance and gap",()=>{const b=makeGrid(600,400);const p=physicalBin(b[0],defaults);assert.equal(p.width,198.7);assert.equal(p.depth,198.7)});
test("binary STL triangle size and correct bounding box",()=>{const shape={width:150,depth:100,height:50,wall:2,floor:2.4,radius:5};const tris=createBinTriangles(shape);assert.ok(tris.length>100);const data=binarySTL(tris);assert.equal(data.byteLength,84+tris.length*50);const vertices=tris.flat();for(let axis=0;axis<3;axis++){assert.equal(Math.min(...vertices.map(v=>v[axis])),0);assert.equal(Math.max(...vertices.map(v=>v[axis])),[150,100,50][axis])}});
test("invalid dimensions are rejected",()=>assert.throws(()=>createBinTriangles({width:10,depth:10,height:5,wall:6,floor:2,radius:7})));
