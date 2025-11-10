// Baseline granular categories
let baseline = {
  violent: { assault: 320, robbery: 65, homicide: 5, sexual: 35 },
  property: { burglary: 450, larceny: 900, vehicle: 250, arson: 20 },
  fraud: { credit: 150, identity: 90, embezzle: 50 },
  disorder: { vandalism: 400, intoxication: 200, disorderly: 120 }
};

// Flattened labels and data for Chart.js
function getFlattenedLabels() {
  return [
    'Assault','Robbery','Homicide','Sexual Assault',
    'Burglary','Larceny/Theft','Motor Vehicle Theft','Arson',
    'Credit Card Fraud','Identity Theft','Embezzlement',
    'Vandalism','Public Intoxication','Disorderly Conduct'
  ];
}

function getBaselineData() {
  return [
    baseline.violent.assault, baseline.violent.robbery, baseline.violent.homicide, baseline.violent.sexual,
    baseline.property.burglary, baseline.property.larceny, baseline.property.vehicle, baseline.property.arson,
    baseline.fraud.credit, baseline.fraud.identity, baseline.fraud.embezzle,
    baseline.disorder.vandalism, baseline.disorder.intoxication, baseline.disorder.disorderly
  ];
}

// Chart.js setup
const ctx = document.getElementById('crimeChart').getContext('2d');
const crimeChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: getFlattenedLabels(),
    datasets: [
      {
        label: 'Baseline',
        data: getBaselineData(),
        backgroundColor: '#0a3a6c',
        borderRadius: 6
      },
      {
        label: 'Projected',
        data: getBaselineData(),
        backgroundColor: '#f3c614',
        borderRadius: 6
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 700, easing: 'easeOutQuart' },
    plugins: { tooltip: { callbacks: { 
      label: function(context) {
        const label = context.dataset.label;
        const val = context.parsed.y;
        return `${label}: ${val}`;
      }
    } } },
    scales: { y: { beginAtZero: true } }
  }
});

// Slider DOM refs
const sliders = {
  staffing: document.getElementById('staffing'),
  cso: document.getElementById('cso'),
  tech: document.getElementById('tech'),
  lighting: document.getElementById('lighting'),
  youth: document.getElementById('youth'),
  place: document.getElementById('place')
};
const labels = {
  staffing: document.getElementById('staffing-value'),
  cso: document.getElementById('cso-value'),
  tech: document.getElementById('tech-value'),
  lighting: document.getElementById('lighting-value'),
  youth: document.getElementById('youth-value'),
  place: document.getElementById('place-value')
};
const costNode = document.getElementById('cost-estimate');
const projNode = document.getElementById('proj-reduction');

// Update slider labels
function refreshLabels() {
  labels.staffing.textContent = sliders.staffing.value;
  labels.cso.textContent = sliders.cso.value;
  labels.tech.textContent = sliders.tech.value + '%';
  labels.lighting.textContent = sliders.lighting.value + '%';
  labels.youth.textContent = sliders.youth.value + '%';
  labels.place.textContent = sliders.place.value + '%';
}

// --- Projection model ---
function computeProjected() {
  const s = parseInt(sliders.staffing.value);
  const c = parseInt(sliders.cso.value);
  const t = parseInt(sliders.tech.value);
  const L = parseInt(sliders.lighting.value);
  const y = parseInt(sliders.youth.value);
  const p = parseInt(sliders.place.value);

  // Multiplicative reductions
  const factor = (base, coeff) => Math.max(0, Math.round(base * (1 - coeff)));

  return {
    violent: {
      assault: factor(baseline.violent.assault, 0.01*s+0.002*L+0.003*y),
      robbery: factor(baseline.violent.robbery,0.012*s+0.002*L+0.003*y),
      homicide: factor(baseline.violent.homicide,0.008*s+0.001*L+0.002*y),
      sexual: factor(baseline.violent.sexual,0.01*s+0.002*L+0.003*y)
    },
    property: {
      burglary: factor(baseline.property.burglary,0.008*s+0.002*L+0.002*p),
      larceny: factor(baseline.property.larceny,0.006*s+0.0015*L+0.002*p),
      vehicle: factor(baseline.property.vehicle,0.005*s+0.001*L+0.002*p),
      arson: factor(baseline.property.arson,0.004*s+0.001*L+0.001*p)
    },
    fraud: {
      credit: factor(baseline.fraud.credit,0.002*t+0.001*y),
      identity: factor(baseline.fraud.identity,0.002*t+0.001*y),
      embezzle: factor(baseline.fraud.embezzle,0.002*t)
    },
    disorder: {
      vandalism: factor(baseline.disorder.vandalism,0.004*c+0.003*y),
      intoxication: factor(baseline.disorder.intoxication,0.004*c+0.003*y),
      disorderly: factor(baseline.disorder.disorderly,0.003*c+0.002*y)
    }
  };
}

// Update chart
function updateDashboard() {
  refreshLabels();
  const proj = computeProjected();

  const projData = [
    proj.violent.assault, proj.violent.robbery, proj.violent.homicide, proj.violent.sexual,
    proj.property.burglary, proj.property.larceny, proj.property.vehicle, proj.property.arson,
    proj.fraud.credit, proj.fraud.identity, proj.fraud.embezzle,
    proj.disorder.vandalism, proj.disorder.intoxication, proj.disorder.disorderly
  ];

  // Color mapping
  const baselineData = getBaselineData();
  const colors = projData.map((val,i)=>{
    const reduction = (baselineData[i]-va
