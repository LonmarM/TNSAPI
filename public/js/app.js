
const chichenitzaApis = [
  "Login",
  "Bodega",
  "CentroCosto",
  "CRM",
  "FormaPago",
  "Material",
  "Tercero",
  "Ventas"
];
const cobaApis = [
  "Login",
  "Bodega",
  "CentroCosto",
  "CRM",
  "FormaPago",
  "Material",
  "Tercero",
  "Ventas"
];

const dnsApis = [
  "WebService Coba",
  "WebService Chichenitza",
  "WebService Oficial"
];

function prefixToProvider(prefix) {
  if (prefix === "chich") return "chichenitza";
  if (prefix === "coba") return "coba";
  return ""; // para DNS
}

// Crear tarjeta individual (grupo o API)
function createCard(id, name, isGroup = false) {
  if (isGroup) {
    return `
      <div class="col-12 col-lg-6">
        <div class="border rounded p-4 text-center shadow-sm h-100 d-flex flex-column justify-content-center"
             id="card-${id}" style="cursor:pointer; min-height: 250px;">
          <h5>${name}</h5>

          <div class="mt-2">
          <p><small>Última actualización: <span class="group-updated-time">--:--</span></small></p>
            <span class="status-dot bg-secondary"
                  id="group-dot-${id}"
                  style="display:inline-block;width:16px;height:16px;border-radius:50%;margin-right:8px;"></span>
            <span id="group-status-${id}">Pendiente...</span>
          </div>
        </div>
      </div>
    `;
  } else {
    return `
      <div class="col-12 col-md-6 col-lg-3">
        <div class="border rounded p-4 text-center shadow-sm h-100 d-flex flex-column justify-content-center" style="min-height: 200px;">
          <h6 class="mb-2">${name}</h6>
          <div class="mt-2">
            <span class="status-dot bg-secondary"
                  id="dot-${id}"
                  style="display:inline-block;width:14px;height:14px;border-radius:50%;margin-right:5px;"></span>
            <span id="status-${id}">Pendiente...</span>
            <div id="latency-${id}" class="text-muted small mt-2"></div>
            <div id="history-${id}" style="display:flex;gap:1px;margin-top:8px;"></div>
            <div id="percent-${id}" class="text-muted small mt-1"></div>

          </div>
        </div>
      </div>
    `;
  }
}

function renderGroupCards() {
  const groupRow = document.getElementById("group-row");
  groupRow.innerHTML = "";

  groupRow.innerHTML += createCard("chich", "Servicios Chichenitza", true);
  groupRow.innerHTML += createCard("coba", "Servicios Coba", true);

  document.getElementById("card-chich").addEventListener("click", () => {
    toggleGroupDetails("chich");
  });
  document.getElementById("card-coba").addEventListener("click", () => {
    toggleGroupDetails("coba");
  });
}

function renderApisDetails() {
  const chichDetails = document.getElementById("group-details-chich");
  chichDetails.innerHTML = "";
  chichenitzaApis.forEach(name => {
    const id = "chich-" + name.replace(/\s/g, '-');
    chichDetails.innerHTML += createCard(id, name);
  });

  const cobaDetails = document.getElementById("group-details-coba");
  cobaDetails.innerHTML = "";
  cobaApis.forEach(name => {
    const id = "coba-" + name.replace(/\s/g, '-');
    cobaDetails.innerHTML += createCard(id, name);
  });

  const dnsRow = document.getElementById("dns-row");
  dnsRow.innerHTML = "";
  dnsApis.forEach(name => {
    const id = name.replace(/\s/g, '-');
    dnsRow.innerHTML += createCard(id, name);
  });
}

function toggleGroupDetails(groupName) {
  const chichDiv = document.getElementById("group-details-chich");
  const cobaDiv = document.getElementById("group-details-coba");

  if (groupName === "chich") {
    chichDiv.style.display = "flex";
    cobaDiv.style.display = "none";
    chichDiv.scrollIntoView({ behavior: "smooth" });
  } else if (groupName === "coba") {
    cobaDiv.style.display = "flex";
    chichDiv.style.display = "none";
    cobaDiv.scrollIntoView({ behavior: "smooth" });
  }
}

