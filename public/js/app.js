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

// Crear tarjeta individual (grupo o API)
function createCard(id, name, isGroup = false) {
  if (isGroup) {
    return `
      <div class="col-12 col-lg-6">
        <div class="border rounded p-4 text-center shadow-sm h-100 d-flex flex-column justify-content-center"
             id="card-${id}" style="cursor:pointer; min-height: 250px;">
          <h5>${name}</h5>
          <div class="mt-2">
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
          </div>
        </div>
      </div>
    `;
  }
}

// Renderiza las tarjetas principales de grupos y las DNS
function renderGroupCards() {
  const groupRow = document.getElementById("group-row");
  groupRow.innerHTML = "";

  // Tarjetas grupo
  groupRow.innerHTML += createCard("chich", "Servicios Chichenitza", true);
  groupRow.innerHTML += createCard("coba", "Servicios Coba", true);

  // Agregar event listeners para toggle detalle
  document.getElementById("card-chich").addEventListener("click", () => {
    toggleGroupDetails("chich");
  });
  document.getElementById("card-coba").addEventListener("click", () => {
    toggleGroupDetails("coba");
  });
}

// Renderiza APIs internas en los contenedores ocultos inicialmente
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

// Muestra un grupo y oculta el otro (solo uno abierto a la vez)
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

// Actualiza el estado de una API individual
async function fetchAndUpdate(name, prefix) {
  const id = prefix ? prefix + "-" + name.replace(/\s/g, '-') : name.replace(/\s/g, '-');

  async function fetchStatus() {
    try {
      const res = await fetch(`/check-api?name=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }

  let data = await fetchStatus();

  // Reintenta si es Bodega y está no disponible o error en la primera consulta
  if ((!data || !data.status) && name === "Bodega") {
    await new Promise(r => setTimeout(r, 1000)); // espera 1 segundo
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

  return isOk;
}

// Verifica grupos y DNS
async function checkGroupsSequentially() {
  // Chichenitza
  let chichOk = true;
  for (const name of chichenitzaApis) {
    const ok = await fetchAndUpdate(name, "chich");
    if (!ok) chichOk = false;
  }
  document.getElementById(`group-dot-chich`).className = `status-dot ${chichOk ? 'bg-success' : 'bg-danger'}`;
  document.getElementById(`group-status-chich`).textContent = chichOk ? 'Disponible' : 'Problemas detectados';

  // Coba
  let cobaOk = true;
  for (const name of cobaApis) {
    const ok = await fetchAndUpdate(name, "coba");
    if (!ok) cobaOk = false;
  }
  document.getElementById(`group-dot-coba`).className = `status-dot ${cobaOk ? 'bg-success' : 'bg-danger'}`;
  document.getElementById(`group-status-coba`).textContent = cobaOk ? 'Disponible' : 'Problemas detectados';

  // DNS
  for (const name of dnsApis) {
    await fetchAndUpdate(name, "");
  }
}

// Inicialización general al cargar
function init() {
  renderGroupCards();
  renderApisDetails();
  checkGroupsSequentially();
  setInterval(checkGroupsSequentially, 180000); // cada 3 minutos
}

window.addEventListener("DOMContentLoaded", init);
