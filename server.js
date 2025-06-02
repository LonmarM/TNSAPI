const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// APIs protegidas y DNS
const monitoredApis = [
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
    name: "DNS Scoba",
    method: "GET",
    url: "https://portalwscoba.tns.net.co/",
    isDnsCheck: true
  },
  {
    name: "DNS Chichenitza",
    method: "GET",
    url: "https://portalwschichenitza.tns.net.co/",
    isDnsCheck: true
  }
];

// Ruta protegida: chequeo de login + APIs
app.get('/check-api-status', async (req, res) => {
  let loginOk = false;
  let jwt = null;

  const loginStart = performance.now();

  try {
    const loginResponse = await fetch('https://api.tns.co/v2/Acceso/Login', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        CodigoEmpresa: process.env.CODIGO_EMPRESA,
        NombreUsuario: process.env.USUARIO,
        Contrasenia: process.env.CONTRASENIA
      })
    });

    const loginResult = await loginResponse.json();

    if (loginResult && loginResult.status === true && loginResult.data) {
      loginOk = true;
      jwt = loginResult.data;
    }
  } catch (err) {
    console.warn("❌ Error de login:", err);
  }

  const loginDuration = Math.round(performance.now() - loginStart);

  // 1. Agrega resultado del login
  const results = [{
    name: "Login",
    status: loginOk,
    ms: loginDuration
  }];

  // 2. Verifica otras APIs
  const apiChecks = await Promise.all(
    monitoredApis.map(async (api) => {
      const start = performance.now();

      try {
        const headers = api.isDnsCheck
          ? {}
          : {
              Authorization: `Bearer ${jwt}`,
              Accept: 'application/json'
            };

        const response = await fetch(api.url, {
          method: api.method,
          headers
        });

        const duration = Math.round(performance.now() - start);

        if (response.status === 401 || (!loginOk && !api.isDnsCheck)) {
          return { name: api.name, status: false, ms: duration };
        }

        const text = await response.text();
        let isAvailable = false;

        if (api.isDnsCheck) {
          isAvailable = true;
        } else {
          try {
            const json = JSON.parse(text);
            isAvailable = json.status === true;
          } catch {
            isAvailable = false;
          }
        }

        return { name: api.name, status: isAvailable, ms: duration };
      } catch {
        return { name: api.name, status: false, ms: null };
      }
    })
  );

  results.push(...apiChecks);
  res.json(results);
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor seguro ejecutándose en http://localhost:${PORT}`);
});
