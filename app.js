const KEY='investsim_v2';
const CAPITAL_INICIAL=10000000;

const EMPRESAS=[
 {id:'MCD',nombre:"McDonald's",ticker:'MCD',cat:'Consumo',color:'#DA291C',precioBase:70000},
 {id:'AAPL',nombre:'Apple',ticker:'AAPL',cat:'Tecnología',color:'#333333',precioBase:150000},
 {id:'GOOGL',nombre:'Google',ticker:'GOOGL',cat:'Tecnología',color:'#4285F4',precioBase:120000},
 {id:'NKE',nombre:'Nike',ticker:'NKE',cat:'Deportes',color:'#111111',precioBase:90000},
 {id:'ADS',nombre:'Adidas',ticker:'ADS',cat:'Deportes',color:'#0F6B3C',precioBase:85000},
 {id:'AMZN',nombre:'Amazon',ticker:'AMZN',cat:'Tecnología',color:'#FF9900',precioBase:135000},
 {id:'TSLA',nombre:'Tesla',ticker:'TSLA',cat:'Otros',color:'#8B1E1E',precioBase:110000},
 {id:'KO',nombre:'Coca-Cola',ticker:'KO',cat:'Consumo',color:'#B00020',precioBase:60000},
];
const CATEGORIAS=['Tecnología','Consumo','Deportes','Otros'];
const ICON={
 home:'<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9h12v-9"/>',
 chart:'<path d="M4 20V10M12 20V4M20 20v-7"/>',
 briefcase:'<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
 file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
 wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14h2"/>',
 trend:'<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6" fill="currentColor"/>',
 cart:'<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L21 7H6"/>',
 swap:'<path d="m7 4 4 4H3M17 20l-4-4h8"/>',
};
function ic(name){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">${ICON[name]}</svg>`; }

const VISTAS=[['inicio','Inicio','home'],['acciones','Acciones','chart'],['portafolio','Portafolio','briefcase'],['historial','Historial','clock'],['resumen','Resumen','file']];

let state=cargar();
let currentView='inicio';
let seleccionCompra=null;   // id de empresa en vista Acciones
let seleccionVenta=null;    // indice de portafolio en vista Portafolio
let busqueda=''; let filtroCat='Todas'; let filtroHist='Todas';

function cargar(){
  try{ const raw=localStorage.getItem(KEY); if(raw) return JSON.parse(raw); }catch(e){}
  return {
    usuario:'',
    capitalDisponible:CAPITAL_INICIAL,
    precios:Object.fromEntries(EMPRESAS.map(e=>[e.id,e.precioBase])),
    portafolio:[],
    historial:[],
    serie:[{fecha:hoyCorta(),valor:CAPITAL_INICIAL}]
  };
}
function guardar(){ try{ localStorage.setItem(KEY, JSON.stringify(state)); }catch(e){} }
function money(n){ const s=Math.round(n)<0?'-':''; return s+'$'+Math.abs(Math.round(n)).toLocaleString('es-CO'); }
function pct(n){ return (n>=0?'+':'')+n.toFixed(1)+'%'; }
function hoy(){ return new Date().toLocaleDateString('es-CO')+' '+new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); }
function hoyCorta(){ return new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'short'}); }
function empresa(id){ return EMPRESAS.find(e=>e.id===id); }
function iniciales(nombre){ return nombre.trim().split(/\s+/).slice(0,2).map(p=>p[0].toUpperCase()).join(''); }

// ---------- Mercado: pequeña fluctuación automática ----------
function tickMercado(){
  EMPRESAS.forEach(e=>{
    const cambio=(Math.random()*6-3)/100; // entre -3% y +3%
    let nuevo=Math.round(state.precios[e.id]*(1+cambio)/500)*500;
    state.precios[e.id]=Math.max(1000,nuevo);
  });
  guardar();
}

// ---------- Cálculos derivados ----------
function valorInversiones(){ return state.portafolio.reduce((s,h)=>s+h.cantidad*state.precios[h.empresaId],0); }
function gananciaRealizada(){ return state.historial.filter(o=>o.resultado!==null).reduce((s,o)=>s+o.resultado,0); }
function valorTotalPortafolio(){ return state.capitalDisponible+valorInversiones(); }
function registrarSerie(){
  state.serie.push({fecha:hoyCorta(),valor:valorTotalPortafolio()});
  if(state.serie.length>14) state.serie.shift();
}

