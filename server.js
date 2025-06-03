const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware para logging (opcional para depurar)
app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.url}`);
  next();
});

app.use(express.json());

// Sirve archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

const monitoredApis = [
  {
    name: "Login",
    method: "POST",
    url: "https://api.tns.co/v2/Acceso/Login",
    isLogin: true
  },
  {
    name: "Bodega",
    method: "GET",
    url: "https://api.tns.co/v2/tablas/Bodega/ObtenerBodegas"
  },
  {
    name: "CentroCosto",
    method: "GET",
    url: "https://api.tns.co/v2/tablas/CentroCosto/Listar"
  },
  {
    name: "CRM",
    method: "GET",
    url: "https://api.tns.co/v2/tablas/CRM/ListarProcesos"
  },
  {
    name: "FormaPago",
    method: "GET",
    url: "https://api.tns.co/v2/tablas/FormaPago/ObtenerFormasDePago"
  },
  {
    name: "Material",
    method: "GET",
    url: "https://api.tns.co/v2/tablas/Material/Listar?codigosucursal=00&filtro=00"
  },
  {
    name: "Tercero",
    method: "GET",
    url: "https://api.tns.co/v2/tablas/Tercero/Listar"
  },
  {
    name: "Ventas",
    method: "GET",
    url: "https://api.tns.co/v2/facturacion/Ventas/Listar?codigosucursal=00"
  },
  {
    name: "WebService Coba",
    method: "GET",
    url: "https://portalwscoba.tns.net.co/",
    isDnsCheck: true
  },
  {
    name: "WebService Chichenitza",
    method: "GET",
    url: "https://portalwschichenitza.tns.net.co/",
    isDnsCheck: true
  },
  {
    name: "WebService Oficial",
    method: "GET",
    url: "https://portalwsoficial.tns.net.co/",
    isDnsCheck: true
  }
];

// Token cache para Chichenitza
let cachedTokenChich = null;
let tokenTimeChich = 0;
let tokenPromiseChich = null;

// Token cache para Coba (si usas otro login, define igual que arriba, con otras variables)
let cachedTokenCoba = null;
let tokenTimeCoba = 0;
let tokenPromiseCoba = null;

// Obtener token para Chichenitza
async function getTokenChich(forceRefresh = false) {
  const now = Date.now();
  const isExpired = now - tokenTimeChich > 5 * 60 * 1000;
  if (cachedTokenChich && !isExpired && !forceRefresh) {
    return cachedTokenChich;
  }
  if (!tokenPromiseChich) {
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
        tokenTimeChich = now;
        return cachedTokenChich;
      } else {
        throw new Error("No se pudo obtener token Chichenitza");
      }
    })();
    try {
      await tokenPromiseChich;
    } finally {
      tokenPromiseChich = null;
    }
  }
  return tokenPromiseChich;
}

// Obtener token para Coba
async function getTokenCoba(forceRefresh = false) {
  const now = Date.now();
  const isExpired = now - tokenTimeCoba > 5 * 60 * 1000;
  if (cachedTokenCoba && !isExpired && !forceRefresh) {
    return cachedTokenCoba;
  }
  if (!tokenPromiseCoba) {
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
        tokenTimeCoba = now;
        return cachedTokenCoba;
      } else {
        throw new Error("No se pudo obtener token Coba");
      }
    })();
    try {
      await tokenPromiseCoba;
    } finally {
      tokenPromiseCoba = null;
    }
  }
  return tokenPromiseCoba;
}

app.get("/check-api", async (req, res) => {
  const name = req.query.name;
  const api = monitoredApis.find(a => a.name === name);
  if (!api) {
    return res.status(404).json({ name, status: false, ms: null });
  }

  const start = performance.now();

  try {
    let token = null;

    // Diferenciar tokens según API (Login Chich o Coba)
    if (!api.isDnsCheck && !api.isLogin) {
      if (api.name === "Login" || api.url.includes('chichenitza')) {
        token = await getTokenChich();
      } else {
        token = await getTokenCoba();
      }
    }

    const headers = api.isDnsCheck
      ? {}
      : api.isLogin
        ? { accept: "application/json", "Content-Type": "application/json" }
        : {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          };

    const body = api.isLogin
      ? JSON.stringify(
          api.name === "Login" || api.url.includes('chichenitza')
            ? {
                CodigoEmpresa: process.env.CODIGO_EMPRESA_CHICH,
                NombreUsuario: process.env.USUARIO_CHICH,
                Contrasenia: process.env.CONTRASENIA_CHICH
              }
            : {
                CodigoEmpresa: process.env.CODIGO_EMPRESA_COBA,
                NombreUsuario: process.env.USUARIO_COBA,
                Contrasenia: process.env.CONTRASENIA_COBA
              }
        )
      : undefined;

    const response = await fetch(api.url, {
      method: api.method,
      headers,
      body
    });

    const ms = Math.round(performance.now() - start);
    const text = await response.text();

    let isAvailable = false;

    if (api.isDnsCheck) {
      isAvailable = true;
    } else if (api.isLogin) {
      const json = JSON.parse(text);
      isAvailable = json.status === true && !!json.data;
    } else {
      try {
        const json = JSON.parse(text);
        isAvailable = json.status === true;
      } catch {
        isAvailable = false;
      }
    }

    res.json({ name: api.name, status: isAvailable, ms });
  } catch (err) {
    console.error(`❌ Error en ${name}:`, err.message);
    res.json({ name: api.name, status: false, ms: null });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en http://localhost:${PORT}`);
});
