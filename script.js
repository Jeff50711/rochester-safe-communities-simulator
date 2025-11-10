// === RPD Strategic Interventions Tool ===

// === Baseline Data (example 2024 Olmsted County-type values) ===
let baselineData = {
  violent: 425,
  property: 1620,
  fraud: 290,
  disorder: 720,
};

// === Chart.js Initialization ===
const ctx = document.getElementById("crimeChart").getContext("2d");
const crimeChart = new Chart(ctx, {
  type: "bar",
  data: {
    labels: ["Violent", "Property", "Fraud/Financial", "Disorder"],
    datasets: [
      {
        label: "Baseline",
        data: Object.values(baselineData),
        backgroundColor: "#1e3a8a",
      },
      {
        label: "Projected",
        data: Object.values(baselineData),
        backgroundColor: "#f3c614",
      },
    ],
  },
  options: {
    responsive: true,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(0)} incidents`;
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Incident Count" } },
    },
  },
});

// === Get DOM Elements ===
const sliders = {
  staffing: document.getElementById("staffing"),
  cso: document.getElementById("cso"),
  tech: document.getElementById("tech"),
  lighting: document.getElementById("lighting"),
  youth: document.getElementById("youth"),
  place: document.getElementById("place"),
};

const values = {
  staffing: document.getElementById("staffing-value"),
  cso: document.getElementById("cso-value"),
  tech: document.getElementById("tech-value"),
  lighting: document.getElementById("lighting-value"),
  youth: document.getElementById("youth-value"),
  place: document.getElementById("place-value"),
};

const costDisplay = document.getElementById("cost-estimate");
const generateBtn = document.getElementById("generateBtn");

// === Tooltip Setup ===
const tooltips = {
  staffing: "Adding sworn officers improves proactive policing, reducing violent and property crimes.",
  cso: "Community Service Officers enhance community engagement and problem-solving capacity.",
  tech: "Technology investments improve evidence gathering, case clearance, and deterrence.",
  lighting: "Improved street lighting reduces opportunity for crime and increases surveillance.",
  youth: "Youth and community programs reduce long-term crime risk through social development.",
  place: "Place management and business compliance address environmental risk factors (e.g., nuisance, disorder).",
};

// Add hover titles dynamically
Object.keys(sliders).forEach((key) => {
  sliders[key].title = tooltips[key];
});

// === Update Function ===
function updateDashboard() {
  const staffing = parseInt(sliders.staffing.value);
  const cso = parseInt(sliders.cso.value);
  const tech = parseInt(sliders.tech.value);
  const lighting = parseInt(sliders.lighting.value);
  const youth = parseInt(sliders.youth.value);
  const place = parseInt(sliders.place.value);

  // === Update slider labels ===
  values.staffing.textContent = staffing;
  values.cso.textContent = cso;
  values.tech.textContent = `${tech}%`;
  values.lighting.textContent = `${lighting}%`;
  values.youth.textContent = `${youth}%`;
  values.place.textContent = `${place}%`;

  // === Calculate projected reductions ===
  const projected = {
    violent:
      baselineData.violent *
      (1 -
        (staffing * 0.01 +
          cso * 0.005 +
          tech * 0.002 +
          lighting * 0.0025 +
          youth * 0.0035 +
          place * 0.003)),
    property:
      baselineData.property *
      (1 -
        (staffing * 0.008 +
          cso * 0.004 +
          tech * 0.0025 +
          lighting * 0.002 +
          youth * 0.0015 +
          place * 0.002)),
    fraud:
      baselineData.fraud *
      (1 -
        (staffing * 0.002 +
          tech * 0.0025 +
          youth * 0.001)),
    disorder:
      baselineData.disorder *
      (1 -
        (cso * 0.003 +
          lighting * 0.003 +
          youth * 0.004 +
          place * 0.0035)),
  };

  // === Update chart ===
  crimeChart.data.datasets[1].data = Object.values(projected);
  crimeChart.data.datasets[1].backgroundColor = Object.values(projected).map(
    (val, i) => {
      return val < Object.values(baselineData)[i] ? "#f3c614" : "#d1d5db";
    }
  );
  crimeChart.update();

  // === Cost Calculation ===
  const totalCost = staffing * 150000 + cso * 100000 + tech * 50000 + lighting * 40000 + youth * 60000 + place * 55000;
  costDisplay.innerHTML = `Estimated Total Annual Cost: <strong>$${totalCost.toLocaleString()}</strong>`;
}

// === Attach Listeners ===
Object.values(sliders).forEach((slider) => {
  slider.addEventListener("input", updateDashboard);
});

// === Generate Proposal ===
generateBtn.addEventListener("click", () => {
  const staffing = parseInt(sliders.staffing.value);
  const cso = parseInt(sliders.cso.value);
  const tech = parseInt(sliders.tech.value);
  const lighting = parseInt(sliders.lighting.value);
  const youth = parseInt(sliders.youth.value);
  const place = parseInt(sliders.place.value);

  const proposal = `
📘 **RPD Strategic Interventions Proposal**

**Staffing & Investments**
- Sworn Officers Added: ${staffing}
- CSOs Added: ${cso}
- Technology Investment: ${tech}%
- Street Lighting Improvement: ${lighting}%
- Youth & Community Programs: ${youth}%
- Place Management & Business Compliance: ${place}%

**Research-Based Impacts**
- **Violent Crime:** ↓ ${(100 - (baselineData.violent / (baselineData.violent * (1 -
    (staffing * 0.01 + cso * 0.005 + tech * 0.002 + lighting * 0.0025 + youth * 0.0035 + place * 0.003))) * 100)).toFixed(1)}%
- **Property Crime:** ↓ ${(100 - (baselineData.property / (baselineData.property * (1 -
    (staffing * 0.008 + cso * 0.004 + tech * 0.0025 + lighting * 0.002 + youth * 0.0015 + place * 0.002))) * 100)).toFixed(1)}%
- **Fraud/Financial Crimes:** ↓ ${(100 - (baselineData.fraud / (baselineData.fraud * (1 -
    (staffing * 0.002 + tech * 0.0025 + youth * 0.001))) * 100)).toFixed(1)}%
- **Disorder & Quality-of-Life:** ↓ ${(100 - (baselineData.disorder / (baselineData.disorder * (1 -
    (cso * 0.003 + lighting * 0.003 + youth * 0.004 + place * 0.0035))) * 100)).toFixed(1)}%

**Academic Evidence**
- Branas et al. (PNAS, 2018): Place-based greening & compliance cut gun violence by up to 29%.
- Welsh & Farrington (J Exp Criminol, 2008): Improved lighting lowers night crime by ~21%.
- Braga & Weisburd (Criminology, 2010): Focused deterrence and technology aid yield strong reductions.
- Farrington (Campbell Systematic Reviews, 2006): Youth programs produce durable prevention effects.
- Livingston (Addiction, 2011): Active business compliance reduces violent outcomes.

---

_This proposal provides an evidence-informed projection of community safety impacts suitable for mayoral review, council planning, or grant submission._
`;

  const blob = new Blob([proposal], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "RPD_Strategic_Interventions_Proposal.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// Initialize dashboard on load
updateDashboard();
