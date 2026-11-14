async function request(path,opts={}){
  const response=await fetch('/api'+path,opts);
  if(!response.ok){let msg='Request failed ('+response.status+')';try{const data=await response.json();msg=data.detail||data.error||msg}catch{}throw new Error(msg)}
  return response.json();
}
export function createWorkspace(question,files){const form=new FormData();form.append('question',question);files.forEach(f=>form.append('files',f));return request('/workspaces',{method:'POST',body:form})}
export const getStatus=id=>request('/workspaces/'+id+'/status');
export const getGraph=id=>request('/workspaces/'+id+'/graph');
export const getFlags=id=>request('/workspaces/'+id+'/flags');
export const getPaper=id=>request('/papers/'+id);
export const getEdge=id=>request('/edges/'+id);
export function addPaper(id,file){const form=new FormData();form.append('file',file);return request('/workspaces/'+id+'/papers',{method:'POST',body:form})}
export const sendChat=(id,message)=>request('/workspaces/'+id+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
