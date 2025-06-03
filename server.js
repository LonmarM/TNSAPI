const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const chichenitzaApis = ["Login", "Bodega", "CentroCosto", "CRM", "FormaPago", "Material", "Tercero", "Ventas"];
const cobaApis = ["Login", "Bodega", "CentroCosto", "CRM", "FormaPago", "Material", "Tercero", "Ventas"];
const dnsApis = ["WebService Coba", "WebService Chichenitza", "WebService Oficial"];
const apiStatus = {};

let cachedTokenChich = null;
let tokenTimeChich = 0;
let tokenPromiseChich = null;

async function getTokenChich(forceRefresh = false) {
  const now = Date.now();
  const isExpired = now - tokenTimeChich > 5 * 60 * 1000;
  if (cachedTokenChich && !isExpired && !forceRefresh) return cachedTokenChich;
  if (tokenPromiseChich) return tokenPromiseChich;

  tokenPromiseChich = (async () => {
    const res = await fetch("https://api.tns.co/v2/Acceso/Login", {
      method: "POST",
      headers: { accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        CodigoEmpresa: process.env.CODIGO_EMPRESA_CHICH,
        NombreUsuario: process.env.USUARIO_CHICH,
        Contrasenia: process.env.CONTRASENIA_CHICH
      })
    });

    const data = await res.json();
    if (data.status === true && data.data) {
      cachedTokenChich = data.data;
      tokenTimeChich = Date.now();
      tokenPromiseChich = null;
      return cachedTokenChich;
    } else {
      tokenPromiseChich = null;
      throw new Error("Token inválido Chichenitza");
    }
  })();

  return tokenPromiseChich;
}

let cachedTokenCoba = null;
let tokenTimeCoba = 0;
let tokenPromiseCoba = null;

async function getTokenCoba(forceRefresh = false) {
  const now = Date.now();
  const isExpired = now - tokenTimeCoba > 5 * 60 * 1000;
  if (cachedTokenCoba && !isExpired && !forceRefresh) return cachedTokenCoba;
  if (tokenPromiseCoba) return tokenPromiseCoba;

  tokenPromiseCoba = (async () => {
    const res = await fetch("https://api.tns.co/v2/Acceso/Login", {
      method: "POST",
      headers: { accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        CodigoEmpresa: process.env.CODIGO_EMPRESA_COBA,
        NombreUsuario: process.env.USUARIO_COBA,
        Contrasenia: process.env.CONTRASENIA_COBA
      })
    });

    const data = await res.json();
    if (data.status === true && data.data) {
      cachedTokenCoba = data.data;
      tokenTimeCoba = Date.now();
      tokenPromiseCoba = null;
      return cachedTokenCoba;
    } else {
      tokenPromiseCoba = null;
      throw new Error("Token inválido Coba");
    }
  })();

  return tokenPromiseCoba;
}

const monitoredApis = [
  { name: "Login", method: "POST", url: "https://api.tns.co/v2/Acceso/Login", isLogin: true },
  { name: "Bodega", method: "GET", url: "https://api.tns.co/v2/tablas/Bodega/ObtenerBodegas" },
  { name: "CentroCosto", method: "GET", url: "https://api.tns.co/v2/tablas/CentroCosto/Listar" },
  { name: "CRM", method: "GET", url: "https://api.tns.co/v2/tablas/CRM/ListarProcesos" },
  { name: "FormaPago", method: "GET", url: "https://api.tns.co/v2/tablas/FormaPago/ObtenerFormasDePago" },
  { name: "Material", method: "GET", url: "https://api.tns.co/v2/tablas/Material/Listar?codigosucursal=00&filtro=00" },
  { name: "Tercero", method: "GET", url: "https://api.tns.co/v2/tablas/Tercero/Listar" },
  { name: "Ventas", method: "GET", url: "https://api.tns.co/v2/facturacion/Ventas/Listar?codigosucursal=00" },
  { name: "WebService Coba", method: "GET", url: "https://portalwscoba.tns.net.co/", isDnsCheck: true },
  { name: "WebService Chichenitza", method: "GET", url: "https://portalwschichenitza.tns.net.co/", isDnsCheck: true },
  { name: "WebService Oficial", method: "GET", url: "https://portalwsoficial.tns.net.co/", isDnsCheck: true }
];

async function checkApi(api, prefix) {
  const key = prefix ? `${prefix}-${api.name.replace(/\s/g, '-')}` : api.name.replace(/\s/g, '-');
  const startTime = Date.now();

  try {
    if (api.isLogin) {
      const res = await fetch(api.url, {
        method: "POST",
        headers: { accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          CodigoEmpresa: prefix === "chich" ? process.env.CODIGO_EMPRESA_CHICH : process.env.CODIGO_EMPRESA_COBA,
          NombreUsuario: prefix === "chich" ? process.env.USUARIO_CHICH : process.env.USUARIO_COBA,
          Contrasenia: prefix === "chich" ? process.env.CONTRASENIA_CHICH : process.env.CONTRASENIA_COBA
        })
      });

      const ms = Date.now() - startTime;
      const data = await res.json();
      const ok = res.ok && data.status === true && !!data.data;

      apiStatus[key] = {
        status: ok,
        ms,
        lastChecked: new Date().toISOString()
      };
      return;
    }

    let headers = {};
    if (!api.isDnsCheck) {
      const token = prefix === "chich" ? await getTokenChich() : await getTokenCoba();
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(api.url, { method: api.method, headers });
    const ms = Date.now() - startTime;

    apiStatus[key] = {
      status: res.ok,
      ms,
      lastChecked: new Date().toISOString()
    };

  } catch (error) {
    apiStatus[key] = {
      status: false,
      ms: null,
      lastChecked: new Date().toISOString(),
      error: error.message
    };
  }
}

async function checkAllApis() {
  for (const api of monitoredApis) {
    if (chichenitzaApis.includes(api.name)) {
      await checkApi(api, "chich");
    }
    if (cobaApis.includes(api.name)) {
      await checkApi(api, "coba");
    }
    if (dnsApis.includes(api.name)) {
      await checkApi(api, ""); // DNS no lleva prefijo
    }
  }
  console.log("✔️ Chequeo completado", new Date().toLocaleTimeString());
}

checkAllApis();
setInterval(checkAllApis, 180000);

app.get('/check-api', (req, res) => {
  const { provider, name } = req.query;
  if (!name) return res.status(400).json({ error: "Falta parámetro name" });

  let key = name.replace(/\s/g, '-');

  if (provider === 'chichenitza') {
    key = `chich-${key}`;
  } else if (provider === 'coba') {
    key = `coba-${key}`;
  }

  if (apiStatus[key]) {
    return res.json(apiStatus[key]);
  }

  res.status(404).json({ status: false, ms: null });
});
app.post('/refresh', async (req, res) => {
  try {
    await checkAllApis();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en http://localhost:${PORT}`);
});
