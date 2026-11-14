import re
from urllib.parse import quote
import httpx
from config.settings import settings

def abstract_from_index(idx):
    if not isinstance(idx,dict): return ''
    words={i:word for word,positions in idx.items() for i in positions}
    return ' '.join(words[i] for i in sorted(words))

def normalize_doi(raw):
    return re.sub(r'^https?://(?:dx\.)?doi\.org/', '', (raw or '').strip(), flags=re.I).lower() or None

def search_openalex(query, limit=18):
    params={'search':query,'per-page':limit,'filter':'has_abstract:true'}
    if settings().openalex_email: params['mailto']=settings().openalex_email
    try:
        r=httpx.get('https://api.openalex.org/works',params=params,timeout=22)
        r.raise_for_status()
    except Exception as e:
        print('OpenAlex request failed:',str(e)[:250],flush=True);return []
    papers=[]
    for w in r.json().get('results',[]):
        abstract=abstract_from_index(w.get('abstract_inverted_index'))
        if not abstract:continue
        title=w.get('display_name') or w.get('title')
        if not title:continue
        authors=', '.join(a.get('author',{}).get('display_name','') for a in (w.get('authorships') or [])[:5])
        loc=w.get('best_oa_location') or {}
        papers.append({'doi':normalize_doi(w.get('doi')),'title':title,'year':w.get('publication_year'), 'authors':authors,
            'venue':((w.get('primary_location') or {}).get('source') or {}).get('display_name',''),
            'url':w.get('doi') or w.get('id') or '', 'oa_url':loc.get('landing_page_url') or '',
            'abstract':abstract,'license':loc.get('license'),'sources':['OpenAlex']})
    return papers

def search_europe_pmc(query, limit=12):
    try:
        r=httpx.get('https://www.ebi.ac.uk/europepmc/webservices/rest/search',params={'query':query,'format':'json','pageSize':limit,'resultType':'core'},timeout=22)
        r.raise_for_status()
    except Exception as e:
        print('Europe PMC request failed:',str(e)[:250],flush=True);return []
    result=[]
    for x in r.json().get('resultList',{}).get('result',[]):
        abstract=re.sub('<[^>]+>',' ',x.get('abstractText') or '').strip()
        if not abstract or not x.get('title'):continue
        doi=normalize_doi(x.get('doi'))
        result.append({'doi':doi,'title':x['title'],'year':int(x['pubYear']) if str(x.get('pubYear','')).isdigit() else None,
         'authors':x.get('authorString',''),'venue':x.get('journalTitle',''),
         'url':f'https://doi.org/{doi}' if doi else '', 'oa_url':'', 'abstract':abstract,'license':None,'sources':['Europe PMC']})
    return result

def resolve_crossref(title):
    try:
        r=httpx.get('https://api.crossref.org/works',params={'query.title':title,'rows':1},timeout=12)
        r.raise_for_status(); hits=r.json().get('message',{}).get('items',[])
        if not hits:return None
        import difflib
        x=hits[0];actual=(x.get('title') or [''])[0]
        if difflib.SequenceMatcher(None,title.lower(),actual.lower()).ratio()<.88:return None
        return normalize_doi(x.get('DOI'))
    except Exception:return None
