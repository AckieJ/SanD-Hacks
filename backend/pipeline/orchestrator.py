import json
import math
import re
import uuid
from collections import defaultdict
from difflib import SequenceMatcher
from db.database import connect,as_json
from clients.scholarly import search_openalex,search_europe_pmc,normalize_doi,resolve_crossref
from clients.brightdata import scholar_search,unlock_public
from clients.gemini import Gemini
from pipeline.pdf_parser import parse_pdf
from pipeline.scoring import radial_positions,comparable
from config.settings import settings

def validate_quote(quote,text):
    def normalize(s):return re.sub(r'\s+',' ',s or '').strip().lower()
    return len(normalize(quote))>=20 and normalize(quote) in normalize(text)

def progress(ws,stage,**extra):
    with connect() as db:
        current=db.execute('SELECT progress FROM workspaces WHERE id=%s',(ws,)).fetchone()
        if not current:return
        p=current['progress'] or {};p.update(extra);p['stage']=stage
        db.execute('UPDATE workspaces SET status=%s,progress=%s::jsonb WHERE id=%s',('running',as_json(p),ws))

def collect(query):
    results=[]
    for q in query:
        results+=search_openalex(q,20)
        results+=search_europe_pmc(q,10)
        results+=scholar_search(q,10)
    unique=[]
    for p in results:
        if not p.get('abstract') or len(p.get('abstract') or '')<100:continue
        key=normalize_doi(p.get('doi'))
        match=next((i for i,x in enumerate(unique) if key and key==normalize_doi(x.get('doi'))),None)
        if match is None:
            match=next((i for i,x in enumerate(unique) if x.get('year')==p.get('year') and SequenceMatcher(None,x['title'].lower(),p['title'].lower()).ratio()>.92),None)
        if match is None:unique.append(p)
        else:
            existing=unique[match]
            existing['sources']=list(set(existing['sources']+p['sources']))
            if len(p.get('abstract',''))>len(existing.get('abstract','')):
                existing['abstract']=p['abstract']
            if not existing.get('doi'):existing['doi']=p.get('doi')
    unique.sort(key=lambda p:(bool(p.get('doi')),len(p.get('abstract') or '')),reverse=True)
    return unique,len(results)

def save_paper(ws,p):
    pid=str(uuid.uuid4())
    with connect() as db:
        db.execute('''INSERT INTO papers(id,workspace_id,doi,title,year,authors,venue,url,abstract,source_text,text_level,license,sources,unverified,embedding,relevance,angle)
         VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s::vector,%s,%s)''',
         (pid,ws,p.get('doi'),p['title'],p.get('year'),p.get('authors'),p.get('venue'),p.get('url'),p.get('abstract'),p.get('source_text'),p.get('text_level','abstract'),p.get('license'),as_json(p.get('sources',[])),not bool(p.get('doi')),p.get('embedding'),p.get('relevance'),p.get('angle')))
    return pid

def save_claim(pid,c,emb):
    cid=str(uuid.uuid4())
    with connect() as db:
        db.execute('''INSERT INTO claims(id,paper_id,claim_text,outcome_family,intervention,outcome,direction,significance,effect_size,population,sample_n,design,duration,measure,limitations,quote,location,embedding)
         VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::vector)''',
          (cid,pid,c.get('claim_text','')[:1000],c.get('outcome_family'),c.get('intervention'),c.get('outcome'),c.get('direction'),c.get('significance'),c.get('effect_size'),c.get('population'),c.get('sample_n') if isinstance(c.get('sample_n'),int) else None,c.get('design'),c.get('duration'),c.get('measure'),c.get('limitations'),c['quote'][:500],c.get('location'),emb))
    c['id']=cid;c['paper_id']=pid
    return c

def add_claims(pid,p,ai):
    source=p.get('source_text') or p.get('abstract') or ''
    valid=[]
    for c in ai.claims(p):
        if not isinstance(c,dict) or not c.get('claim_text') or not validate_quote(c.get('quote',''),source):continue
        valid.append(save_claim(pid,c,ai.embed(c['claim_text'])))
    return valid

def add_relationships(ws,new_claims,other_claims,ai,max_pairs):
    count=0
    for a in new_claims:
        for b in other_claims:
            if a['paper_id']==b['paper_id'] or not comparable(a,b):continue
            if count>=max_pairs:return count
            with connect() as db:
                exists=db.execute('SELECT 1 FROM claim_edges WHERE (claim_a=%s AND claim_b=%s) OR (claim_a=%s AND claim_b=%s) LIMIT 1',(a['id'],b['id'],b['id'],a['id'])).fetchone()
                paper_levels=db.execute('SELECT text_level FROM papers WHERE id IN (%s,%s)',(a['paper_id'],b['paper_id'])).fetchall()
            if exists:continue
            relation=ai.compare(a,b,any(p['text_level']=='abstract' for p in paper_levels))
            if relation['label']=='genuine_contradiction':
                check=ai.compare(a,b,any(p['text_level']=='abstract' for p in paper_levels))
                if check['label']!='genuine_contradiction':
                    relation={'label':'unresolved','reason':'Independent verification did not confirm a genuine contradiction.','factors':['second-pass disagreement'],'confidence':0}
            with connect() as db:
                db.execute('''INSERT INTO claim_edges(id,workspace_id,claim_a,claim_b,label,reason,factors,confidence) VALUES (%s,%s,%s,%s,%s,%s,%s::jsonb,%s)''',
                    (str(uuid.uuid4()),ws,a['id'],b['id'],relation['label'],relation['reason'],as_json(relation['factors']),relation['confidence']))
            count+=1
    return count

