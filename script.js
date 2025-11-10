// === script.js for RPD Strategic Interventions Tool ===

// Baseline (you can override by uploading LEARCAT CSV)
let baseline = {
  violent: 425,
  property: 1620,
  fraud: 290,
  disorder: 720
};

// --- Chart setup (two datasets: baseline and projected) ---
const ctx = document.getElementById('crimeChart').getContext('2d');

const crimeChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Violent', 'Property', 'Fraud/Financial', 'Disorder'],
    datasets: [
      {
        label: 'Baseline',
        data: [baseline.violent, baseline.property, baseline.fraud, baseline.disorder],
        backgroundColor: ['#0a3a6c','#0a3a6c','#0a3a6c','#0a3a6c'],
        borderRadius: 6
      },
      {
        label: 'Projected',
        data: [baseline.violent, baseline.property, baseline.fraud, baseline.disorder],
        backgroundColor: ['#f3c614','#f3c614','#f3c614','#f3c614'],
        borderColor: ['#b07f0c','#b07f0c','#b07f0c','#b07f0c'],
        borderWidth: 0,
        borderRadius: 6
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 700,
      easing: 'easeOutQuart'
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const val = context.parsed.y !== undefined ? context.parsed.y : context.raw;
            const idx = context.dataIndex;
            const key = ['violent','property','fraud','disorder'][idx];
            const reduction = ((baseline[key] - val) / baseline[key]) * 100;
            return `${label}: ${Math.round(val)} incidents — ${isFinite(reduction) ? reduction.toFixed(1) + '%' : '0.0%' } change`;
          }
        }
      }
    },
    onHover: (evt, activeEls) => {
      const canvas = evt.chart.canvas;
      canvas.style.cursor = activeEls.length ? 'pointer' : 'default';
    },
    scales: { y: { beginAtZero: true } }
  }
});

// --- DOM references ---
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
const learnote = document.getElementById('learnote');
const generateBtn = document.getElementById('generateBtn');

// Update displayed label values
function refreshLabels() {
  labels.staffing.textContent = sliders.staffing.value;
  labels.cso.textContent = sliders.cso.value;
  labels.tech.textContent = sliders.tech.value + '%';
  labels.lighting.textContent = sliders.lighting.value + '%';
  labels.youth.textContent = sliders.youth.value + '%';
  labels.place.textContent = sliders.place.value + '%';
}

// === Impact model (research-aligned conservative coefficients) ===
function computeProjected() {
  const s = parseInt(sliders.staffing.value);
  const c = parseInt(sliders.cso.value);
  const t = parseInt(sliders.tech.value);
  const L = parseInt(sliders.lighting.value);
  const y = parseInt(sliders.youth.value);
  const p = parseInt(sliders.place.value);

  // Fractions derived from research-informed conservative estimates:
  // Note: these are multiplicative reductions modeled linearly for UI clarity
  const violentFactor = 1 -
    (0.01 * s + 0.008 * c + 0.0015 * t + 0.0025 * L + 0.0035 * y + 0.0018 * p);
  const propertyFactor = 1 -
    (0.008 * s + 0.006 * c + 0.0012 * t + 0.002 * L + 0.002 * y + 0.0012 * p);
  const fraudFactor = 1 -
    (0.002 * s + 0.0025 * t + 0.001 * y);
  const disorderFactor = 1 -
    (0.002 * s + 0.004 * c + 0.002 * L + 0.0035 * y + 0.0014 * p);

  // prevent negative
  return {
    violent: Math.max(0, Math.round(baseline.violent * violentFactor)),
    property: Math.max(0, Math.round(baseline.property * propertyFactor)),
    fraud: Math.max(0, Math.round(baseline.fraud * fraudFactor)),
    disorder: Math.max(0, Math.round(baseline.disorder * disorderFactor))
  };
}

// Update the chart with fade-in and highlight
function updateDashboard() {
  refreshLabels();
  const proj = computeProjected();

  // update values & animate
  crimeChart.data.datasets[1].data = [proj.violent, proj.property, proj.fraud, proj.disorder];

  // dynamic coloring: green if big improvement, gold if moderate, red if small/no improvement
  const improvements = [
    (baseline.violent - proj.violent) / baseline.violent,
    (baseline.property - proj.property) / baseline.property,
    (baseline.fraud - proj.fraud) / baseline.fraud,
    (baseline.disorder - proj.disorder) / baseline.disorder
  ];

  crimeChart.data.datasets[1].backgroundColor = improvements.map(r =>
    r >= 0.25 ? '#2ECC71' : r >= 0.10 ? '#F1C40F' : '#E74C3C'
  );

  crimeChart.update();

  // cost: $150k per officer, $100k per CSO (display)
  const cost = (parseInt(sliders.staffing.value) * 150000) + (parseInt(sliders.cso.value) * 100000);
  costNode.textContent = `Estimated Additional Staffing Cost: $${cost.toLocaleString()}`;

  // projected reduction summary (overall weighted by baseline counts)
  const totalBaseline = baseline.violent + baseline.property + baseline.fraud + baseline.disorder;
  const totalProjected = proj.violent + proj.property + proj.fraud + proj.disorder;
  const overallReduction = ((totalBaseline - totalProjected) / totalBaseline) * 100;
  document.getElementById('proj-reduction').textContent = `${overallReduction.toFixed(1)}%`;
}