// ---------- Navegación ----------
function navigate(v){
  if(v!==currentView) tickMercado();
  currentView=v; seleccionCompra=null; seleccionVenta=null; busqueda=''; filtroCat='Todas'; filtroHist='Todas';
  render();
}
function comenzar(){
  const v=document.getElementById('gate-nombre').value.trim();
  const msg=document.getElementById('gate-msg');
  if(!v){ msg.innerHTML='<div class="msg err">Escribe tu nombre para continuar.</div>'; return; }
  state.usuario=v; guardar();
  document.getElementById('gate').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  navigate('inicio');
}
function cerrarSesion(){
  state.usuario=''; guardar();
  document.getElementById('app').classList.add('hidden');
  document.getElementById('gate').classList.remove('hidden');
}

// ---------- Render maestro ----------
function render(){
  renderSidebar();
  renderTopbar();
  const c=document.getElementById('content');
  if(currentView==='inicio') c.innerHTML=viewInicio();
  if(currentView==='acciones') c.innerHTML=seleccionCompra?viewComprar():viewAcciones();
  if(currentView==='portafolio') c.innerHTML=viewPortafolio();
  if(currentView==='historial') c.innerHTML=viewHistorial();
  if(currentView==='resumen') c.innerHTML=viewResumen();
  document.querySelectorAll('.line-chart-slot').forEach(el=>el.innerHTML=lineChartSVG());
  document.querySelectorAll('.donut-slot').forEach(el=>el.innerHTML=donutHTML());
  if(currentView==='acciones' && seleccionCompra) renderCalcCompra();
  if(currentView==='portafolio' && seleccionVenta!==null) renderCalcVenta();
}
function renderSidebar(){
  const nav=document.getElementById('nav'); nav.innerHTML='';
  VISTAS.forEach(([id,label,icon])=>{
    const b=document.createElement('button');
    b.className=id===currentView?'active':''; b.onclick=()=>navigate(id);
    b.innerHTML=ic(icon)+'<span>'+label+'</span>';
    nav.appendChild(b);
  });
}
function renderTopbar(){
  const titles={inicio:['Inicio','Resumen general de tu simulación'],acciones:['Acciones disponibles','Explora las empresas y elige en cuáles invertir'],
    portafolio:['Portafolio','Tus inversiones actuales y ventas simuladas'],historial:['Historial de operaciones','Todas tus compras y ventas registradas'],
    resumen:['Resumen','Estado final de tu capital y tus inversiones']};
  const [t,s]=titles[currentView];
  document.getElementById('topbar').innerHTML=`
    <div><h1>${currentView==='inicio'?`Hola, ${esc(state.usuario)}`:t}</h1><p>${currentView==='inicio'?'Bienvenido a InvestSim. Aquí puedes gestionar tus inversiones y ver cómo evoluciona tu capital.':s}</p></div>
    <div class="userchip"><span class="av">${iniciales(state.usuario||'?')}</span>${esc(state.usuario)}</div>`;
}
function esc(s){ return (s||'').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }

// ================= INICIO =================
function viewInicio(){
  const vi=valorInversiones(), gr=gananciaRealizada();
  const previa=[...EMPRESAS].slice(0,4);
  return `
  <div class="stats-grid">
    ${statCard('wallet','ic-blue','Capital disponible',money(state.capitalDisponible),`de ${money(CAPITAL_INICIAL)}`)}
    ${statCard('trend','ic-green','Valor de tus inversiones',money(vi),`en ${state.portafolio.length} inversión(es)`)}
    ${statCard('target','ic-purple','Ganancia / Pérdida',(gr>=0?'+':'')+money(gr),state.historial.some(o=>o.resultado!==null)?'realizada hasta ahora':'(aún sin ventas)',gr)}
  </div>
  <div class="grid-2col">
    <div class="card"><h3>Resumen de tu portafolio</h3><div class="line-chart-slot"></div></div>
    <div class="card"><h3>Acciones rápidas</h3>
      <button class="qa-btn qa-green" onclick="navigate('acciones')">${ic('cart')} Comprar acciones</button>
      <button class="qa-btn qa-blue" onclick="navigate('portafolio')">${ic('swap')} Vender acciones</button>
      <button class="qa-btn qa-purple" onclick="navigate('portafolio')">${ic('briefcase')} Ver portafolio</button>
      <button class="qa-btn qa-ghost" onclick="navigate('historial')">${ic('file')} Ver historial</button>
    </div>
  </div>
  <div class="card"><h3>Empresas disponibles</h3>
    <div class="tbl-wrap"><table>
      <tr><th>Empresa</th><th>Precio actual</th><th>Variación</th><th></th></tr>
      ${previa.map(filaEmpresa).join('')}
    </table></div>
  </div>`;
}
function statCard(icon,cls,label,val,sub,signo){
  const color=signo===undefined?'':(signo>=0?'pos':'neg');
  return `<div class="card stat"><div class="ic ${cls}">${ic(icon)}</div>
    <div><div class="lbl">${label}</div><div class="val ${color}">${val}</div><div class="sub">${sub}</div></div></div>`;
}
function filaEmpresa(e){
  const precio=state.precios[e.id], variacion=((precio-e.precioBase)/e.precioBase*100);
  return `<tr><td><div class="company"><span class="badge" style="background:${e.color}">${iniciales(e.nombre)}</span>
      <div><div class="name">${e.nombre}</div><div class="ticker">${e.ticker} · ${e.cat}</div></div></div></td>
      <td>${money(precio)}</td>
      <td class="${variacion>=0?'pos':'neg'}">${pct(variacion)}</td>
      <td><button class="btn btn-primary btn-sm" onclick="abrirCompra('${e.id}')">Invertir</button></td></tr>`;
}

