// Rochester Safe Communities Simulator - professional edition
// Loads sample_data.json, wires sliders, computes impacts, updates charts, generates PDF

// Globals and DOM
const DOM = {
  hot_spot_patrol: document.getElementById('hot_spot_patrol'),
  focused_deterrence: document.getElementById('focused_deterrence'),
  pop_projects: document.getElementById('pop_projects'),
  procedural_training: document.getElementById('procedural_training'),
  street_lighting: document.getElementById('street_lighting'),
  vacant_lot_greening: document.getElementById('vacant_lot_greening'),
  liquor_store_reduction: document.getElementById('liquor_store_reduction'),
  food_store_delta: document.getElementById('food_store_delta'),
  staffing: document.getElementById('staffing'),
  csos: document.getElementById('csos'),
  // value labels
  hot_spot_patrol_val: document.getElementById('hot_spot_patrol_val'),
  focused_deterrence_val: document.getElementById('focused_deterrence_val'),
  pop_projects_val: document.getElementById('pop_projects_val'),
  procedural_training_val: document.getElementById('procedural_training_val'),
  street_lighting_val: document.getElementById('street_lighting_val'),
  vacant_lot_greening_val: document.getElementById('vacant_lot_greening_val'),
  liquor_store_reduction_val: document.getElementById('liquor_store_reduction_val'),
  food_store_delta_val: document.getElementById('food_store_delta_val'),
  staffing_val: document.getElementById('staffing_val'),
  csos_val: document.getElementById('csos_val'),
  // KPIs
  violentChange: document.getElementById('violentChange'),
  propertyChange: document.getElementById('propertyChange'),
  crimesPrevented: document.getElementById('crimesPrevented'),
  estimatedCost: document.getElementById('estimatedCost'),
  baselinePop: document.getElementById('baselinePop'),
  baselineViolent: document.getElementById('baselineViolent'),
  baselineProperty: document.getElementById('baselineProperty'),
  scenarioSummary: document.getElementById('scenarioSummary'),
  implementBtn: document.getElementById('implementBtn'),
  resetBtn: document.getElementById('resetBtn'),
  downloadJson: document.getElementById('downloadJson'),
  yearEl: document.getElementById('year')
};

DOM.yearEl.innerText = new Date().getFullYear();

// Load sample data
let baseline = {
  population: 120000,
  violent: 1200,
  property: 4000,
  disorder: 2200
};

fetch('sample_data.json')
  .then(r => r.json())
  .then(j => {
    if (j && j.baseline) {
      baseline.population = j.metadata?.population || baseline.population;
      baseline.violent = j.baseline.violent_incidents_per_year || baseline.violent;
      baseline.property = j.baseline.property_incidents_per_year || baseline.property;
      baseline.disorder = j.baseline.disorder_calls_per_year || baseline.disorder;
    }
    renderBaselines();
    computeAndRender();
  }).catch(err => {
    console.warn('Could not load sample_data.json, using embedded defaults.', err);
    renderBaselines();
    computeAndRender();
  });

function renderBaselines() {
  DOM.baselinePop.innerText = baseline.population.toLocaleString();
  DOM.baselineViolent.innerText = baseline.violent.toLocaleString();
  DOM.baselineProperty.innerText = baseline.property.toLocaleString();
}

// Wire slider display values
function updateSliderLabels() {
  DOM.hot_spot_patrol_val.innerText = DOM.hot_spot_patrol.value + '%';
  DOM.focused_deterrence_val.innerText = DOM.focused_deterrence.value + '%';
  DOM.pop_projects_val.innerText = DOM.pop_projects.value;
  DOM.procedural_training_val.innerText = DOM.procedural_training.value + '%';
  DOM.street_lighting_val.innerText = DOM.street_lighting.value + '%';
  DOM.vacant_lot_greening_val.innerText = DOM.vacant_lot_greening.value + '%';
  DOM.liquor_store_reduction_val.innerText = DOM.liquor_store_reduction.value + '%';
  DOM.food_store_delta_val.innerText = DOM.food_store_delta.value + '%';
  DOM.staffing_val.innerText = DOM.staffing.value;
  DOM.csos_val.innerText = DOM.csos.value + '%';
}