// ---------------------------------
// CSV upload parsing (LEARCAT)
// ---------------------------------
document.getElementById('learcatUpload').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  learnote.textContent = `Parsing ${file.name}...`;
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      const rows = results.data;
      if (!rows || rows.length === 0) {
        learnote.textContent = 'No rows found in CSV.';
        return;
      }
      // detect likely columns
      const keys = Object.keys(rows[0]);
      const offenderField = keys.find(k => /offense|offense_name|offense_type/i.test(k));
      const countField = keys.find(k => /actual|count|incidents|numb/i.test(k));
      if (!offenderField || !countField) {
        learnote.textContent = 'CSV format not recognized; needs offense + count columns.';
        return;
      }

      // Aggregate to our categories
      const totals = { violent: 0, property: 0, fraud: 0, disorder: 0 };
      rows.forEach(r => {
        const offense = (r[offenderField] || '').toLowerCase();
        const c = parseInt(r[countField]) || 0;
        if (/assault|homicide|robbery|rape|sexual/i.test(offense)) totals.violent += c;
        else if (/burglary|larceny|theft|motor vehicle theft|arson|stolen/i.test(offense)) totals.property += c;
        else if (/fraud|forgery|counterfeit|identity|credit card/i.test(offense)) totals.fraud += c;
        else totals.disorder += c;
      });

      // override baseline (and update UI)
      baseline = totals;
      learnote.textContent = `Baselines updated from ${file.name}.`;
      // refresh baseline dataset and recalc
      crimeChart.data.datasets[0].data = [baseline.violent, baseline.property, baseline.fraud, baseline.disorder];
      updateDashboard();
    },
    error: function(err) {
      learnote.textContent = 'CSV parse error. See console.';
      console.error(err);
    }
  });
});

// ---------------------------------
// Hover highlight: Chart.js built-in hover will highlight; add border on active elements
// ---------------------------------
ctx.canvas.addEventListener('mousemove', function(event) {
  const points = crimeChart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
  // reset all border widths first
  crimeChart.data.datasets[1].borderWidth = crimeChart.data.datasets[1].borderWidth || [0,0,0,0];
  if (points.length) {
    const idx = points[0].index;
    // set border width array with highlight at idx
    crimeChart.data.datasets[1].borderWidth = [0,0,0,0].map((v,i)=> i===idx ? 3 : 0);
    crimeChart.data.datasets[1].borderColor = [ '#2a4a6f','#2a4a6f','#2a4a6f','#2a4a6f' ];
  } else {
    crimeChart.data.datasets[1].borderWidth = [0,0,0,0];
  }
  crimeChart.update('none'); // light update (no animation)
});

// ---------------------------------
// Generate Proposal (includes short citations)
// ---------------------------------
generateBtn.addEventListener('click', () => {
  const proj = computeProjected();
  const s = sliders.staffing.value, c = sliders.cso.value, t = sliders.tech.value;
  const L = sliders.lighting.value, y = sliders.youth.value, p = sliders.place.value;
  const cost = (parseInt(s) * 150000) + (parseInt(c) * 100000);

  const proposal = [
    'RPD Strategic Interventions Tool — Proposal',
    '',
    `Additional Sworn Officers: ${s}`,
    `Additional CSOs: ${c}`,
    `Technology Investment: ${t}%`,
    `Street Lighting Improvements: ${L}%`,
    `Youth & Community Programs: ${y}%`,
    `Place Management & Business Compliance: ${p}%`,
    '',
    'Projected annual incidents (post-intervention):',
    `• Violent: ${proj.violent}`,
    `• Property: ${proj.property}`,
    `• Fraud/Financial: ${proj.fraud}`,
    `• Disorder: ${proj.disorder}`,
    '',
    `Estimated Additional Staffing Cost: $${cost.toLocaleString()}`,
    '',
    'Evidence summary (key sources):',
    '- Branas CC, et al. (2018). Vacant-lot greening RCT — reductions in violence. PNAS.',
    '- Welsh BC & Farrington DP (2008). Lighting meta-analysis — crime reductions.',
    '- Braga AA & Weisburd DL (2010). Hot-spots policing meta-analysis — targeted policing reduces crime.',
    '- Livingston M (2011). Alcohol outlet density and violence; compliance interventions reduce harm.',
    '- Farrington DP (2006). Youth prevention programs — durable crime reductions.',
    '',
    'Prepared using RPD Strategic Interventions Tool (evidence-informed simulation).'
  ].join('\n');

  // download as text file
  const blob = new Blob([proposal], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'RPD_Interventions_Proposal.txt';
  a.click();
  URL.revokeObjectURL(url);
});

// --- Attach slider listeners + init ---
Object.values(sliders).forEach(s => s.addEventListener('input', updateDashboard));
updateDashboard();
