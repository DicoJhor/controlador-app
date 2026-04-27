from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import urllib.parse
import os
import re
import time
import json

PORT = 8080
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sessions = {}
referers = {}


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirectHandler())


def _handle_cookies(ont_ip, headers):
    new_cookies = []
    for line in str(headers).splitlines():
        if line.lower().startswith('set-cookie:'):
            val = line.split(':', 1)[1].strip().split(';')[0]
            if '=' in val:
                new_cookies.append(val)
    if new_cookies:
        existing = {}
        for kv in sessions.get(ont_ip, '').split('; '):
            if '=' in kv:
                k, v = kv.split('=', 1)
                existing[k.strip()] = v.strip()
        for kv in new_cookies:
            k, v = kv.split('=', 1)
            existing[k.strip()] = v.strip()
        sessions[ont_ip] = '; '.join(f'{k}={v}' for k, v in existing.items())
        print(f'  COOKIE [{ont_ip}]: {sessions[ont_ip]}')


def post_table_encrypt(params: dict) -> int:
    """
    Python port of postTableEncrypt() from common.js (BENMUNDO/CDATA Realtek BOA).
    params: ordered dict of {name: value} — all POST fields EXCEPT postSecurityFlag/csrftoken.
    Returns the checksum integer to use as postSecurityFlag.
    """
    SKIP = {'postSecurityFlag', 'csrftoken'}

    def encode_val(v) -> str:
        s = urllib.parse.quote(str(v) if v is not None else '', safe='')
        s = s.replace('%20', '+')
        return s

    def encode_name(n: str) -> str:
        return n.replace('[', '%5B').replace(']', '%5D')

    input_val = ''
    for name, value in params.items():
        if name in SKIP:
            continue
        input_val += encode_name(name) + '=' + encode_val(value) + '&'

    csum = 0
    i = 0
    L = len(input_val)
    while i < L:
        if (i + 4) > L:
            if i < L:     csum += (ord(input_val[i])   << 24)
            if i+1 < L:   csum += (ord(input_val[i+1]) << 16)
            if i+2 < L:   csum += (ord(input_val[i+2]) << 8)
            break
        else:
            csum += ((ord(input_val[i])   << 24) +
                     (ord(input_val[i+1]) << 16) +
                     (ord(input_val[i+2]) << 8)  +
                      ord(input_val[i+3]))
            i += 4

    csum = (csum & 0xffff) + (csum >> 16)
    csum = csum & 0xffff
    csum = (~csum) & 0xffff
    return csum


def do_request(ont_ip, url, method='GET', body=None):
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    req.add_header('Accept', 'text/html,application/xhtml+xml,*/*;q=0.8')
    req.add_header('Accept-Language', 'es-ES,es;q=0.9')
    req.add_header('Connection', 'keep-alive')
    if ont_ip in referers:
        req.add_header('Referer', referers[ont_ip])
    cookie = sessions.get(ont_ip, '')
    if cookie:
        req.add_header('Cookie', cookie)
    try:
        with opener.open(req, timeout=12) as resp:
            _handle_cookies(ont_ip, resp.info())
            data = resp.read()
            referers[ont_ip] = url
            return resp.status, data
    except urllib.error.HTTPError as e:
        _handle_cookies(ont_ip, e.headers)
        try:
            data = e.read()
        except Exception:
            data = b''
        location = e.headers.get('Location', '')
        if location:
            print(f'  REDIRECT -> {location}')
            if 'login' in location.lower():
                sessions.pop(ont_ip, None)
                print(f'  SESSION CLEARED [{ont_ip}]')
        referers[ont_ip] = url
        return e.code, data
    except Exception as e:
        err_str = str(e).lower()
        is_disconnect = any(k in err_str for k in (
            'timed out', 'timeout', 'connection reset',
            'remotedisconnected', 'connection refused',
            'broken pipe', 'econnreset', 'econnaborted'
        ))
        if is_disconnect and method == 'POST':
            print(f'  DISCONNECT POST (OK): {e}')
            return 200, b''
        raise


