"""One NPC move per observed UTC day. No fabricated history for idle days."""
import time
DOCTRINES={'Vance':'Escalation: targets the workshop.', 'Iris':'Intelligence: targets the garden.', 'Oathkeepers':'Stewardship: occupies an empty block only.'}
def board(c,season):
    now=time.time();day=int(now//86400);actor=list(DOCTRINES)[day%3]
    if not c.execute('SELECT 1 FROM rival_moves WHERE day=?',(day,)).fetchone():
        choices={'Vance':['workshop'],'Iris':['garden'],'Oathkeepers':['workshop','garden']}[actor]
        target=''
        for block in choices:
            if c.execute('SELECT 1 FROM territory WHERE block=? AND expires>? AND season=?',(block,now,season)).fetchone():continue
            old=c.execute('SELECT crew FROM rival_holds WHERE block=?',(block,)).fetchone()
            if old and (old[0]==actor or actor=='Oathkeepers'):continue
            target=block;break
        if target:c.execute('INSERT OR REPLACE INTO rival_holds VALUES(?,?,?)',(target,actor,now))
        c.execute('INSERT INTO rival_moves VALUES(?,?,?,?)',(day,actor,target,now))
    return {'crews':[{'name':n,'doctrine':d,'captures':c.execute("SELECT count(*) FROM rival_moves WHERE crew=? AND block!=''",(n,)).fetchone()[0]} for n,d in DOCTRINES.items()],
            'holds':[dict(x) for x in c.execute('SELECT * FROM rival_holds ORDER BY block')], 'latest':dict(c.execute('SELECT * FROM rival_moves ORDER BY day DESC LIMIT 1').fetchone())}
