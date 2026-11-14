import fitz

def parse_pdf(path):
    with fitz.open(path) as doc:
        if len(doc) > 120:
            raise ValueError('PDF exceeds 120-page limit')
        chunks=[]
        for i,page in enumerate(doc):
            text=page.get_text('text') or ''
            if text.strip():
                chunks.append(f'[Page {i+1}]\n{text}')
        full='\n\n'.join(chunks)
        title=next((x.strip() for x in full.splitlines() if len(x.strip()) > 15 and not x.startswith('[Page')), 'Uploaded paper')[:240]
        return title,full[:100000]