// Attach input listeners
[
  'hot_spot_patrol','focused_deterrence','pop_projects','procedural_training',
  'street_lighting','vacant_lot_greening','liquor_store_reduction','food_store_delta',
  'staffing','csos'
].forEach(id => {
  const el = DOM[id];
  el.addEventListener('input', () => { updateSliderLabels(); computeAndRender(); });
});

// Reset
DOM.resetBtn.addEventListener('click', () => {
  DOM.hot_spot_patrol.value = 100;
  DOM.focused_deterrence.value = 0;
  DOM.pop_projects.value = 0;
  DOM.procedural_training.value = 0;
  DOM.street_lighting.value = 0;
  DOM.vacant_lot_greening.value = 0;
  DOM.liquor_store_reduction.value = 0;
  DOM.food_store_delta.value = 0;
  DOM.staffing.value = 150;
  DOM.csos.value = 100;
  updateSliderLabels();
  computeAndRender();
});

// Basic impact model (transparent & tunable)
// These multipliers are intentionally conservative and literature-informed directionally.
// Replace/tune with calibrated, local effect sizes for higher fidelity.
function estimateImpacts(inputs) {
  // inputs are numbers
  // Hot-spot patrol: per +10% -> small local reductions on incidents (scaled)
  const hs_effect = -0.002 * (inputs.hot_spot_patrol - 100); // per 1% change
  // Focused deterrence: stronger effect on violent crime proportionally to coverage
  const fd_violent = -0.15 * (inputs.focused_deterrence / 100.0);
  // Procedural training: modest indirect benefit
  const pj = -0.05 * (inputs.procedural_training / 100.0);
  // Street lighting: property-focused
  const sl_prop = -0.10 * (inputs.street_lighting / 100.0);
  // Greening and environment
  const green_prop = -0.02 * (inputs.vacant_lot_greening / 100.0);
  const food_effect = -0.01 * (inputs.food_store_delta / 10.0); // small effect
  const liquor_effect = -0.03 * (inputs.liquor_store_reduction / 10.0);
  // CSOs and POP projects
  const pop_effect = -0.03 * inputs.pop_projects; // per project
  const csos_effect = -0.001 * (inputs.csos - 100); // small scaling above baseline

  // Staffing marginal effect (benefit when above baseline 150 FTE)
  const staffing_effect = -0.005 * Math.max(0, inputs.staffing - 150);

  // Aggregate percent changes (clamp)
  let violent_pct = (hs_effect + fd_violent + pj + pop_effect + staffing_effect + csos_effect) * 100;
  let property_pct = (hs_effect + sl_prop + pj + green_prop + food_effect + liquor_effect + pop_effect + staffing_effect) * 100;

  violent_pct = Math.max(-80, Math.min(80, violent_pct));
  property_pct = Math.max(-80, Math.min(80, property_pct));

  // Crimes prevented (annual)
  const preventedViolent = baseline.violent * (-violent_pct / 100.0);
  const preventedProperty = baseline.property * (-property_pct / 100.0);
  const totalPrevented = Math.max(0, Math.round(preventedViolent + preventedProperty));

  // Cost model (estimates)
  let cost = 0;
  cost += (inputs.procedural_training / 100.0) * 150000; // training program
  cost += (inputs.street_lighting / 100.0) * 250000; // lighting rollout
  cost += (inputs.vacant_lot_greening / 100.0) * 120000; // greening program
  cost += (inputs.liquor_store_reduction / 10.0) * 50000; // admin/partnership
  cost += Math.max(0, inputs.staffing - 150) * 90000; // per FTE annual cost

  return {
    violent_pct,
    property_pct,
    crimes_prevented: totalPrevented,
    estimated_cost: Math.round(cost),
    prevented_violent: Math.round(preventedViolent),
    prevented_property: Math.round(preventedProperty)
  };
}

// Chart initialization (5-year projection)
const ctx = document.getElementById('projectionChart').getContext('2d');
const projectionChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Year 0', 'Year 1', 'Year 2', 'Year 3', 'Year 4'],
    datasets: [
      { label: 'Violent incidents', data: [], borderColor: '#D97600', backgroundColor: 'rgba(217,150,40,0.06)', tension: 0.3, fill:true, pointRadius:3 },
      { label: 'Property incidents', data: [], borderColor: '#0B3D91', backgroundColor: 'rgba(11,61,145,0.06)', tension: 0.3, fill:true, pointRadius:3 }
    ]
  },
  options: {
    responsive:true,
    maintainAspectRatio:false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true } }
  }
});

