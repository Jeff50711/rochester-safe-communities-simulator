// Base crime data
let baseData = { violent: 980, property: 2263, fraud: 450, disorder: 900 };
const sliders = document.querySelectorAll('input[type="range"]');

// Calculate projected impact
function getImpactScores(){
  const v = Object.fromEntries([...sliders].map(s => [s.id, +s.value]));
  const addedOfficers = v.staffing || 0;
  const addedCSOs = v.cso || 0;

  let violent_frac = -0.008*addedOfficers -0.10*(v.tech/100) -0.20*(v.youth/100) -0.03*(v.lighting/100) +0.10*(v.liquor/100);
  let property_frac = -0.004*addedOfficers -0.002*addedCSOs -0.05*(v.tech/100) -0.20*(v.lighting/100) +0.05*(v.liquor/100);
  let fraud_frac = -0.002*addedOfficers -0.03*(v.tech/100) -0.10*(v.youth/100);
  let disorder_frac = -0.01*addedCSOs -0.10*(v.youth/100) -0.10*(v.lighting/100);

  function clamp(x){ return Math.max(-0.8, Math.min(0.8, x)); }
  violent_frac = clamp(violent_frac); property_frac = clamp(property_frac);
  fraud_frac = clamp(fraud_frac); disorder_frac = clamp(disorder_frac);

  return { 
    violent: Math.round(baseData.violent*(1+violent_frac)), 
    property: Math.round(baseData.property*(1+property_frac)), 
    fraud: Math.round(baseData.fraud*(1+fraud_frac)), 
    disorder: Math.round(baseData.disorder*(1+disorder_frac)),
    violent_frac, property_frac, fraud_frac, disorder_frac
  };
}

// Chart setup
const ctx = document.getElementById('impactChart').getContext('2d');
let chart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Violent Crimes','Property Crimes','Fraud & Financial','Other/Disorder'],
    datasets: [{
      label: 'Projected Incidents per Year',
      data: [baseData.violent, baseData.property, baseData.fraud, baseData.disorder],
      backgroundColor: ['#0b2340','#ffd700','#7a99c0','#9b59b6']
    }]
  },
  options:{
    responsive:true,
    maintainAspectRatio:false,
    animation:{duration:400},
    plugins:{
      tooltip:{
        callbacks:{
          label: function(context){
            const key = context.dataIndex===0?'violent':context.dataIndex===1?'property':context.dataIndex===2?'fraud':'disorder';
            const proj = context.raw;
            const reduction = ((baseData[key]-proj)/baseData[key]*100).toFixed(1);
            return `${context.label}: ${proj} (-${reduction}%)`;
          }
        }
      }
    },
    scales:{y:{beginAtZero:true}}
  }
});

function getBarColors(impacts){
  const keys = ['violent','property','fraud','disorder'];
  return keys.map(k=>{
    const reduction = 1 - impacts[k]/baseData[k];
    if(reduction>=0.30) return '#00c853';
    if(reduction>=0.10) return '#ffd600';
    return '#ff3d00';
  });
}

// Update chart & cost
function updateChart(){
  const impacts = getImpactScores();
  chart.data.datasets[0].data = [impacts.violent, impacts.property, impacts.fraud, impacts.disorder];
  chart.data.datasets[0].backgroundColor = getBarColors(impacts);
  chart.update();

  const staffingCost = (document.getElementById('staffing').value*150000 + document.getElementById('cso').value*100000).toLocaleString();
  document.getElementById('cost-estimate').innerText = `Estimated Additional Staffing Cost: $${staffingCost}`;
}

sliders.forEach(s=>s.addEventListener('input', updateChart));
updateChart();

// CSV Upload parsing (optional)
const MAPPING = {
  violent: ['homicide','murder','rape','sexual','robbery','assault','kidnap','abduct','human trafficking'],
  fraud: ['fraud','credit card','atm','identity','impersonation','wire fraud','computer','embezzlement','forgery','counterfeit','extortion'],
  property: ['burglary','larceny','theft','motor vehicle theft','vehicle theft','arson','stolen property','shoplifting'],
  other: []
};

function norm(s){ return (s||'').toString().toLowerCase(); }
function aggregateLEARCAT(rows){
  const keys = rows.length ? Object.keys(rows[0]) : [];
  const offenseFields = keys.filter(k => /offense|offense_name|offense_type/i.test(k));
  const countFields = keys.filter(k => /actual|count|incidents|numb/i.test(k));
  if(offenseFields.length===0||countFields.length===0){console.warn('CSV format not recognized');return null;}
  const offenseKey = offenseFields[0]; const countKey = countFields[0];
  const totals = {violent:0, property:0, fraud:0, other:0};
  rows.forEach(r=>{
    const name=norm(r[offenseKey]);
    const count = r[countKey]?parseInt(r[countKey].toString().replace(/[, ]/g,''))||0:0;
    let matched=false;
    for(const category of ['violent','fraud','property']){
      for(const pat of MAPPING[category]){
        if(name.indexOf(pat)!==-1){totals[category]+=count;matched=true;break;}
      }
      if(matched) break;
    }
    if(!matched) totals.other+=count;
  });
  return totals;
}

document.getElementById('learcatUpload').addEventListener('change', function(e){
  const file = e.target.files[0];
  if(!file) return;
  document.getElementById('learnote').innerText = `Parsing ${file.name}...`;
  Papa.parse(file,{header:true,skipEmptyLines:true,
    complete:function(results){
      const rows=results.data; const totals=aggregateLEARCAT(rows);
      if(!totals){document.getElementById('learnote').innerText='CSV parse succeeded but format not recognized.';return;}
      baseData.violent=totals.violent||baseData.violent;
      baseData.property=totals.property||baseData.property;
      baseData.fraud=totals.fraud||baseData.fraud;
      baseData.disorder=totals.other||baseData.disorder;
      document.getElementById('learnote').innerText=`Baselines seeded from ${file.name}. Violent:${baseData.violent}, Property:${baseData.property}, Fraud:${baseData.fraud}, Other:${baseData.disorder}.`;
      updateChart();
    },
    error:function(err){document.getElementById('learnote').innerText='CSV parse error';console.error(err);}
  });
});

// Generate Proposal
document.getElementById('generateBtn').addEventListener('click', ()=>{
  const impacts = getImpactScores();
  const proposalText = `
Proposal: RPD Strategic Interventions Tool

1. Additional Officers: ${document.getElementById('staffing').value}
2. Additional CSOs: ${document.getElementById('cso').value}
3. Tech Investment: ${document.getElementById('tech').value}%
4. Street Lighting: ${document.getElementById('lighting').value}%
5. Youth Programs: ${document.getElementById('youth').value}%
6. Reduce Liquor Outlets: ${document.getElementById('liquor').value}%

Projected incidents per year:
Violent Crimes: ${impacts.violent}
Property Crimes: ${impacts.property}
Fraud & Financial: ${impacts.fraud}
Other/Disorder: ${impacts.disorder}

${document.getElementById('cost-estimate').innerText}

Source: 2023 LEARCAT estimates, Olmsted County, MN
`;
  alert(proposalText);
});
