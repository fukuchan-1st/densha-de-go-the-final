// Optional isolated loader; the patch may also be merged into the standard catalogs.
export class TobuVehiclePack {
 constructor(id,assets){this.root=new URL(`./assets/final/vehicles/${id}/`,import.meta.url);this.assets=assets;}
 objectURL(ref){const asset=this.assets[ref.entryIndex];if(!asset)throw Error('東武車両の素材が見つかりません');return new URL(asset.file,this.root).href;}
 dimensions(ref){return this.assets[ref.entryIndex];}
 async bytes(ref){const response=await fetch(this.objectURL(ref));if(!response.ok)throw Error('東武車両の素材を読み込めません');return new Uint8Array(await response.arrayBuffer());}
}

export async function loadTobuVehiclePatch(){
 const response=await fetch(new URL('./assets/final/tobu114/vehicle-patch.json?v=116',import.meta.url));
 if(!response.ok)throw Error('東武車両データを読み込めません');return response.json();
}

/** recipes is the existing {trains:[]} catalog; packs is loadBundledTrainPacks() Map. */
export async function integrateTobuVehicles(recipes,packs){
 const patch=await loadTobuVehiclePatch();
 const ids=new Set(patch.trains.map(train=>train.id));
 recipes.trains=[...recipes.trains.filter(train=>!ids.has(train.id)),...patch.trains];
 for(const [id,assets] of Object.entries(patch.manifestTrains))packs.set(id,new TobuVehiclePack(id,assets));
 return {recipes,packs};
}