function computeAndRender() {
  // collect inputs
  const inputs = {
    hot_spot_patrol: Number(DOM.hot_spot_patrol.value),
    focused_deterrence: Number(DOM.focused_deterrence.value),
    pop_projects: Number(DOM.pop_projects.value),
    procedural_training: Number(DOM.procedural_training.value),
    street_lighting: Number(DOM.street_lighting.value),
    vacant_lot_greening: Number(DOM.vacant_lot_greening.value),
    liquor_store_reduction: Number(DOM.liquor_store_reduction.value),
    food_store_delta: Number(DOM.food_store_delta.value),
    staffing: Number(DOM.staffing.value),
    csos: Number(DOM.csos.value)
  };

  const results = estimateImpacts(inputs);

  // KPIs
  DOM.violentChange.innerText = `${results.violent_pct.toFixed(1)}%`;
  DOM.propertyChange.innerText = `${results.property_pct.toFixed(1)}%`;
  DOM.crimesPrevented.innerText = results.crimes_prevented.toLocaleString();
  DOM.estimatedCost.innerText = `$${results.estimated_cost.toLocaleString()}`;

  // Projection logic: ramp effect over 2 years then stable
  const vio = [];
  const prop = [];
  for (let year=0; year<5; year++) {
    const ramp = Math.min(1, (year+1)/2);
    const vPct = results.violent_pct/100 * ramp;
    const pPct = results.property_pct/100 * ramp;
    const projV = Math.round(baseline.violent * (1 + vPct));
    const projP = Math.round(baseline.property * (1 + pPct));
    vio.push(projV);
    prop.push(projP);
  }
  projectionChart.data.datasets[0].data = vio;
  projectionChart.data.datasets[1].data = prop;
  projectionChart.update();

  // Scenario summary
  DOM.scenarioSummary.innerText = `Hot-spot patrol: ${inputs.hot_spot_patrol}% • Focused deterrence: ${inputs.focused_deterrence}% • Proc. training: ${inputs.procedural_training}% • Lighting: ${inputs.street_lighting}% • Greening: ${inputs.vacant_lot_greening}% • Staffing: ${inputs.staffing} FTE.`;

  // update slider labels
  updateSliderLabels();
}

