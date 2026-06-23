'use strict';
// build-demo.js — generate self-contained, backend-free demo pages from the REAL
// app frontends. Each output (scout.html / quartermaster.html) is the app's own
// index.html with a stub injected ahead of its <script> that fakes the backend:
// SSE/WebSocket + REST are intercepted and answered with canned NMOS data, the
// licence shows unlocked, and routing actions mutate the in-memory demo state so
// the UI reacts live. No server, no shared state — each visitor gets their own.
//
//   1) capture state:  curl localhost:3500/api/state > _scout-state.json
//                      curl localhost:3011/api/state > _qm-state.json
//   2) node build-demo.js
//
// Re-run whenever the apps change.

const fs   = require('fs');
const path = require('path');

const HERE = __dirname;
const APPS = path.resolve(HERE, '..', '..');           // broadcast-projects/
const read = (p) => fs.readFileSync(p, 'utf8');
// Safe-embed JSON inside a <script> (prevent </script> / <! breakage).
const bake = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e');

// Inject the stub immediately before the app's (first & only inline) <script>.
function inject(html, stubScript) {
  const i = html.indexOf('<script>');
  if (i === -1) throw new Error('no <script> found to inject before');
  return html.slice(0, i) + stubScript + '\n' + html.slice(i);
}

// A tiny "live demo / sample data" ribbon, shared by both.
const RIBBON = `
<div id="demoRibbon" style="position:fixed;z-index:99999;left:10px;bottom:10px;display:flex;align-items:center;gap:7px;
  padding:5px 11px;border-radius:100px;background:rgba(0,212,255,.12);border:1px solid rgba(0,212,255,.4);
  color:#00d4ff;font:600 11px/1 'JetBrains Mono',monospace;letter-spacing:.04em;pointer-events:none;backdrop-filter:blur(4px)">
  <span style="width:6px;height:6px;border-radius:50%;background:#00e676;box-shadow:0 0 6px #00e676"></span>
  LIVE DEMO · sample data · runs in your browser
</div>`;