// ================= ACCIONES =================
function viewAcciones(){
  const lista=EMPRESAS.filter(e=>
    (filtroCat==='Todas'||e.cat===filtroCat) &&
    (e.nombre.toLowerCase().includes(busqueda.toLowerCase())||e.ticker.toLowerCase().includes(busqueda.toLowerCase())));
  return `
  <div class="card">
    <div class="toolbar">
      <input type="text" placeholder="Buscar empresa..." value="${esc(busqueda)}" oninput="busqueda=this.value;render()">
      ${['Todas',...CATEGORIAS].map(c=>`<button class="chip ${filtroCat===c?'active':''}" onclick="filtroCat='${c}';render()">${c}</button>`).join('')}
    </div>
    <div class="tbl-wrap"><table>
      <tr><th>Empresa</th><th>Precio actual</th><th>Variación</th><th></th></tr>
      ${lista.length?lista.map(filaEmpresa).join(''):'<tr><td class="empty" colspan="4">No se encontraron empresas.</td></tr>'}
    </table></div>
  </div>`;
}
function abrirCompra(id){ seleccionCompra=id; render(); }
function viewComprar(){
  const e=empresa(seleccionCompra), precio=state.precios[e.id];
  const max=Math.max(1,Math.floor(state.capitalDisponible/precio));
  return `
  <button class="btn btn-ghost btn-sm" style="margin-bottom:14px" onclick="seleccionCompra=null;render()">← Volver a acciones</button>
  <div class="grid-2col">
    <div class="card">
      <h3>Comprar acciones</h3><p style="color:var(--ink-soft);font-size:13px;margin-top:0">Completa la información para realizar tu inversión.</p>
      <div class="field"><label>Empresa</label><select onchange="abrirCompra(this.value)">
        ${EMPRESAS.map(x=>`<option value="${x.id}" ${x.id===e.id?'selected':''}>${x.nombre} (${x.ticker})</option>`).join('')}
      </select></div>
      <div class="field"><label>Precio por acción (precio actual)</label><input value="${money(precio)}" disabled></div>
      <div class="field"><label>Cantidad de acciones</label><input id="c-cant" type="number" min="1" max="${max}" value="1" oninput="renderCalcCompra()">
        <div class="hint">Máximo disponible: ${max}</div></div>
      <div class="calc-box" id="c-calc"></div>
      <div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="seleccionCompra=null;render()">Cancelar</button>
        <button class="btn btn-primary" onclick="comprar()">${ic('cart')} Comprar</button></div>
      <div id="c-msg"></div>
    </div>
    <div class="card">
      <div class="company" style="margin-bottom:14px"><span class="badge" style="background:${e.color}">${iniciales(e.nombre)}</span>
        <div><div class="name">${e.nombre}</div><div class="ticker">${e.ticker} · ${e.cat}</div></div></div>
      <div class="calc-box"><div class="r"><span>Precio actual</span><span>${money(precio)}</span></div>
        <div class="r"><span>Variación</span><span class="${(precio-e.precioBase)>=0?'pos':'neg'}">${pct((precio-e.precioBase)/e.precioBase*100)}</span></div>
        <div class="r"><span>Capital disponible</span><span>${money(state.capitalDisponible)}</span></div></div>
      <div class="note">📍 Recuerda: esta es una simulación educativa. Las cifras son ficticias y no corresponden a precios reales del mercado.</div>
    </div>
  </div>`;
}
function renderCalcCompra(){
  const e=empresa(seleccionCompra), precio=state.precios[e.id];
  const cant=Number(document.getElementById('c-cant').value)||0;
  const valor=precio*cant;
  document.getElementById('c-calc').innerHTML=`
    <div class="r"><span>Valor de la operación</span><span>${cant} × ${money(precio)} = ${money(valor)}</span></div>
    <div class="r"><span>Capital disponible después</span><span>${money(state.capitalDisponible)} − ${money(valor)} = ${money(state.capitalDisponible-valor)}</span></div>`;
}
function comprar(){
  const e=empresa(seleccionCompra), precio=state.precios[e.id];
  const cantidad=Number(document.getElementById('c-cant').value);
  const msg=document.getElementById('c-msg');
  if(!cantidad||cantidad<=0){ msg.innerHTML='<div class="msg err">Ingresa una cantidad válida.</div>'; return; }
  const valor=precio*cantidad;
  if(valor>state.capitalDisponible){ msg.innerHTML=`<div class="msg err">Capital insuficiente. Necesitas ${money(valor)} y tienes ${money(state.capitalDisponible)}.</div>`; return; }
  state.capitalDisponible-=valor;
  state.portafolio.push({empresaId:e.id,cantidad,precioCompra:precio,fecha:hoy()});
  state.historial.push({tipo:'Compra',empresaId:e.id,cantidad,precio,fecha:hoy(),resultado:null});
  registrarSerie(); guardar();
  seleccionCompra=null; render();
}

