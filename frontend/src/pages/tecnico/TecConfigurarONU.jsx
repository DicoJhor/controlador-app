import { useState } from "react";

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
  server:    "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 01-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 011-.99l7-3 7 3c.6.27 1 .86 1 1.5v6z",
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
    ip: "192.168.101.1",
    usuario: "adminisp",
    password: "adminisp",
    color: "#d97706",
    bg: "rgba(217,119,6,.08)",
    border: "rgba(217,119,6,.3)",
  },
];

const PASOS = [
  { id: "login",  label: "Login",      desc: "Autenticando en la ONU" },
  { id: "wan",    label: "WAN / IP",   desc: "Configurando WAN estática" },
  { id: "lan",    label: "LAN / DHCP", desc: "Configurando red local" },
  { id: "acl",    label: "Acceso",     desc: "Habilitando acceso remoto" },
  { id: "upnp",   label: "UPnP",       desc: "Habilitando UPnP" },
  { id: "wifi5",  label: "WiFi 5G",    desc: "Configurando red 5GHz" },
  { id: "wifi24", label: "WiFi 2.4G",  desc: "Configurando red 2.4GHz" },
  { id: "reboot", label: "Reinicio",   desc: "Reiniciando equipo" },
];

/* ─── Config entorno ─────────────────────────────────────── */
const IS_DEV = import.meta.env.DEV;

function buildUrl(ep, ontIp, equipo) {
  if (IS_DEV) return `/proxy/${ep}`;
  const isZTE = equipo === "optic";
  return isZTE
    ? `http://${ontIp}/cgi-bin/${ep}`
    : `http://${ontIp}/${ep}`;
}

/* ─── postTableEncrypt (port de Python→JS para BENMUNDO) ─── */
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
    // Si el valor es array (chkpt múltiple), iterar cada uno
    if (Array.isArray(value)) {
      for (const v of value) {
        inputVal += encodeName(name) + "=" + encodeVal(v) + "&";
      }
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

  // Forzar unsigned 32-bit antes de reducir
  csum = csum >>> 0;
  csum = (csum & 0xffff) + (csum >>> 16);
  csum = csum & 0xffff;
  csum = (~csum) & 0xffff;
  return csum;
}

