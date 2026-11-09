/** Parse exact user-entered millimetres without accepting partial or malformed values. */
export function parseSizeInput(draft:string):number|null{
 const value=draft.trim().replace(",",".");
 if(!/^\d+(?:\.\d+)?$/.test(value))return null;
 const number=Number(value);
 return Number.isFinite(number)?number:null;
}