// ================= PORTAFOLIO =================
function viewPortafolio(){
  const vi=valorInversiones();
  return `
  <div class="stats-grid">
    ${statCard('wallet','ic-blue','Capital disponible',money(state.capitalDisponible),'')}
    ${statCard('trend','ic-green','Valor de inversiones',money(vi),`${state.portafolio.length} posición(es)`)}
    ${statCard('target','ic-purple','Ganancia / Pérdida',(gananciaRealizada()>=0?'+':'')+money(gananciaRealizada()),'realizada',gananciaRealizada())}
    ${statCard('briefcase','ic-blue','Valor total del portafolio',money(state.capitalDisponible+vi),'')}
  </div>
  <div class="grid-2col">
    <div class="card"><h3>Mis inversiones</h3>
      <div class="tbl-wrap"><table>
        <tr><th>Empresa</th><th>Cant.</th><th>Precio compra</th><th>Inversión</th><th>Precio actual</th><th>Ganancia/Pérdida</th><th></th></tr>
        ${state.portafolio.length?state.portafolio.map((h,i)=>filaPortafolio(h,i)).join(''):'<tr><td class="empty" colspan="7">Aún no tienes inversiones. Ve a la pestaña Acciones.</td></tr>'}
      </table></div>
    </div>
    <div class="card"><h3>Vender acciones</h3>${panelVenta()}</div>
  </div>
  <div class="card"><h3>Distribución de tu portafolio</h3><div class="donut-slot"></div></div>`;
}
function filaPortafolio(h,i){
  const e=empresa(h.empresaId), actual=state.precios[h.empresaId], g=(actual-h.precioCompra)*h.cantidad;
  return `<tr><td><div class="company"><span class="badge" style="background:${e.color}">${iniciales(e.nombre)}</span>
      <div><div class="name">${e.nombre}</div><div class="ticker">${e.ticker}</div></div></div></td>
      <td>${h.cantidad}</td><td>${money(h.precioCompra)}</td><td>${money(h.cantidad*h.precioCompra)}</td><td>${money(actual)}</td>
      <td class="${g>=0?'pos':'neg'}">${g>=0?'+':''}${money(g)}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="seleccionVenta=${i};render()">Vender</button></td></tr>`;
}
function panelVenta(){
  if(seleccionVenta===null||!state.portafolio[seleccionVenta]) return `<p style="color:var(--ink-soft);font-size:13.5px">Selecciona una inversión en la tabla y presiona "Vender" para continuar.</p>`;
  const h=state.portafolio[seleccionVenta], e=empresa(h.empresaId), actual=state.precios[h.empresaId];
  return `
  <div class="note" style="margin-bottom:14px">El precio de venta es un valor ficticio que tú decides.</div>
  <div class="field"><label>Empresa</label><input value="${e.nombre} (${e.ticker})" disabled></div>
  <div class="field"><label>Cantidad a vender</label><input id="v-cant" type="number" min="1" max="${h.cantidad}" value="${h.cantidad}" oninput="renderCalcVenta()">
    <div class="hint">Tienes: ${h.cantidad}</div></div>
  <div class="field"><label>Precio de venta por acción</label><input id="v-precio" type="number" min="1" value="${actual}" oninput="renderCalcVenta()"></div>
  <div class="calc-box" id="v-calc"></div>
  <div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="seleccionVenta=null;render()">Cancelar</button>
    <button class="btn btn-danger" onclick="vender()">${ic('swap')} Vender</button></div>
  <div id="v-msg"></div>`;
}
function renderCalcVenta(){
  const h=state.portafolio[seleccionVenta];
  const cant=Number(document.getElementById('v-cant').value)||0;
  const pv=Number(document.getElementById('v-precio').value)||0;
  const gxa=pv-h.precioCompra, total=gxa*cant;
  document.getElementById('v-calc').innerHTML=`
    <div class="r"><span>Precio de compra (por acción)</span><span>${money(h.precioCompra)}</span></div>
    <div class="r"><span>Precio de venta (por acción)</span><span>${money(pv)}</span></div>
    <div class="r"><span>Ganancia por acción</span><span class="${gxa>=0?'pos':'neg'}">${gxa>=0?'+':''}${money(gxa)}</span></div>
    <div class="r"><span>Resultado total (${cant} acciones)</span><span class="${total>=0?'pos':'neg'}">${total>=0?'+':''}${money(total)}</span></div>`;
}
function vender(){
  const h=state.portafolio[seleccionVenta], e=empresa(h.empresaId);
  const cant=Number(document.getElementById('v-cant').value);
  const pv=Number(document.getElementById('v-precio').value);
  const msg=document.getElementById('v-msg');
  if(!cant||cant<=0||cant>h.cantidad){ msg.innerHTML='<div class="msg err">Cantidad inválida.</div>'; return; }
  if(!pv||pv<=0){ msg.innerHTML='<div class="msg err">Ingresa un precio de venta válido.</div>'; return; }
  const valorVenta=pv*cant, resultado=(pv-h.precioCompra)*cant;
  state.capitalDisponible+=valorVenta;
  state.historial.push({tipo:'Venta',empresaId:e.id,cantidad:cant,precio:pv,fecha:hoy(),resultado});
  if(cant===h.cantidad) state.portafolio.splice(seleccionVenta,1); else h.cantidad-=cant;
  registrarSerie(); guardar();
  seleccionVenta=null; render();
}

