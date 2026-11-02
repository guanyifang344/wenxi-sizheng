"""Import the supplied DOCX, preserving its reference answers verbatim."""
import json,re,sys,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
root=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(sys.argv[1]) as z:
    xml=ET.fromstring(z.read('word/document.xml'))
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
lines=[''.join(t.text or '' for t in p.findall('.//w:t',ns)).strip() for p in xml.findall('.//w:body/w:p',ns)]
lines=[l for l in lines if l]
sections=[(0,'绪论','担当复兴大任，成就时代新人'),(1,'第一章','领悟人生真谛，把握人生方向'),(2,'第二章','追求远大理想，坚定崇高信念')]
starts=[next(i for i,l in enumerate(lines) if l.startswith(prefix)) for _,prefix,_ in sections]+[len(lines)]
questions=[]
for (ci,title,subtitle),start,end in zip(sections,starts,starts[1:]):
    block=lines[start:end]
    ai=next(i for i,l in enumerate(block) if l=='参考答案')
    qpart=block[:ai]; apart=block[ai+1:]
    ah=[i for i,l in enumerate(apart) if re.match(r'^[一二三].*(?:选|判断)',l)]+[len(apart)]
    answers={}
    for kind,a,b in zip(['single','multiple','judge'],ah,ah[1:]):
        txt=' '.join(apart[a+1:b])
        if kind=='judge':
            tokens=([('A' if x=='正确' else 'B') for x in re.findall(r'正确|错误',txt)] if ci<2 else list(''.join(re.findall(r'[AB]+',txt))))
            answers[kind]=tokens
            continue
        # Numbered lists and range-labelled groups both resolve into ordered answer tokens.
        tokens=re.findall(r'[A-E]+',txt)
        if ci==2 and kind=='single': tokens=list(''.join(tokens))
        answers[kind]=tokens
    kind=None; cur=None; groups={'single':[],'multiple':[],'judge':[]}
    for l in qpart:
        if re.match(r'^一、.*单',l): kind='single';cur=None;continue
        if re.match(r'^二、.*多',l): kind='multiple';cur=None;continue
        if re.match(r'^三、',l): kind='judge';cur=None;continue
        if re.match(r'^四、|^材料分析题',l): kind=None;cur=None;continue
        if kind is None: continue
        m=re.match(r'^(\d+)\s*[、.．]\s*(.*)',l)
        if m:
            cur={'number':int(m[1]),'parts':[m[2]]};groups[kind].append(cur)
        elif cur: cur['parts'].append(l)
    for kind,items in groups.items():
        assert len(items)==len(answers[kind]),(ci,kind,len(items),len(answers[kind]))
        assert [q['number'] for q in items]==list(range(1,len(items)+1))
        for q,answer in zip(items,answers[kind]):
            txt='\n'.join(q['parts'])
            if kind=='judge':
                assert answer in ('A','B')
                questions.append({'id':f'c{ci}-judge-{q["number"]}','chapter':ci,'number':q['number'],'type':'judge','prompt':re.sub(r'\s+',' ',txt).strip(),'options':[{'id':'A','text':'正确'},{'id':'B','text':'错误'}],'answer':[answer]})
                continue
            matches=list(re.finditer(r'([A-E])(?:[.．、]|\s+|(?=[\u4e00-\u9fff]))',txt))
            # Each choice label occurs exactly once and in alphabetical order.
            assert [m[1] for m in matches]==list('ABCDE'[:len(matches)]),(ci,kind,q['number'],txt)
            assert 4<=len(matches)<=5,(ci,kind,q['number'],txt)
            opts=[{'id':m[1],'text':re.sub(r'\s+',' ',txt[m.end():matches[j+1].start() if j+1<len(matches) else len(txt)]).strip()} for j,m in enumerate(matches)]
            assert all(o['text'] for o in opts)
            assert set(answer)<=set(o['id'] for o in opts)
            assert len(answer)==1 if kind=='single' else len(answer)>1
            questions.append({'id':f'c{ci}-{kind}-{q["number"]}','chapter':ci,'number':q['number'],'type':kind,'prompt':re.sub(r'\s+',' ',txt[:matches[0].start()]).strip(),'options':opts,'answer':list(answer)})
bank={'version':2,'title':'思想道德与法治','source':Path(sys.argv[1]).name,'chapters':[{'id':i,'title':t,'subtitle':s} for i,t,s in sections],'questions':questions}
(root/'data/questions.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
print(f'Imported and validated {len(questions)} questions')