def do_reboot_optic(ont_ip):
    base   = f'http://{ont_ip}/cgi-bin'
    cookie = sessions.get(ont_ip, '')
    print(f'\n[REBOOT OPTIC] {ont_ip} cookie={cookie[:50]}')

    def mk_get(path, referer=None):
        req = urllib.request.Request(f'{base}/{path}')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        req.add_header('Accept', 'text/html,application/xhtml+xml,*/*;q=0.8')
        req.add_header('Connection', 'keep-alive')
        if referer:
            req.add_header('Referer', f'{base}/{referer}')
        if cookie:
            req.add_header('Cookie', cookie)
        return req

    def mk_post(path, params, referer=None):
        body = urllib.parse.urlencode(params).encode()
        req  = urllib.request.Request(f'{base}/{path}', data=body, method='POST')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded; charset=gb2312')
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        req.add_header('Accept', 'text/html,application/xhtml+xml,*/*;q=0.8')
        req.add_header('Connection', 'keep-alive')
        req.add_header('X-Requested-With', 'XMLHttpRequest')
        if referer:
            req.add_header('Referer', f'{base}/{referer}')
        if cookie:
            req.add_header('Cookie', cookie)
        return req

    def xget(path, referer=None):
        print(f'  [R] GET {path}')
        try:
            with opener.open(mk_get(path, referer), timeout=12) as r:
                data = r.read().decode('utf-8', errors='replace')
                print(f'  [R] {r.status} {len(data)}b')
                return data
        except Exception as e:
            print(f'  [R] GET err: {e}')
            return ''

    def xpost(path, params, referer=None):
        print(f'  [R] POST {path} {urllib.parse.urlencode(params)[:80]}')
        try:
            with opener.open(mk_post(path, params, referer), timeout=8) as r:
                data = r.read().decode('utf-8', errors='replace')
                print(f'  [R] {r.status} {len(data)}b')
                return data
        except Exception as e:
            err = str(e).lower()
            if any(k in err for k in ('reset','disconnect','refused','broken','timeout','timed')):
                print(f'  [R] Conexion cortada — REBOOT OK: {e}')
                return 'DISCONNECTED'
            print(f'  [R] POST err: {e}')
            return ''

    def extract_key(html):
        m = re.search(r'gcsessionkey\s*=\s*["\']([a-zA-Z0-9]{20,50})["\']', html)
        return m[1] if m else None

    h1 = xget('reboot.cgi', referer='index.cgi')
    k1 = extract_key(h1)
    if not k1:
        print('  [R] ERROR: sin key en reboot.cgi')
        return False
    xpost('reboot.cgi', {'onSubmit': 'loading', 'sessionkey': k1}, referer='reboot.cgi')
    time.sleep(1)
    h3 = xget('loading.cgi?url=reboot.cgi&waittime=60&operation=docmd', referer='reboot.cgi')
    k3 = extract_key(h3)
    if not k3:
        print('  [R] ERROR: sin key en loading.cgi')
        return False
    time.sleep(1)
    xpost('reboot.cgi', {'onSubmit': 'docmd', 'sessionkey': k3},
          referer='loading.cgi?url=reboot.cgi&waittime=60&operation=docmd')
    print(f'  [R] Secuencia completa para {ont_ip}')
    return True


def do_reboot_benmundo(ont_ip):
    base   = f'http://{ont_ip}'
    cookie = sessions.get(ont_ip, '')
    print(f'\n[REBOOT BENMUNDO] {ont_ip} cookie={cookie[:50]}')

    reboot_params = {'submit-url': '/mgm_dev_reboot.asp'}
    psf = post_table_encrypt(reboot_params)
    reboot_params['postSecurityFlag'] = str(psf)

    body = urllib.parse.urlencode(reboot_params).encode()
    req = urllib.request.Request(f'{base}/boaform/admin/formReboot', data=body, method='POST')
    req.add_header('Content-Type', 'application/x-www-form-urlencoded')
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    req.add_header('Referer', f'{base}/mgm_dev_reboot.asp')
    if cookie:
        req.add_header('Cookie', cookie)

    try:
        with opener.open(req, timeout=8) as r:
            print(f'  [RB] POST reboot {r.status}')
            return True
    except Exception as e:
        err = str(e).lower()
        if any(k in err for k in ('reset','disconnect','refused','broken','timeout','timed')):
            print(f'  [RB] Conexion cortada — REBOOT OK: {e}')
            return True
        print(f'  [RB] POST reboot err: {e}')
        return False


class ProxyHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f'[{self.command}] {self.path}')

    def send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-ONT-IP, X-EQUIPO, X-REFERER')

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors()
        self.end_headers()

    def serve_file(self):
        path = self.path.split('?')[0].lstrip('/')
        if not path:
            path = 'optic-config.html'
        fp = os.path.join(SCRIPT_DIR, path)
        if os.path.isfile(fp):
            with open(fp, 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_cors()
            self.end_headers()
            try:
                self.wfile.write(data)
            except (ConnectionAbortedError, BrokenPipeError):
                pass
        else:
            self.send_response(404)
            self.end_headers()

    def proxy_request(self, method, body=None):
        ont_ip         = self.headers.get('X-ONT-IP', '192.168.1.1')
        equipo         = self.headers.get('X-EQUIPO', 'optic').lower()
        raw_path       = self.path.replace('/proxy/', '', 1)
        forced_referer = self.headers.get('X-REFERER', '')

        print(f'  RAW_PATH={raw_path}')

        if equipo in ("lanly", "mct", "dixon", "benmundo"):
            url = f'http://{ont_ip}/{raw_path}'
        else:
            url = f'http://{ont_ip}/cgi-bin/{raw_path}'

        print(f'  -> {url}')

        if forced_referer:
            referers[ont_ip] = forced_referer
            print(f'  FORCED REFERER: {forced_referer}')

        try:
            status, data = do_request(ont_ip, url, method, body)
            print(f'  HTTP {status}')
        except Exception as e:
            print(f'  ERROR: {e}')
            self.send_response(502)
            self.send_cors()
            self.end_headers()
            try:
                self.wfile.write(str(e).encode())
            except (ConnectionAbortedError, BrokenPipeError):
                pass
            return

        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_cors()
        self.end_headers()
        try:
            self.wfile.write(data)
        except (ConnectionAbortedError, BrokenPipeError):
            pass

    def do_GET(self):
        if self.path.startswith('/proxy/'):
            self.proxy_request('GET')
        else:
            self.serve_file()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(length)

        # ── Calcular postSecurityFlag para BENMUNDO ───────────────────────────
        if '/calc-psf' in self.path:
            try:
                params = json.loads(raw_body.decode('utf-8'))
            except Exception:
                params = {}
            psf = post_table_encrypt(params)
            resp = json.dumps({'psf': psf}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            try:
                self.wfile.write(resp)
            except (ConnectionAbortedError, BrokenPipeError):
                pass
            return

        # ── Reboot OPTIC ──────────────────────────────────────────────────────
        if '/reboot-optic' in self.path:
            try:
                data   = json.loads(raw_body.decode('utf-8'))
                ont_ip = data.get('ip', '192.168.1.1')
            except Exception:
                ont_ip = '192.168.1.1'
            ok = do_reboot_optic(ont_ip)
            resp = json.dumps({'ok': ok}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            try:
                self.wfile.write(resp)
            except (ConnectionAbortedError, BrokenPipeError):
                pass
            return

        # ── Reboot BENMUNDO ───────────────────────────────────────────────────
        if '/reboot-benmundo' in self.path:
            try:
                data   = json.loads(raw_body.decode('utf-8'))
                ont_ip = data.get('ip', '192.168.101.1')
            except Exception:
                ont_ip = '192.168.101.1'
            ok = do_reboot_benmundo(ont_ip)
            resp = json.dumps({'ok': ok}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_cors()
            self.end_headers()
            try:
                self.wfile.write(resp)
            except (ConnectionAbortedError, BrokenPipeError):
                pass
            return

        self.proxy_request('POST', raw_body)


if __name__ == '__main__':
    print(f'Proxy en http://localhost:{PORT}')
    print(f'Abre: http://localhost:{PORT}/optic-config.html\n')
    HTTPServer(('localhost', PORT), ProxyHandler).serve_forever()