// ================= HISTORIAL =================
function viewHistorial(){
  const ops=state.historial.slice().reverse().filter(o=>filtroHist==='Todas'||(filtroHist==='Compras'&&o.tipo==='Compra')||(filtroHist==='Ventas'&&o.tipo==='Venta'));
  return `
  <div class="grid-2col">
    <div class="card">
      <div class="tabs">${['Todas','Compras','Ventas'].map(f=>`<button class="chip ${filtroHist===f?'active':''}" onclick="filtroHist='${f}';render()">${f}</button>`).join('')}</div>
      <div class="tbl-wrap"><table>
        <tr><th>Fecha</th><th>Tipo</th><th>Empresa</th><th>Cant.</th><th>Precio</th><th>Total</th><th>Resultado</th></tr>
        ${ops.length?ops.map(filaHistorial).join(''):'<tr><td class="empty" colspan="7">Todavía no hay operaciones registradas.</td></tr>'}
      </table></div>
    </div>
    <div>
      <div class="card"><h3>Resumen general</h3>
        <div class="calc-box">
          <div class="r"><span>Capital inicial</span><span>${money(CAPITAL_INICIAL)}</span></div>
          <div class="r"><span>Capital disponible</span><span>${money(state.capitalDisponible)}</span></div>
          <div class="r"><span>Valor de inversiones</span><span>${money(valorInversiones())}</span></div>
          <div class="r"><span>Ganancia / Pérdida</span><span class="${gananciaRealizada()>=0?'pos':'neg'}">${gananciaRealizada()>=0?'+':''}${money(gananciaRealizada())}</span></div>
          <div class="r"><span>Valor total del portafolio</span><span>${money(valorTotalPortafolio())}</span></div>
        </div>
      </div>
      <div class="card"><h3>Distribución</h3><div class="donut-slot"></div></div>
    </div>
  </div>`;
}
function filaHistorial(op){
  const e=empresa(op.empresaId);
  return `<tr><td>${op.fecha}</td><td><span class="pill ${op.tipo==='Compra'?'buy':'sell'}">${op.tipo}</span></td>
    <td><div class="company"><span class="badge" style="background:${e.color};width:26px;height:26px;font-size:11px">${iniciales(e.nombre)}</span>${e.nombre}</div></td>
    <td>${op.cantidad}</td><td>${money(op.precio)}</td><td>${money(op.cantidad*op.precio)}</td>
    <td>${op.resultado===null?'—':`<span class="${op.resultado>=0?'pos':'neg'}">${op.resultado>=0?'+':''}${money(op.resultado)}</span>`}</td></tr>`;
}

