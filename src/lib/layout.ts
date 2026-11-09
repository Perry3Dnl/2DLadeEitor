export type Bin = {id:string;x:number;y:number;width:number;depth:number};
export type Settings = {width:number;depth:number;height:number;wall:number;floor:number;radius:number;clearance:number;gap:number};
export const defaults:Settings={width:600,depth:400,height:55,wall:2,floor:2.4,radius:5,clearance:1,gap:0.6};
const r=(n:number)=>Math.round(n*1000)/1000;
export function makeGrid(w:number,d:number,cols=3,rows=2):Bin[]{return Array.from({length:cols*rows},(_,i)=>{const c=i%cols,row=Math.floor(i/cols),x=r(c*w/cols),y=r(row*d/rows);return {id:"bin-"+i,x,y,width:r((c+1)*w/cols-x),depth:r((row+1)*d/rows-y)}})}
export function validateSettings(s:Settings) {
 if(!Object.values(s).every(Number.isFinite)) return "Vul bij alle velden een geldig getal in.";
 if(s.width<60||s.width>2000) return "Ladebreedte: kies 60 tot 2000 mm.";
 if(s.depth<60||s.depth>2000) return "Ladediepte: kies 60 tot 2000 mm.";
 if(s.height<3||s.height>300) return "Bakjehoogte: kies 3 tot 300 mm.";
 if(s.wall<=0) return "Wanddikte moet groter zijn dan 0 mm.";
 if(s.floor<=0||s.floor>=s.height) return "Bodemdikte moet groter zijn dan 0 en kleiner dan de bakjehoogte.";
 if(s.clearance<0) return "Buitenmarge mag niet negatief zijn.";
 if(s.gap<0) return "Tussenruimte mag niet negatief zijn.";
 if(s.radius<0) return "Hoekradius mag niet negatief zijn. Gebruik 0 mm voor rechte hoeken.";
 if(s.radius>0&&s.radius<=s.wall) return "Hoekradius: gebruik 0 mm voor rechte hoeken of kies een waarde groter dan de wanddikte.";
 return null;
}
export function physicalBin(b:Bin,s:Settings){const left=b.x<0.002?s.clearance:s.gap/2,right=Math.abs(b.x+b.width-s.width)<.002?s.clearance:s.gap/2,top=b.y<.002?s.clearance:s.gap/2,bottom=Math.abs(b.y+b.depth-s.depth)<.002?s.clearance:s.gap/2;return {width:r(b.width-left-right),depth:r(b.depth-top-bottom),height:s.height,wall:s.wall,floor:s.floor,radius:s.radius}}
let id=100;export function splitBin(bins:Bin[],selected:string,axis:"horizontal"|"vertical"){const b=bins.find(v=>v.id===selected);if(!b||(axis==="vertical"?b.width:b.depth)<60)return null;const a={...b,id:"bin-"+(++id)},c={...b,id:"bin-"+(++id)};if(axis==="vertical"){a.width=r(b.width/2);c.x=r(b.x+a.width);c.width=r(b.width-a.width)}else{a.depth=r(b.depth/2);c.y=r(b.y+a.depth);c.depth=r(b.depth-a.depth)}return bins.flatMap(v=>v.id===selected?[a,c]:[v])}
export function mergeBins(bins:Bin[],idA:string,idB:string){const a=bins.find(v=>v.id===idA),b=bins.find(v=>v.id===idB);if(!a||!b||a.id===b.id)return null;const eq=(x:number,y:number)=>Math.abs(x-y)<.002;const side=eq(a.y,b.y)&&eq(a.depth,b.depth)&&(eq(a.x+a.width,b.x)||eq(b.x+b.width,a.x));const stack=eq(a.x,b.x)&&eq(a.width,b.width)&&(eq(a.y+a.depth,b.y)||eq(b.y+b.depth,a.y));if(!side&&!stack)return null;const merged={id:"bin-"+(++id),x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:side?r(a.width+b.width):a.width,depth:stack?r(a.depth+b.depth):a.depth};return [...bins.filter(v=>v.id!==idA&&v.id!==idB),merged]}
export function validateLayout(bins:Bin[],s:Settings){if(!bins.length||bins.length>300)return "Ongeldig aantal vakken.";let area=0;for(const [index,b] of bins.entries()){if(![b.x,b.y,b.width,b.depth].every(Number.isFinite)||b.x<-.001||b.y<-.001||b.width<30||b.depth<30||b.x+b.width>s.width+.002||b.y+b.depth>s.depth+.002)return `Vak ${index+1}: ligt buiten de lade of is kleiner dan 30 mm.`;const p=physicalBin(b,s);if(p.width<=2*p.wall||p.depth<=2*p.wall||p.radius>Math.min(p.width,p.depth)/2)return `Vak ${index+1}: te weinig ruimte voor wanddikte of hoekradius. Verklein de wanddikte/hoekradius of vergroot dit vak.`;area+=b.width*b.depth;}for(let i=0;i<bins.length;i++)for(let j=i+1;j<bins.length;j++){const a=bins[i],b=bins[j];if(Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>.002&&Math.min(a.y+a.depth,b.y+b.depth)-Math.max(a.y,b.y)>.002)return "Vakken overlappen.";}if(Math.abs(area-s.width*s.depth)>.2)return "Niet de hele lade is ingedeeld.";return null}

