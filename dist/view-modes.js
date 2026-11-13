export const VIEW_LABELS=['運転台','前面展望','アウタービュー','沿線撮影'];
export function normalizedView(value,fallback=0){return Number.isInteger(value)&&value>=0&&value<VIEW_LABELS.length?value:fallback;}
export function replayViewMode(state,override=null){return override===null?normalizedView(state?.viewMode,2):normalizedView(override,2);}