/* ─── Helpers HTTP ───────────────────────────────────────── */
function devHdrs(ontIp, equipo, extra = {}) {
  return IS_DEV
    ? { "X-ONT-IP": ontIp, "X-EQUIPO": equipo, ...extra }
    : extra;
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
function b64(str)   { return btoa(unescape(encodeURIComponent(str))); }

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

/* ─── Clase de configuración por modelo ─────────────────── */
class ONUConfigurator {
  constructor({ ontIp, equipo, usuario, password, vlan, ip, mascara, gateway,
                dns1, dns2, lanIp, dhcpS, dhcpE, ssid24, pass24, ssid5, pass5 }) {
    this.ontIp    = ontIp;
    this.equipo   = equipo;
    this.usuario  = usuario;
    this.password = password;
    this.vlan     = vlan;
    this.ip       = ip;
    this.mascara  = mascara;
    this.gateway  = gateway;
    this.dns1     = dns1 || "8.8.8.8";
    this.dns2     = dns2 || "8.8.4.4";
    this.lanIp    = lanIp || "192.168.1.1";
    this.dhcpS    = dhcpS || "192.168.1.100";
    this.dhcpE    = dhcpE || "192.168.1.254";
    this.ssid24   = ssid24;
    this.pass24   = pass24;
    this.ssid5    = ssid5;
    this.pass5    = pass5;
    this.sk       = "";   // sessionKey (OPTIC)
    this.csrf     = "";   // csrfToken (LANLY/BENMUNDO)
  }

  url(ep) { return buildUrl(ep, this.ontIp, this.equipo); }

  hdrs(extra = {}) { return devHdrs(this.ontIp, this.equipo, extra); }

  async getCGI(ep) {
    const r = await fetch(this.url(ep), {
      credentials: "include",
      headers: this.hdrs({ Accept: "text/html,*/*" }),
    });
    return r.text();
  }

  async postCGI(ep, params) {
    const r = await fetch(this.url(ep), {
      method: "POST",
      credentials: "include",
      headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded", Accept: "text/html,*/*" }),
      body: enc(params),
    });
    return r.text();
  }

  // ── PSF para BENMUNDO ── //
  calcPSF(fields) {
    if (IS_DEV) {
      // En dev podemos llamar al proxy, pero para mantener consistencia
      // con prod, calculamos en cliente igual
      return postTableEncrypt(fields);
    }
    return postTableEncrypt(fields);
  }

  // ── Refresh sessionKey OPTIC ── //
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

  // ── Refresh CSRF LANLY/BENMUNDO ── //
  async refreshCSRF(page) {
    const h = await this.getCGI(page);
    const t = extractCSRF(h);
    if (t) this.csrf = t;
    return h;
  }

  // ════════════════════════════════════════════════════════
  // OPTIC — ZTE CGI
  // ════════════════════════════════════════════════════════
  async runOptic(onProgress) {
    // 1. LOGIN
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
    } catch (e) {
      onProgress("login", "error");
      throw new Error(`Login fallido: ${e.message}`);
    }
    await sleep(300);

    // 2. WAN
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
    } catch (e) {
      onProgress("wan", "error");
      throw new Error(`WAN fallida: ${e.message}`);
    }
    await sleep(800);

    // 3. LAN
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
    } catch (e) {
      onProgress("lan", "error");
      throw new Error(`LAN fallida: ${e.message}`);
    }
    await sleep(600);

    // 4. ACL
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

    // 5. UPnP
    onProgress("upnp", "running");
    try {
      await this.refreshSK(["upnp.cgi"]);
      await this.postCGI("upnp.cgi", {
        onSubmit: "1", sessionkey: this.sk,
        upnpenable: "1", upnp_enable: "on",
      });
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    // 6. WiFi 5G
    onProgress("wifi5", "running");
    try {
      await this.refreshSK(["wlantop.cgi"]);
      await this._wifiOptic(this.ssid5, this.pass5, 9, "160MHz", "a,n,ac,ax");
      onProgress("wifi5", "done");
    } catch (e) {
      onProgress("wifi5", "error");
      throw new Error(`WiFi 5G fallida: ${e.message}`);
    }
    await sleep(600);

    // 7. WiFi 2.4G
    onProgress("wifi24", "running");
    try {
      await this.refreshSK(["wlantop.cgi"]);
      await this._wifiOptic(this.ssid24, this.pass24, 1, "40MHz", "b,g,n,ax");
      onProgress("wifi24", "done");
    } catch (e) {
      onProgress("wifi24", "error");
      throw new Error(`WiFi 2.4G fallida: ${e.message}`);
    }
    await sleep(600);

    // 8. REBOOT
    onProgress("reboot", "running");
    try {
      if (IS_DEV) {
        fetch("/reboot-optic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ip: this.ontIp }),
        }).catch(() => {});
      } else {
        this.getCGI("reboot.cgi?onSubmit=1&reboot=1").catch(() => {});
      }
      await sleep(3000);
      onProgress("reboot", "done");
    } catch (_) { onProgress("reboot", "done"); }
  }

  async _wifiOptic(ssid, pass, idx, bw, std) {
    const passB64 = b64(pass);
    await this.postCGI("wlantop.cgi", {
      sessionkey: this.sk, onSubmit: "1",
      Enable: "1", RadioEnabled: "1",
      ModeEnabled: "WPA-WPA2-Personal",
      wep_authmode: "", WEPEncryptionLevel: "",
      SSIDAdvertisementEnabled: "1", AutoChannelEnable: "1",
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
      wpa_encryptionmode: idx === 1 ? "TKIP+AES" : "AES",
      wep_encryption_level: "40-bit", WMM_Enable: "on",
    });
  }

  // ════════════════════════════════════════════════════════
  // LANLY — BOA CGI
  // ════════════════════════════════════════════════════════
  async runLanly(onProgress) {
    // 1. LOGIN
    onProgress("login", "running");
    try {
      await this.refreshCSRF("admin/login.asp");
      if (!this.csrf) throw new Error("No se encontró CSRF token");
      await this.postCGI("boaform/admin/formLogin", {
        username1: this.usuario, psd1: this.password,
        loginSelinit: this.usuario === "superadmin" ? "3" : "1",
        username: this.usuario, psd: this.password,
        sec_lang: "0", ismobile: "", csrftoken: this.csrf,
      });
      const html2 = await this.getCGI("net_eth_links.asp");
      const t2 = extractCSRF(html2);
      if (t2) this.csrf = t2;
      if (!t2 && html2.includes("formLogin")) throw new Error("Credenciales inválidas");
      onProgress("login", "done");
    } catch (e) {
      onProgress("login", "error");
      throw new Error(`Login fallido: ${e.message}`);
    }
    await sleep(300);

    // 2. WAN
    onProgress("wan", "running");
    try {
      const html = await this.refreshCSRF("net_eth_links.asp");
      // Detectar interfaz existente para borrar
      const lstM = html.match(/new\s+it_nr\s*\(\s*["']([^"']+)["']/);
      const lst = lstM ? lstM[1] : null;
      if (lst) {
        await this._lanlyPostEthernet({
          lkname: lst, lkmode: "1", IpProtocolType: "1", ipmode: "1",
          PPPoEProxyMaxUser: "0", napt: "on", vlan: "on", vid: "100",
          vprio: "1", mtu: "1500", pppUsername: "", pppPassword: "",
          pppServiceName: "", pppCtype: "0",
          ipAddr: "0.0.0.0", netMask: "255.255.255.0", remoteIpAddr: "0.0.0.0",
          v4dns1: "8.8.8.8", v4dns2: "8.8.4.4",
          applicationtype: "1", dslite_aftr_mode: "0", dslite_aftr_hostname: "::",
          Ipv6Addr: "", Ipv6PrefixLen: "", Ipv6Gateway: "",
          dnsv6Mode: "1", Ipv6Dns1: "", Ipv6Dns2: "",
          cmode: "1", ipDhcp: "0", itfGroup: "543",
          encodePppUserName: "", encodePppPassword: "",
          lst, action: "rm",
          "submit-url": `http://${this.ontIp}/net_eth_links.asp`,
          acnameflag: "none", csrftoken: this.csrf,
          chkpt: ["on","on","on","on","on","","","","","on","","","",""],
        });
        await sleep(1500);
        await this.refreshCSRF("net_eth_links.asp");
      }
      await this._lanlyPostEthernet({
        lkname: "new", lkmode: "1", IpProtocolType: "1", ipmode: "1",
        PPPoEProxyMaxUser: "0", napt: "on", vlan: "on", vid: this.vlan,
        vprio: "1", mtu: "1500", pppUsername: "", pppPassword: "",
        pppServiceName: "", pppCtype: "0",
        ipAddr: this.ip, netMask: this.mascara, remoteIpAddr: this.gateway,
        dnsMode: "0", v4dns1: this.dns1, v4dns2: this.dns2,
        applicationtype: "1", dslite_aftr_mode: "0", dslite_aftr_hostname: "::",
        Ipv6Addr: "", Ipv6PrefixLen: "", Ipv6Gateway: "",
        dnsv6Mode: "1", Ipv6Dns1: "", Ipv6Dns2: "",
        cmode: "1", ipDhcp: "0", itfGroup: "543",
        encodePppUserName: "", encodePppPassword: "",
        lst: "", action: "sv",
        "submit-url": `http://${this.ontIp}/net_eth_links.asp`,
        acnameflag: "none", csrftoken: this.csrf,
        chkpt: ["on","on","on","on","on","","","","","on","","","",""],
      });
      onProgress("wan", "done");
    } catch (e) {
      onProgress("wan", "error");
      throw new Error(`WAN fallida: ${e.message}`);
    }
    await sleep(800);

    // 3. LAN
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

    // 4. ACL
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

    // 5. UPnP
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

    // 6. WiFi 5G
    onProgress("wifi5", "running");
    try {
      await this.refreshCSRF("admin/wlbasic.asp?wlan_idx=0");
      await this.postCGI("boaform/admin/formWlanSetup", {
        band: "75", mode: "0", ssid: this.ssid5, pskFormat: "0", pskValue: this.pass5,
        wl_wmm_func: "ON", powerincrease: "ON", powersaving: "ON",
        chanwid: "2", ctlband: "0", chan: "153", txpower: "0",
        wl_limitstanum: "0", wl_stanum: "", regdomain_demo: "13",
        "submit-url": "/admin/wlbasic.asp", save: "Aplicar Cambios",
        basicrates: "15", operrates: "4095", wlan_idx: "0",
        Band2G5GSupport: "2", wlanBand2G5GSelect: "", dfs_enable: "1",
        regDomain: "11", csrftoken: this.csrf,
      });
      onProgress("wifi5", "done");
    } catch (e) {
      onProgress("wifi5", "error");
      throw new Error(`WiFi 5G fallida: ${e.message}`);
    }
    await sleep(600);

    // 7. WiFi 2.4G
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
      onProgress("wifi24", "error");
      throw new Error(`WiFi 2.4G fallida: ${e.message}`);
    }
    await sleep(600);

    // 8. REBOOT
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
    const r = await fetch(this.url("boaform/admin/formEthernet"), {
      method: "POST",
      credentials: "include",
      headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded" }),
      body: params.toString(),
    });
    return r.text();
  }

  // ════════════════════════════════════════════════════════
  // BENMUNDO — BOA CGI + postSecurityFlag
  // ════════════════════════════════════════════════════════
  async runBenmundo(onProgress) {
    // 1. LOGIN
    onProgress("login", "running");
    try {
      const loginHtml = await this.getCGI("admin/login.asp");
      const psfM = loginHtml.match(/name\s*=\s*["']postSecurityFlag["'][^>]*value\s*=\s*["']([^"']*)["']/i)
                || loginHtml.match(/value\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']postSecurityFlag["']/i);
      const chalM = loginHtml.match(/name\s*=\s*["']challenge["'][^>]*value\s*=\s*["']([^"']*)["']/i)
                 || loginHtml.match(/value\s*=\s*["']([^"']*)["'][^>]*name\s*=\s*["']challenge["']/i);
      const loginParams = {
        challenge: chalM ? chalM[1] : "",
        username: this.usuario,
        password: this.password,
        save: "Login",
        "submit-url": "/admin/login.asp",
        postSecurityFlag: psfM ? psfM[1] : "",
      };
      await this.postCGI("boaform/admin/formLogin", loginParams);
      // Verificar sesión
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
    } catch (e) {
      onProgress("login", "error");
      throw new Error(`Login fallido: ${e.message}`);
    }
    await sleep(300);

    // 2. WAN
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
        await fetch(this.url("boaform/admin/formWanEth"), {
          method: "POST", credentials: "include",
          headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded" }),
          body: delParams.toString(),
        });
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
        apply: "Apply Changes", itfGroup,
        postSecurityFlag: "",
      };
      wanFields.postSecurityFlag = String(this.calcPSF(wanFields));
      const wanParams = new URLSearchParams();
      for (const [k, v] of Object.entries(wanFields)) wanParams.append(k, v ?? "");
      for (const v of ["on","on","","","on","","","","on","","",""]) wanParams.append("chkpt", v);
      await fetch(this.url("boaform/admin/formWanEth"), {
        method: "POST", credentials: "include",
        headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded" }),
        body: wanParams.toString(),
      });
      onProgress("wan", "done");
    } catch (e) {
      onProgress("wan", "error");
      throw new Error(`WAN fallida: ${e.message}`);
    }
    await sleep(2000);

    // 3. LAN
    onProgress("lan", "running");
    try {
      const lanFields = {
        lan_ip: this.lanIp, lan_mask: "255.255.255.0",
        dhcpdenable: "2", dhcpRangeStart: this.dhcpS, dhcpRangeEnd: this.dhcpE,
        dhcpSubnetMask: "255.255.255.0", ltime: "43200", dname: "bbrouter",
        ip: this.lanIp, dhcpdns: "1",
        dns1: this.dns1, dns2: this.dns2, dns3: "1.1.1.1",
        save: "Apply Changes", "submit-url": "/dhcpd.asp",
        postSecurityFlag: "",
      };
      lanFields.postSecurityFlag = String(this.calcPSF(lanFields));
      await this.postCGI("boaform/formDhcpServer", lanFields);
      onProgress("lan", "done");
    } catch (e) {
      onProgress("lan", "error");
      throw new Error(`LAN fallida: ${e.message}`);
    }
    await sleep(600);

    // 4. ACL
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

    // 5. UPnP
    onProgress("upnp", "running");
    try {
      const upnpPage = await this.getCGI("upnp.asp").catch(() => "");
      const allOpts = [...upnpPage.matchAll(/<option[^>]+value\s*=\s*(\d+)/gi)];
      const validOpt = allOpts.find(m => parseInt(m[1]) < 65535);
      const extIf = validOpt ? validOpt[1] : "130816";
      const upnpFields = {
        daemon: "1", ext_if: extIf,
        "submit-url": "/upnp.asp", postSecurityFlag: "",
      };
      upnpFields.postSecurityFlag = String(this.calcPSF(upnpFields));
      await this.postCGI("boaform/formUpnp", upnpFields);
      onProgress("upnp", "done");
    } catch (_) { onProgress("upnp", "done"); }
    await sleep(400);

    // 6. WiFi 5G
    onProgress("wifi5", "running");
    try {
      await this._wifiBenmundo(this.ssid5, this.pass5, "5");
      onProgress("wifi5", "done");
    } catch (e) {
      onProgress("wifi5", "error");
      throw new Error(`WiFi 5G fallida: ${e.message}`);
    }
    await sleep(600);

    // 7. WiFi 2.4G
    onProgress("wifi24", "running");
    try {
      await this._wifiBenmundo(this.ssid24, this.pass24, "24");
      onProgress("wifi24", "done");
    } catch (e) {
      onProgress("wifi24", "error");
      throw new Error(`WiFi 2.4G fallida: ${e.message}`);
    }
    await sleep(600);

    // 8. REBOOT
    onProgress("reboot", "running");
    try {
      const rebootFields = {
        "submit-url": "/mgm_dev_reboot.asp", postSecurityFlag: "",
      };
      rebootFields.postSecurityFlag = String(this.calcPSF(rebootFields));
      fetch(this.url("boaform/admin/formReboot"), {
        method: "POST", credentials: "include",
        headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded" }),
        body: enc(rebootFields),
      }).catch(() => {});
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
      wlan_idx: wlanIdx, "submit-btn": "Apply Changes",
      "submit-url": submitUrl,
    };
    if (!psf) {
      params.postSecurityFlag = String(this.calcPSF(params));
    } else {
      params.postSecurityFlag = psf;
    }
    await fetch(this.url("boaform/admin/formCdtWlanSetup"), {
      method: "POST", credentials: "include",
      headers: this.hdrs({ "Content-Type": "application/x-www-form-urlencoded" }),
      body: enc(params),
    });
  }

  // ── Dispatch ── //
  async run(onProgress) {
    if (this.equipo === "optic")    return this.runOptic(onProgress);
    if (this.equipo === "lanly")    return this.runLanly(onProgress);
    if (this.equipo === "benmundo") return this.runBenmundo(onProgress);
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
  const [estado,    setEstado]  = useState("idle"); // idle | running | done | error
  const [pasos,     setPasos]   = useState(() =>
    Object.fromEntries(PASOS.map(p => [p.id, "pending"]))
  );
  const [errorMsg, setErrorMsg] = useState("");

  const modeloActual = MODELOS.find(m => m.id === modeloId);

  const seleccionarModelo = (m) => {
    setModeloId(m.id);
    setErrors({});
  };

  const onProgress = (pasoId, nuevoEstado) => {
    setPasos(prev => ({ ...prev, [pasoId]: nuevoEstado }));
  };

  const validate = () => {
    const e = {};
    if (!modeloId)                  e.modelo   = "Seleccioná el modelo de ONU";
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

    const m = MODELOS.find(x => x.id === modeloId);
    const cfg = new ONUConfigurator({
      ontIp: m.ip, equipo: m.id, usuario: m.usuario, password: m.password,
      vlan, ip, mascara, gateway,
      dns1: "8.8.8.8", dns2: "8.8.4.4",
      lanIp: m.id === "benmundo" ? "192.168.101.1" : "192.168.1.1",
      dhcpS: m.id === "benmundo" ? "192.168.101.100" : "192.168.1.100",
      dhcpE: m.id === "benmundo" ? "192.168.101.254" : "192.168.1.254",
      ssid24: ssid, pass24: wifiPass,
      ssid5: `${ssid}-5G`, pass5: wifiPass,
    });

    try {
      await cfg.run(onProgress);
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {MODELOS.map(m => {
                const sel = modeloId === m.id;
                return (
                  <button key={m.id} type="button"
                    onClick={() => seleccionarModelo(m)}
                    style={{
                      padding: "12px 8px", borderRadius: 10, border: "1.5px solid",
                      borderColor: sel ? m.color : "var(--border)",
                      background: sel ? m.bg : "white",
                      cursor: "pointer", textAlign: "center", transition: "all .15s",
                    }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: sel ? m.color : "var(--text)", marginBottom: 3 }}>
                      {m.nombre}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.3 }}>
                      {m.desc}
                    </div>
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
            {[
              { label: "IP WAN",  value: ip },
              { label: "Máscara", value: mascara },
              { label: "Gateway", value: gateway },
              { label: "VLAN",    value: vlan },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</div>
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "monospace", color: "#14532d" }}>{value || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── WiFi ── */}
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
              style={{ minHeight: 48, marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                       opacity: (!modeloId || !ip) ? 0.5 : 1 }}>
              <Icon d={IC.zap} size={16} />
              Configurar ONU automáticamente
            </button>
          </div>
        </div>
      )}

      {/* ── Progreso ── */}
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
                <span style={{ fontFamily: "monospace" }}>{modeloActual?.ip}</span>
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

          {estado === "done" && (
            <div style={{ padding: "0 14px 14px" }}>
              <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, fontSize: 13, color: "#166534" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>✅ Resumen</div>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12 }}>
                  <span style={{ opacity: 0.7 }}>Modelo:</span>   <span style={{ fontWeight: 600, color: modeloActual?.color }}>{modeloActual?.nombre}</span>
                  <span style={{ opacity: 0.7 }}>IP WAN:</span>   <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{ip}</span>
                  <span style={{ opacity: 0.7 }}>Gateway:</span>  <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{gateway}</span>
                  <span style={{ opacity: 0.7 }}>VLAN:</span>     <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{vlan}</span>
                  <span style={{ opacity: 0.7 }}>WiFi 2.4G:</span><span style={{ fontWeight: 600 }}>{ssid}</span>
                  <span style={{ opacity: 0.7 }}>WiFi 5G:</span>  <span style={{ fontWeight: 600 }}>{ssid}-5G</span>
                  <span style={{ opacity: 0.7 }}>Contraseña:</span><span style={{ fontFamily: "monospace", fontWeight: 600 }}>{wifiPass}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {estado === "idle" && (
        <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, fontSize: 12, color: "#92400e" }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ Antes de configurar:</div>
          <ol style={{ paddingLeft: 16, margin: 0, lineHeight: 1.8 }}>
            <li>Seleccioná el modelo de ONU</li>
            <li>Conectate al WiFi de la ONU (ver etiqueta trasera)</li>
            <li>Asegurate de estar en la red del equipo (<span style={{ fontFamily: "monospace" }}>192.168.1.x</span> o <span style={{ fontFamily: "monospace" }}>192.168.101.x</span>)</li>
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