def make_flags(ws,claims,papers):
    with connect() as db:
        for p in papers:
            if p.get('text_level')=='abstract':
                db.execute('INSERT INTO flags(id,workspace_id,kind,description,paper_id) VALUES (%s,%s,%s,%s,%s)',(str(uuid.uuid4()),ws,'weak_evidence','Only the abstract was examined; full methods and limitations may be unavailable.',p['id']))
        for c in claims:
            lim=(c.get('limitations') or '').strip()
            if lim and lim.lower() not in ('not_reported','none','n/a','unknown'):
                db.execute('INSERT INTO flags(id,workspace_id,kind,description,paper_id) VALUES (%s,%s,%s,%s,%s)',(str(uuid.uuid4()),ws,'stated_limitations',lim[:700],c['paper_id']))
        if len(claims)<3:
            db.execute('INSERT INTO flags(id,workspace_id,kind,description) VALUES (%s,%s,%s,%s)',(str(uuid.uuid4()),ws,'library_gap','Few verifiable findings were extracted in this workspace. This is a collection limitation, not a claim about all published research.'))

def run_workspace(ws,uploads=None,incremental=False):
    uploads=uploads or []
    ai=Gemini(); added=[];all_claims=[]
    try:
        with connect() as db:
            workspace=db.execute('SELECT question FROM workspaces WHERE id=%s',(ws,)).fetchone()
            if not workspace:return
            prior=db.execute('SELECT c.*,p.text_level FROM claims c JOIN papers p ON p.id=c.paper_id WHERE p.workspace_id=%s',(ws,)).fetchall()
        progress(ws,'Parsing question',papers_found=0,claims_extracted=0,edges_verified=0)
        parsed=ai.parse_question(workspace['question']) if not incremental else {}
        if parsed:
            with connect() as db:db.execute('UPDATE workspaces SET parsed=%s::jsonb WHERE id=%s',(as_json(parsed),ws))
        candidates=[];raw_count=0
        if not incremental:
            progress(ws,'Discovering papers across scholarly sources')
            candidates,raw_count=collect((parsed.get('search_queries') or [workspace['question']])[:2])
            progress(ws,'Deduplicating papers',papers_found=raw_count,duplicates_removed=max(0,raw_count-len(candidates)))
            candidates=candidates[:settings().max_papers]
        for file in uploads:
            title,text=parse_pdf(file['path'])
            if not text.strip():continue
            candidates.insert(0,{'title':title,'year':None,'authors':'User upload','venue':'Uploaded PDF','url':'','doi':None,
              'abstract':text[:3000],'source_text':text,'text_level':'full','sources':['User PDF']})
        candidates=radial_positions(candidates)
        for idx,p in enumerate(candidates):
            progress(ws,f'Processing paper {idx+1}/{len(candidates)}',processed=idx)
            if not p.get('source_text'):
                if settings().enable_fulltext and p.get('oa_url'):
                    full=unlock_public(p['oa_url'])
                    if full:p['source_text']=full;p['text_level']='full';p['sources'].append('Bright Data Unlocker')
                p.setdefault('text_level','abstract')
            p['embedding']=ai.embed(p['title']+' '+(p.get('abstract') or '')[:1000])
            p['id']=save_paper(ws,p);added.append(p)
            current=add_claims(p['id'],p,ai)
            all_claims+=current
            progress(ws,f'Extracting claims {idx+1}/{len(candidates)}',processed=idx+1,claims_extracted=len(all_claims))
        progress(ws,'Comparing compatible findings')
        # Only compare claims within same outcome family; cap API cost.
        relationships=add_relationships(ws,all_claims,prior+all_claims,ai,settings().max_pairs)
        make_flags(ws,all_claims,added)
        with connect() as db:
            total=db.execute('SELECT count(*) AS n FROM papers WHERE workspace_id=%s',(ws,)).fetchone()['n']
            flags=db.execute('SELECT count(*) AS n FROM flags WHERE workspace_id=%s',(ws,)).fetchone()['n']
            db.execute('UPDATE workspaces SET status=%s,progress=%s::jsonb,error=NULL WHERE id=%s',
                ('complete',as_json({'stage':'Complete','papers_found':raw_count,'papers_analyzed':total,'claims_extracted':len(all_claims),'edges_verified':relationships,'flags':flags,'uploaded':len(uploads),'note': 'Comparisons are model-assisted and must be independently verified.'}),ws))
    except Exception as e:
        import traceback
        traceback.print_exc()
        with connect() as db:db.execute('UPDATE workspaces SET status=%s,error=%s,progress=%s::jsonb WHERE id=%s',('failed',str(e)[:800],as_json({'stage':'Failed','error':str(e)[:800]}),ws))