// JSON download of scenario
DOM.downloadJson.addEventListener('click', () => {
  const scenario = {
    baseline,
    inputs: {
      hot_spot_patrol: DOM.hot_spot_patrol.value,
      focused_deterrence: DOM.focused_deterrence.value,
      pop_projects: DOM.pop_projects.value,
      procedural_training: DOM.procedural_training.value,
      street_lighting: DOM.street_lighting.value,
      vacant_lot_greening: DOM.vacant_lot_greening.value,
      liquor_store_reduction: DOM.liquor_store_reduction.value,
      food_store_delta: DOM.food_store_delta.value,
      staffing: DOM.staffing.value,
      csos: DOM.csos.value
    }
  };
  const blob = new Blob([JSON.stringify(scenario, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'scenario_rochester.json'; a.click();
  URL.revokeObjectURL(url);
});

// PDF generation (jsPDF)
DOM.implementBtn.addEventListener('click', () => {
  const inputs = {
    hot_spot_patrol: DOM.hot_spot_patrol.value,
    focused_deterrence: DOM.focused_deterrence.value,
    pop_projects: DOM.pop_projects.value,
    procedural_training: DOM.procedural_training.value,
    street_lighting: DOM.street_lighting.value,
    vacant_lot_greening: DOM.vacant_lot_greening.value,
    liquor_store_reduction: DOM.liquor_store_reduction.value,
    food_store_delta: DOM.food_store_delta.value,
    staffing: DOM.staffing.value,
    csos: DOM.csos.value
  };
  const results = estimateImpacts(inputs);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({unit:'pt', format:'letter'});
  let y = 48;

  // Header
  doc.setFontSize(18); doc.setTextColor(11,61,145); doc.setFont('helvetica','bold');
  doc.text('Implementation Proposal — Rochester Safe Communities', 40, y);
  y += 26;

  // Exec summary
  doc.setFontSize(11); doc.setTextColor(0,0,0); doc.setFont('helvetica','normal');
  doc.text('Executive summary:', 40, y); y += 16;
  const summary = `This proposal presents a package of research-informed interventions for Rochester, MN. Scenario inputs: Hot-spot patrol ${inputs.hot_spot_patrol}%, Focused deterrence ${inputs.focused_deterrence}%, Procedural training ${inputs.procedural_training}%, Street lighting ${inputs.street_lighting}%, Vacant greening ${inputs.vacant_lot_greening}%, Liquor reduction ${inputs.liquor_store_reduction}%, Food access ${inputs.food_store_delta}%, Staffing ${inputs.staffing} FTE.`;
  y = writeWrapped(doc, summary, 40, y, 520, 14);

  // KPIs
  doc.setFont('helvetica','bold');
  doc.text(`Projected violent crime change: ${results.violent_pct.toFixed(1)}%`, 40, y); y += 16;
  doc.text(`Projected property crime change: ${results.property_pct.toFixed(1)}%`, 40, y); y += 16;
  doc.text(`Estimated crimes prevented / yr: ${results.crimes_prevented.toLocaleString()}`, 40, y); y += 16;
  doc.text(`Estimated annual cost: $${results.estimated_cost.toLocaleString()}`, 40, y); y += 24;

  // Timeline
  doc.setFont('helvetica','normal'); doc.text('Timeline (high-level):', 40, y); y += 14;
  const timeline = [
    'Months 0-3: Planning, procurement, stakeholder engagement, baseline data collection.',
    'Months 4-12: Pilot implementation in 3-5 hotspots; lighting & greening projects; focused deterrence call-ins.',
    'Months 12-24: Scale-up and formal evaluation with pre-registered design.'
  ];
  timeline.forEach(t => { y = writeWrapped(doc, '- ' + t, 60, y, 500, 12); y += 6; });

  // Budget page
  doc.addPage(); y = 48;
  doc.setFont('helvetica','bold'); doc.text('Budget Estimate', 40, y); y += 20;
  doc.setFont('helvetica','normal');
  const budgetRows = [
    ['Procedural justice training', `$${Math.round((inputs.procedural_training/100.0)*150000).toLocaleString()}`],
    ['Street lighting rollout (estimate)', `$${Math.round((inputs.street_lighting/100.0)*250000).toLocaleString()}`],
    ['Vacant lot greening (pilot)', `$${Math.round((inputs.vacant_lot_greening/100.0)*120000).toLocaleString()}`],
    ['Liquor outlet reduction admin', `$${Math.round((inputs.liquor_store_reduction/10.0)*50000).toLocaleString()}`],
    ['Additional staffing annual payroll', `$${Math.max(0, inputs.staffing-150)*90000 .toLocaleString()}`],
    ['Total (estimate)', `$${results.estimated_cost.toLocaleString()}`]
  ];
  let by = y;
  budgetRows.forEach(r => { doc.text(r[0], 60, by); doc.text(r[1], 420, by); by += 18; });

  // Citations
  doc.addPage(); y = 48; doc.setFont('helvetica','bold'); doc.text('Key Evidence & Citations', 40, y); y += 18;
  doc.setFont('helvetica','normal');
  const cites = [
    'Braga, A.A., Papachristos, A.V., & Hureau, D.M. (2019). Hot spots policing meta-analysis.',
    'Braga & Weisburd (2012). Focused deterrence review.',
    'Welsh & Farrington (2008). Street lighting systematic review.',
    'Branas et al. (2018). Vacant lot greening randomized trial.'
  ];
  cites.forEach(c => { y = writeWrapped(doc, '- ' + c, 60, y, 500, 12); y += 6; });

  doc.save('Rochester_Implementation_Proposal.pdf');
});

// small helpers
function writeWrapped(doc, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = doc.getTextWidth ? doc.getTextWidth(testLine) : testLine.length * 6;
    if (testWidth > maxWidth && n > 0) {
      doc.text(line.trim(), x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) { doc.text(line.trim(), x, y); y += lineHeight; }
  return y;
}

// initialize UI
updateSliderLabels();
computeAndRender();
