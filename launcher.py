"""Local, offline prototype launcher. Only listens on this computer."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import webbrowser

root = Path(__file__).resolve().parent / 'dist'
server = None
for port in range(8765, 8785):
    try:
        server = ThreadingHTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(root)))
        break
    except OSError:
        continue
if server is None:
    raise SystemExit('Could not find an available local port (8765-8784).')
url = f'http://127.0.0.1:{server.server_port}/'
print(f'Tohoku 701 Simulator: {url}\nClose this window to finish.')
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