// ─────────────────────────────────────────────────────────────────────────────
// SCOUT
// ─────────────────────────────────────────────────────────────────────────────
function buildScout() {
  const state = JSON.parse(read(path.join(HERE, '_scout-state.json')));
  state.license = { state: 'licensed', licensee: 'Demo Studio', edition: 'pro' };
  state.diff = null;

  const stub = `<script>
/* ===== NMOS Scout — live demo backend stub ===== */
(function(){
  var STATE = ${bake(state)};
  var LOG = [];
  var es = null, esListeners = {};
  function emit(type, data){ (esListeners[type]||[]).forEach(function(cb){ cb({ data: JSON.stringify(data) }); }); }
  function pushState(){ emit('state', STATE); }
  function addLog(method, p, status){
    var e = { ts:new Date().toISOString(), method:method, url:'http://demo-registry.local/x-nmos/'+p,
              status:status, duration: 18 + Math.floor(Math.random()*70) };
    LOG.unshift(e); if (LOG.length>200) LOG.pop(); emit('log', e);
  }
  function FakeES(){ es = this; setTimeout(function(){ if(es.onopen) es.onopen(); pushState();
      [1,2,3].forEach(function(d){ setTimeout(function(){ try{ if(typeof renderCurrentSection==='function') renderCurrentSection(); }catch(e){} }, 150*d); });
      ['/nodes','/devices','/senders','/receivers'].forEach(function(p,i){ setTimeout(function(){ addLog('GET','query/v1.3'+p,200); }, 120+i*90); });
    }, 60); }
  FakeES.prototype.addEventListener = function(t,cb){ (esListeners[t]=esListeners[t]||[]).push(cb); };
  FakeES.prototype.close = function(){};
  window.EventSource = FakeES;

  function R(body, status){ status=status||200; return Promise.resolve({ ok: status<400, status: status,
    json: function(){ return Promise.resolve(body); }, text: function(){ return Promise.resolve(JSON.stringify(body)); } }); }
  function rcv(id){ return STATE.resources.receivers.find(function(x){return x.id===id;}); }
  function snd(id){ return STATE.resources.senders.find(function(x){return x.id===id;}); }

  window.fetch = function(url, opts){
    opts = opts||{}; var u = String(url); var m = (opts.method||'GET').toUpperCase();
    try {
      if (u.indexOf('/api/license/activate')>-1) return R({ ok:true, status: STATE.license });
      if (u.indexOf('/api/license')>-1)          return R(STATE.license);
      if (u.indexOf('/api/state')>-1)            return R(STATE);
      if (u.indexOf('/api/log')>-1){ if(m==='DELETE'){ LOG=[]; return R({ok:true}); } return R(LOG.slice()); }
      if (u.indexOf('/api/scan')>-1){ STATE.scanning=true; STATE.scanProgress='Discovering APIs…'; pushState();
        setTimeout(function(){ STATE.scanProgress='Fetching resources…'; pushState(); },350);
        setTimeout(function(){ STATE.scanning=false; STATE.scanProgress=''; STATE.lastScan=new Date().toISOString();
          ['/nodes','/devices','/senders','/receivers','/flows'].forEach(function(p){ addLog('GET','query/v1.3'+p,200); }); pushState(); }, 950);
        return R({ ok:true }); }
      if (u.indexOf('/api/mock')>-1){ STATE.isMock=true; pushState(); return R({ok:true}); }
      if (u.indexOf('/api/route')>-1){ var b=JSON.parse(opts.body||'{}'); var r=rcv(b.receiverId), s=snd(b.senderId);
        if(r) r.subscription={ sender_id:b.senderId, active:true };
        if(s) s.subscription=Object.assign({}, s.subscription, { receiver_id:b.receiverId, active:true });
        addLog('PATCH','connection/v1.1/single/receivers/'+(b.receiverId||'').slice(0,8)+'/staged',200); pushState();
        return R({ ok:true, staged:{status:200}, active:{status:200} }); }
      if (u.indexOf('/api/disconnect')>-1){ var b2=JSON.parse(opts.body||'{}'); var r2=rcv(b2.receiverId);
        if(r2) r2.subscription={ sender_id:null, active:false };
        addLog('PATCH','connection/v1.1/single/receivers/'+(b2.receiverId||'').slice(0,8)+'/staged',200); pushState();
        return R({ ok:true, staged:{status:200}, active:{status:200} }); }
      if (u.indexOf('/api/subscribe')>-1){ addLog('POST','query/v1.3/subscriptions',201); return R({ ok:true, status:201, body:{ id:'demo-sub-1', ws_href:'wss://demo-registry.local/x-nmos/query/subscriptions/demo-sub-1' } }); }
      if (u.indexOf('/api/proxy')>-1){ addLog('GET','query/v1.3/senders',200); return R({ ok:true, status:200, body: STATE.resources.senders }); }
      if (u.indexOf('/api/export')>-1) return R(STATE);
    } catch(e){ /* fall through */ }
    return R({ ok:true });
  };
})();
</script>
${RIBBON}`;

  let html = read(path.join(APPS, 'nmos-scout', 'public', 'index.html'));
  html = inject(html, stub);
  // export uses window.location.href — neutralise in the demo (it'd navigate the frame)
  html = html.replace("window.location.href = '/api/export';", "alert('Demo: export is disabled in the live demo.');");
  fs.writeFileSync(path.join(HERE, 'scout.html'), html);
  return state.resources;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUARTERMASTER  (curate the captured state into a clean demo)
// ─────────────────────────────────────────────────────────────────────────────
function buildQM() {
  const s = JSON.parse(read(path.join(HERE, '_qm-state.json')));
  const isDemo = (x) => x && x._demo === true && !x._manual;
  const snap = {
    nodes:     (s.nodes||[]).filter(isDemo),
    devices:   (s.devices||[]).filter(isDemo),
    senders:   (s.senders||[]).filter(isDemo),
    receivers: (s.receivers||[]).filter(isDemo),
    healthStatus: {},
    rules:     (s.rules||[]).filter(r => !/smoke|test/i.test(r.name||'')),
    alerts:    [],
    connections: [],
    timestamp: new Date().toISOString(),
  };
  // all demo nodes shown healthy/green
  snap.nodes.forEach(n => { snap.healthStatus[n.id] = { resourceId:n.id, status:'online' }; });
  // seed a couple of live connections so the routing canvas shows activity
  const vidS = snap.senders.find(x => /video|pgm/i.test(x.label));
  const vidR = snap.receivers.find(x => /input 1|switcher input/i.test(x.label));
  const audS = snap.senders.find(x => /audio|console pgm/i.test(x.label));
  const audR = snap.receivers.find(x => /console input/i.test(x.label));
  if (vidS && vidR) snap.connections.push({ id:'demo-c1', senderId:vidS.id, receiverId:vidR.id, status:'active' });
  if (audS && audR) snap.connections.push({ id:'demo-c2', senderId:audS.id, receiverId:audR.id, status:'active' });

  const LICENSE = { state:'licensed', licensee:'Demo Studio', edition:'site' };

  const stub = `<script>
/* ===== NMOS Quartermaster — live demo backend stub ===== */
(function(){
  var SNAP = ${bake(snap)};
  var LIC  = ${bake(LICENSE)};
  var ws = null;
  function send(obj){ if(ws && ws.onmessage) ws.onmessage({ data: JSON.stringify(obj) }); }
  function FakeWS(){ ws = this; this.readyState=1;
    setTimeout(function(){ if(ws.onopen) ws.onopen(); send({ type:'FULL_STATE_SNAPSHOT', payload: SNAP });
      [1,2,3].forEach(function(d){ setTimeout(function(){ try{ if(typeof renderAll==='function') renderAll(); }catch(e){} }, 150*d); });
    }, 70); }
  FakeWS.prototype.send=function(){}; FakeWS.prototype.close=function(){};
  window.WebSocket = FakeWS;

  function R(body, status){ status=status||200; return Promise.resolve({ ok: status<400, status: status,
    json:function(){ return Promise.resolve(body); }, text:function(){ return Promise.resolve(JSON.stringify(body)); } }); }
  function nm(addr,status,detail){ return { address:addr, status:status, conflict:false, alloc:detail&&detail.alloc||null, reservation:detail&&detail.reservation||null, external:detail&&detail.external||null }; }

  window.fetch = function(url, opts){
    opts = opts||{}; var u=String(url); var m=(opts.method||'GET').toUpperCase();
    try {
      if (u.indexOf('/license/activate')>-1) return R({ ok:true, status: LIC });
      if (u.indexOf('/license')>-1)          return R(LIC);
      if (u.indexOf('/api/state')>-1)        return R(SNAP);
      if (u.indexOf('/registry/refresh')>-1) return R({ ok:true });
      if (u.indexOf('/manual/devices')>-1)   return R([]);
      if (u.indexOf('/multicast/stats')>-1)  return R({ pool:{ base:'239.100.0.0', size:1000, allocated:2, reserved:1, external:0, available:997 }, conflicts:0, conflictDetails:[], reservations:[], allocations:[], external:[] });
      if (u.indexOf('/multicast/map')>-1)    return R([
        nm('239.100.0.0','allocated',{ alloc:{ senderId:(SNAP.senders[0]||{}).id, receiverId:(SNAP.receivers[0]||{}).id, port:5000 } }),
        nm('239.100.0.1','allocated',{ alloc:{ senderId:(SNAP.senders[2]||{}).id, receiverId:(SNAP.receivers[1]||{}).id, port:5000 } }),
        nm('239.100.0.2','reserved', { reservation:{ label:'PGM spare', note:'reserved for studio A' } }),
        nm('239.100.0.3','available'), nm('239.100.0.4','available'), nm('239.100.0.5','available') ]);
      if (u.indexOf('/connect')>-1){ var b=JSON.parse(opts.body||'{}');
        var c={ id:'demo-'+Math.random().toString(36).slice(2,8), senderId:b.senderId, receiverId:b.receiverId, status:'active' };
        SNAP.connections.push(c); send({ type:'CONNECTION_ADDED', payload:c }); return R({ ok:true, connection:c }); }
      if (u.indexOf('/disconnect')>-1){ var b2=JSON.parse(opts.body||'{}');
        var c2=SNAP.connections.filter(function(x){return x.id===b2.connectionId;})[0];
        SNAP.connections=SNAP.connections.filter(function(x){return x.id!==b2.connectionId;});
        if(c2) send({ type:'CONNECTION_REMOVED', payload:c2 }); return R({ ok:true }); }
      if (u.indexOf('/rules')>-1){
        if (m==='POST'){ var nr=JSON.parse(opts.body||'{}'); nr.id='rule-demo-'+Math.random().toString(36).slice(2,7); nr.enabled=true;
          SNAP.rules.push(nr); send({ type:'RULE_ADDED', payload:nr }); return R(nr); }
        var id=(u.split('/rules/')[1]||'').split('?')[0];
        if (m==='DELETE'){ SNAP.rules=SNAP.rules.filter(function(r){return r.id!==id;}); send({ type:'RULE_REMOVED', payload:{ id:id } }); return R({ ok:true }); }
        if (m==='PATCH'){ var body=JSON.parse(opts.body||'{}'); var r=SNAP.rules.filter(function(x){return x.id===id;})[0];
          if(r){ Object.assign(r, body); send({ type:'RULE_UPDATED', payload:r }); } return R(r||{ ok:true }); }
        return R(SNAP.rules);
      }
      if (u.indexOf('/alerts')>-1 && m==='PATCH') return R({ ok:true });
    } catch(e){ /* fall through */ }
    return R({ ok:true });
  };
})();
</script>
${RIBBON}`;

  let html = read(path.join(APPS, 'nmos-quartermaster', 'frontend', 'index.html'));
  html = inject(html, stub);
  fs.writeFileSync(path.join(HERE, 'quartermaster.html'), html);
  return snap;
}

const sc = buildScout();
console.log('scout.html  ->', Object.keys(sc).map(k => k+':'+sc[k].length).join(' '));
const qm = buildQM();
console.log('quartermaster.html  -> nodes:'+qm.nodes.length, 'senders:'+qm.senders.length, 'receivers:'+qm.receivers.length, 'connections:'+qm.connections.length, 'rules:'+qm.rules.length, 'alerts:'+qm.alerts.length);
console.log('done.');
