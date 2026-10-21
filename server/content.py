"""Versioned, server-owned mission definitions. Never accept scores from clients."""
VERSION = 'switchyard-1.1.0'
# id, text, resource cost, tactical score. Costs are {supplies, intel}.
def option(id, text, s=0, i=0, score=0):
    return dict(id=id, text=text, supplies=s, intel=i, score=score)
MISSIONS = {
 'scout': dict(name='Ghosts on the canal',domain='reconnaissance',faction='Glasswatch',cost=1,reward=4,influence=1,
  intro='Glasswatch moved its patrol. Find a safe route to the transit cache.',
  stages=[dict(title='Choose your vantage',text='A drone sweeps the water. The roof offers cover; the service stairs are faster.',
   options=[option('roof','Climb to the rooftop',1,0,2),option('stairs','Take the service stairs',0,0,0)]),
   dict(title='A signal, or a decoy?',text='Two beacons report different patrol positions. Verify before trusting either.',
   options=[option('verify','Cross-check both beacons',0,1,3),option('follow','Follow the strongest beacon',0,0,-1)]),
   dict(title='Make the report',text='Your crew needs a route. Decide how much uncertainty to preserve.',
   options=[option('qualified','Report the route with its uncertainty',0,0,2),option('certain','Declare the route completely safe',0,0,-2)])]),
 'negotiate': dict(name='An honest exchange',domain='negotiation',faction='Verdant Union',cost=1,reward=5,influence=2,
  intro='Verdant Union can open the west crossing. Agree on a bounded exchange.',
  stages=[dict(title='Set the terms',text='The Union asks for a contribution to crossing repairs.',options=[option('bounded','Offer 2 Supplies for one passage',2,0,2),option('vague','Promise future help instead',0,0,-1)]),
   dict(title='Read the counteroffer',text='The Union wants your patrol schedule. Protect the crew while making a useful offer.',options=[option('limited','Share a single verified route',0,1,3),option('bluff','Invent a schedule',0,0,-2)]),
   dict(title='Keep your word',text='The crossing is open. Your commitment is due.',options=[option('honor','Honor the agreed terms',0,0,2),option('renege','Leave without honoring the agreement',0,0,-3)])]),
 'defend': dict(name='Hold the lantern',domain='defense',faction='Railjack Collective',cost=2,reward=6,influence=2,
  intro='A Railjack drill targets your safehouse perimeter. Protect the archive and keep a route open.',
  stages=[dict(title='Allocate the defenses',text='You can cover the canal entrance or reinforce the main gate.',options=[option('canal','Watch the canal and preserve an exit',1,0,2),option('gate','Put everything at the main gate',1,0,0)]),
   dict(title='An unexpected approach',text='Movement appears at two entrances. One may be a distraction.',options=[option('observe','Use Intel to verify the real approach',0,1,3),option('rush','Commit to the first alarm',0,0,-1)]),
   dict(title='Protect what matters',text='The drill reaches its final push. Your archive is the objective.',options=[option('archive','Hold position at the archive',0,0,2),option('chase','Chase the retreating decoy',0,0,-2)])]),
 'heist': dict(name='The midnight manifest',domain='operations',faction='Glasswatch',cost=3,reward=9,influence=3,
  intro='Recover a fictional transit manifest from the Glasswatch depot. Nobody’s wallet is at risk.',
  stages=[dict(title='Choose the entry',text='Glasswatch monitors the main gate. The canal is quiet, but the signal is old.',options=[option('canal','Use Intel to enter through the canal',1,1,3),option('gate','Move quickly through the main gate',0,0,-1)]),
   dict(title='The patrol has changed',text='A guard drone blocks the planned crossing. Adapt, or force the original route.',options=[option('reroute','Reroute using a fresh signal',0,1,3),option('force','Force the original route',2,0,-2)]),
   dict(title='Take only the objective',text='The manifest is in reach. An extra cache would expose your exit.',options=[option('extract','Secure the manifest and extract',0,0,2),option('greed','Reach for the extra cache',1,0,-3)])])
}
BLOCKS=[dict(id='home',name='Lantern House',x=3,y=6,kind='home',faction='Your protected safehouse'),
 dict(id='canal',name='Canal watch',x=2,y=2,kind='scout',faction='Glasswatch'),
 dict(id='commons',name='Union crossing',x=7,y=2,kind='negotiate',faction='Verdant Union'),
 dict(id='depot',name='Midnight depot',x=7,y=6,kind='heist',faction='Glasswatch'),
 dict(id='gate',name='Signal gate',x=5,y=8,kind='defend',faction='Railjack Collective'),
 dict(id='workshop',name='Copper workshop',x=1,y=5,kind='territory',faction='Neutral'),
 dict(id='garden',name='Rooftop garden',x=8,y=4,kind='territory',faction='Neutral')]
