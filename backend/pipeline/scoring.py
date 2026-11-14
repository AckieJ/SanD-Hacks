import math
import hashlib

def radial_positions(papers):
    n=max(1,len(papers))
    for i,p in enumerate(papers):
        # Relevance is only a navigation metric, not scientific truth.
        rank=i/max(1,n-1)
        p['relevance']=round(0.88-0.54*rank,3)
        sector=i%4
        stagger=(i//4)/max(1,math.ceil(n/4))
        p['angle']=round((sector+stagger)*2*math.pi/4,4)
    return papers

def comparable(a,b):
    outcome_a=(a.get('outcome_family') or '').lower().strip()
    outcome_b=(b.get('outcome_family') or '').lower().strip()
    if not outcome_a or not outcome_b:
        return False
    if outcome_a==outcome_b:
        return True
    ta=set(outcome_a.split());tb=set(outcome_b.split())
    return bool(ta and tb and len(ta&tb)/max(len(ta),len(tb))>=0.7)
