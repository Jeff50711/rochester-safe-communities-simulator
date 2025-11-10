// ========== RPD Strategic Interventions Tool (Updated) ==========
// Author: ChatGPT 2025 | Rochester Police Department color scheme + research-based model
// ================================================================

// Baseline data (Olmsted County, MN - NIBRS style estimates)
const baseData = {
  violent: 980,
  property: 2263,
  fraud: 450,
  disorder: 900
};

// Chart.js setup
const ctx = document.getElementById('crimeChart').getContext('2d');
let crimeChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Violent', 'Property', 'Fraud', 'Disorder'],
    datasets: [{
      label: 'Projected Crimes',
      backgroundColor: ['#00274D', '#004B8D', '#2E8B57', '#DAA520'],
      data: [baseData.violent, baseData.property, baseData.fraud, baseData.disorder]
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue} incidents`
        }
      }
    },
    scales: {
      y: { beginAtZero: true }
    }
  }
});

// ========== INTERVENTION IMPACT MODEL ==========
function getImpactScores() {
  const officers = +document.getElementById('staffing').value;
  const csos = +document.getElementById('cso').value;
  const tech = +document.getElementById('tech').value;
  const lighting = +document.getElementById('lighting').value;
  const youth = +document.getElementById('youth').value;
  const place = +document.getElementById('place').value;

  // impact coefficients (fractional reductions per % or unit)
  const impacts = {
    violent: baseData.violent *
      (1
        - 0.01 * officers
        - 0.004 * csos
        - 0.15 * (tech / 100)
        - 0.20 * (lighting / 100)
        - 0.30 * (youth / 100)
        - 0.18 * (place / 100)),
    property: baseData.property *
      (1
        - 0.005 * officers
        - 0.003 * csos
        - 0.12 * (tech / 100)
        - 0.15 * (lighting / 100)
        - 0.25 * (youth / 100)
        - 0.12 * (place / 100)),
    fraud: baseData.fraud *
      (1
        - 0.05 * (tech / 100)
        - 0.10 * (youth / 100)),
    disorder: baseData.disorder *
      (1
        - 0.002 * officers
        - 0.002 * csos
        - 0.10 * (lighting / 100)
        - 0.20 * (youth / 100)
        - 0.14 * (place / 100))
  };

  // Prevent negatives
  for (let k in impacts) if (impacts[k] < 0) impacts[k] = 0;
  return impacts;
}

// ========== UPDATE CHART & COST ==========
function updateChart() {
  const impacts = getImpactScores();

  crimeChart.data.datasets[0].data = [
    impacts.violent, impacts.property, impacts.fraud, impacts.disorder
  ];

  // dynamic bar colors (green = improved)
  const improvements = [
    1 - impacts.violent / baseData.violent,
    1 - impacts.property / baseData.property,
    1 - impacts.fraud / baseData.fraud,
    1 - impacts.disorder / baseData.disorder
  ];

  crimeChart.data.datasets[0].backgroundColor = improvements.map(i =>
    i > 0.25 ? '#2ECC71' : i > 0.1 ? '#F1C40F' : '#E74C3C'
  );

  crimeChart.update();

  // Cost estimate
  const officerCost = +document.getElementById('staffing').value * 150000;
  const csoCost = +document.getElementById('cso').value * 100000;
  const totalCost = officerCost + csoCost;
  document.getElementById('cost-estimate').innerText =
    `Estimated Additional Staffing Cost: $${totalCost.toLocaleString()}`;
}

// ========== TOOLTIP HELP ==========
const tooltips = {
  staffing: 'Adding sworn officers targeted to hot spots can reduce violent and property crime when deployed strategically. (Braga & Weisburd 2010)',
  cso: 'Community Service Officers free sworn staff for proactive work and improve community trust.',
  tech: 'Technology (DFR, ALPR, analytics) improves response times and clearance rates. (Braga & Weisburd 2010)',
  lighting: 'Improved street lighting reduces nighttime crime by ~20%. (Welsh & Farrington 2008)',
  youth: 'Youth & community programs produce long-term reductions in offending. (Farrington 2006)',
  place: 'Place management & business compliance—vacant-lot greening, lighting, enforcement—reduces violence by 10–30%. (Branas et al. 2018; Livingston 2011)'
};

// Add hover tooltips
for (let id in tooltips) {
  const el = document.getElementById(id);
  if (el) el.title = tooltips[id];
}

// ========== CSV PARSING (LEARCAT) ==========
document.getElementById('learcatUpload').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('learnote').innerText = `Parsing ${file.name}...`;

  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: function (results) {
      const rows = results.data;
      if (rows.length < 1) return;
      const keys = Object.keys(rows[0]);
      const offenseField = keys.find(k => /offense/i.test(k));
      const countField = keys.find(k => /count|actual/i.test(k));
      if (!offenseField || !countField) {
        document.getElementById('learnote').innerText = 'Format not recognized.';
        return;
      }
      const totals = { violent: 0, property: 0, fraud: 0, disorder: 0 };
      rows.forEach(r => {
        const name = (r[offenseField] || '').toLowerCase();
        const c = parseInt(r[countField]) || 0;
        if (name.includes('assault') || name.includes('homicide') || name.includes('robbery')) totals.violent += c;
        else if (name.includes('burglary') || name.includes('theft')) totals.property += c;
        else if (name.includes('fraud') || name.includes('forgery')) totals.fraud += c;
        else totals.disorder += c;
      });
      Object.assign(baseData, totals);
      document.getElementById('learnote').innerText =
        `Baselines updated from ${file.name}.`;
      updateChart();
    }
  });
});

// ========== GENERATE PROPOSAL ==========
document.getElementById('generateBtn').addEventListener('click', () => {
  const impacts = getImpactScores();
  const proposal = `
RPD Strategic Interventions Tool — Proposal

1. Additional Officers: ${document.getElementById('staffing').value}
2. Additional CSOs: ${document.getElementById('cso').value}
3. Technology Investment: ${document.getElementById('tech').value}%
4. Street Lighting Improvement: ${document.getElementById('lighting').value}%
5. Youth & Community Programs: ${document.getElementById('youth').value}%
6. Place Management & Business Compliance: ${document.getElementById('place').value}%

Projected annual incidents:
  • Violent Crime: ${impacts.violent.toFixed(0)}
  • Property Crime: ${impacts.property.toFixed(0)}
  • Fraud & Financial Crime: ${impacts.fraud.toFixed(0)}
  • Disorder / Quality of Life: ${impacts.disorder.toFixed(0)}

${document.getElementById('cost-estimate').innerText}

Evidence Summary:
- Branas CC et al., PNAS (2018): Vacant-lot greening RCT → −29% gun assaults.
- Welsh BC & Farrington DP (2008): Lighting meta-analysis → −14–26% crime.
- Braga AA & Weisburd DL (2010): Hot-spots policing meta-analysis → significant reductions in violent/property crime.
- Livingston M (2011): Alcohol outlet density associated with violence; compliance enforcement reduces harm.
- Farrington DP (2006): Youth mentoring/community programs show durable crime prevention effects.

Source: 2023–2024 LEARCAT / NIBRS estimates, Olmsted County MN.
`;
  alert(proposal);
});

// ========== INIT ==========
document.querySelectorAll('input[type="range"]').forEach(sl => sl.addEventListener('input', updateChart));
updateChart();
