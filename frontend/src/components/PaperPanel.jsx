import React,{useEffect,useState}from'react';import{getPaper}from'../api/client';import{ExternalLink,BookOpen}from'lucide-react';
export default function PaperPanel({id,demoData}){
 const[data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{setData(null);setError('');if(!id)return;if(demoData){setData(demoData[id]||null);return}getPaper(id).then(setData).catch(e=>setError(e.message))},[id,demoData]);
 if(!id)return <div className="empty"><BookOpen size={28} style={{margin:'0 auto 16px'}}/><p>Select a paper node to view its findings, study conditions, and evidence.</p></div>;
 if(error)return <div className="notice danger">{error}</div>;
 if(!data)return <div className="empty"><span className="spinner"/> Loading paper...</div>;
 const p=data.paper;
 return <><div className="eyebrow">Paper details</div><h2 style={{margin:'12px 0'}}>{p.title}</h2><p className="muted small">{[p.authors,p.year,p.venue].filter(Boolean).join(' · ')}</p><div className="row" style={{margin:'12px 0'}}><span className={'tag '+(p.text_level==='full'?'teal':'amber')}>{p.text_level==='full'?'Full text':'Abstract only'}</span>{p.unverified&&<span className="tag amber">DOI unverified</span>}</div>{p.url&&<a className="small" href={p.url} target="_blank" rel="noopener noreferrer">Open source <ExternalLink size={12} style={{display:'inline'}}/></a>}
 <div className="divider"/><h3>Validated findings ({data.claims.length})</h3>{data.claims.length?data.claims.map(c=><div className="card" key={c.id}><div className="small" style={{lineHeight:1.6}}>{c.claim_text}</div><div className="row" style={{marginTop:8,flexWrap:'wrap'}}><span className="tag blue">{c.outcome_family||'Outcome unspecified'}</span><span className="tag">{c.significance||'Significance unknown'}</span></div><div className="quote">“{c.quote}”</div><div className="muted small">{[c.population,c.design,c.duration,c.location].filter(Boolean).join(' · ')}</div></div>):<div className="empty">No claims passed source quote verification. This paper is not used for contradiction verdicts.</div>}
 <div className="divider"/><h3>Abstract</h3><p className="muted small" style={{lineHeight:1.7,marginTop:10}}>{p.abstract?.slice(0,2200)||'Not available.'}</p></>;
}
