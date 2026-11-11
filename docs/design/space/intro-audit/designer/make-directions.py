# Makes direction-1.png to direction-6.png from PROMPTS.md with ElevenLabs Image and Video.
# Run in this folder: ELEVENLABS_API_KEY=... python3 make-directions.py   (the key needs "Image and Video Generation")
import json,os,re,sys,time,urllib.request
K=os.environ.get('ELEVENLABS_API_KEY') or sys.exit('Refused. Missing: ELEVENLABS_API_KEY. To do: export it, then run again.')
md=open('PROMPTS.md').read()
base=md.split('## The base prompt (used by every direction)')[1].split('## The six directions')[0].strip()
rows=[[x.strip() for x in l.split('|')] for l in md.split('\n') if re.match(r'^\| [1-6] \|',l)]
H={'xi-api-key':K,'Content-Type':'application/json'}
def req(method,url,body=None):
    r=urllib.request.Request(url,data=json.dumps(body).encode() if body else None,headers=H,method=method)
    try: return json.loads(urllib.request.urlopen(r,timeout=120).read())
    except urllib.error.HTTPError as e: sys.exit(f'Refused by ElevenLabs ({e.code}): {e.read()[:300].decode()}')
jobs=[]
for n,fname,extra in [(r[1],r[2],re.sub(r'\*\*','',r[3])) for r in rows]:
    g=req('POST','https://api.elevenlabs.io/v1/flows/image',{'model_id':'gemini-3-pro-image','prompt':base+' '+extra,'aspect_ratio':'16:9'})
    jobs.append((fname,g['id'])); print('submitted',fname,g['id'])
for fname,gid in jobs:
    for _ in range(120):
        g=req('GET',f'https://api.elevenlabs.io/v1/flows/image/{gid}')
        if g['status']=='completed': open(fname,'wb').write(urllib.request.urlopen(g['content_url'],timeout=120).read()); print('saved',fname); break
        if g['status']=='failed': print('failed',fname,g.get('failure_reason'),g.get('error_message')); break
        time.sleep(5)
