"""Versioned situation rules. All clues and score changes are server owned."""
import hashlib

VERSION = 'switchyard-2.0.0'

def situation(kind, seed, alert, has_lead):
    bits = hashlib.sha256(seed.encode()).digest()
    a, b, c = (bits[i] % 2 for i in (1, 2, 3))
    labels = {
        'scout': ('Drone sweeps the roofs' if a else 'Drone is recharging',
                  'Beacons disagree' if b else 'Beacons agree'),
        'negotiate': ('Union needs repairs' if a else 'Union needs route data',
                      'Crossing is urgent' if b else 'Privacy is the priority'),
        'defend': ('Tracks approach from canal' if a else 'Tracks approach from gate',
                   'There is time to observe' if b else 'The alarm is imminent'),
        'heist': ('A drone guards the crossing' if a else 'The canal barrier is sealed',
                  'The extra cache is guarded' if b else 'The extra cache is unguarded'),
    }
    return dict(pattern=a, pressure=b, twist=c, clues=labels[kind],
                startingAlert=alert, hasLead=bool(has_lead))

def apply_stage(kind, step, stage, context):
    """Mutate a copied stage and return the situational, rule-based field note."""
    scene=context['situation'];a=scene['pattern'];b=scene['pressure'];c=scene['twist']
    options={o['id']:o for o in stage['options']}
    preferred=None
    if kind=='scout':
        if step==0:
            stage['text']=('The drone is sweeping roof height. The service stairs are exposed but fast.' if a else
                           'The drone is recharging. The stairs are clear; the roof costs Supplies without more cover.')
            options['roof']['score'],options['stairs']['score']=(2,0) if a else (0,2)
            preferred='roof' if a else 'stairs'
        elif step==1:
            stage['text']=('The two beacons disagree. A quick guess could put the crew on the patrol route.' if b else
                           'The beacons agree. Following now saves Intel, while cross-checking can certify a depot lead.')
            options['verify']['score'],options['follow']['score']=(3,-1) if b else (2,2)
            preferred='verify' if b else 'follow'
        else:
            stage['text']='The report can carry uncertainty to the depot. Certainty sounds stronger, but evidence must support it.'
            options['qualified']['score'],options['certain']['score']=(2,-1)
            preferred='qualified'
    elif kind=='negotiate':
        if step==0:
            stage['text']='The Union needs repairs this evening.' if a else 'The Union needs reliable route data more than Supplies.'
            options['bounded']['text']='Pay 2 Supplies toward the crossing repairs'
            options['vague'].update(text='Offer a verified route schedule instead',supplies=0,intel=1)
            options['bounded']['score'],options['vague']['score']=(2,0) if a else (0,2)
            preferred='bounded' if a else 'vague'
        elif step==1:
            stage['text']='The crossing is urgent. A precise route will let both crews move tonight.' if b else 'The Union asks you not to expose your patrol schedule. Give a public window instead.'
            options['bluff'].update(text='Share a public-only crossing window',score=0)
            options['limited']['score'],options['bluff']['score']=(3,0) if b else (0,2)
            preferred='limited' if b else 'bluff'
        else:
            stage['text']='The delivery window is closing.' if b else 'A new observation just arrived. Confirm or revise the delivery time.'
            options['honor'].update(text='Deliver under the original terms',score=2 if b else 0)
            options['renege'].update(text='Revise the delivery time openly',supplies=1,score=0 if b else 2)
            preferred='honor' if b else 'renege'
    elif kind=='defend':
        if step==0:
            stage['text']='Fresh tracks lead to the canal.' if a else 'Fresh tracks lead to the gate.'
            options['canal']['score'],options['gate']['score']=(2,0) if a else (0,2)
            preferred='canal' if a else 'gate'
        elif step==1:
            stage['text']='There is time to identify the real approach.' if b else 'The alarm is imminent; waiting for another signal risks the archive.'
            options['observe']['score'],options['rush']['score']=(3,0) if b else (0,2)
            options['rush']['text']='Commit to the entrance with fresh tracks'
            preferred='observe' if b else 'rush'
        else:
            stage['text']='The retreat is a decoy; keep the archive covered.' if c else 'A courier is escaping with the archive key.'
            options['archive']['score'],options['chase']['score']=(2,0) if c else (0,2)
            options['chase']['text']='Intercept the courier at the exit'
            preferred='archive' if c else 'chase'
    else:  # heist
        if step==0:
            patrol=context['patrol'];has_lead=bool(context.get('scoutReceipt'))
            stage['text']=(f'Your signed Scout report places the patrol at the {patrol}. Take the other route.' if has_lead else
                           'No verified Scout report. The patrol could be at either entry. This route is a real gamble.')
            options['canal']['score'],options['gate']['score']=(3,-1) if patrol=='gate' else (-1,3)
            options['gate']['text']='Approach through the main gate'
            preferred=('gate' if patrol=='canal' else 'canal') if has_lead else None
        elif step==1:
            stage['text']='A drone guards the crossing. A fresh route signal can bypass it.' if a else 'The canal barrier is sealed. Tools can open it; rerouting leads into a patrol.'
            options['reroute']['score'],options['force']['score']=(3,0) if a else (0,3)
            options['force']['text']='Use 2 Supplies of tools to open the sealed barrier' if not a else 'Force the guarded crossing'
            preferred='reroute' if a else 'force'
        else:
            stage['text']='The extra cache is guarded. Leaving now protects the manifest.' if b else 'The extra cache is unguarded. It pays more, but collecting it raises district alert.'
            options['extract']['score'],options['greed']['score']=(2,-1) if b else (2,1)
            options['greed']['text']='Take the extra cache, then extract'
            preferred='extract' if b else 'greed'
    note=('No verified patrol location. Neither entry can be confirmed safe. A signed Scout result changes this decision.' if kind=='heist' and step==0 and preferred is None else
          'The field clue favors one response, but the cheaper route may protect your budget. Weigh the sign against its cost and the next mission.' if kind=='scout' and step==1 else
          'Compare the field sign with each option. Spending Intel can resolve uncertainty; extra Supplies or alert may cost you the next job.' if kind=='heist' else
          'Read the changing sign, the mission budget, and the next job. The record will show which assumption held.')
    return note, preferred