export type Boundary={
 id:string;axis:"vertical"|"horizontal";firstId:string;secondId:string;
 firstIds:string[];secondIds:string[];x:number;y:number;length:number
};
const eq=(a:number,b:number)=>Math.abs(a-b)<.002;
type Segment={id:string;start:number;end:number};
/**
 * Find all movable interior partition segments, including T-junctions.
 * At each coordinate, group opposing sides by positive-length overlap.
 * A connected component moves as a single boundary: if one large bin faces
 * two smaller bins, all three resize together without producing a gap.
 */
export function findBoundaries(bins:Bin[]):Boundary[]{
 const results:Boundary[]=[];
 for(const axis of ["vertical","horizontal"] as const){
  const positions=new Set<number>();
  for(const b of bins){
   positions.add(axis==="vertical"?r(b.x):r(b.y));
   positions.add(axis==="vertical"?r(b.x+b.width):r(b.y+b.depth));
  }
  for(const position of positions){
   const first:Segment[]=[],second:Segment[]=[];
   for(const b of bins){
    const start=axis==="vertical"?b.y:b.x;
    const end=start+(axis==="vertical"?b.depth:b.width);
    const near=axis==="vertical"?b.x:b.y;
    const far=axis==="vertical"?b.x+b.width:b.y+b.depth;
    if(eq(far,position))first.push({id:b.id,start,end});
    if(eq(near,position))second.push({id:b.id,start,end});
   }
   const links:{a:Segment;b:Segment}[]=[];
   for(const a of first)for(const b of second){
    if(Math.min(a.end,b.end)-Math.max(a.start,b.start)>.002)links.push({a,b});
   }
   const visited=new Set<number>();
   for(let i=0;i<links.length;i++){
    if(visited.has(i))continue;
    const queue=[i];visited.add(i);
    const groupA=new Set<string>(),groupB=new Set<string>();
    let start=Infinity,end=-Infinity;
    while(queue.length){
     const k=queue.pop()!,{a,b}=links[k];
     groupA.add(a.id);groupB.add(b.id);
     start=Math.min(start,Math.max(a.start,b.start));
     end=Math.max(end,Math.min(a.end,b.end));
     for(let j=0;j<links.length;j++){
      if(visited.has(j))continue;
      const candidate=links[j];
      if(candidate.a.id===a.id||candidate.b.id===b.id){
       visited.add(j);queue.push(j);
      }
     }
    }
    const firstIds=[...groupA].sort(),secondIds=[...groupB].sort();
    // IDs must remain stable while the boundary is dragged.
    const id=axis+":"+firstIds.join(",")+"|"+secondIds.join(",");
    results.push({id,axis,firstId:firstIds[0],secondId:secondIds[0],
     firstIds,secondIds,x:axis==="vertical"?position:start,
     y:axis==="horizontal"?position:start,length:r(end-start)});
   }
  }
 }
 return results.sort((a,b)=>a.axis.localeCompare(b.axis)||a.y-b.y||a.x-b.x);
}
/** Move an entire shared boundary, including all adjoining T-junction bins.
 * Delta in mm. The displacement is clamped to the nearest valid layout. */
export function moveBoundary(bins:Bin[],edge:Boundary,delta:number,s:Settings):Bin[]{
 if(!Number.isFinite(delta))return bins;
 const fresh=findBoundaries(bins).find(e=>e.id===edge.id&&e.axis===edge.axis);
 if(!fresh)return bins;
 const first=new Set(fresh.firstIds),second=new Set(fresh.secondIds);
 // Every affected bin must stay at least 30mm on the changing axis.
 const dimension=fresh.axis==="vertical"?"width":"depth";
 const neg=Math.max(...bins.filter(b=>first.has(b.id)).map(b=>30-b[dimension]));
 const pos=Math.min(...bins.filter(b=>second.has(b.id)).map(b=>b[dimension]-30));
 const requested=Math.max(neg,Math.min(pos,delta));
 function candidate(amount:number):Bin[]{
  return bins.map(b=>{
   if(first.has(b.id))return {...b,[dimension]:r(b[dimension]+amount)};
   if(second.has(b.id))return fresh.axis==="vertical"?
    {...b,x:r(b.x+amount),width:r(b.width-amount)}:
    {...b,y:r(b.y+amount),depth:r(b.depth-amount)};
   return b;
  });
 }
 let result=candidate(requested);
 if(!validateLayout(result,s))return result;
 let low=0,high=1;
 for(let i=0;i<30;i++){
  const mid=(low+high)/2;
  result=candidate(requested*mid);
  if(!validateLayout(result,s))low=mid;
  else high=mid;
 }
 return candidate(requested*low);
}
