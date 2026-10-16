import io,json,sqlite3,sys,tempfile,time,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from app import Game
from deliver import deliver_once
from secrets_config import secret_value


class OperationsTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.game=Game(self.temp.name,demo=True,secret='s'*40)
 def tearDown(self):self.temp.cleanup()
 def test_new_database_has_versioned_schema(self):
  with self.game.db() as c:
   self.assertEqual(c.execute('PRAGMA user_version').fetchone()[0],2)
   self.assertIn('next_attempt',[r[1] for r in c.execute('PRAGMA table_info(outbox)')])
 def test_unversioned_database_upgrades_without_losing_history(self):
  session=self.game.login({})
  path=Path(self.temp.name)/'syndicates.sqlite'
  with sqlite3.connect(path) as c:
   c.execute('DROP INDEX due_outbox');c.execute('ALTER TABLE outbox DROP COLUMN next_attempt')
   c.execute('ALTER TABLE missions DROP COLUMN context')
   c.execute('PRAGMA user_version=0')
  next_game=Game(self.temp.name,demo=True,secret='s'*40)
  self.assertEqual(next_game.state(session['token'])['agent']['id'],session['agent']['id'])
  with next_game.db() as c:self.assertEqual(c.execute('PRAGMA user_version').fetchone()[0],2)
 def test_unknown_future_schema_is_rejected(self):
  with self.game.db() as c:c.execute('PRAGMA user_version=99')
  with self.assertRaisesRegex(RuntimeError,'newer than this build'):Game(self.temp.name,demo=True,secret='s'*40)
 def insert_pending(self):
  with self.game.tx() as c:c.execute("INSERT INTO outbox(receipt,payload) VALUES(?,?)",('proof-test',json.dumps(dict(id='proof-test'))))
 def test_failure_is_scheduled_and_worker_does_not_hot_retry(self):
  self.insert_pending()
  with patch('deliver.urllib.request.urlopen',side_effect=TimeoutError):
   self.assertEqual(deliver_once(self.game,'https://world.example', 'x'*40)[0]['delivered'],False)
   self.assertEqual(deliver_once(self.game,'https://world.example', 'x'*40),[])
  with self.game.db() as c:
   row=c.execute('SELECT attempts,next_attempt FROM outbox').fetchone()
   self.assertEqual(row['attempts'],1);self.assertGreater(row['next_attempt'],time.time())
 def test_rate_limit_retry_after_and_matching_ack(self):
  self.insert_pending()
  error=urllib.error.HTTPError('https://world.example',429,'slow',{'Retry-After':'120'},io.BytesIO())
  with patch('deliver.urllib.request.urlopen',side_effect=error):deliver_once(self.game,'https://world.example','x'*40)
  with self.game.db() as c:
   row=c.execute('SELECT next_attempt FROM outbox').fetchone();self.assertGreater(row['next_attempt'],time.time()+100)
  with self.game.tx() as c:c.execute('UPDATE outbox SET next_attempt=0')
  class Response:
   status=200
   def __enter__(self):return self
   def __exit__(self,*args):pass
   def read(self,n):return b'{"ok":true,"receiptId":"proof-test"}'
  with patch('deliver.urllib.request.urlopen',return_value=Response()):
   self.assertTrue(deliver_once(self.game,'https://world.example','x'*40)[0]['delivered'])
  with self.game.db() as c:self.assertEqual(c.execute('SELECT status FROM outbox').fetchone()[0],'delivered')
 def test_secret_file_loading(self):
  file=Path(self.temp.name)/'key.txt';file.write_text('example-private-secret\n')
  with patch.dict('os.environ',{'TEST_SECRET_FILE':str(file)},clear=False):self.assertEqual(secret_value('TEST_SECRET'),'example-private-secret')
 def test_managed_signing_key_is_loaded_without_regeneration(self):
  pem=Path(self.temp.name)/'receipt-key.pem'
  managed=Path(self.temp.name)/'managed.pem';managed.write_bytes(pem.read_bytes())
  other=Path(self.temp.name)/'other';other.mkdir()
  with patch.dict('os.environ',{'SYNDICATES_SIGNING_KEY_FILE':str(managed)},clear=False):
   next_game=Game(str(other),demo=False,secret='a'*40)
   self.assertEqual(next_game.pub,self.game.pub)
   self.assertFalse((other/'receipt-key.pem').exists())

if __name__=='__main__':unittest.main()
