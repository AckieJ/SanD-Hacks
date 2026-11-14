import React from 'react';
const titles={stated_limitations:'Author-stated limitations',weak_evidence:'Evidence coverage flags',library_gap:'Gaps in this collection'};
export default function Gaps({flags,onSelect}){
 const groups=['stated_limitations','weak_evidence','library_gap'];
 return <><div className="eyebrow">Research gap explorer</div><h2 style={{margin:'12px 0'}}>What is still unknown?</h2><div className="notice">These are limitations in the papers examined, not proof that no research exists elsewhere.</div>{groups.map(kind=><div className="section" key={kind}><h3>{titles[kind]}</h3>{(flags||[]).filter(f=>f.kind===kind).slice(0,12).map(f=><div className="card" key={f.id}><p className="small" style={{lineHeight:1.6}}>{f.description}</p>{f.paper_id&&<button className="btn ghost" style={{marginTop:9,padding:'6px 10px'}} onClick={()=>onSelect(f.paper_id)}>View paper →</button>}</div>)}{!flags?.some(f=>f.kind===kind)&&<div className="muted small" style={{marginTop:12}}>No flagged items in this category.</div>}</div>)}</>;
}
