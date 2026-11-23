const KEY='trackfinity-scenario-wallet-v1';export const SCENARIO_PRICE=1000;
export class ScenarioWallet{
 constructor(storage){this.storage=storage;this.all=[];try{this.data=JSON.parse(storage?.getItem(KEY)??'{}');}catch{this.data={};}this.data.balance=Math.max(0,Math.floor(Number(this.data.balance)||0));this.data.unlocked??={};this.data.credited??={};}
 save(){try{this.storage?.setItem(KEY,JSON.stringify(this.data));}catch{}}
 get balance(){return this.data.balance;}
 register(starters,all){this.all=[...new Set(all)];for(const key of starters)this.data.unlocked[key]=true;this.save();}
 isUnlocked(key){return !!this.data.unlocked[key];}
 purchase(key){if(this.isUnlocked(key))return true;if(!this.all.includes(key)||this.balance<SCENARIO_PRICE)return false;this.data.balance-=SCENARIO_PRICE;this.data.unlocked[key]=true;this.save();return true;}
 unlockAll(){for(const key of this.all)this.data.unlocked[key]=true;this.save();}
 settle(id,points,eligible=true){if(!id||!eligible||this.data.credited[id])return 0;const credit=Math.max(0,Math.floor(Number(points)||0));this.data.credited[id]=true;this.data.balance+=credit;this.save();return credit;}
}
export const wallet=new ScenarioWallet(globalThis.localStorage);
