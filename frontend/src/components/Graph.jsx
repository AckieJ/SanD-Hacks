import React,{useEffect,useRef} from 'react';
import cytoscape from 'cytoscape';
const hues={supports_compatible:'#46caaa',genuine_contradiction:'#fa687f',apparent_contradiction:'#ebae58',related_not_comparable:'#768ca4',unresolved:'#b4a0ec'};
export default function Graph({data,minimum,types,onPaper,onEdge}){
 const ref=useRef(null), instance=useRef(null);
 useEffect(()=>{
  if(!data||!ref.current)return;
  const papers=data.papers.filter(p=>p.relevance>=minimum);
  const ids=new Set(papers.map(p=>p.id));
  const elements=[{data:{id:'question',label:'RESEARCH\nQUESTION',type:'question'},position:{x:0,y:0}}];
  papers.forEach((p,i)=>{
    const radius=125+(1-(p.relevance||.4))*370;
    const angle=p.angle??i*2*Math.PI/Math.max(1,papers.length);
    elements.push({data:{id:p.id,label:(p.title||'').slice(0,24)+(p.title?.length>24?'…':''),type:'paper',level:p.text_level,unverified:p.unverified,year:p.year},position:{x:radius*Math.cos(angle),y:radius*Math.sin(angle)}});
    elements.push({data:{id:'spoke-'+p.id,source:'question',target:p.id,type:'spoke'}})
  });
  data.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&types.includes(e.label)).forEach(e=>elements.push({data:{id:'edge-'+e.id,source:e.source,target:e.target,type:e.label,edgeId:e.id}}));
  const cy=cytoscape({container:ref.current,elements,layout:{name:'preset',fit:true,padding:75},
   style:[
    {selector:'node',style:{'background-color':'#183c51','border-color':'#6bd8bd','border-width':2,'label':'data(label)','color':'#c6dced','font-size':9,'text-valign':'bottom','text-margin-y':8,'text-wrap':'wrap','text-max-width':110,'width':24,'height':24,'overlay-opacity':0}},
    {selector:'node[type="question"]',style:{'background-color':'#2a716c','width':82,'height':82,'font-size':10,'text-valign':'center','text-margin-y':0,'font-weight':700,'text-outline-color':'#2a716c','text-outline-width':1,'color':'#fff'}},
    {selector:'node[level="abstract"]',style:{'border-style':'dashed'}},
    {selector:'node[unverified]',style:{'border-color':'#e6ad5a'}},
    {selector:'edge',style:{'width':2,'curve-style':'bezier','line-color':'#7991a2','opacity':.82}},
    {selector:'edge[type="spoke"]',style:{'width':.7,'line-color':'#335069','opacity':.55}},
    ...Object.entries(hues).map(([k,color])=>({selector:`edge[type="${k}"]`,style:{'line-color':color,'width':3,'line-style':k==='apparent_contradiction'?'dashed':k==='related_not_comparable'?'dotted':'solid'}}))
   ],wheelSensitivity:.25});
  cy.on('tap','node[type="paper"]',e=>onPaper(e.target.id()));
  cy.on('tap','edge',e=>{const id=e.target.data('edgeId');if(id)onEdge(id)});
  instance.current=cy;
  return()=>{cy.destroy();instance.current=null};
 },[data,minimum,types.join('|')]);
 return <div className="graph-wrap"><div ref={ref} className="graph-canvas"/><div className="graph-hint">Scroll to zoom · drag to pan · click nodes or colored connections</div></div>;
}
