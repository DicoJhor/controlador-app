import { useState, useRef } from "react";
import { CapacitorHttp } from '@capacitor/core';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

/* ─── Iconos ─────────────────────────────────────────────── */
function Icon({ d, size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const IC = {
  wifi:      "M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01",
  check:     "M20 6L9 17l-5-5",
  x:         "M18 6L6 18M6 6l12 12",
  eye:       "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8M12 9a3 3 0 100 6 3 3 0 000-6",
  eyeOff:    "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22",
  arrowLeft: "M19 12H5M12 19l-7-7 7-7",
  router:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  refresh:   "M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15",
  zap:       "M13 2L3 14h9l-1 8 10-12h-9l1-8",
  warning:   "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
};

/* ─── Modelos disponibles ────────────────────────────────── */
const MODELOS = [
  {
    id: "optic",
    nombre: "OPTIC",
    desc: "XPON ONU",
    ip: "192.168.1.1",
    usuario: "admin",
    password: "system",
    color: "#2563eb",
    bg: "rgba(37,99,235,.08)",
    border: "rgba(37,99,235,.3)",
  },
  {
    id: "lanly",
    nombre: "LANLY",
    desc: "BOA CGI",
    ip: "192.168.1.1",
    usuario: "superadmin",
    password: "La23n7y",
    color: "#16a34a",
    bg: "rgba(22,163,74,.08)",
    border: "rgba(22,163,74,.3)",
  },
  {
    id: "benmundo",
    nombre: "BENMUNDO",
    desc: "BOA CGI",
    ip: "192.168.100.1",
    ipFallback: "192.168.101.1",
    usuario: "adminisp",
    password: "adminisp",
    color: "#d97706",
    bg: "rgba(217,119,6,.08)",
    border: "rgba(217,119,6,.3)",
  },
  {
    id: "mct",
    nombre: "MCT",
    desc: "AX3000",
    ip: "192.168.2.1",
    usuario: "Administrador",
    password: "mct@dm1n1str@d0r",
    color: "#7c3aed",
    bg: "rgba(124,58,237,.08)",
    border: "rgba(124,58,237,.3)",
  },
  {
    id: "zte",
    nombre: "ZTE",
    desc: "F6201B",
    ip: "192.168.1.1",
    usuario: "admin",
    password: "Web@0063",
    color: "#0891b2",
    bg: "rgba(8,145,178,.08)",
    border: "rgba(8,145,178,.3)",
  },
];

const PASOS = [
  { id: "login",  label: "Login",      desc: "Autenticando en la ONU" },
  { id: "wan",    label: "WAN / IP",   desc: "Configurando WAN estática" },
  { id: "lan",    label: "LAN / DHCP", desc: "Configurando red local" },
  { id: "acl",    label: "Acceso",     desc: "Habilitando acceso remoto" },
  { id: "upnp",   label: "UPnP",       desc: "Habilitando UPnP" },
  { id: "info",   label: "Info ONU",   desc: "Obteniendo datos del dispositivo" },
  { id: "wifi5",  label: "WiFi 5G",    desc: "Configurando red 5GHz" },
  { id: "wifi24", label: "WiFi 2.4G",  desc: "Configurando red 2.4GHz" },
  { id: "reboot", label: "Reinicio",   desc: "Reiniciando equipo" },
];

/* ─── Config entorno ─────────────────────────────────────── */
const IS_DEV = import.meta.env.DEV;

function buildUrl(ep, ontIp, equipo) {
  if (IS_DEV) return `/proxy/${ep}`;
  if (equipo === "mct" || equipo === "zte") return `http://${ontIp}/${ep}`;
  if (equipo === "optic") return `http://${ontIp}/cgi-bin/${ep}`;
  return `http://${ontIp}/${ep}`;
}

/* ─── postTableEncrypt ─── */
function postTableEncrypt(params) {
  const SKIP = new Set(["postSecurityFlag", "csrftoken"]);
  function encodeVal(v) {
    let s = encodeURIComponent(v == null ? "" : String(v));
    s = s.replace(/%20/g, "+");
    return s;
  }
  function encodeName(n) {
    return n.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
  }
  let inputVal = "";
  for (const [name, value] of Object.entries(params)) {
    if (SKIP.has(name)) continue;
    if (Array.isArray(value)) {
      for (const v of value) inputVal += encodeName(name) + "=" + encodeVal(v) + "&";
    } else {
      inputVal += encodeName(name) + "=" + encodeVal(value) + "&";
    }
  }
  let csum = 0;
  let i = 0;
  const L = inputVal.length;
  while (i < L) {
    if (i + 4 > L) {
      if (i < L)     csum += (inputVal.charCodeAt(i)   << 24);
      if (i + 1 < L) csum += (inputVal.charCodeAt(i+1) << 16);
      if (i + 2 < L) csum += (inputVal.charCodeAt(i+2) << 8);
      break;
    } else {
      csum += (inputVal.charCodeAt(i)   << 24) +
              (inputVal.charCodeAt(i+1) << 16) +
              (inputVal.charCodeAt(i+2) << 8)  +
               inputVal.charCodeAt(i+3);
      i += 4;
    }
  }
  csum = csum >>> 0;
  csum = (csum & 0xffff) + (csum >>> 16);
  csum = csum & 0xffff;
  csum = (~csum) & 0xffff;
  return csum;
}

/* ─── Helpers HTTP ───────────────────────────────────────── */
function devHdrs(ontIp, equipo, extra = {}) {
  return IS_DEV ? { "X-ONT-IP": ontIp, "X-EQUIPO": equipo, ...extra } : extra;
}

function enc(obj) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      for (const item of v) parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(item ?? "")}`);
    } else {
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v ?? "")}`);
    }
  }
  return parts.join("&");
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sha256hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function b64(str) { return btoa(unescape(encodeURIComponent(str))); }

async function getGatewayONU() {
  if (IS_DEV) return null;
  const webrtcGateway = await new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then(o => pc.setLocalDescription(o)).catch(() => resolve(null));
      pc.onicecandidate = (e) => {
        if (!e?.candidate?.candidate) return;
        const m = e.candidate.candidate.match(/(\d+\.\d+\.\d+)\.\d+/);
        if (m) { pc.close(); resolve(`${m[1]}.1`); }
      };
      setTimeout(() => { pc.close(); resolve(null); }, 2000);
    } catch (_) { resolve(null); }
  });
  if (webrtcGateway) {
    try {
      await CapacitorHttp.get({ url: `http://${webrtcGateway}/`, connectTimeout: 1500, readTimeout: 1500 });
      return webrtcGateway;
    } catch (_) {}
  }
  const commonIPs = ["192.168.1.1","192.168.0.1","192.168.2.1","192.168.100.1","192.168.101.1","192.168.10.1","192.168.8.1","192.168.18.1","192.168.3.1"];
  const results = await Promise.all(commonIPs.map(ip =>
    CapacitorHttp.get({ url: `http://${ip}/`, connectTimeout: 1200, readTimeout: 1200 }).then(() => ip).catch(() => null)
  ));
  return results.find(ip => ip !== null) || null;
}

