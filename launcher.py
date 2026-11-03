"""Local, offline prototype launcher. Only listens on this computer."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
from urllib.parse import urlsplit
import re
import sys
import webbrowser

app_root = Path(__file__).resolve().parent
root = app_root / 'dist'
vehicle_file = re.compile(r"/local-vehicles/(manifest\.json|(?:e235|e233|323|207)/[0-9]+\.(?:png|wav|ogg|bmp|jpg))")


class AppHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        match = vehicle_file.fullmatch(urlsplit(path).path)
        port = self.server.server_port
        local_host = self.headers.get('Host') in {f'127.0.0.1:{port}', f'localhost:{port}'}
        if match and local_host:
            return str(app_root / 'local-vehicles' / match.group(1))
        return super().translate_path(path)


server = None
for port in range(8765, 8785):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), partial(AppHandler, directory=str(root)))
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('Could not find an available local port (8765-8784).')
url = f'http://127.0.0.1:{server.server_port}/'
print(f'Railway Drive: {url}\nClose this window to finish.')
if '--no-browser' not in sys.argv:
    webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