// ================= RESUMEN =================
function viewResumen(){
  return `
  <div class="card">
    <h3>Resumen final</h3>
    <div class="calc-box">
      <div class="r"><span>Capital inicial</span><span>${money(CAPITAL_INICIAL)}</span></div>
      <div class="r"><span>Capital disponible</span><span>${money(state.capitalDisponible)}</span></div>
      <div class="r"><span>Valor de inversiones</span><span>${money(valorInversiones())}</span></div>
      <div class="r"><span>Ganancia / Pérdida</span><span class="${gananciaRealizada()>=0?'pos':'neg'}">${gananciaRealizada()>=0?'+':''}${money(gananciaRealizada())}</span></div>
      <div class="r"><span>Valor total del portafolio</span><span>${money(valorTotalPortafolio())}</span></div>
    </div>
  </div>
  <div class="card"><button class="btn btn-ghost" onclick="reiniciar()">Reiniciar simulación</button></div>`;
}
function reiniciar(){
  if(!confirm('Esto borrará tu progreso y comenzarás de nuevo con el capital inicial. ¿Continuar?')) return;
  const usuario=state.usuario;
  state={usuario,capitalDisponible:CAPITAL_INICIAL,precios:Object.fromEntries(EMPRESAS.map(e=>[e.id,e.precioBase])),portafolio:[],historial:[],serie:[{fecha:hoyCorta(),valor:CAPITAL_INICIAL}]};
  guardar(); navigate('inicio');
}

// ================= Gráficos =================
function lineChartSVG(){
  const pts=state.serie;
  const w=560,h=190,pad=30;
  const vals=pts.map(p=>p.valor);
  const min=Math.min(...vals)*0.97, max=Math.max(...vals)*1.03;
  const x=i=>pad+(i/(Math.max(pts.length-1,1)))*(w-pad*2);
  const y=v=>h-pad+ (( (max-v)/(max-min||1) ) * (h-pad*2-10));
  const path=pts.map((p,i)=>`${i===0?'M':'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const area=path+` L${x(pts.length-1).toFixed(1)},${h-pad} L${x(0).toFixed(1)},${h-pad} Z`;
  const labels=pts.map((p,i)=>`<text x="${x(i)}" y="${h-6}" font-size="10" fill="#98A2B3" text-anchor="middle">${p.fecha}</text>`).join('');
  return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:200px">
    <path d="${area}" fill="#2F6FED" opacity=".08"/>
    <path d="${path}" fill="none" stroke="#2F6FED" stroke-width="2.5"/>
    ${pts.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.valor)}" r="3.5" fill="#2F6FED"/>`).join('')}
    ${labels}</svg>`;
}
function donutHTML(){
  const datos=state.portafolio.map(h=>({label:empresa(h.empresaId).nombre,color:empresa(h.empresaId).color,valor:h.cantidad*state.precios[h.empresaId]}));
  const total=datos.reduce((s,d)=>s+d.valor,0);
  if(!total) return `<p style="color:var(--ink-soft);font-size:13.5px">Aún no tienes inversiones para mostrar.</p>`;
  let acc=0;
  const stops=datos.map(d=>{ const from=acc/total*360; acc+=d.valor; const to=acc/total*360; return `${d.color} ${from}deg ${to}deg`; }).join(',');
  return `<div class="donut-wrap">
    <div class="donut" style="background:conic-gradient(${stops})"><div class="hole"><b>${money(total)}</b><span>Total</span></div></div>
    <div class="legend">${datos.map(d=>`<div class="li"><span><span class="dot" style="background:${d.color}"></span>${d.label}</span><span>${(d.valor/total*100).toFixed(1)}%</span></div>`).join('')}</div>
  </div>`;
}

// ================= Init =================
if(state.usuario){
  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    render();
  });
}