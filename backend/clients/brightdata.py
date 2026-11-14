import hashlib
import json
import time
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup
from config.settings import settings
from db.database import connect

_LAST={}

def allowed(url):
    u=urlparse(url)
    if u.scheme!='https' or not u.hostname:return False
    domains=('www.ncbi.nlm.nih.gov','pmc.ncbi.nlm.nih.gov','europepmc.org','journals.plos.org','arxiv.org')
    return u.hostname.lower() in domains

def unlock_public(url):
    s=settings()
    if not (s.enable_bright_data and s.enable_fulltext and s.bright_data_api_key and s.bright_data_unlocker_zone):return None
    if not allowed(url):return None
    key=hashlib.sha256(url.encode()).hexdigest()
    with connect() as db:
        item=db.execute("SELECT body FROM fetch_cache WHERE url_hash=%s AND fetched_at>now()-interval '7 days'",(key,)).fetchone()
        if item:return item['body']
    host=urlparse(url).hostname
    pause=1-(time.monotonic()-_LAST.get(host,0))
    if pause>0:time.sleep(pause)
    _LAST[host]=time.monotonic()
    for attempt in range(3):
        try:
            r=httpx.post('https://api.brightdata.com/request',headers={'Authorization':'Bearer '+s.bright_data_api_key},
                json={'zone':s.bright_data_unlocker_zone,'url':url,'format':'raw'},timeout=55)
            r.raise_for_status()
            soup=BeautifulSoup(r.text,'html.parser')
            for x in soup(['script','style','nav','footer','header']):x.decompose()
            body=' '.join(soup.stripped_strings)
            if any(p in body.lower()[:1500] for p in ['subscribe to read','purchase this article','institutional login']):return None
            if len(body)<500:return None
            body=body[:100000]
            with connect() as db:
                db.execute('INSERT INTO fetch_cache(url_hash,url,body) VALUES (%s,%s,%s) ON CONFLICT (url_hash) DO UPDATE SET fetched_at=now(),body=excluded.body',(key,url,body))
            return body
        except Exception as e:
            print('Bright Data Unlocker:',str(e)[:200],flush=True)
            time.sleep(2**attempt)
    return None

def scholar_search(query,limit=12):
    s=settings()
    if not (s.enable_bright_data and s.bright_data_api_key and s.bright_data_scholar_id):return []
    # Synchronous dataset scrape; actual input fields must be confirmed in Bright Data dashboard.
    try:
        r=httpx.post('https://api.brightdata.com/datasets/v3/scrape',
          params={'dataset_id':s.bright_data_scholar_id,'format':'json'},
          headers={'Authorization':'Bearer '+s.bright_data_api_key},
          json=[{'keyword':query}], timeout=85)
        r.raise_for_status()
        data=r.json()
        if isinstance(data,dict):data=data.get('data') or data.get('results') or []
        if not isinstance(data,list):return []
        out=[]
        for x in data[:limit]:
            title=x.get('title') or x.get('name') or ''
            if not title:continue
            out.append({'title':title,'year':x.get('year'),'authors':x.get('authors') or '',
             'abstract':x.get('snippet') or x.get('description') or '',
             'url':x.get('url') or x.get('link') or '', 'doi':None,'venue':'',
             'oa_url':'','license':None,'sources':['Bright Data Scholar']})
        return out
    except Exception as e:
        print('Bright Data Scholar:',str(e)[:250],flush=True)
        return []