async function fetchAndUpdate(name, prefix) {
  const id = prefix ? prefix + "-" + name.replace(/\s/g, '-') : name.replace(/\s/g, '-');
  const cleanName = name.split(":")[0]; // evita errores tipo "Ventas:1"

  async function fetchStatus() {
    try {
      const provider = prefixToProvider(prefix);
      const url = provider
        ? `/check-api?provider=${provider}&name=${encodeURIComponent(cleanName)}`
        : `/check-api?name=${encodeURIComponent(cleanName)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  let data = await fetchStatus();

  if ((!data || !data.status) && cleanName === "Bodega") {
    await new Promise(r => setTimeout(r, 1000));
    data = await fetchStatus();
  }

  if (!data) {
    document.getElementById(`dot-${id}`).className = `status-dot bg-danger`;
    document.getElementById(`status-${id}`).textContent = "Error";
    document.getElementById(`latency-${id}`).textContent = "";
    return false;
  }

  const isOk = data.status;
  const ms = data.ms;

  document.getElementById(`dot-${id}`).className = `status-dot ${isOk ? 'bg-success' : 'bg-danger'}`;
  document.getElementById(`status-${id}`).textContent = isOk ? 'Disponible' : 'No disponible';
  document.getElementById(`latency-${id}`).textContent = ms !== null ? `(${ms} ms)` : "";
  if (!isOk) {
    const now = new Date();
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    const failTime = `${hh}:${mm}`;
    document.getElementById(`status-${id}`).textContent += ` (Fallo a las ${failTime})`;
  }
  updateHistory(id, isOk);
  return isOk;
  
}

async function checkGroupsSequentially() {
  let chichOk = true;
  for (const name of chichenitzaApis) {
    const ok = await fetchAndUpdate(name, "chich");
    if (!ok) chichOk = false;
  }
  document.getElementById(`group-dot-chich`).className = `status-dot ${chichOk ? 'bg-success' : 'bg-danger'}`;
  document.getElementById(`group-status-chich`).textContent = chichOk ? 'Disponible' : 'Problemas detectados';

  let cobaOk = true;
  for (const name of cobaApis) {
    const ok = await fetchAndUpdate(name, "coba");
    if (!ok) cobaOk = false;
  }
  document.getElementById(`group-dot-coba`).className = `status-dot ${cobaOk ? 'bg-success' : 'bg-danger'}`;
  document.getElementById(`group-status-coba`).textContent = cobaOk ? 'Disponible' : 'Problemas detectados';

  for (const name of dnsApis) {
    await fetchAndUpdate(name, "");
  }
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.querySelectorAll(".group-updated-time").forEach(el => el.textContent = now);

}

document.addEventListener("DOMContentLoaded", () => {
  // Llamar al backend para forzar actualización
  fetch('/refresh', { method: 'POST' })
    .then(res => res.json())
    .then(() => {
      console.log("🔄 Datos actualizados desde el backend");
      loadStatuses();  // Luego de actualizar, carga resultados
    })
    .catch(err => {
      console.error("❌ Error actualizando servicios:", err);
      loadStatuses();  // Incluso si falla, intenta mostrar lo que haya
    });

  // También se puede recargar automáticamente cada X minutos
  setInterval(() => {
    console.log("⏰ Auto refresco...");
    fetch('/refresh', { method: 'POST' })
      .then(() => loadStatuses())
      .catch(console.error);
  }, 180000); // Cada 3 minutos
});

const historyMap = new Map();

function updateHistory(id, status) {
  if (!historyMap.has(id)) {
    historyMap.set(id, []);
  }
  const history = historyMap.get(id);
  history.unshift(status);
  if (history.length > 30) {
    history.pop();
  }

  // Render barras
  const container = document.getElementById(`history-${id}`);
  if (!container) return;

  container.innerHTML = history.map(s => {
    const color = s === true ? '#198754' : s === false ? '#dc3545' : '#6c757d';
    return `<div style="flex:1;height:10px;margin:0 1px;background:${color};border-radius:2px;"></div>`;
  }).join('');

  // Mostrar % de disponibilidad
  const percent = Math.round(history.filter(v => v === true).length / history.length * 100);
  const percentSpan = document.getElementById(`percent-${id}`);
  if (percentSpan) {
    percentSpan.textContent = `Disponibilidad: ${percent}%`;
  }
}
async function loadHistoryFromMongo() {
  try {
    const res = await fetch('/history');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    for (const [id, history] of Object.entries(data)) {
      historyMap.set(id, history);

      // Render historial al cargar
      const container = document.getElementById(`history-${id}`);
      if (container) {
        container.innerHTML = history.map(s => {
          const color = s === true ? '#198754' : s === false ? '#dc3545' : '#6c757d';
          return `<div style="flex:1;height:10px;margin:0 1px;background:${color};border-radius:2px;"></div>`;
        }).join('');
      }

      // Mostrar porcentaje de disponibilidad
      const percent = Math.round(history.filter(v => v === true).length / history.length * 100);
      const percentSpan = document.getElementById(`percent-${id}`);
      if (percentSpan) {
        percentSpan.textContent = `Disponibilidad: ${percent}%`;
      }
    }

    console.log("📊 Historial cargado desde MongoDB.");
  } catch (err) {
    console.error("❌ Error cargando historial desde MongoDB:", err);
  }
}

function init() {
    renderGroupCards();
    renderApisDetails();
    loadHistoryFromMongo().then(() => {
      checkGroupsSequentially();
    });
    setInterval(checkGroupsSequentially, 600000); // cada 10 minutos
  } 
window.addEventListener("DOMContentLoaded", init);
