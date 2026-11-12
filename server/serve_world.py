#!/usr/bin/env python3
"""Run the Switchyard and its receipt worker in one process, on one data volume.

For hosts where a separate worker cannot share the game's disk (Render disks
attach to a single service). The game server is unchanged (app.py); the worker
loop is deliver.py's, run on a background thread every 15 seconds. Leave
KULT_WORLD_RECEIPT_URL unset to run the game without delivery.
"""
import json, os, threading, time
from app import create_server
from deliver import deliver_once
from secrets_config import secret_value


def deliver_forever(game, url, secret, every=15):
    while True:
        try:
            delivered = deliver_once(game, url, secret)
            if delivered:
                print(json.dumps(delivered), flush=True)
        except Exception as exc:  # keep delivering; never stop the game
            print('Receipt delivery failed:', type(exc).__name__, str(exc)[:200], flush=True)
        time.sleep(every)


if __name__ == '__main__':
    server = create_server(port=int(os.getenv('PORT', '8787')), host=os.getenv('HOST', '127.0.0.1'))
    url = os.getenv('KULT_WORLD_RECEIPT_URL', '')
    if url:
        secret = secret_value('KULT_SYNDICATES_CALLBACK_SECRET')
        threading.Thread(target=deliver_forever, args=(server.game, url, secret), daemon=True, name='receipt-worker').start()
        print(f'Receipt worker delivering to {url}', flush=True)
    print(f'KULT Syndicates running on {server.public_origin}{server.base_path}/ — {"SANDBOX" if server.game.demo else "KULT gateway"}', flush=True)
    server.serve_forever()
