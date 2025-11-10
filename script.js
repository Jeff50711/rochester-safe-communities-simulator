// Granular baseline data
let baseline = {
  violent: { assault:320, robbery:65, homicide:5, sexual:35 },
  property: { burglary:450, larceny:900, vehicle:250, arson:20 },
  fraud: { credit:150, identity:90, embezzle:50 },
  disorder: { vandalism:400, intoxication:200, disorderly:120 }
};

function getFlattenedLabels(){
  return ['Assault','Robbery','Homicide','Sexual Assault',
          'Burglary','Larceny/Theft','Motor Vehicle Theft','Arson',
          'Credit Card Fraud','Identity Theft','Embezzlement',
          'Vandalism','Public Intoxication','Disorderly Conduct'];
}

function getBaselineData(){
  return [
    baseline.violent.assault, baseline.violent.robbery, baseline.violent.homicide, baseline.violent.sexual,
    baseline.property.burglary, baseline.property.larceny, baseline.property.vehicle, baseline.property.arson,
    baseline.fraud.credit, baseline.fraud.identity, baseline.fraud.embezzle,
    baseline.disorder.vandalism, baseline.disorder.intoxication, baseline.disorder.disorderly
  ];
}

// Chart
const ctx=document.getElementById('crimeChart').getContext('2d');
const crimeChart=new Chart(ctx,{
  type:'bar',
  data:{labels:getFlattenedLabels(),datasets:[
    {label:'Baseline',data:getBaselineData(),backgroundColor:'#0a3a6c',borderRadius:6},
    {label:'Projected',data:getBaselineData(),backgroundColor:'#f3c614',borderRadius:6}
  ]},
  options:{
    responsive:true,
    maintainAspectRatio:false,
    animation:{duration:700,easing:'easeOutQuart'},
    plugins:{tooltip:{callbacks:{label:function(c){return `${c.dataset.label}: ${c.parsed.y}`;}}}},
    scales:{y:{beginAtZero:true}}
  }
});

// Slider refs
const sliders={
  staffing: document.getElementById('staffing'),
  cso: document.getElementById('cso'),
  tech: document.getElementById('tech'),
  lighting: document.getElementById('lighting'),
  youth: document.getElementById('youth'),
  place: document.getElementById('place')
};
const labels={
  staffing: document.getElementById('staffing-value'),
  cso: document.getElementById('cso-value'),
  tech: document.getElementById('tech-value'),
  lighting: document.getElementById('lighting-value'),
  youth: document.getElementById('youth-value'),
  place: document.getElementById('place-value')
};
const costNode=document.getElementById('cost-estimate');
const projNode=document.getElementById('proj-reduction');

function refreshLabels(){
  labels.staffing.textContent=sliders.staffing.value;
  labels.cso.textContent=sliders.cso.value;
  labels.tech.textContent=sliders.tech.value+'%';
  labels.lighting.textContent=sliders.lighting.value+'%';
  labels.youth.textContent=sliders.youth.value+'%';
  labels.place.textContent=sliders.place.value+'%';
}

// Projection model
function computeProjected(){
  const s=parseInt(sliders.staffing.value);
  const c=parseInt(sliders.cso.value);
  const t=parseInt(sliders.tech.value);
  const L=parseInt(sliders.lighting.value);
  const y=parseInt(sliders.youth.value);
  const p=parseInt(sliders.place.value);

  const factor=(base,coeff)=>Math.max(0,Math.round(base*(1-coeff)));

  return {
    violent:{
      assault:factor(baseline.violent.assault,0.01*s+0.002*L+0.003*y),
      robbery:factor(baseline.violent.robbery,0.012*s+0.002*L+0.003*y),
      homicide:factor(baseline.violent.homicide,0.008*s+0.001*L+0.002*y),
      sexual:factor(baseline.violent.sexual,0.01*s+0.002*L+0.003*y)
    },
    property:{
      burglary:factor(baseline.property.burglary,0.008*s+0.002*L+0.002*p),
      larceny:factor(baseline.property.larceny,0.006*s+0.0015*L+0.002*p),
      vehicle:factor(baseline.property.vehicle,0.005*s+0.001*L+0.002*p),
      arson:factor(baseline.property.arson,0.004*s+0.001*L+0.001*p)
    },
    fraud:{
      credit:factor(baseline.fraud.credit,0.002*t+0.001*y),
      identity:factor(baseline.fraud.identity,0.002*t+0.001*y),
      embezzle:factor(baseline.fraud.embezzle,0.002*t)
    },
    disorder:{
      vandalism:factor(baseline.disorder.vandalism,0.004*c+0.003*y),
      intoxication:factor(baseline.disorder.intoxication,0.004*c+0.003*y),
      disorderly:factor(baseline.disorder.disorderly,0.003*c+0.002*y)
    }
  };
}

