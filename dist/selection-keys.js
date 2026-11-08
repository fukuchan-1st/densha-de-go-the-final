export function trainSelectionKey(code){return ({ArrowUp:'previous',ArrowDown:'next',ArrowLeft:'previousLine',ArrowRight:'nextLine',Enter:'details',Escape:'back'})[code]??null;}
export function bindTrainSelectionKeys(document,{active,previous,next,previousLine,nextLine,details,back}){
 const actions={previous,next,previousLine,nextLine,details,back};
 document.addEventListener('keydown',event=>{if(!active()||event.altKey||event.ctrlKey||event.metaKey)return;const action=trainSelectionKey(event.code);if(!action)return;event.preventDefault();event.stopImmediatePropagation();actions[action]();},true);
}
