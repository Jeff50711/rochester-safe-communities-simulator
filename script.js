let baseData = { violent: 980, property: 2263, fraud: 450, disorder: 900 };
const sliders = document.querySelectorAll('input[type="range"]');

function getImpactScores(){
  const v = Object.fromEntries([...sliders].map(s => [s.id, +s.value]));
  const addedOfficers = v.staffing || 0;
  const addedCSOs = v.cso || 0;

  let violent_frac   = -0.008*addedOfficers -0.10*(v.tech/100) -0.20*(v.youth/100) -0.03*(v.lighting/100) -0.10*(v.liquor/100);
  let property_frac  = -0.004*addedOfficers -0.002*addedCSOs -0.05*(v.tech/100) -0.20*(v.lighting/100) -0.05*(v.liquor/100);
  let fraud_frac     = -0.002*addedOfficers -0.03*(v.tech/100) -0.10*(v.youth/100);
  let disorder_frac  = -0.01*addedCSOs -0.10*(v.youth/100) -0.10*(v.lighting/100);

  function clamp(x){ return Math.max(-0.8, Math.min(0.8, x)); }
  violent_frac   = clamp(violent_frac);
  property_frac  = clamp(property_frac);
  fraud_frac     = clamp(fraud_frac);
  disorder_frac  = clamp(disorder_frac);

  return { 
    violent: Math.round(baseData.violent*(1+violent_frac)), 
    property: Math.round(baseData.property*(1+property_frac)), 
    fraud: Math.round(baseData.fraud*(1+fraud_frac)), 
    disorder: Math.round(baseData.disorder*(1+disorder_frac)),
    violent_frac, property_frac, fraud_frac, disorder_frac
  };
}

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
            const key = ['violent','property','fraud','disorder'][context.dataIndex];
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

function updateChart(){
  const impacts = getImpactScores();
  chart.data.datasets[0].data = [impacts.violent, impacts.property, impacts.fraud, impacts.disorder];
  chart.data.datasets[0].backgroundColor = getBarColors(impacts);
  chart.update();

  const staffingCost = (document.getElementById('staffing').value*150000 + document.getElementById('cso').value*100000).toLocaleString();
  document.getElement
