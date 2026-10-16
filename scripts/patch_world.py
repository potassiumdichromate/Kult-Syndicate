#!/usr/bin/env python3
"""Apply the supplied adapter to the inspected v6.6 shape. Refuses unknown files; creates backups."""
import difflib, pathlib, shutil, sys
root=pathlib.Path(sys.argv[1]).resolve();src=root/'server.js';text=src.read_text();before=text
if "const Syndicates = require('./syndicates-integration.cjs');" in text:raise SystemExit('Already integrated')
anchor='  let { id, owner, identityMode } = resolveSession(req, res, url.pathname);'
assert text.count(anchor)==1,'Unknown server shape: resolveSession anchor not unique'
receipt_route='''  if (url.pathname === '/api/syndicates/receipt' && method === 'POST') {
    let signedReceipt;
    try {
      const delivery = await readBody(req);
      signedReceipt = Syndicates.verifyDelivery(delivery, req.headers, {
        secret: process.env.KULT_SYNDICATES_CALLBACK_SECRET,
        publicKey: process.env.KULT_SYNDICATES_PUBLIC_KEY
      });
    } catch (error) { return apiError(res, 403, error.message, 'syndicates_receipt_rejected'); }
    const entry = store.listOwners().find(([, candidate]) => candidate?.agent?.id === signedReceipt.agentId);
    if (!entry) return apiError(res, 404, 'Existing KULT Agent not found.', 'agent_not_found');
    const release = await acquireOwnerLock(entry[0]);
    try {
      const liveOwner = store.getOwner(entry[0]);
      const result = Syndicates.ingestIntoOwner(liveOwner, signedReceipt);
      if (!result.duplicate) {
        save(entry[0], liveOwner);
        store.appendAudit?.({type:'syndicates.receipt.ingested', agentId:signedReceipt.agentId, ownerId:entry[0], payload:{receiptId:signedReceipt.id, outcome:signedReceipt.outcome}});
      }
      return json(res, 200, {...result, receiptId:signedReceipt.id});
    } catch (error) { return apiError(res, 409, error.message, 'syndicates_conflict'); }
    finally { release(); }
  }

'''
text=text.replace(anchor,receipt_route+anchor)
launch_anchor="  if (url.pathname === '/api/state' && method === 'GET') {"
assert text.count(launch_anchor)==1,'Unknown server shape: state anchor not unique'
launch_route='''  if (url.pathname === '/api/syndicates/launch' && method === 'POST') {
    try {
      return json(res, 200, Syndicates.issueLaunch({ownerId:id, agent:owner.agent, identityMode,
        secret:process.env.KULT_SYNDICATES_LAUNCH_SECRET,
        baseUrl:process.env.KULT_SYNDICATES_URL}));
    } catch (error) { return apiError(res, 403, error.message, 'syndicates_launch_rejected'); }
  }

'''
text=text.replace(launch_anchor,launch_route+launch_anchor)
summary_anchor='    proofs, anchoredProofs,'
assert text.count(summary_anchor)==1,'Unknown Passport shape'
text=text.replace(summary_anchor,summary_anchor+'\n    syndicates: Syndicates.passportSummary(agent),')
text=text.replace("'use strict';", "'use strict';\nconst Syndicates = require('./syndicates-integration.cjs');", 1)
backup=root/'server.js.before-syndicates';assert not backup.exists(),'Backup exists; refusing overwrite'
shutil.copy2(src,backup);src.write_text(text);shutil.copy2(pathlib.Path(__file__).resolve().parents[1]/'integration/world-adapter.cjs',root/'syndicates-integration.cjs')
(root/'syndicates.patch').write_text(''.join(difflib.unified_diff(before.splitlines(True),text.splitlines(True),fromfile='server.js',tofile='server.js')))
print('Patched server, preserved backup. Configure both secrets and the pinned public key; restart World.')
