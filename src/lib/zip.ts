/** Produces an uncompressed, standards-compliant ZIP with CRC-32 checks.
 * STL files are already binary and small; avoiding an extra compression library
 * keeps this export available entirely offline in the browser. */
export type ZipEntry={name:string;data:ArrayBuffer};
const encoder=new TextEncoder();
const crcTable=new Uint32Array(256);
for(let n=0;n<256;n++){
 let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);
 crcTable[n]=c>>>0;
}
function crc32(bytes:Uint8Array):number{
 let crc=0xffffffff;
 for(const byte of bytes)crc=(crc>>>8)^crcTable[(crc^byte)&255];
 return (crc^0xffffffff)>>>0;
}
function u16(view:DataView,offset:number,value:number){view.setUint16(offset,value,true)}
function u32(view:DataView,offset:number,value:number){view.setUint32(offset,value>>>0,true)}
export function createZip(entries:ZipEntry[]):ArrayBuffer{
 if(!entries.length)throw new Error("Er zijn geen bakjes om te exporteren.");
 if(entries.length>65535)throw new Error("Te veel bestanden voor dit ZIP-formaat.");
 const names=new Set<string>();
 const records=entries.map(entry=>{
  if(!entry.name||entry.name.includes("/")||entry.name.includes("\\")||entry.name==="."||entry.name===".."||!entry.name.endsWith(".stl"))
   throw new Error("Ongeldige STL-bestandsnaam in het ZIP-archief.");
  if(names.has(entry.name))throw new Error("Dubbele STL-bestandsnaam in het ZIP-archief.");
  names.add(entry.name);
  const name=encoder.encode(entry.name),data=new Uint8Array(entry.data);
  if(name.length>65535)throw new Error("Bestandsnaam is te lang.");
  return {name,data,size:data.byteLength,crc:crc32(data),offset:0};
 });
 const localSize=records.reduce((sum,r)=>sum+30+r.name.length+r.size,0);
 const centralSize=records.reduce((sum,r)=>sum+46+r.name.length,0);
 const length=localSize+centralSize+22;
 if(length>0xffffffff)throw new Error("ZIP-archief is te groot.");
 const result=new ArrayBuffer(length),view=new DataView(result),bytes=new Uint8Array(result);
 let pos=0;
 for(const r of records){
  r.offset=pos;
  u32(view,pos,0x04034b50); // Local file header
  u16(view,pos+4,20);u16(view,pos+6,0x0800);u16(view,pos+8,0);
  u16(view,pos+10,0);u16(view,pos+12,0x0021); // 1980-01-01
  u32(view,pos+14,r.crc);u32(view,pos+18,r.size);u32(view,pos+22,r.size);
  u16(view,pos+26,r.name.length);u16(view,pos+28,0);
  bytes.set(r.name,pos+30);bytes.set(r.data,pos+30+r.name.length);
  pos+=30+r.name.length+r.size;
 }
 const centralOffset=pos;
 for(const r of records){
  u32(view,pos,0x02014b50); // Central directory header
  u16(view,pos+4,20);u16(view,pos+6,20);u16(view,pos+8,0x0800);
  u16(view,pos+10,0);u16(view,pos+12,0);u16(view,pos+14,0x0021);
  u32(view,pos+16,r.crc);u32(view,pos+20,r.size);u32(view,pos+24,r.size);
  u16(view,pos+28,r.name.length);u16(view,pos+30,0);u16(view,pos+32,0);
  u16(view,pos+34,0);u16(view,pos+36,0);u32(view,pos+38,0);
  u32(view,pos+42,r.offset);
  bytes.set(r.name,pos+46);pos+=46+r.name.length;
 }
 u32(view,pos,0x06054b50);u16(view,pos+4,0);u16(view,pos+6,0);
 u16(view,pos+8,records.length);u16(view,pos+10,records.length);
 u32(view,pos+12,centralSize);u32(view,pos+16,centralOffset);u16(view,pos+20,0);
 return result;
}