function updateDashboard(){
  refreshLabels();
  const proj=computeProjected();
  const projData=[
    proj.violent.assault, proj.violent.robbery, proj.violent.homicide, proj.violent.sexual,
    proj.property.burglary, proj.property.larceny, proj.property.vehicle, proj.property.arson,
    proj.fraud.credit, proj.fraud.identity, proj.fraud.embezzle,
    proj.disorder.vandalism, proj.disorder.intoxication, proj.disorder.disorderly
  ];
  const baselineData=getBaselineData();
  const colors=projData.map((v,i)=>{
    const red=(baselineData[i]-v)/baselineData[i];
    return red>=0.25?'#2ECC71':red>=0.10?'#F1C40F':'#E74C3C';
  });
  crimeChart.data.datasets[1].data=projData;
  crimeChart.data.datasets[1].backgroundColor=colors;
  crimeChart.update();

  const cost=parseInt(sliders.staffing.value)*150000+parseInt(sliders.cso.value)*100000;
  costNode.textContent=`$${cost.toLocaleString()}`;
  const totalBase=baselineData.reduce((a,b)=>a+b,0);
  const totalProj=projData.reduce((a,b)=>a+b,0);
  projNode.textContent=`${((totalBase-totalProj)/totalBase*100).toFixed(1)}%`;
}

// PDF export
document.getElementById('generatePDFBtn').addEventListener('click',async()=>{
  const { jsPDF }=window.jspdf;
  const doc=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
  const margin=40; let y=margin;
  doc.setFontSize(18); doc.setTextColor('#0a3a6c');
  doc.text('RPD Strategic Interventions Tool — Proposal',margin,y); y+=25;
  doc.setFontSize(11); doc.setTextColor('#22314a');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`,margin,y); y+=20;

  const proj=computeProjected();
  const s=sliders.staffing.value, c=sliders.cso.value, t=sliders.tech.value;
  const L=sliders.lighting.value, yth=sliders.youth.value, p=sliders.place.value;
  const cost=s*150000+c*100000;

  const lines=[
    `Additional Sworn Officers: ${s}`,
    `Additional CSOs: ${c}`,
    `Technology Investment: ${t}%`,
    `Street Lighting Improvements: ${L}%`,
    `Youth & Community Programs: ${yth}%`,
    `Place Management & Compliance: ${p}%`,
    `Estimated Additional Staffing Cost: $${cost.toLocaleString()}`,
    '',
    'Projected Annual Incidents (Post-Intervention):',
    `Violent: Assault ${proj.violent.assault}, Robbery ${proj.violent.robbery}, Homicide ${proj.violent.homicide}, Sexual ${proj.violent.sexual}`,
    `Property: Burglary ${proj.property.burglary}, Larceny ${proj.property.larceny}, Vehicle ${proj.property.vehicle}, Arson ${proj.property.arson}`,
    `Fraud: Credit ${proj.fraud.credit}, Identity ${proj.fraud.identity}, Embezzlement ${proj.fraud.embezzle}`,
    `Disorder: Vandalism ${proj.disorder.vandalism}, Intoxication ${proj.disorder.intoxication}, Disorderly ${proj.disorder.disorderly}`
  ];
  lines.forEach(l=>{doc.text(l,margin,y); y+=15;});

  const canvas=document.getElementById('crimeChart');
  const img=canvas.toDataURL('image/png',1.0);
  doc.addImage(img,'PNG',margin,y,doc.internal.pageSize.getWidth()-margin*2,200); y+=210;

  doc.setFontSize(12); doc.setTextColor('#0a3a6c');
  doc.text('References & Evidence:',margin,y); y+=15;
  doc.setFontSize(10); doc.setTextColor('#22314a');
  const refs=[
    'Branas CC, et al. (2018). Vacant-lot greening RCT — reductions in violence. PNAS.',
    'Welsh BC & Farrington DP (2008). Lighting meta-analysis — crime reductions.',
    'Braga AA & Weisburd DL (2010). Hot-spots policing — targeted reductions.',
    'Livingston M (2011). Alcohol outlet density & compliance interventions reduce harm.',
    'Farrington DP (2006). Youth prevention programs — durable reductions.'
  ];
  refs.forEach(r=>{doc.text(`• ${r}`,margin,y); y+=12;});
  doc.save('RPD_Strategic_Interventions_Proposal.pdf');
});

// Init
Object.values(sliders).forEach(s=>s.addEventListener('input',updateDashboard));
updateDashboard();
