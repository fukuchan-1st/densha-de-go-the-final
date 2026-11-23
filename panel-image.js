// Wait for the load event before decode; some browsers reject an early decode.
export async function loadPanelImage(url,label,{ImageClass=Image,fetchImage=fetch,urls=URL}={}){
 let failure;
 for(let attempt=0;attempt<2;attempt++){
  let blobURL;
  try{
   let source=String(url);
   if(attempt){
    const response=await fetchImage(source,{cache:'reload'});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    blobURL=urls.createObjectURL(await response.blob());source=blobURL;
   }
   const image=new ImageClass();
   await new Promise((resolve,reject)=>{
    image.onload=resolve;image.onerror=()=>reject(Error('画像を読み込めません'));
    image.src=source;
   });
   if(image.decode){try{await image.decode();}catch(error){if(!image.naturalWidth||!image.naturalHeight)throw error;}}
   if(!image.naturalWidth||!image.naturalHeight)throw Error('画像のサイズを取得できません');
   return image;
  }catch(error){failure=error;}finally{if(blobURL)urls.revokeObjectURL(blobURL);}
 }
 throw Error(`運転台画像を読み込めません：${label}（${failure?.message??'取得失敗'}）`);
}
