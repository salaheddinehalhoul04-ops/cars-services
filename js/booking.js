// INITIALE AUTO RENT – Booking logic
(function(){
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
  const form = $('#booking-form'); if(!form) return;

  const pickDate = $('#pickup-date'); const retDate = $('#return-date');
  const pickTime = $('#pickup-time'); const retTime = $('#return-time');
  const category = $('#category'); const age25 = $('#age25');
  const estimateEl = $('#estimate'); const errorsEl = $('.errors');
  const confirmSection = $('#confirmation'); const confirmDetails = $('#confirm-details');

  const rates = { economy: 250, compact: 320, suv: 550, luxury: 900 };
  const addonRates = { gps: 50, child: 30, extra: 70 };

  const todayISO = () => new Date().toISOString().split('T')[0];
  const ensureMins = () => { pickDate.min = todayISO(); retDate.min = todayISO(); };

  const parseDateTime = (d, t) => new Date(`${d}T${t||'12:00'}`);
  const nights = (d1, d2) => Math.max(1, Math.ceil((d2 - d1) / (1000*60*60*24)));

  const formatMoney = (n) => `MAD ${n.toFixed(0)}`;

  const updateEstimate = () => {
    errorsEl.textContent = '';
    if(!pickDate.value || !retDate.value || !category.value) { estimateEl.textContent = '—'; return; }
    const start = parseDateTime(pickDate.value, pickTime.value || '10:00');
    const end = parseDateTime(retDate.value, retTime.value || '10:00');
    if(!(start < end)) { estimateEl.textContent = '—'; return; }
    const days = nights(start, end);
    const base = (rates[category.value]||0) * days;
    const addons = $$('input[name="addon"]:checked', form).reduce((s, el)=> s + (addonRates[el.value]||0), 0) * days;
    const total = base + addons;
    estimateEl.textContent = `${formatMoney(total)} / ${days} day${days>1?'s':''}`;
  };

  // Preselect category from URL
  const params = new URLSearchParams(location.search);
  const preCat = params.get('category'); if(preCat && $('#category')){ $('#category').value = preCat; }

  // Phone input simple formatting
  const phone = $('#phone');
  phone?.addEventListener('input', ()=>{ phone.value = phone.value.replace(/[^+\d\s\-]/g,''); });

  // Validation helper
  const validate = () => {
    const messages = [];
    if(!pickDate.value || !retDate.value) messages.push('Please select pickup and return dates.');
    if(pickDate.value && retDate.value){
      const s = parseDateTime(pickDate.value, pickTime.value||'10:00');
      const e = parseDateTime(retDate.value, retTime.value||'10:00');
      if(!(s < e)) messages.push('Return must be after pickup.');
    }
    if(!age25.checked) messages.push('Driver must confirm 25+ age.');
    if(!category.value) messages.push('Please select a car category.');
    if(!$('#full-name').value) messages.push('Please enter your full name.');
    if(!$('#email').value) messages.push('Please enter a valid email.');
    if(!$('#phone').value) messages.push('Please enter a phone/WhatsApp number.');
    if(!$('#pickup-location').value || !$('#dropoff-location').value) messages.push('Please enter pickup and dropoff locations.');
    errorsEl.innerHTML = messages.map(m=>`<div>• ${m}</div>`).join('');
    return messages.length===0;
  };

  form.addEventListener('input', updateEstimate);
  form.addEventListener('change', updateEstimate);

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validate()) return;
    // Build confirmation
    const startStr = `${pickDate.value} ${pickTime.value}`;
    const endStr = `${retDate.value} ${retTime.value}`;
    const selectedAddons = $$('input[name="addon"]:checked', form).map(el=>el.value).join(', ') || 'None';
    const est = estimateEl.textContent || '';
    confirmDetails.innerHTML = `
      <div><strong>Dates:</strong> ${startStr} → ${endStr}</div>
      <div><strong>Category:</strong> ${category.options[category.selectedIndex].text}</div>
      <div><strong>Add-ons:</strong> ${selectedAddons}</div>
      <div><strong>Name:</strong> ${$('#full-name').value}</div>
      <div><strong>Email:</strong> ${$('#email').value}</div>
      <div><strong>Phone:</strong> ${$('#phone').value}</div>
      <div><strong>Pickup:</strong> ${$('#pickup-location').value}</div>
      <div><strong>Dropoff:</strong> ${$('#dropoff-location').value}</div>
      <div><strong>Estimate:</strong> ${est}</div>
    `;
    form.hidden = true; confirmSection.hidden = false; confirmSection.scrollIntoView({behavior:'smooth'});
  });

  ensureMins();
  updateEstimate();
})();
