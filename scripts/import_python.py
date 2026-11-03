"""Read classroom Markdown as data; preserve code and supplied answer keys."""
import json,re,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
chapters=[];questions=[]
for source in sorted(Path(sys.argv[1]).glob('course_*_quiz.md')):
    raw=source.read_text()
    title=re.match(r'# COURSE (\d+) — Quiz: (.+)',raw)
    assert title,source
    course=int(title[1]);chapter=len(chapters)
    chapters.append({'id':chapter,'course':course,'title':f'Course {course:02}','subtitle':title[2].replace('`',''),'source':source.name})
    body,answer_text=raw.split('## Answers')
    keys=dict((int(n),a) for n,a in re.findall(r'(\d+)-([A-D])',answer_text))
    chunks=list(re.finditer(r'^\*\*Q(\d+)\.\*\*\s*',body,re.M))
    assert len(chunks)==len(keys),(source,len(chunks),keys)
    assert [int(m[1]) for m in chunks]==list(range(1,len(chunks)+1))
    for i,m in enumerate(chunks):
        n=int(m[1]);text=body[m.end():chunks[i+1].start() if i+1<len(chunks) else len(body)].strip()
        text=re.sub(r'\n---\s*$','',text).strip()
        opts=list(re.finditer(r'^- ([A-D])\) ',text,re.M))
        assert [o[1] for o in opts]==list('ABCD'),(source,n)
        prompt=text[:opts[0].start()].strip()
        blocks=[];cursor=0
        for code in re.finditer(r'^```([^\n]*)\n(.*?)^```\s*$',prompt,re.M|re.S):
            if prompt[cursor:code.start()].strip():blocks.append({'type':'text','text':prompt[cursor:code.start()].strip()})
            blocks.append({'type':'code','language':code[1],'text':code[2].removesuffix('\n')})
            cursor=code.end()
        if prompt[cursor:].strip():blocks.append({'type':'text','text':prompt[cursor:].strip()})
        assert '```' not in ''.join(b['text'] for b in blocks if b['type']=='text'),(source,n)
        options=[{'id':o[1],'text':text[o.end():opts[j+1].start() if j+1<len(opts) else len(text)].strip()} for j,o in enumerate(opts)]
        assert all(o['text'] for o in options)
        questions.append({'id':f'py-{course:02}-{n}','chapter':chapter,'number':n,'type':'single','prompt':prompt,'blocks':blocks,'options':options,'answer':[keys[n]],'source':source.name})
assert questions
bank={'subject':'python','version':1,'title':'Python 入门','chapters':chapters,'questions':questions}
(root/'data/python.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(questions)} questions across {len(chapters)} courses')
print([(c['course'],sum(q['chapter']==c['id'] for q in questions)) for c in chapters])