function extractSessionKey(html) {
  let m = html.match(/gcsessionkey\s*=\s*["']([a-zA-Z0-9]{20,50})["']/);
  if (m) return m[1];
  m = html.match(/var\s+\w*[Ss]ession[Kk]ey\w*\s*=\s*["']([a-zA-Z0-9]{20,50})["']/);
  return m ? m[1] : null;
}

function extractCSRF(html) {
  const m = html.match(/name\s*=\s*["']csrftoken["'][^>]*value\s*=\s*["']([a-f0-9]{32})["']/i)
         || html.match(/value\s*=\s*["']([a-f0-9]{32})["'][^>]*name\s*=\s*["']csrftoken["']/i)
         || html.match(/csrftoken["']?\s*[=:]\s*["']?([a-f0-9]{32})/i);
  return m ? m[1] : null;
}

/* ─── Parsear texto XML de ZTE ─────────────────────────── */
function zteXmlVal(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
  return m ? m[1].trim() : "";
}

/* ─── Clase de configuración por modelo ─────────────────── */
class ONUConfigurator {
  constructor({ ontIp, ipFallback, equipo, usuario, password, vlan, ip, mascara, gateway,
                dns1, dns2, lanIp, dhcpS, dhcpE, ssid24, pass24, ssid5, pass5 }) {
    this.ontIp      = ontIp;
    this.ipFallback = ipFallback || null;
    this.equipo     = equipo;
    this.usuario    = usuario;
    this.password   = password;
    this.vlan       = vlan;
    this.ip         = ip;
    this.mascara    = mascara;
    this.gateway    = gateway;
    this.dns1       = dns1 || "8.8.8.8";
    this.dns2       = dns2 || "8.8.4.4";
    this.lanIp      = lanIp || "192.168.1.1";
    this.dhcpS      = dhcpS || "192.168.1.100";
    this.dhcpE      = dhcpE || "192.168.1.254";
    this.ssid24     = ssid24;
    this.pass24     = pass24;
    this.ssid5      = ssid5;
    this.pass5      = pass5;
    this.sk         = "";
    this.csrf       = "";
    this.zteToken   = "";
    this.zteTmpToken = "";
    this.zteHeaders = {};
    this.deviceInfo = { sn: "", rxPower: "", txPower: "", temp: "", firmware: "", modelo: "" };
  }

  url(ep) { return buildUrl(ep, this.ontIp, this.equipo); }
  hdrs(extra = {}) { return devHdrs(this.ontIp, this.equipo, extra); }

  async getCGI(ep) {
    if (IS_DEV) {
      const r = await fetch(this.url(ep), { credentials: "include", headers: this.hdrs({ Accept: "text/html,*/*" }) });
      return r.text();
    }
    const r = await CapacitorHttp.get({
      url: this.url(ep),
      headers: { Accept: "text/html,*/*" },
      params: {}, connectTimeout: 5000, readTimeout: 5000,
    });
    return r.data;
  }

  async postCGI(ep, params) {
    if (IS_DEV) {
      const r = await fetch(this.url(ep), {
        method: "POST", credentials: "include",
        headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html,*/*" }),
        body: enc(params),
      });
      return r.text();
    }
    const r = await CapacitorHttp.post({
      url: this.url(ep),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: params, params: {}, connectTimeout: 5000, readTimeout: 5000,
    });
    return r.data;
  }

  async postRaw(url, body) {
    if (IS_DEV) {
      const r = await fetch(url, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }, body,
      });
      return r.text();
    }
    const obj = {};
    for (const part of body.split("&")) {
      if (!part) continue;
      const eq = part.indexOf("=");
      const k = decodeURIComponent(part.slice(0, eq));
      const v = decodeURIComponent(part.slice(eq + 1));
      if (k in obj) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else { obj[k] = v; }
    }
    const r = await CapacitorHttp.post({
      url, headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: obj, params: {}, connectTimeout: 5000, readTimeout: 5000,
    });
    return r.data;
  }

  calcPSF(fields) { return postTableEncrypt(fields); }

  async refreshSK(pages = ["index.cgi", "wanpon_edit.cgi", "dhcpgateway.cgi", "wlantop.cgi"]) {
    for (const p of pages) {
      try {
        const h = await this.getCGI(p);
        const k = extractSessionKey(h);
        if (k) { this.sk = k; return k; }
      } catch (_) {}
    }
    return null;
  }

  async refreshCSRF(page) {
    const h = await this.getCGI(page);
    const t = extractCSRF(h);
    if (t) this.csrf = t;
    return h;
  }

  // ════════════════════════════════════════════════════════
  // INFO DISPOSITIVO
  // ════════════════════════════════════════════════════════

  // ── OPTIC — con sesión activa, antes del reboot ──────────
  async _fetchDeviceInfoOptic() {
    const info = { sn: "", rxPower: "", txPower: "", temp: "", firmware: "", modelo: "" };
    try {
      // deviceinfo.cgi — modelo, SN, firmware
      try {
        const r = await CapacitorHttp.get({
          url: `http://${this.ontIp}/cgi-bin/deviceinfo.cgi`,
          headers: { Accept: "text/html,*/*" },
          params: {}, connectTimeout: 3000, readTimeout: 3000,
        });
        const html = typeof r.data === "string" ? r.data : "";
        if (html && html.length > 300 && !html.includes("jumpUrl") && !html.includes("login.cgi")) {
          const modM = html.match(/id="?devinceinfo_modelname"?[^>]*>\s*([^<]{3,20})\s*</);
          if (modM) info.modelo = modM[1].trim();

          const snM = html.match(/width="75%"[^>]*>\s*([A-Za-z0-9\-]{6,30})\s*</)
                   || html.match(/id="?devinceinfo_sn"?[^>]*>\s*([A-Za-z0-9\-]{6,30})\s*</);
          if (snM) info.sn = snM[1].trim();

          const fwM = html.match(/id="?devinceinfo_softwareversion"?[^>]*>\s*([^<]{4,30})\s*</);
          if (fwM) info.firmware = fwM[1].trim();
        }
      } catch (_) {}

      // poninfo.cgi — RX, TX, temperatura (endpoint correcto del OPTIC)
      try {
        const r = await CapacitorHttp.get({
          url: `http://${this.ontIp}/cgi-bin/poninfo.cgi`,
          headers: { Accept: "text/html,*/*" },
          params: {}, connectTimeout: 3000, readTimeout: 3000,
        });
        const html = typeof r.data === "string" ? r.data : "";
        if (html && html.length > 100 && !html.includes("jumpUrl") && !html.includes("login.cgi")) {
          // El OPTIC usa IDs específicos en poninfo.cgi
          const rxM = html.match(/id="poninfo_rxpower"[^>]*>\s*([^<]+)\s*</);
          if (rxM) {
            const v = rxM[1].trim();
            info.rxPower = v.includes("dBm") ? v : v + " dBm";
          }
          const txM = html.match(/id="poninfo_txpower"[^>]*>\s*([^<]+)\s*</);
          if (txM) {
            const v = txM[1].trim();
            info.txPower = v.includes("dBm") ? v : v + " dBm";
          }
          const tempM = html.match(/id="poninfo_worktemp"[^>]*>\s*([^<]+)\s*</);
          if (tempM) {
            const v = tempM[1].trim();
            info.temp = v.includes("°") ? v : v + "°C";
          }
        }
      } catch (_) {}
    } catch (_) {}
    return info;
  }

        async _fetchDeviceInfoBOA(sessionCookie = null) {
          const info = { sn: "", rxPower: "", txPower: "", temp: "", firmware: "", modelo: "" };
          const headers = { Accept: "text/html,*/*" };
          if (sessionCookie) headers["Cookie"] = sessionCookie;

          // Usar las URLs que sabemos que funcionan para esta LANLY
          const ponUrl = `http://${this.ontIp}/status_gpon.asp`;
          const deviceUrl = `http://${this.ontIp}/status_device_basic_info.asp`;

          // Obtener datos PON (RX, TX, Temperatura)
          try {
            const r = await CapacitorHttp.get({ url: ponUrl, headers, connectTimeout: 5000, readTimeout: 5000 });
            const html = typeof r.data === "string" ? r.data : "";
            if (html && html.length > 300 && r.status === 200 && !html.includes("login")) {
              const parsed = this._parseLanlyGpon(html);
              if (parsed.rx) info.rxPower = parsed.rx + " dBm";
              if (parsed.tx) info.txPower = parsed.tx + " dBm";
              if (parsed.temp) info.temp = parsed.temp + "°C";
              console.log("LANLY PON:", parsed);
            }
          } catch (e) { console.log("Error PON:", e.message); }

          // Obtener datos del dispositivo (SN, Modelo, Firmware)
          try {
            const r = await CapacitorHttp.get({ url: deviceUrl, headers, connectTimeout: 5000, readTimeout: 5000 });
            const html = typeof r.data === "string" ? r.data : "";
            if (html && html.length > 500 && r.status === 200 && !html.includes("login")) {
              const parsed = this._parseLanlyDeviceInfo(html);
              if (parsed.modelo) info.modelo = parsed.modelo;
              if (parsed.gponsn) info.sn = parsed.gponsn;
              if (parsed.fw) info.firmware = parsed.fw;
              console.log("LANLY Device:", parsed);
            }
          } catch (e) { console.log("Error Device:", e.message); }

          return info;
        }

  async _fetchDeviceInfoMCT() {
    const info = { sn: "", rxPower: "", txPower: "", temp: "", firmware: "", modelo: "" };
    try {
      const statusPages = [
        `status.html`, `x_poninfo.html`, `x_devinfo.html`,
        `ctstatus.html`, `ctdevinfo.html`,
      ];
      for (const page of statusPages) {
        try {
          const html = await this.getCGI(page);
          if (!html || html.length < 200 || html.includes("login.html")) continue;
          const snM = html.match(/(?:SerialNumber|GPON_SN|serial_number)[^"'<>]*["'>]([A-Fa-f0-9]{12,20})[<"']/i)
                   || html.match(/MDMOID[^"']*SN[^"']*["']([A-Fa-f0-9]{12,20})["']/i);
          if (snM && !info.sn) info.sn = snM[1];
          const rxM = html.match(/(?:RxPower|RX_Power|rx_power)[^"'<>]*["'>](-?\d+\.?\d*)[<"']/i);
          if (rxM && !info.rxPower) info.rxPower = rxM[1] + " dBm";
          const txM = html.match(/(?:TxPower|TX_Power|tx_power)[^"'<>]*["'>](-?\d+\.?\d*)[<"']/i);
          if (txM && !info.txPower) info.txPower = txM[1] + " dBm";
          const fwM = html.match(/(?:SoftwareVersion|FirmwareVersion)[^"'<>]*["'>]([^<>"']{3,30})[<"']/i);
          if (fwM && !info.firmware) info.firmware = fwM[1].trim();
          const modM = html.match(/(?:ModelName|ProductName)[^"'<>]*["'>]([^<>"']{3,20})[<"']/i);
          if (modM && !info.modelo) info.modelo = modM[1].trim();
          if (info.sn || info.rxPower) break;
        } catch (_) {}
      }
      try {
        const ponHtml = await this.getCGI(`x_poninfocfg.cgi?type=objShow&id=MDMOID_PON_INFO`);
        const rxM = ponHtml.match(/RxPower[^"'<>]*["'>](-?\d+\.?\d*)[<"']/i);
        if (rxM && !info.rxPower) info.rxPower = rxM[1] + " dBm";
        const txM = ponHtml.match(/TxPower[^"'<>]*["'>](-?\d+\.?\d*)[<"']/i);
        if (txM && !info.txPower) info.txPower = txM[1] + " dBm";
        const snM = ponHtml.match(/SerialNumber[^"'<>]*["'>]([A-Fa-f0-9]{12,20})[<"']/i);
        if (snM && !info.sn) info.sn = snM[1];
      } catch (_) {}
    } catch (_) {}
    return info;
  }

  async _fetchDeviceInfoZTE() {
    const info = { sn: "", rxPower: "", txPower: "", temp: "", firmware: "", modelo: "" };
    const luaEndpoints = [
      { tag: "systeminfo",    lua: "devmgr_devinfo_lua.lua" },
      { tag: "ponStatus",     lua: "devmgr_pon_lua.lua" },
      { tag: "deviceSummary", lua: "devmgr_summary_lua.lua" },
      { tag: "statusinfo",    lua: null },
    ];
    for (const { tag, lua } of luaEndpoints) {
      try {
        const viewRes = await CapacitorHttp.get({
          url: `http://${this.ontIp}/?_type=menuView&_tag=${tag}&Menu3Location=0`,
          headers: { Accept: "text/html,*/*", ...this.zteHeaders },
          params: {}, connectTimeout: 5000, readTimeout: 5000,
        });
        const viewHtml = typeof viewRes.data === "string" ? viewRes.data : "";
        if (viewRes.status >= 400 || viewHtml.length < 100) continue;
        const tokM = viewHtml.match(/_sessionTmpToken\s*=\s*"((?:\\x[0-9a-fA-F]{2}|[^"\\])+)"/);
        const tok = tokM ? tokM[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) : this.zteTmpToken;
        if (!info.sn) {
          const snM = viewHtml.match(/GPON\s*SN[^<>]*>[^<]*<[^<>]*>([A-Fa-f0-9]{12,20})/i)
                   || viewHtml.match(/SerialNumber[^<>]*>([A-Fa-f0-9]{12,20})/i)
                   || viewHtml.match(/(?:value|val)\s*=\s*["']([A-Fa-f0-9]{12,20})["'][^>]*(?:sn|serial)/i);
          if (snM) info.sn = snM[1];
        }
        const fwM = viewHtml.match(/(?:SoftwareVersion|FirmwareVersion|Software Version)[^<>]*>([^<]{4,30})</i);
        if (fwM && !info.firmware) info.firmware = fwM[1].trim();
        if (lua) {
          try {
            const dataRes = await CapacitorHttp.post({
              url: `http://${this.ontIp}/?_type=menuData&_tag=${lua}`,
              headers: { "Content-Type": "application/x-www-form-urlencoded", ...this.zteHeaders },
              data: `IF_ACTION=Query&_sessionTOKEN=${encodeURIComponent(tok)}`,
              params: {}, connectTimeout: 5000, readTimeout: 5000,
            });
            const xml = typeof dataRes.data === "string" ? dataRes.data : "";
            const snXml = zteXmlVal(xml, "SerialNumber") || zteXmlVal(xml, "GPON_SN") || zteXmlVal(xml, "sn");
            if (snXml && !info.sn) info.sn = snXml;
            const rxXml = zteXmlVal(xml, "RxPower") || zteXmlVal(xml, "RXPower") || zteXmlVal(xml, "rx_power");
            if (rxXml && !info.rxPower) info.rxPower = rxXml + (rxXml.includes("dBm") ? "" : " dBm");
            const txXml = zteXmlVal(xml, "TxPower") || zteXmlVal(xml, "TXPower") || zteXmlVal(xml, "tx_power");
            if (txXml && !info.txPower) info.txPower = txXml + (txXml.includes("dBm") ? "" : " dBm");
            const tempXml = zteXmlVal(xml, "Temperature") || zteXmlVal(xml, "Temp");
            if (tempXml && !info.temp) info.temp = tempXml + (tempXml.includes("°") ? "" : "°C");
            const fwXml = zteXmlVal(xml, "SoftwareVersion") || zteXmlVal(xml, "FirmwareVersion");
            if (fwXml && !info.firmware) info.firmware = fwXml;
            const modXml = zteXmlVal(xml, "ModelName") || zteXmlVal(xml, "ProductClass");
            if (modXml && !info.modelo) info.modelo = modXml;
          } catch (_) {}
        }
        if (info.sn && info.rxPower) break;
      } catch (_) {}
    }
    if (!info.rxPower) {
      try {
        const ponEndpoints = [
          `/?_type=menuData&_tag=devmgr_pon_info_lua.lua`,
          `/?_type=menuData&_tag=poninfo_lua.lua`,
          `/?_type=menuData&_tag=devmgr_poninfo_lua.lua`,
        ];
        for (const ep of ponEndpoints) {
          try {
            const r = await CapacitorHttp.post({
              url: `http://${this.ontIp}${ep}`,
              headers: { "Content-Type": "application/x-www-form-urlencoded", ...this.zteHeaders },
              data: `IF_ACTION=Query&_sessionTOKEN=${encodeURIComponent(this.zteTmpToken)}`,
              params: {}, connectTimeout: 5000, readTimeout: 5000,
            });
            const xml = typeof r.data === "string" ? r.data : "";
            if (xml.includes("SUCC") || xml.length > 100) {
              const rxM = xml.match(/<[^>]*[Rr]x[Pp]ower[^>]*>([^<]+)</);
              if (rxM && !info.rxPower) info.rxPower = rxM[1].trim() + " dBm";
              const txM = xml.match(/<[^>]*[Tt]x[Pp]ower[^>]*>([^<]+)</);
              if (txM && !info.txPower) info.txPower = txM[1].trim() + " dBm";
              const snM = xml.match(/<[^>]*[Ss]erial[Nn]umber[^>]*>([^<]+)</);
              if (snM && !info.sn) info.sn = snM[1].trim();
              if (info.rxPower) break;
            }
          } catch (_) {}
        }
      } catch (_) {}
    }
    return info;
  }

  // ════════════════════════════════════════════════════════
  // OPTIC — ZTE CGI
  // ORDEN: login → wan → lan → acl → upnp → INFO → wifi5 → wifi24 → reboot
  // ════════════════════════════════════════════════════════
  async runOptic(onProgress) {
    onProgress("login", "running");
    try {
      await this.getCGI("login.cgi");
      await this.postCGI("login.cgi", {
        onSubmit: "1", login_language: "English",
        encryPassword: "54b53072540eeeb8f8e9343e71f28176",
        encryUsername: "21232f297a57a5a743894a0e4a801fc3",
      });
      const k = await this.refreshSK();
      if (!k) throw new Error("No se encontró sessionkey");
      onProgress("login", "done");
    } catch (e) { onProgress("login", "error"); throw new Error(`Login fallido: ${e.message}`); }
    await sleep(300);

    onProgress("wan", "running");
    try {
      await this.refreshSK(["wanpon_edit.cgi"]);
      for (const idx of ["1", "2"]) {
        try {
          await this.getCGI(`wanpon_edit.cgi?sessionkey=${this.sk}&pvceditindex=${idx}&child_index=1&encapmode=IPoE&operate=delpvc&onSubmit=2`);
          await sleep(600);
        } catch (_) {}
      }
      await sleep(800);
      await this.refreshSK(["wanpon_edit.cgi"]);
      await this.postCGI("wanpon_edit.cgi", {
        wanpon_connect_type: "", pvcindex: "-1", child_index: "-1",
        pvcenable: "1", pvcdhcpenable: "1", encapmode: "IPoE", pvcipprotocol: "1",
        pppauthtype: "", pppconntrigger: "", ipacqmode: "Static", ipnat: "1",
        sessionkey: this.sk, onSubmit: "1",
        ipv6getmodeid: "", ipv6staticguaid: "", ipv6staticguagwid: "",
        ipv6staticdnsid: "", prefixdelegateid: "", X_8021pvalue: "0",
        wanpon_operation: "add", dslite_enable: "0", dslite_addressmode: "DHCPv6",
        laninterface: "InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1,InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.2,InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.3,InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.4,InternetGatewayDevice.WiFi.SSID.9,InternetGatewayDevice.WiFi.SSID.1",
        nptv6_enable: "0", wanpon_connectionType: "IP_Routed", dscp_enable: "0",
        pppoe_proxyenable: "0", passthrough_enable: "0", servicetype: "INTERNET",
        wanponedit_option60_enable: "", wanponedit_option125_enable: "", page_action: "",
        wanpon_connectname: "9", wanpon_encapsulatemode: "IPoE", wanpon_protocol: "1",
        wanponedit_servicetype: "INTERNET", wanponedit_vlanmode: "2",
        wanponedit_vlanid: this.vlan, wanponedit_8021p: "0",
        wanponedit_ppptranstype: "PPPoE", wanponedit_pppusername: "",
        wanponedit_ppppassword: "", wanponedit_dmsname: "",
        wanponedit_authtype: "Auto", wanponedit_ppptrigger: "AlwaysOn",
        wanponedit_idletime: "", wanponedit_Ipv4getmode: "Static",
        wanponedit_staticip: this.ip, wanponedit_staticmask: this.mascara,
        wanponedit_staticgateway: this.gateway,
        wanponedit_staticdns1: this.dns1, wanponedit_staticdns2: this.dns2,
        wanponedit_staticdns3: "1.1.1.1",
        ipv6getmode: "Manual", wanponedit_ipv6staticgua: "None",
        wanponedit_ipv6staticguaipaddress: "", wanponedit_ipv6staticguaiplen: "",
        wanponedit_ipv6staticguaipgwaddress: "",
        wanponedit_ipv6staticdns1: "", wanponedit_ipv6staticdns2: "",
        wanponedit_ipv6staticdns3: "", wanponedit_ipv6staticpdipprefix: "",
        wanponedit_ipv6staticpdiplen: "", wanponedit_ipv6staticdsliteipaddress: "",
        wanponedit_nat: "on", wanponedit_mtu: "1480", wanponedit_multicastvlan: "",
        wanponedit_option60username: "", wanponedit_option60password: "",
        wanponedit_option125username: "",
      });
      onProgress("wan", "done");
    } catch (e) { onProgress("wan", "error"); throw new Error(`WAN fallida: ${e.message}`); }
    await sleep(800);

    onProgress("lan", "running");
    try {
      await this.refreshSK(["dhcpgateway.cgi"]);
      await this.postCGI("dhcpgateway.cgi", {
        sessionkey: this.sk, onSubmit: "1",
        dhcpserverenable: "1", dhcpipchanged: "", lanispdns: "0",
        dhcpsv_ispleasetime: "86400",
        dhcpgw_ipaddress: this.lanIp, dhcpgw_subnetmask: "255.255.255.0",
        dhcpsv_dhcpenable: "on",
        dhcpsv_startip: this.dhcpS, dhcpsv_endip: this.dhcpE,
        dhcpsv_dns1: this.dns1, dhcpsv_dns2: this.dns2,
      });
      onProgress("lan", "done");
    } catch (e) { onProgress("lan", "error"); throw new Error(`LAN fallida: ${e.message}`); }
    await sleep(600);

    onProgress("acl", "running");
    try {
      await this.refreshSK(["acl.cgi"]);
      await this.postCGI("acl.cgi", {
        onSubmit: "1", sessionkey: this.sk,
        lan_http_enable: "1", lan_https_enable: "1",
        lan_telnet_enable: "1", lan_ssh_enable: "1",
        wifi_web_enable: "1", wifi_webs_enable: "1",
        wan_http_enable: "1", wan_https_enable: "1",
        wan_telnet_enable: "1", wan_icmp_enable: "1",
      });
      onProgress("acl", "done");
    } catch (_) { onProgress("acl", "done"); }
    await sleep(400);

    onProgress("upnp", "running");
    try {
      await this.refreshSK(["upnp.cgi"]);
      await this.postCGI("upnp.cgi", {
        onSubmit: "1", sessionkey: this.sk, upnpenable: "1", upnp_enable: "on",
      });
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    onProgress("wifi5", "running");
    try {
      await this.refreshSK(["wlantop.cgi"]);
      await this._wifiOptic(this.ssid5, this.pass5, 9, "160MHz", "a,n,ac,ax");
      onProgress("wifi5", "done");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("IOException") || msg.includes("EOFException") ||
          msg.includes("unexpected end") || msg.includes("NullPointerException")) {
        onProgress("wifi5", "done");
      } else {
        onProgress("wifi5", "error");
        throw new Error(`WiFi 5G fallida: ${e.message}`);
      }
    }
    await sleep(1500);

    // INFO aquí — entre wifi5 y wifi24, sesión todavía activa
    onProgress("info", "running");
    try {
      this.deviceInfo = await this._fetchDeviceInfoOptic();
      onProgress("info", "done");
    } catch (_) { onProgress("info", "done"); }
    await sleep(300);

    onProgress("wifi24", "running");
    try {
      await this.refreshSK(["wlantop.cgi"]);
      await this._wifiOptic(this.ssid24, this.pass24, 1, "40MHz", "b,g,n,ax");
      onProgress("wifi24", "done");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("IOException") || msg.includes("EOFException") ||
          msg.includes("unexpected end") || msg.includes("NullPointerException")) {
        onProgress("wifi24", "done");
      } else {
        onProgress("wifi24", "error");
        throw new Error(`WiFi 2.4G fallida: ${e.message}`);
      }
    }
    await sleep(1500);

    onProgress("reboot", "running");
    try {
      await this.refreshSK(["reboot.cgi"]);
      await this.postCGI("reboot.cgi", {
        onSubmit: "loading",
        sessionkey: this.sk,
      });
      await sleep(1000);
      await this.refreshSK(["loading.cgi?url=reboot.cgi&waittime=60&operation=docmd"]);
      await sleep(1000);
      this.postCGI("reboot.cgi", {
        onSubmit: "docmd",
        sessionkey: this.sk,
      }).catch(() => {});
      await sleep(3000);
      onProgress("reboot", "done");
    } catch (_) {
      onProgress("reboot", "done");
    }
  }

  async _wifiOptic(ssid, pass, idx, bw, std) {
    const passB64 = b64(pass);
    try {
      await this.postCGI("wlantop.cgi", {
        sessionkey: this.sk, onSubmit: "1",
        Enable: "1", RadioEnabled: "1",
        ModeEnabled: "WPA-WPA2-Personal",
        wep_authmode: "", WEPEncryptionLevel: "",
        SSIDAdvertisementEnabled: "1",
        Channel: "", AutoChannelEnable: "1",
        OperatingChannelBandwidth: bw, TransmitPower: "100",
        external_idx: String(idx), SSID: ssid,
        X_GC_HT_GuardInterval: "0", WmmEnable: "1",
        backup_external_idx: "", Backup_Enable: "0",
        Backup_SSID: ssid + "Wifi5", BandEnable: "1",
        KeyPassphrase_input: passB64, WEPKey: b64("12345"),
        SAEPassphrase_input: passB64,
        RadioEnabled_bt: "on", BandEnable_bt: "on",
        country_region: "PE", standard: std,
        bw, channel: "0", SGIEnabled_bt: "on",
        BeaconPeriod: "100", transmitpower: "100", DTIMPeriod: "3",
        wlan_twt: "1", external_idx_sel: String(idx), Enable_bt: "on",
        MaxAllowedAssociations: "16", SSID_input: ssid,
        authmode: "WPA-WPA2-Personal", radius_server: "", radius_port: "0",
        radius_key: "", wpa3_encryptionmode: "AES",
        wpa_encryptionmode: "TKIP+AES",
        wep_encryption_level: "40-bit", WMM_Enable: "on",
      });
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("IOException") || msg.includes("EOFException") ||
          msg.includes("unexpected end") || msg.includes("NullPointerException")) return;
      throw e;
    }
  }

  // ════════════════════════════════════════════════════════
  // LANLY — BOA CGI
  // ════════════════════════════════════════════════════════
  async runLanly(onProgress) {
    // LOGIN
    onProgress("login", "running");
    try {
      let html = await this.getCGI("net_eth_links.asp");
      let tok = extractCSRF(html);
      if (!tok || html.includes("formLogin") || html.length < 1000) {
        const loginHtml = await this.getCGI("admin/login.asp");
        const loginTok = extractCSRF(loginHtml);
        if (!loginTok) throw new Error("No se encontró CSRF token");
        this.csrf = loginTok;
        await this.postCGI("boaform/admin/formLogin", {
          username1: this.usuario, psd1: this.password,
          loginSelinit: this.usuario === "superadmin" ? "3" : "1",
          username: this.usuario, psd: this.password,
          sec_lang: "0", ismobile: "", csrftoken: this.csrf,
        });
        html = await this.getCGI("net_eth_links.asp");
        tok = extractCSRF(html);
        if (!tok && html.includes("formLogin")) 
          throw new Error("Credenciales inválidas");
      }
      if (tok) this.csrf = tok;
      onProgress("login", "done");
    } catch (e) { 
      onProgress("login", "error"); 
      throw new Error(`Login fallido: ${e.message}`); 
    }
    await sleep(300);

    // WAN
    onProgress("wan", "running");
    try {
      let html = await this.refreshCSRF("net_eth_links.asp");
      const lstM = html.match(/new\s+it_nr\s*\(\s*["']([^"']+)["']/);
      const lst = lstM ? lstM[1] : null;

      if (lst) {
        // DELETE — igual que referencia: lkname='0', ignorar timeout
        try {
          await this._lanlyPostEthernet({
            lkname: "0",  // ← CLAVE: usa '0' no lst
            lkmode: "1", IpProtocolType: "1", ipmode: "1",
            PPPoEProxyMaxUser: "0", napt: "on", vlan: "on", vid: "100",
            vprio: "1", mtu: "1500", pppUsername: "", pppPassword: "",
            pppServiceName: "", pppCtype: "0",
            ipAddr: "0.0.0.0", netMask: "255.255.255.0", 
            remoteIpAddr: "0.0.0.0",
            v4dns1: "8.8.8.8", v4dns2: "8.8.4.4",
            applicationtype: "1", dslite_aftr_mode: "0", 
            dslite_aftr_hostname: "::",
            Ipv6Addr: "", Ipv6PrefixLen: "", Ipv6Gateway: "",
            dnsv6Mode: "1", Ipv6Dns1: "", Ipv6Dns2: "",
            cmode: "1", ipDhcp: "0", itfGroup: "543",
            encodePppUserName: "", encodePppPassword: "",
            lst, action: "rm",
            "submit-url": `http://${this.ontIp}/net_eth_links.asp`,
            acnameflag: "none", csrftoken: this.csrf,
            chkpt: ["on","on","on","on","on","","","","","on","","","",""],
          });
        } catch (_) {} // ignorar error del delete
        await sleep(1500);
        await this.refreshCSRF("net_eth_links.asp");
      }

      // SAVE — ignorar timeout igual que referencia
      try {
        await this._lanlyPostEthernet({
          lkname: "new", lkmode: "1", IpProtocolType: "1", ipmode: "1",
          PPPoEProxyMaxUser: "0", napt: "on", vlan: "on", vid: this.vlan,
          vprio: "1", mtu: "1500", pppUsername: "", pppPassword: "",
          pppServiceName: "", pppCtype: "0",
          ipAddr: this.ip, netMask: this.mascara, remoteIpAddr: this.gateway,
          dnsMode: "0", v4dns1: this.dns1, v4dns2: this.dns2,
          applicationtype: "1", dslite_aftr_mode: "0", 
          dslite_aftr_hostname: "::",
          Ipv6Addr: "", Ipv6PrefixLen: "", Ipv6Gateway: "",
          dnsv6Mode: "1", Ipv6Dns1: "", Ipv6Dns2: "",
          cmode: "1", ipDhcp: "0", itfGroup: "543",
          encodePppUserName: "", encodePppPassword: "",
          lst: "", action: "sv",
          "submit-url": `http://${this.ontIp}/net_eth_links.asp`,
          acnameflag: "none", csrftoken: this.csrf,
          chkpt: ["on","on","on","on","on","","","","","on","","","",""],
        });
      } catch (_) {} // ignorar timeout del save — es normal en este equipo

      onProgress("wan", "done");

      // LOOP DE ESPERA — igual que referencia, hasta 20s
      const wanStart = Date.now();
      let wanReady = false;
      while (Date.now() - wanStart < 20000) {
        await sleep(2000);
        try {
          const h = await this.getCGI("net_eth_links.asp");
          if (h && h.length > 500 && !h.includes("formLogin")) {
            wanReady = true;
            break;
          }
        } catch (_) {}
      }
      if (!wanReady) await sleep(3000);

    } catch (e) { 
      onProgress("wan", "error"); 
      throw new Error(`WAN fallida: ${e.message}`); 
    }

    // LAN
    onProgress("lan", "running");
    try {
      await this.refreshCSRF("net_dhcpd.asp");
      await this.postCGI("boaform/formDhcpServer", {
        uIp: this.lanIp, uMask: "255.255.255.0", uDhcpType: "1",
        dhcpRangeStart: this.dhcpS, dhcpRangeEnd: this.dhcpE,
        ipMaskMode: "0", ulTime: "86400", ipv4landnsmode: "1",
        Ipv4Dns1: this.dns1, Ipv4Dns2: this.dns2,
        "submit-url": `http://${this.ontIp}/net_dhcpd.asp`,
        csrftoken: this.csrf,
      });
      onProgress("lan", "done");
    } catch (e) { 
      onProgress("lan", "error"); 
      throw new Error(`LAN fallida: ${e.message}`); 
    }
    await sleep(600);

    // UPnP — antes de ACL, igual que referencia
    onProgress("upnp", "running");
    try {
      const upnpHtml = await this.refreshCSRF("app_upnp.asp");
      const ifIdx = upnpHtml.match(/ifIdx\s*=\s*(\d+)/);
      const extIf = ifIdx ? ifIdx[1] : "130816";
      await this.postCGI("boaform/admin/formUpnp", {
        daemon: "1", ext_if: extIf, save: "Guardar",
        "submit-url": "/app_upnp.asp", csrftoken: this.csrf,
      });
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    // ACL
    onProgress("acl", "running");
    try {
      await this.refreshCSRF("rmtacc.asp");
      await this.postCGI("boaform/formSAC", {
        l_telnet: "1", w_telnet: "1", w_telnet_port: "23", w_telnet_ip: "",
        w_ftp_port: "21", w_ftp_ip: "", l_web: "1", w_web: "1",
        w_web_port: "80", w_web_ip: "", l_https: "1", w_https: "1",
        w_https_port: "443", w_https_ip: "", w_icmp: "1", w_icmp_ip: "",
        set: "Aplicar", "submit-url": "/rmtacc.asp", csrftoken: this.csrf,
      });
      onProgress("acl", "done");
    } catch (_) { onProgress("acl", "done"); }
    await sleep(400);

    // WiFi 5G
    onProgress("wifi5", "running");
    try {
      await this.refreshCSRF("admin/wlbasic.asp?wlan_idx=0");
      await this.postCGI("boaform/admin/formWlanSetup", {
        band: "75", mode: "0", ssid: this.ssid5, pskFormat: "0", 
        pskValue: this.pass5, wl_wmm_func: "ON",
        powerincrease: "ON", powersaving: "ON",
        chanwid: "2", ctlband: "0", chan: "153", txpower: "0",
        wl_limitstanum: "0", wl_stanum: "", regdomain_demo: "13",
        "submit-url": "/admin/wlbasic.asp", save: "Aplicar Cambios",
        basicrates: "15", operrates: "4095", wlan_idx: "0",
        Band2G5GSupport: "2", wlanBand2G5GSelect: "", dfs_enable: "1",
        regDomain: "11", csrftoken: this.csrf,
      });
      onProgress("wifi5", "done");
    } catch (e) {
      const msg = e.message || "";
      const code = e.code || "";
      // Estos errores son NORMALES al aplicar WiFi - el servicio web se reinicia
      if (msg.includes("Software caused connection abort") ||
          msg.includes("SocketException") ||
          msg.includes("connection abort") ||
          code === "SocketException") {
        onProgress("wifi5", "done"); // Considerar como éxito
      } else {
        onProgress("wifi5", "error");
        throw new Error(`WiFi 5G fallida: ${e.message}`);
      }
    }
    await sleep(3000); // ← referencia usa 600 pero 3000 es más seguro

     // ✅ AGREGAR AQUÍ LA CAPTURA DE INFO
    // INFO - capturar datos del dispositivo (SN, RX, TX)
    onProgress("info", "running");
    try {
      this.deviceInfo = await this._fetchDeviceInfoBOA();
      onProgress("info", "done");
    } catch (_) { 
      onProgress("info", "done"); 
    }
    await sleep(300);

    // WiFi 2.4G
    onProgress("wifi24", "running");
    try {
      await this.refreshCSRF("admin/wlbasic.asp?wlan_idx=1");
      await this.postCGI("boaform/admin/formWlanSetup", {
        band: "10", mode: "0", ssid: this.ssid24, pskFormat: "0", pskValue: this.pass24,
        wl_wmm_func: "ON", chanwid: "1", chan: "0", txpower: "0",
        wl_limitstanum: "0", wl_stanum: "", regdomain_demo: "13",
        "submit-url": "/admin/wlbasic.asp", save: "Aplicar Cambios",
        basicrates: "15", operrates: "4095", wlan_idx: "1",
        Band2G5GSupport: "1", wlanBand2G5GSelect: "", dfs_enable: "1",
        regDomain: "11", csrftoken: this.csrf,
      });
      onProgress("wifi24", "done");
    } catch (e) {
      const msg = e.message || "";
      const code = e.code || "";
      // Los mismos errores de conexión son normales aquí también
      if (msg.includes("Software caused connection abort") ||
          msg.includes("SocketException") ||
          msg.includes("connection abort") ||
          msg.includes("SocketTimeoutException") ||
          msg.includes("timeout") ||
          code === "SocketException") {
        onProgress("wifi24", "done");
      } else {
        onProgress("wifi24", "error");
        throw new Error(`WiFi 2.4G fallida: ${msg}`);
      }
    }
    await sleep(600);

    // REBOOT
    onProgress("reboot", "running");
    try {
      await this.refreshCSRF("mgm_dev_reboot.asp");
      await this.postCGI("boaform/admin/formReboot", {
        "submit-url": "/mgm_dev_reboot.asp", csrftoken: this.csrf,
      });
      await sleep(2000);
      onProgress("reboot", "done");
    } catch (_) { onProgress("reboot", "done"); }
  }

  async _lanlyPostEthernet(fields) {
    const chkpt = fields.chkpt || [];
    const { chkpt: _c, ...rest } = fields;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(rest)) params.append(k, v ?? "");
    for (const v of chkpt) params.append("chkpt", v);
    return this.postRaw(this.url("boaform/admin/formEthernet"), params.toString());
  }

// ════════════════════════════════════════════════════════
// BENMUNDO — BOA CGI + postSecurityFlag
// ════════════════════════════════════════════════════════
  async runBenmundo(onProgress) {
    onProgress("login", "running");
    try {
      let loginHtml;
      try {
        loginHtml = await this.getCGI("admin/login.asp");
      } catch (e) {
        if (this.ipFallback) {
          this.ontIp = this.ipFallback;
          this.ipFallback = null;
          loginHtml = await this.getCGI("admin/login.asp");
        } else throw e;
      }
      const psfM = loginHtml.match(/name\s*=\s*["']postSecurityFlag["'][^>]*value\s*=\s*["']([^"']*)["']/i)
                || loginHtml.match(/value\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']postSecurityFlag["']/i);
      const chalM = loginHtml.match(/name\s*=\s*["']challenge["'][^>]*value\s*=\s*["']([^"']*)["']/i)
                 || loginHtml.match(/value\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']challenge["']/i);
      const loginParams = {
        challenge: chalM ? chalM[1] : "",
        username: this.usuario, password: this.password,
        save: "Login", "submit-url": "/admin/login.asp",
        postSecurityFlag: psfM ? psfM[1] : "",
      };
      await this.postCGI("boaform/admin/formLogin", loginParams);
      let ok = false;
      for (const page of ["multi_wan_generic.asp", "status_device_basic_info.asp"]) {
        try {
          const h = await this.getCGI(page);
          if (h && h.length > 500 && !h.includes("login.asp") && !h.includes("formLogin")) {
            ok = true; break;
          }
        } catch (_) {}
      }
      if (!ok) throw new Error("Credenciales inválidas");
      onProgress("login", "done");
    } catch (e) { onProgress("login", "error"); throw new Error(`Login fallido: ${e.message}`); }
    await sleep(300);

    onProgress("wan", "running");
    try {
      const wanPageHtml = await this.getCGI("multi_wan_generic.asp");
      const itfGroupM = wanPageHtml.match(/new\s+it\s*\(\s*["']itfGroup["']\s*,\s*(\d+)\s*\)/);
      const itfGroup = (itfGroupM && parseInt(itfGroupM[1]) > 0) ? itfGroupM[1] : "275";
      const existingLstM = wanPageHtml.match(/new\s+it_nr\s*\(\s*["'](nas[\w_]+)["']/);
      const existingLst = existingLstM ? existingLstM[1] : null;
      if (existingLst) {
        const delFields = {
          lkname: existingLst, lst: existingLst, action: "rm",
          itfGroup, "submit-url": "/multi_wan_generic.asp", postSecurityFlag: "",
        };
        delFields.postSecurityFlag = String(this.calcPSF(delFields));
        const delParams = new URLSearchParams();
        for (const [k, v] of Object.entries(delFields)) delParams.append(k, v ?? "");
        for (const v of ["on","on","","","on","","","","on","","",""]) delParams.append("chkpt", v);
        await this.postRaw(this.url("boaform/admin/formWanEth"), delParams.toString());
        await sleep(1500);
      }
      const wanFields = {
        lkname: existingLst || "new", vlan: "ON", vid: this.vlan,
        vprio: "1", multicast_vid: "", adslConnectionMode: "1",
        brmode: "0", naptEnabled: "ON", chEnable: "1", ctype: "2",
        mtu: "1480", droute: "1", IpProtocolType: "1", auth: "0",
        acName: "", serviceName: "", ipMode: "0",
        ip: this.ip, remoteIp: this.gateway, netmask: this.mascara,
        dnsMode: "0", dns1: this.dns1, dns2: this.dns2,
        gwStr: "", wanIf: "", SixrdBRv4IP: "", SixrdIPv4MaskLen: "",
        SixrdPrefix: "", SixrdPrefixLen: "", AddrMode: "1",
        Ipv6Addr: "", Ipv6PrefixLen: "", Ipv6Gateway: "",
        iana: "ON", dnsV6Mode: "1", dslite_aftr_hostname: "",
        "submit-url": "/multi_wan_generic.asp",
        lst: existingLst || "", encodePppUserName: "", encodePppPassword: "",
        apply: "Apply Changes", itfGroup, postSecurityFlag: "",
      };
      wanFields.postSecurityFlag = String(this.calcPSF(wanFields));
      const wanParams = new URLSearchParams();
      for (const [k, v] of Object.entries(wanFields)) wanParams.append(k, v ?? "");
      for (const v of ["on","on","","","on","","","","on","","",""]) wanParams.append("chkpt", v);
      await this.postRaw(this.url("boaform/admin/formWanEth"), wanParams.toString());
      onProgress("wan", "done");
    } catch (e) { onProgress("wan", "error"); throw new Error(`WAN fallida: ${e.message}`); }
    await sleep(2000);

    onProgress("lan", "running");
    try {
      const lanFields = {
        lan_ip: this.lanIp, lan_mask: "255.255.255.0",
        dhcpdenable: "2", dhcpRangeStart: this.dhcpS, dhcpRangeEnd: this.dhcpE,
        dhcpSubnetMask: "255.255.255.0", ltime: "43200", dname: "bbrouter",
        ip: this.lanIp, dhcpdns: "1",
        dns1: this.dns1, dns2: this.dns2, dns3: "1.1.1.1",
        save: "Apply Changes", "submit-url": "/dhcpd.asp", postSecurityFlag: "",
      };
      lanFields.postSecurityFlag = String(this.calcPSF(lanFields));
      await this.postCGI("boaform/formDhcpServer", lanFields);
      onProgress("lan", "done");
    } catch (e) { onProgress("lan", "error"); throw new Error(`LAN fallida: ${e.message}`); }
    await sleep(600);

    onProgress("acl", "running");
    try {
      const aclFields = {
        lan_ip: this.lanIp, lan_mask: "255.255.255.0",
        aclcap: "1", enable: "1", interface: "1",
        aclstartIP: "0.0.0.0", aclendIP: "255.255.255.255",
        l_telnet_port: "23", l_ftp_port: "21", l_web_port: "80",
        l_https_port: "443", l_ssh_port: "22", l_icmp: "1",
        w_telnet: "1", w_telnet_port: "23", w_ftp_port: "21",
        w_web: "1", w_web_port: "80", w_https: "1", w_https_port: "443",
        w_ssh_port: "22", w_icmp: "1", addIP: "Add",
        "submit-url": "/acl.asp", postSecurityFlag: "",
      };
      aclFields.postSecurityFlag = String(this.calcPSF(aclFields));
      await this.postCGI("boaform/admin/formACL", aclFields);
      onProgress("acl", "done");
    } catch (_) { onProgress("acl", "done"); }
    await sleep(400);

    onProgress("upnp", "running");
    try {
      const upnpPage = await this.getCGI("upnp.asp").catch(() => "");
      const allOpts = [...upnpPage.matchAll(/<option[^>]+value\s*=\s*(\d+)/gi)];
      const validOpt = allOpts.find(m => parseInt(m[1]) < 65535);
      const extIf = validOpt ? validOpt[1] : "130816";
      const upnpFields = {
        daemon: "1", ext_if: extIf, "submit-url": "/upnp.asp", postSecurityFlag: "",
      };
      upnpFields.postSecurityFlag = String(this.calcPSF(upnpFields));
      await this.postCGI("boaform/formUpnp", upnpFields);
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    // ── INFO aquí — sesión activa, ANTES del reboot ──────────
    onProgress("info", "running");
    try {
      this.deviceInfo = await this._fetchDeviceInfoBOA();
      onProgress("info", "done");
    } catch (_) { onProgress("info", "done"); }
    await sleep(300);

    onProgress("wifi5", "running");
    try {
      await this._wifiBenmundo(this.ssid5, this.pass5, "5");
      onProgress("wifi5", "done");
    } catch (e) { onProgress("wifi5", "error"); throw new Error(`WiFi 5G fallida: ${e.message}`); }
    await sleep(600);

    onProgress("wifi24", "running");
    try {
      await this._wifiBenmundo(this.ssid24, this.pass24, "24");
      onProgress("wifi24", "done");
    } catch (e) { onProgress("wifi24", "error"); throw new Error(`WiFi 2.4G fallida: ${e.message}`); }
    await sleep(600);

    onProgress("reboot", "running");
    try {
      const rebootFields = { "submit-url": "/mgm_dev_reboot.asp", postSecurityFlag: "" };
      rebootFields.postSecurityFlag = String(this.calcPSF(rebootFields));
      this.postRaw(this.url("boaform/admin/formReboot"), enc(rebootFields)).catch(() => {});
      await sleep(2000);
      onProgress("reboot", "done");
    } catch (_) { onProgress("reboot", "done"); }
  }

  async _wifiBenmundo(ssid, pass, band) {
    const is5 = band === "5";
    const wlanIdx = is5 ? "0" : "1";
    const page = is5 ? "wlan_basic_five.asp?wlan_idx=0" : "wlan_basic_two.asp?wlan_idx=1";
    const submitUrl = is5 ? "/wlan_basic_five.asp" : "/wlan_basic_two.asp";
    let psf = "";
    try {
      const html = await this.getCGI(page);
      const psfM = html.match(/name\s*=\s*["']postSecurityFlag["'][^>]*value\s*=\s*["']([^"']*)["']/i)
                || html.match(/value\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']postSecurityFlag["']/i);
      psf = psfM ? psfM[1] : "";
    } catch (_) {}
    const params = {
      wlanOnOff: "0", SSIDindex: "0", wlanDisabled: "0",
      hidessid: "0", ssid, encrypt: "6",
      wpa2UnicastCipher: "3", wpaPSK: pass,
      wlan_idx: wlanIdx, "submit-btn": "Apply Changes", "submit-url": submitUrl,
    };
    if (!psf) {
      params.postSecurityFlag = String(this.calcPSF(params));
    } else {
      params.postSecurityFlag = psf;
    }
    await this.postRaw(this.url("boaform/admin/formCdtWlanSetup"), enc(params));
  }

  // ════════════════════════════════════════════════════════
  // MCT AX3000 — GET CGI con base64
  // ════════════════════════════════════════════════════════
  async runMCT(onProgress) {
    onProgress("login", "running");
    try {
      await this.getCGI(`login.cgi?username=${b64(this.usuario)}&psd=${b64(this.password)}`);
      const main = await this.getCGI("main.html");
      if (main.includes("login.html") || main.length < 500) throw new Error("Credenciales incorrectas");
      onProgress("login", "done");
    } catch (e) { onProgress("login", "error"); throw new Error(`Login fallido: ${e.message}`); }
    await sleep(300);

    onProgress("wan", "running");
    try {
      const wanH = await this.getCGI("x_wancfg.html");
      const wanExists = wanH.includes("MDMOID_WAN_IP_CONN{1-") || wanH.includes("MDMOID_WAN_PPP_CONN{1-");
      const oidM = wanH.match(/objBuf\['(MDMOID_WAN_IP_CONN\{[^']+\})'\]\['ExternalIPAddress'\]/);
      const oid = oidM ? oidM[1] : null;
      const dns = `${this.dns1},${this.dns2}`;
      const fields = `UserDefinedMtu=1480&X_CU_MulticastVlan=-1&ConnectionType=IP_Routed&NATEnabled=1&Enable=1&AddressingType=Static&ExternalIPAddress=${this.ip}&DefaultGateway=${this.gateway}&DNSServers=${dns}&X_CU_ServiceList=INTERNET&X_UM_COM_VlanMuxID=${this.vlan}&X_UM_COM_VlanMux8021p=0&X_CU_IPv6IPAddress=&X_CU_DefaultIPv6Gateway=&X_CU_IPv6IPAddressOrigin=AutoConfigured&X_CU_IPv6DNSServers=&X_CU_IPv6Prefix=&X_CU_IPv6PrefixVltime=604800&X_CU_IPv6PrefixPltime=86400&X_CU_IPv6PrefixOrigin=PrefixDelegation&PrefixChildPrefixBits=::/64&X_CU_IPMode=1&X_CU_Dslite_Enable=0&X_CU_AftrMode=0&X_CU_Aftr=&X_CU_LanInterface=InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.1.,InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.2.,InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.3.,InternetGatewayDevice.LANDevice.1.LANEthernetInterfaceConfig.4.&X_UM_COM_IPv6Enabled=0&X_UM_COM_IPv4Enabled=1&X_CU_IPForwardModeEnabled=0&X_CU_IPForwardList=&ConnectionStatus=Disconnected&SubnetMask=${this.mascara}`;
      let wanUrl;
      if (wanExists && oid) {
        const val = `<${oid}>${fields}</${oid}>`;
        wanUrl = `x_wancfg.cgi?type=objOperate&action=edit&id=${oid}&value=${encodeURIComponent(val)}`;
      } else {
        const val = `<MDMOID_WAN_CONN_DEVICE{1}></MDMOID_WAN_CONN_DEVICE{1}><MDMOID_WAN_IP_CONN>${fields}</MDMOID_WAN_IP_CONN>`;
        wanUrl = `x_wancfg.cgi?type=objOperate&action=addMltLv&id=MDMOID_WAN_CONN_DEVICE{1}|MDMOID_WAN_IP_CONN&value=${encodeURIComponent(val)}`;
      }
      await this.getCGI(wanUrl);
      onProgress("wan", "done");
    } catch (e) { onProgress("wan", "error"); throw new Error(`WAN fallida: ${e.message}`); }
    await sleep(800);

    onProgress("lan", "running");
    try {
      const val = `<MDMOID_LAN_IP_INTF{1-1}>IPInterfaceIPAddress=${this.lanIp}&IPInterfaceSubnetMask=255.255.255.0</MDMOID_LAN_IP_INTF{1-1}><MDMOID_LAN_HOST_CFG{1}>DHCPServerEnable=1&MinAddress=${this.dhcpS}&MaxAddress=${this.dhcpE}&SubnetMask=255.255.255.0&IPRouters=${this.lanIp}&DHCPLeaseTime=86400&DNSOption=2&DNSServers=${this.dns1},${this.dns2}</MDMOID_LAN_HOST_CFG{1}>`;
      await this.getCGI(`ctdhcp.cgi?type=objOperate&action=edit&id=MDMOID_LAN_IP_INTF{1-1}|MDMOID_LAN_HOST_CFG{1}&value=${encodeURIComponent(val)}`);
      onProgress("lan", "done");
    } catch (e) { onProgress("lan", "error"); throw new Error(`LAN fallida: ${e.message}`); }
    await sleep(600);

    onProgress("acl", "running");
    try {
      const aclVal = `<MDMOID_SSHD_CFG>NetworkAccess=LAN and WAN</MDMOID_SSHD_CFG><MDMOID_HTTPD_CFG>NetworkAccess=LAN and WAN</MDMOID_HTTPD_CFG><MDMOID_TELNETD_CFG>NetworkAccess=LAN and WAN</MDMOID_TELNETD_CFG>`;
      await this.getCGI(`x_accesscontrol.cgi?type=objOperate&action=edit&id=MDMOID_SSHD_CFG|MDMOID_HTTPD_CFG|MDMOID_TELNETD_CFG&value=${encodeURIComponent(aclVal)}`);
      onProgress("acl", "done");
    } catch (_) { onProgress("acl", "done"); }
    await sleep(400);

    onProgress("upnp", "running");
    try {
      await this.getCGI(`x_upnpcfg.cgi?type=objOperate&action=edit&id=MDMOID_UPNP_CFG&value=${encodeURIComponent("<MDMOID_UPNP_CFG>Enable=1</MDMOID_UPNP_CFG>")}`);
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    // ── INFO aquí — sesión activa, ANTES del reboot ──────────
    onProgress("info", "running");
    try {
      this.deviceInfo = await this._fetchDeviceInfoMCT();
      onProgress("info", "done");
    } catch (_) { onProgress("info", "done"); }
    await sleep(300);

    onProgress("wifi5", "running");
    try {
      const val5 = `<MDMOID_LAN_WLAN_CT{1-5}>SSID=${this.ssid5}&Enable=1&SSIDAdvertisementEnabled=0&WMMEnable=1&MaxStaNum=0&BeaconType=WPA2&WPAEncryptionModes=AESEncryption</MDMOID_LAN_WLAN_CT{1-5}><MDMOID_LAN_WLAN_CT_PRE_SHARED_KEY{1-5-1}>KeyPassphrase=${this.pass5}&wlWpaPskShow=0</MDMOID_LAN_WLAN_CT_PRE_SHARED_KEY{1-5-1}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-1}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-1}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-2}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-2}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-3}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-3}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-4}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-4}>`;
      await this.getCGI(`x_wl5gssidcfg.cgi?type=objOperate&action=edit&id=MDMOID_LAN_WLAN_CT{1-5}|MDMOID_LAN_WLAN_CT_PRE_SHARED_KEY{1-5-1}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-1}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-2}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-3}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-5-4}&value=${encodeURIComponent(val5)}`);
      onProgress("wifi5", "done");
    } catch (e) { onProgress("wifi5", "error"); throw new Error(`WiFi 5G fallida: ${e.message}`); }
    await sleep(600);

    onProgress("wifi24", "running");
    try {
      const val24 = `<MDMOID_LAN_WLAN_CT{1-1}>SSID=${this.ssid24}&Enable=1&SSIDAdvertisementEnabled=0&WMMEnable=1&MaxStaNum=0&BeaconType=WPA2&WPAEncryptionModes=AESEncryption</MDMOID_LAN_WLAN_CT{1-1}><MDMOID_LAN_WLAN_CT_PRE_SHARED_KEY{1-1-1}>KeyPassphrase=${this.pass24}&wlWpaPskShow=0</MDMOID_LAN_WLAN_CT_PRE_SHARED_KEY{1-1-1}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-1}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-1}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-2}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-2}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-3}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-3}><MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-4}></MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-4}>`;
      await this.getCGI(`x_wlssidcfg.cgi?type=objOperate&action=edit&id=MDMOID_LAN_WLAN_CT{1-1}|MDMOID_LAN_WLAN_CT_PRE_SHARED_KEY{1-1-1}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-1}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-2}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-3}|MDMOID_LAN_WLAN_CT_WEP_KEY{1-1-4}&value=${encodeURIComponent(val24)}`);
      onProgress("wifi24", "done");
    } catch (e) { onProgress("wifi24", "error"); throw new Error(`WiFi 2.4G fallida: ${e.message}`); }
    await sleep(600);

    onProgress("reboot", "running");
    try {
      const resetHtml = await this.getCGI("ctreset.html").catch(() => "");
      const skM = resetHtml.match(/sessionKey\s*=\s*'?(\d+)'?/);
      const sk = skM ? skM[1] : "";
      this.getCGI(`ctrebootinfo.cgi?sessionKey=${sk}`).catch(() => {});
      await sleep(2000);
      onProgress("reboot", "done");
    } catch (_) { onProgress("reboot", "done"); }
  }

  // ════════════════════════════════════════════════════════
  // ZTE F6201B — API REST con Lua + AES/RSA encrypt
  // ════════════════════════════════════════════════════════

  _zteExtractTmpToken(html) {
    const m = (html || "").match(/_sessionTmpToken\s*=\s*"((?:\\x[0-9a-fA-F]{2}|[^"\\])+)"/);
    if (!m) { console.log("ZTE: no tmpToken found"); return null; }
    try {
      const decoded = m[1].replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
      return decoded;
    } catch {
      return m[1];
    }
  }

  async _loadForge() {
    if (window._forge) return window._forge;
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/forge/1.3.1/forge.min.js";
      s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    window._forge = window.forge;
    return window._forge;
  }

  async _ztePost(path, data) {
    const forge = await this._loadForge();
    const RSA_PUB_PEM =
      "-----BEGIN PUBLIC KEY-----\n" +
      "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAodPTerkUVCYmv28SOfRV\n" +
      "7UKHVujx/HjCUTAWy9l0L5H0JV0LfDudTdMNPEKloZsNam3YrtEnq6jqMLJV4ASb\n" +
      "1d6axmIgJ636wyTUS99gj4BKs6bQSTUSE8h/QkUYv4gEIt3saMS0pZpd90y6+B/9\n" +
      "hZxZE/RKU8e+zgRqp1/762TB7vcjtjOwXRDEL0w71Jk9i8VUQ59MR1Uj5E8X3WIc\n" +
      "fYSK5RWBkMhfaTRM6ozS9Bqhi40xlSOb3GBxCmliCifOJNLoO9kFoWgAIw5hkSIb\n" +
      "GH+4Csop9Uy8VvmmB+B3ubFLN35qIa5OG5+SDXn4L7FeAA5lRiGxRi8tsWrtew8w\n" +
      "nwIDAQAB\n" +
      "-----END PUBLIC KEY-----";

    const tok = data._sessionTOKEN || this.zteToken;
    const rand16 = () => Array.from({length:16}, () => Math.floor(Math.random()*10)).join("");
    const aesEncrypt = (val, ck, ci) => {
      const key = forge.util.createBuffer(forge.md.sha256.create().update(ck).digest().getBytes());
      const iv  = forge.util.createBuffer(forge.md.sha256.create().update(ci).digest().getBytes().slice(0,16));
      const cipher = forge.cipher.createCipher("AES-CBC", key);
      cipher.start({iv});
      const padLen = 16 - (val.length % 16);
      cipher.update(forge.util.createBuffer(val + "\x00".repeat(padLen)));
      cipher.finish();
      return forge.util.encode64(cipher.output.getBytes());
    };

    const url = path;
    let encFields = [];
    if (url.includes("wan_internet_lua"))  encFields = ["Password"];
    if (url.includes("DHCPBasicCfg"))      encFields = ["IPAddr","MinAddress","MaxAddress","DNSServer1","DNSServer2"];
    if (url.includes("wlansssidconf"))     encFields = ["KeyPassphrase","WEPKey00","WEPKey01","WEPKey02","WEPKey03"];

    const ck = rand16(); const ci = rand16();
    const { _sessionTOKEN: _t, ...fields } = data;
    const parts = [];
    for (const [k, v] of Object.entries(fields)) {
      const val = encFields.includes(k) ? aesEncrypt(String(v ?? ""), ck, ci) : String(v ?? "");
      parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
    }
    if (encFields.length > 0) {
      const pubKey = forge.pki.publicKeyFromPem(RSA_PUB_PEM);
      const encKey = forge.util.encode64(pubKey.encrypt(`${ck}+${ci}`, "RSAES-PKCS1-V1_5"));
      parts.push(`encode=${encodeURIComponent(encKey)}`);
    }
    const bodyStr = parts.join("&");
    const bodyWithTok = bodyStr + "&_sessionTOKEN=" + encodeURIComponent(tok);
    const md = forge.md.sha256.create();
    md.update(bodyWithTok, "utf8");
    const hashHex = md.digest().toHex();
    const pubKey = forge.pki.publicKeyFromPem(RSA_PUB_PEM);
    const checkVal = forge.util.encode64(pubKey.encrypt(hashHex, "RSAES-PKCS1-V1_5"));
    const fullUrl = IS_DEV ? this.url(path.replace(/^\//,"").split("?")[0]) : `http://${this.ontIp}${path}`;
    const r = await CapacitorHttp.post({
      url: fullUrl,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Check": checkVal,
        ...this.zteHeaders,
      },
      data: bodyWithTok,
      params: {}, connectTimeout: 10000, readTimeout: 10000,
    });
    return r;
  }

  async _zteNav(tag) {
    const res = await CapacitorHttp.get({
      url: `http://${this.ontIp}/?_type=menuView&_tag=${tag}&Menu3Location=0`,
      headers: { Accept: "text/html,*/*", ...this.zteHeaders },
      params: {}, connectTimeout: 5000, readTimeout: 5000,
    });
    const html = typeof res.data === "string" ? res.data : "";
    const tok = this._zteExtractTmpToken(html);
    if (tok) this.zteTmpToken = tok;
    return html;
  }

  async runZTE(onProgress) {
    onProgress("login", "running");
    try {
      const entryRes = await CapacitorHttp.get({
        url: `http://${this.ontIp}/?_type=loginData&_tag=login_entry`,
        headers: { Accept: "text/html,*/*" },
        params: {}, connectTimeout: 5000, readTimeout: 5000,
      });
      const entryData = typeof entryRes.data === "string"
        ? JSON.parse(entryRes.data) : entryRes.data;
      const sessionToken = entryData?.sess_token || "";
      const sidCookie = entryRes.headers?.["Set-Cookie"] || "";
      const sidMatch = sidCookie.match(/SID=([a-f0-9]+)/i);
      const sid = sidMatch ? sidMatch[1] : "";
      this.zteHeaders = sid ? { Cookie: `SID=${sid}` } : {};

      const tokenRes = await CapacitorHttp.get({
        url: `http://${this.ontIp}/?_type=loginData&_tag=login_token`,
        headers: { Accept: "text/html,*/*", ...this.zteHeaders },
        params: {}, connectTimeout: 5000, readTimeout: 5000,
      });
      const tokenStr = typeof tokenRes.data === "string" ? tokenRes.data : JSON.stringify(tokenRes.data);
      const chalM = tokenStr.match(/<ajax_response_xml_root>([^<]+)<\/ajax_response_xml_root>/);
      const challenge = chalM ? chalM[1].trim() : "";
      const finalHash = await sha256hex(this.password + challenge);

      const loginRes = await CapacitorHttp.post({
        url: `http://${this.ontIp}/?_type=loginData&_tag=login_entry`,
        headers: { "Content-Type": "application/x-www-form-urlencoded", ...this.zteHeaders },
        data: { action: "login", Username: this.usuario, Password: finalHash, _sessionTOKEN: sessionToken },
        params: {}, connectTimeout: 5000, readTimeout: 5000,
      });
      const loginData = typeof loginRes.data === "string"
        ? JSON.parse(loginRes.data) : loginRes.data;
      if (loginData?.loginErrMsg && loginData.loginErrMsg.trim() !== "")
        throw new Error(loginData.loginErrMsg.trim());

      const newSidCookie = loginRes.headers?.["Set-Cookie"] || "";
      const newSidMatches = [...newSidCookie.matchAll(/SID=([a-f0-9]+)/gi)];
      const newSid = newSidMatches.length > 0 ? newSidMatches[newSidMatches.length - 1][1] : sid;
      this.zteHeaders = newSid ? { Cookie: `SID=${newSid}` } : this.zteHeaders;
      const newToken = loginData?.sess_token || sessionToken;
      if (!newToken) throw new Error("No se obtuvo token de sesión");
      this.zteToken = newToken;
      this.zteTmpToken = "";
      onProgress("login", "done");
    } catch (e) { onProgress("login", "error"); throw new Error(`Login fallido: ${e.message}`); }
    await sleep(300);

    onProgress("wan", "running");
    try {
      await this._zteNav("ethWanConfig");
      const wanAction = "/?_type=menuData&_tag=wan_internet_lua.lua&TypeUplink=2&pageType=0";
      for (const instId of ["1","2","3","4","5","6","7","8"]) {
        try {
          await this._ztePost(wanAction, { IF_ACTION: "Delete", _InstID: instId, _sessionTOKEN: this.zteTmpToken });
          await sleep(200);
        } catch (_) {}
      }
      await sleep(500);
      await this._zteNav("ethWanConfig");
      await this._ztePost(wanAction, {
        IF_ACTION: "Apply", _InstID: "-1", uplink: "2", InstHasGot: "0",
        ControlType: "1", WANCName: "Enet", Enable: "1", mode: "route",
        ServList: "1", MTU: "1480", linkMode: "IP", TransType: "PPPoE",
        UserName: "", Password: "", AuthType: "PAP,CHAP,MS-CHAP",
        ConnTrigger: "AlwaysOn", IdleTime0: "20", IdleTime1: "0",
        IpMode: "IPv4", Addressingtype: "Static",
        IPAddress0: this.ip.split(".")[0], IPAddress1: this.ip.split(".")[1],
        IPAddress2: this.ip.split(".")[2], IPAddress3: this.ip.split(".")[3],
        SubnetMask0: this.mascara.split(".")[0], SubnetMask1: this.mascara.split(".")[1],
        SubnetMask2: this.mascara.split(".")[2], SubnetMask3: this.mascara.split(".")[3],
        GateWay0: this.gateway.split(".")[0], GateWay1: this.gateway.split(".")[1],
        GateWay2: this.gateway.split(".")[2], GateWay3: this.gateway.split(".")[3],
        DNS10: this.dns1.split(".")[0], DNS11: this.dns1.split(".")[1],
        DNS12: this.dns1.split(".")[2], DNS13: this.dns1.split(".")[3],
        DNS20: this.dns2.split(".")[0], DNS21: this.dns2.split(".")[1],
        DNS22: this.dns2.split(".")[2], DNS23: this.dns2.split(".")[3],
        DNS30: "1", DNS31: "1", DNS32: "1", DNS33: "1",
        IsNAT: "1", IPv6AcquireMode: "Auto",
        Gua1: "", Gua1PrefixLen: "128", Gateway6: "", Pd: "", PdLen: "",
        Dns1v6: "", Dns2v6: "", Dns3v6: "",
        IsPD: "1", Unnumbered: "0", IsSLAAC: "1", IsGUA: "1", IsPdAddr: "1",
        VlanEnable: "1", VLANID: this.vlan, Priority: "0",
        Btn_cancel_internet: "", Btn_apply_internet: "",
        _sessionTOKEN: this.zteTmpToken,
      });
      onProgress("wan", "done");
    } catch (e) {
      const msg = e.message || "";
      if (msg.includes("can not be the same") || msg.includes("same with name")) {
        onProgress("wan", "done");
      } else { onProgress("wan", "error"); throw new Error(`WAN fallida: ${msg}`); }
    }
    await sleep(800);

    onProgress("lan", "running");
    try {
      await this._zteNav("lanMgrIpv4");
      await this._ztePost("/?_type=menuData&_tag=Localnet_LanMgrIpv4_DHCPBasicCfg_lua.lua", {
        IF_ACTION: "Apply", IF_URL_HOST: this.ontIp, _InstID: "IGD",
        IPAddr: this.lanIp, SubMask: "255.255.255.0", SubnetMask: "255.255.255.0",
        MinAddress: this.dhcpS, MaxAddress: this.dhcpE, IPRouters: "",
        DNSServer1: this.dns1, DNSServer2: this.dns2,
        LeaseTime: "86400", ServerEnable: "1", DnsServerSource: "0", DomainName: "ehome",
        Btn_cancel_DHCPBasicCfg: "", Btn_apply_DHCPBasicCfg: "",
        _sessionTOKEN: this.zteTmpToken,
      });
      onProgress("lan", "done");
    } catch (e) { onProgress("lan", "error"); throw new Error(`LAN fallida: ${e.message}`); }
    await sleep(600);

    onProgress("acl", "running");
    try {
      await this._zteNav("localServiceCtrl");
      const aclAction = "/?_type=menuData&_tag=firewall_ipv4service_lua.lua";
      for (const instId of ["1","2","3","4","IGD.FWSc.FWSC1","IGD.FWSc.FWSC2","IGD.FWSc.FWSC3"]) {
        try {
          await this._ztePost(aclAction, { IF_ACTION: "Delete", _InstID: instId, _sessionTOKEN: this.zteTmpToken });
          await sleep(100);
        } catch (_) {}
      }
      await sleep(300);
      await this._zteNav("localServiceCtrl");
      await this._ztePost(aclAction, {
        IF_ACTION: "Apply", Enable: "1", _InstID: "-1", INCName: "WAN",
        MinSrcIp: "0.0.0.0", MaxSrcIp: "0.0.0.0",
        ServiceList: "HTTP,FTP,TELNET,HTTPS,PING",
        IPMode: "1", Name: "Enet", FilterTarget: "1", INCViewName: "IGD.WANIF",
        Btn_cancel_serviceCtl: "", Btn_apply_serviceCtl: "",
        _sessionTOKEN: this.zteTmpToken,
      });
      onProgress("acl", "done");
    } catch (_) { onProgress("acl", "done"); }
    await sleep(400);

    onProgress("upnp", "running");
    try {
      await this._zteNav("appUpnp");
      await this._ztePost("/?_type=menuData&_tag=app_upnp_lua.lua", {
        IF_ACTION: "Apply", Enable: "1", _InstID: "-1",
        Btn_cancel_UPnP: "", Btn_apply_UPnP: "",
        _sessionTOKEN: this.zteTmpToken,
      });
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    // ── INFO aquí — sesión activa, ANTES del reboot ──────────
    onProgress("info", "running");
    try {
      this.deviceInfo = await this._fetchDeviceInfoZTE();
      onProgress("info", "done");
    } catch (_) { onProgress("info", "done"); }
    await sleep(300);

    onProgress("wifi5", "running");
    try {
      await this._zteNav("wlanBasic");
      await this._ztePost("/?_type=menuData&_tag=wlan_wlansssidconf_lua.lua", {
        IF_ACTION: "Apply", Enable: "1", _InstID: "DEV.WIFI.AP5",
        _WEPCONIG: "N", _PSKCONIG: "Y", BeaconType: "11i",
        WEPAuthMode: "None", WPAAuthMode: "PSKAuthentication", "11iAuthMode": "PSKAuthentication",
        WPAEncryptType: "TKIPandAESEncryption", "11iEncryptType": "AESEncryption",
        _InstID_PSK: "DEV.WIFI.AP5.PSK1", _InstID_GUEST: "DEV.GuestWifi4", _GUEST: "N",
        ESSID: this.ssid5, ESSIDHideEnable: "0", EncryptionType: "WPA2-PSK-AES",
        KeyPassphrase: this.pass5, MaxUserNum: "32",
        Btn_cancel_WLANSSIDConf: "", Btn_apply_WLANSSIDConf: "",
        _sessionTOKEN: this.zteTmpToken,
      });
      onProgress("wifi5", "done");
    } catch (e) { onProgress("wifi5", "error"); throw new Error(`WiFi 5G fallida: ${e.message}`); }
    await sleep(1500);

    onProgress("wifi24", "running");
    try {
      await this._zteNav("wlanBasic");
      await this._ztePost("/?_type=menuData&_tag=wlan_wlansssidconf_lua.lua", {
        IF_ACTION: "Apply", Enable: "1", _InstID: "DEV.WIFI.AP1",
        _WEPCONIG: "N", _PSKCONIG: "Y", BeaconType: "11i",
        WEPAuthMode: "None", WPAAuthMode: "PSKAuthentication", "11iAuthMode": "PSKAuthentication",
        WPAEncryptType: "TKIPandAESEncryption", "11iEncryptType": "AESEncryption",
        _InstID_PSK: "DEV.WIFI.AP1.PSK1", _InstID_GUEST: "DEV.GuestWifi1", _GUEST: "N",
        ESSID: this.ssid24, ESSIDHideEnable: "0", EncryptionType: "WPA2-PSK-AES",
        KeyPassphrase: this.pass24, MaxUserNum: "32",
        Btn_cancel_WLANSSIDConf: "", Btn_apply_WLANSSIDConf: "",
        _sessionTOKEN: this.zteTmpToken,
      });
      onProgress("wifi24", "done");
    } catch (e) { onProgress("wifi24", "error"); throw new Error(`WiFi 2.4G fallida: ${e.message}`); }
    await sleep(600);

    onProgress("reboot", "running");
    try {
      await this._zteNav("rebootAndReset");
      this._ztePost("/?_type=menuData&_tag=devmgr_restartmgr_lua.lua", {
        IF_ACTION: "Restart", Btn_restart: "",
        _sessionTOKEN: this.zteTmpToken,
      }).catch(() => {});
      await sleep(2000);
      onProgress("reboot", "done");
    } catch (_) { onProgress("reboot", "done"); }
  }
  // ═══════════════════════════════════════════════════════════════
  // PARSERS ESPECÍFICOS PARA LANLY / BENMUNDO
  // ═══════════════════════════════════════════════════════════════

    _parseLanlyGpon(html) {
      const info = {};
      
      // Método alternativo: buscar por posición de tabla
      // Buscar la fila de Potencia Tx
      const txRowMatch = html.match(/<th[^>]*>Potencia\s+Tx<\/th>\s*<td[^>]*>([^<]+)</i);
      if (txRowMatch) {
        const txValue = txRowMatch[1].trim().replace(/\s+dBm/, '').trim();
        if (txValue) info.tx = txValue;
      }
      
      // Buscar la fila de Potencia Rx
      const rxRowMatch = html.match(/<th[^>]*>Potencia\s+Rx<\/th>\s*<td[^>]*>([^<]+)</i);
      if (rxRowMatch) {
        const rxValue = rxRowMatch[1].trim().replace(/\s+dBm/, '').trim();
        if (rxValue) info.rx = rxValue;
      }
      
      // Buscar la fila de Temperatura
      const tempRowMatch = html.match(/<th[^>]*>Temperatura<\/th>\s*<td[^>]*>([^<]+)</i);
      if (tempRowMatch) {
        const tempValue = tempRowMatch[1].trim().replace(/\s+°C/, '').trim();
        if (tempValue) info.temp = tempValue;
      }
      
      console.log("RX:", info.rx, "TX:", info.tx, "Temp:", info.temp);
      
      return info;
    }

    _parseLanlyDeviceInfo(html) {
      const info = {};
      
      // Modelo - formato: "<th>Modelo</th><td>G24AT</td>"
      const modelMatch = html.match(/Modelo<\/th>\s*<td[^>]*>\s*([^<]+)\s*<\/td>/i);
      if (modelMatch) info.modelo = modelMatch[1].trim();
      
      // GPON SN (Número de serie) - formato: "<th>Número de serie</th><td>XPON34579526</td>"
      const gponMatch = html.match(/Número de serie<\/th>\s*<td[^>]*>\s*([^<]+)\s*<\/td>/i);
      if (gponMatch) info.gponsn = gponMatch[1].trim();
      
      // Serial Number (Número Serie) - formato: "<th>Número Serie</th><td>60A434-1234560A434579526</td>"
      const snMatch = html.match(/Número Serie<\/th>\s*<td[^>]*>\s*([^<]+)\s*<\/td>/i);
      if (snMatch) info.sn = snMatch[1].trim();
      
      // Firmware - formato: "<th>Versión Firmware</th><td>V3.2.01-260121</td>"
      const fwMatch = html.match(/Versión Firmware<\/th>\s*<td[^>]*>\s*([^<]+)\s*<\/td>/i);
      if (fwMatch) info.fw = fwMatch[1].trim();
      
      return info;
    }

  async run(onProgress) {
    if (this.equipo === "optic")    return this.runOptic(onProgress);
    if (this.equipo === "lanly")    return this.runLanly(onProgress);
    if (this.equipo === "benmundo") return this.runBenmundo(onProgress);
    if (this.equipo === "mct")      return this.runMCT(onProgress);
    if (this.equipo === "zte")      return this.runZTE(onProgress);
    throw new Error("Modelo desconocido");
  }
}

/* ─── Componente principal ───────────────────────────────── */
export default function TecConfigurarONU({ ordenActual, onVolver }) {
  const [modeloId, setModeloId] = useState("");
  const [ip,       setIp]      = useState(ordenActual?.ip_local || "");
  const [mascara,  setMascara] = useState(ordenActual?.mascara  || "255.255.255.0");
  const [gateway,  setGateway] = useState(ordenActual?.gateway  || "");
  const [vlan,     setVlan]    = useState(ordenActual?.vlan     || "100");
  const modoManual = !ordenActual?.ip_local;

  const [ssid,      setSsid]    = useState("");
  const [wifiPass,  setWifiPass] = useState("");
  const [showWifi,  setShowWifi] = useState(false);
  const [errors,    setErrors]  = useState({});
  const [estado,    setEstado]  = useState("idle");
  const [pasos,     setPasos]   = useState(() =>
    Object.fromEntries(PASOS.map(p => [p.id, "pending"]))
  );
  const [errorMsg,    setErrorMsg]    = useState("");
  const [ipDetectada, setIpDetectada] = useState("");
  const [deviceInfo,  setDeviceInfo]  = useState({});
  const [sharing,     setSharing]     = useState(false);
  const shareRef = useRef(null);

  const modeloActual = MODELOS.find(m => m.id === modeloId);

  const seleccionarModelo = (m) => { setModeloId(m.id); setErrors({}); };

  const onProgress = (pasoId, nuevoEstado) => {
    setPasos(prev => ({ ...prev, [pasoId]: nuevoEstado }));
  };

  const validate = () => {
    const e = {};
    if (!modeloId)                   e.modelo   = "Seleccioná el modelo de ONU";
    if (!ip || !mascara || !gateway) e.red      = "Faltan datos de red (IP, máscara o gateway)";
    if (!ssid.trim())                e.ssid     = "Ingresá el nombre de la red WiFi";
    if (!wifiPass.trim())            e.wifiPass = "Ingresá la contraseña WiFi";
    if (wifiPass.length > 0 && wifiPass.length < 8)
                                     e.wifiPass = "La contraseña debe tener al menos 8 caracteres";
    return e;
  };

  const handleConfigurar = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setEstado("running");
    setPasos(Object.fromEntries(PASOS.map(p => [p.id, "pending"])));
    setErrorMsg("");
    setDeviceInfo({});

    const m = MODELOS.find(x => x.id === modeloId);
    const gatewayDetectado = await getGatewayONU();
    const ontIpFinal = gatewayDetectado || m.ip;
    const lanIpBase = ontIpFinal.match(/(\d+\.\d+\.\d+)\./)?.[1] || "192.168.1";
    const lanDefaults = {
      mct: { lanIp: "192.168.2.1", dhcpS: "192.168.2.2", dhcpE: "192.168.2.254" },
    };
    const lan = lanDefaults[m.id] || {
      lanIp: ontIpFinal,
      dhcpS: `${lanIpBase}.100`,
      dhcpE: `${lanIpBase}.254`,
    };

    const cfg = new ONUConfigurator({
      ontIp: ontIpFinal, ipFallback: null,
      equipo: m.id, usuario: m.usuario, password: m.password,
      vlan, ip, mascara, gateway,
      dns1: "8.8.8.8", dns2: "8.8.4.4",
      lanIp: lan.lanIp, dhcpS: lan.dhcpS, dhcpE: lan.dhcpE,
      ssid24: ssid, pass24: wifiPass,
      ssid5: `${ssid}-5G`, pass5: wifiPass,
    });

    try {
      await cfg.run(onProgress);
      setIpDetectada(cfg.ontIp);
      setDeviceInfo(cfg.deviceInfo || {});
      setEstado("done");
    } catch (err) {
      setEstado("error");
      setErrorMsg(err.message);
    }
  };

  const handleReintentar = () => {
    setEstado("idle");
    setPasos(Object.fromEntries(PASOS.map(p => [p.id, "pending"])));
    setErrorMsg("");
  };

  const handleShareImage = async () => {
    if (!shareRef.current) return;
    setSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, {
        backgroundColor: "#ffffff",
        scale: 2.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });
      const base64 = canvas.toDataURL("image/png").split(",")[1];
      const fileName = `ONU-${modeloActual?.nombre || "cfg"}-${Date.now()}.png`;
      const saved = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: `ONU ${modeloActual?.nombre} · ${ipDetectada || modeloActual?.ip}`,
        text: `ONU ${modeloActual?.nombre} · IP: ${ipDetectada || modeloActual?.ip}`,
        url: saved.uri,
      });
    } catch (e) {
      if (e?.message !== "Share canceled") alert("Error: " + e?.message);
    } finally {
      setSharing(false);
    }
  };

  const pasoBg = (est) => {
    if (est === "done")    return "var(--success, #16a34a)";
    if (est === "running") return "var(--primary, #2563eb)";
    if (est === "error")   return "#dc2626";
    return "var(--border, #e2e8f0)";
  };

  const pasoIcon = (est, idx) => {
    if (est === "done")    return <Icon d={IC.check} size={13} color="white" />;
    if (est === "running") return <SpinIcon />;
    if (est === "error")   return <Icon d={IC.x} size={13} color="white" />;
    return <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>{idx + 1}</span>;
  };

  const gridCols = MODELOS.length <= 3 ? "1fr 1fr 1fr" : "1fr 1fr";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      {onVolver && (
        <button type="button" className="btn btn-outline btn-sm"
          onClick={onVolver}
          style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon d={IC.arrowLeft} size={14} /> Volver
        </button>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={IC.router} size={20} color="var(--primary)" />
          Configurar ONU
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Conectate al WiFi de la ONU antes de continuar
          {IS_DEV && <span style={{ marginLeft: 8, fontSize: 11, color: "#f59e0b", fontFamily: "monospace" }}>[DEV]</span>}
        </div>
      </div>

      {/* ── Selector de modelo ── */}
      {estado === "idle" && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--hover)", borderRadius: "12px 12px 0 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Modelo de ONU *
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 8 }}>
              {MODELOS.map(m => {
                const sel = modeloId === m.id;
                return (
                  <button key={m.id} type="button" onClick={() => seleccionarModelo(m)}
                    style={{
                      padding: "12px 8px", borderRadius: 10, border: "1.5px solid",
                      borderColor: sel ? m.color : "var(--border)",
                      background: sel ? m.bg : "white",
                      cursor: "pointer", textAlign: "center", transition: "all .15s",
                    }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: sel ? m.color : "var(--text)", marginBottom: 3 }}>
                      {m.nombre}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>{m.desc}</div>
                    {sel && (
                      <div style={{ marginTop: 6, width: 18, height: 18, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", margin: "6px auto 0" }}>
                        <Icon d={IC.check} size={10} color="white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.modelo && <div className="form-error" style={{ marginTop: 8 }}>{errors.modelo}</div>}
          </div>
        </div>
      )}

      {/* ── Datos de red ── */}
      {modoManual && estado === "idle" && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "#f0fdf4", borderRadius: "12px 12px 0 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Datos de red (manual)
            </div>
          </div>
          <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "IP WAN *",  val: ip,      set: setIp,      ph: "200.10.10.5" },
              { label: "Máscara *", val: mascara, set: setMascara, ph: "255.255.255.0" },
              { label: "Gateway *", val: gateway, set: setGateway, ph: "200.10.10.1" },
              { label: "VLAN",      val: vlan,    set: setVlan,    ph: "100" },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label className="form-label" style={{ fontSize: 11 }}>{label}</label>
                <input className="form-input" placeholder={ph} value={val}
                  onChange={e => set(e.target.value)}
                  style={{ fontSize: 13, fontFamily: "monospace" }} />
              </div>
            ))}
          </div>
          {errors.red && <div style={{ padding: "0 14px 10px", fontSize: 12, color: "#991b1b" }}>{errors.red}</div>}
        </div>
      )}

      {!modoManual && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "#f0fdf4", borderRadius: "12px 12px 0 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Datos de red (de la orden)
            </div>
          </div>
          <div style={{ padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px 12px" }}>
            {[["IP WAN", ip], ["Máscara", mascara], ["Gateway", gateway], ["VLAN", vlan]].map(([label, value]) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#14532d" }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WiFi + botón configurar ── */}
      {estado === "idle" && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--hover)", borderRadius: "12px 12px 0 0" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon d={IC.wifi} size={12} /> Datos del WiFi
            </div>
          </div>
          <div style={{ padding: 14 }}>
            <div className="form-group">
              <label className="form-label">Nombre de red (SSID) *</label>
              <input className={`form-input ${errors.ssid ? "error" : ""}`}
                placeholder="Ej: INTERNET-GARCIA"
                value={ssid}
                onChange={e => { setSsid(e.target.value); setErrors(p => ({ ...p, ssid: null })); }}
                style={{ fontSize: 14 }} />
              {errors.ssid && <div className="form-error">{errors.ssid}</div>}
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                2.4G: "{ssid || "..."}" · 5G: "{ssid ? ssid + "-5G" : "...-5G"}"
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Contraseña WiFi * <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(mín. 8 caracteres)</span></label>
              <div style={{ position: "relative" }}>
                <input className={`form-input ${errors.wifiPass ? "error" : ""}`}
                  type={showWifi ? "text" : "password"}
                  placeholder="Contraseña del cliente"
                  value={wifiPass}
                  onChange={e => { setWifiPass(e.target.value); setErrors(p => ({ ...p, wifiPass: null })); }}
                  style={{ fontSize: 14, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowWifi(v => !v)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--text-muted)" }}>
                  <Icon d={showWifi ? IC.eyeOff : IC.eye} size={16} />
                </button>
              </div>
              {errors.wifiPass && <div className="form-error">{errors.wifiPass}</div>}
            </div>
            <button className="btn btn-primary btn-lg btn-full"
              onClick={handleConfigurar}
              disabled={!modeloId || !ip}
              style={{ minHeight: 48, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (!modeloId || !ip) ? 0.5 : 1 }}>
              <Icon d={IC.zap} size={16} />
              Configurar ONU automáticamente
            </button>
          </div>
        </div>
      )}

      {/* ── Panel de progreso ── */}
      {(estado === "running" || estado === "done" || estado === "error") && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid var(--border)",
            background: estado === "done" ? "#f0fdf4" : estado === "error" ? "#fef2f2" : "var(--hover)",
            borderRadius: "12px 12px 0 0"
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
              color: estado === "done" ? "#166534" : estado === "error" ? "#991b1b" : "var(--text)" }}>
              {estado === "running" && <SpinIcon color="var(--primary)" />}
              {estado === "done"    && <Icon d={IC.check}   size={16} color="#166534" />}
              {estado === "error"   && <Icon d={IC.warning} size={16} color="#991b1b" />}
              {estado === "running" && "Configurando..."}
              {estado === "done"    && "¡ONU configurada correctamente!"}
              {estado === "error"   && "Error en la configuración"}
            </div>
            {modeloActual && (
              <div style={{ fontSize: 11, marginTop: 3, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontWeight: 700, color: modeloActual.color }}>{modeloActual.nombre}</span>
                <span>·</span>
                <span style={{ fontFamily: "monospace" }}>{ipDetectada || modeloActual.ip}</span>
              </div>
            )}
            {estado === "done"  && <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>El equipo se está reiniciando. Esperá 2 minutos y probá el servicio.</div>}
            {estado === "error" && <div style={{ fontSize: 12, color: "#991b1b", marginTop: 2 }}>{errorMsg}</div>}
          </div>

          <div style={{ padding: 14 }}>
            {PASOS.map((paso, idx) => {
              const est = pasos[paso.id];
              return (
                <div key={paso.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "9px 0",
                  borderBottom: idx < PASOS.length - 1 ? "1px solid var(--hover)" : "none"
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", background: pasoBg(est),
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "background .3s",
                    boxShadow: est === "running" ? "0 0 0 4px rgba(37,99,235,.15)" : "none"
                  }}>
                    {pasoIcon(est, idx)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: est === "running" ? 700 : 500,
                      color: est === "pending" ? "var(--text-muted)" : "var(--text)" }}>
                      {paso.label}
                    </div>
                    {est === "running" && <div style={{ fontSize: 11, color: "var(--primary)", marginTop: 1 }}>{paso.desc}</div>}
                  </div>
                  {est === "done"  && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>OK</span>}
                  {est === "error" && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Error</span>}
                </div>
              );
            })}
          </div>

          {estado === "error" && (
            <div style={{ padding: "0 14px 14px" }}>
              <button className="btn btn-outline btn-full" onClick={handleReintentar}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon d={IC.refresh} size={14} /> Reintentar
              </button>
            </div>
          )}

          {/* ── Resumen + botón compartir ── */}
          {estado === "done" && (
            <>
              <div ref={shareRef} style={{
                margin: "0 14px 14px",
                background: "#ffffff",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                fontFamily: "'Segoe UI', Arial, sans-serif",
              }}>
                {/* Encabezado */}
                <div style={{ background: modeloActual?.color || "#2563eb", padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "white", fontWeight: 800, fontSize: 14 }}>
                        ONU {modeloActual?.nombre} · {modeloActual?.desc}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "monospace", marginTop: 1 }}>
                        IP: {ipDetectada || modeloActual?.ip}
                      </div>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 700, color: "white" }}>
                      ✔ EXITOSO
                    </div>
                  </div>
                </div>

                {/* WAN */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: 0.8 }}>WAN</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px" }}>
                    {[
                      ["IP pública",  ip],
                      ["Máscara",     mascara],
                      ["Gateway",     gateway],
                      ["DNS",         "8.8.8.8 / 8.8.4.4"],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: "#f8fafc", borderLeft: "3px solid #bfdbfe", padding: "5px 8px" }}>
                        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>{value || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WiFi */}
                <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.8 }}>WiFi</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px" }}>
                    {[
                      ["2.4 GHz", ssid],
                      ["5 GHz",   `${ssid}-5G`],
                      ["Contraseña", wifiPass],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: "#f0fdf4", borderLeft: "3px solid #86efac", padding: "5px 8px" }}>
                        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#14532d" }}>{value || "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dispositivo */}
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "#fef9c3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#a16207" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-.99l7-3 7 3c.6.27 1 .86 1 1.5v6z" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#854d0e", textTransform: "uppercase", letterSpacing: 0.8 }}>Dispositivo</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 10px" }}>
                    {[
                      ["GPON SN",   deviceInfo.sn      || "N/D"],
                      ["Modelo",    deviceInfo.modelo  || "N/D"],
                      ["RX Power",  deviceInfo.rxPower || "N/D"],
                      ["TX Power",  deviceInfo.txPower || "N/D"],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: "#fffbeb", borderLeft: "3px solid #fde68a", padding: "5px 8px" }}>
                        <div style={{ fontSize: 9, color: "#64748b", marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: value === "N/D" ? "#94a3b8" : "#78350f" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Botón compartir */}
              <div style={{ padding: "0 14px 14px" }}>
                <button
                  onClick={handleShareImage}
                  disabled={sharing}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    minHeight: 44, background: "#f0fdf4", border: "1px solid #bbf7d0",
                    color: "#166534", fontSize: 14, fontWeight: 600, borderRadius: 8,
                    width: "100%", cursor: sharing ? "wait" : "pointer",
                    opacity: sharing ? 0.6 : 1,
                  }}
                >
                  {sharing
                    ? <><SpinIcon color="#166634" size={14} /> Generando imagen...</>
                    : <>📤 Compartir reporte de configuración</>
                  }
                </button>
              </div>
            </>
          )}
        </div>
      )}
        

      {/* ── Instrucciones ── */}
      {estado === "idle" && (
        <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#92400e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Antes de configurar:</div>
          <ol style={{ paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
            <li>Seleccioná el modelo de ONU</li>
            <li>Conectate al WiFi de la ONU (ver etiqueta trasera)</li>
            <li>Asegurate de estar en la misma red del equipo</li>
            {IS_DEV && <li>Corré el proxy: <span style={{ fontFamily: "monospace" }}>python proxy_onu.py</span></li>}
            <li>Ingresá el SSID y contraseña del cliente</li>
            <li>Presioná "Configurar ONU" y esperá que termine</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function SpinIcon({ color = "white", size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round"
      style={{ animation: "spin 1s linear infinite" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}