async function checkStatusPage() {
  try {
    const response = await fetch("/check-api-status");
    const apis = await response.json();

    let hasFailures = false;
    const container = document.getElementById("apiStatusContainer");
    container.innerHTML = "";

    apis.forEach((api) => {
      const card = document.createElement("div");
      card.className = "api-card";
      card.innerHTML = `
        <h5>${api.name}</h5>
        <div>
          <span class="status-dot ${api.status ? "status-ok" : "status-fail"}"></span>
          <span>${api.status ? "Operational" : "No disponible"}</span>
          <span class="text-muted small ms-2"> ${api.ms !== null ? `(${api.ms} ms)` : ""}</span>
        </div>
      `;
      container.appendChild(card);
      if (!api.status) hasFailures = true;
    });

    updateGlobalStatus(hasFailures);
  } catch (err) {
    console.error("Error consultando estado:", err);
  }
}

function updateGlobalStatus(hasFailures) {
  const globalStatus = document.getElementById("globalStatus");
  if (hasFailures) {
    globalStatus.className = "alert alert-danger status-bar";
    globalStatus.textContent = "⚠️ Algunos servicios no están disponibles";
  } else {
    globalStatus.className = "alert alert-success status-bar";
    globalStatus.textContent = "✅ Todos los servicios operativos";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  checkStatusPage();
  setInterval(checkStatusPage, 180000); // cada 3 minutos
});
