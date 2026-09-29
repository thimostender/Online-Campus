'use strict';
// Videokonferenz für Online-Vorlesungen mit Jitsi Meet (eingebettet über die External API).
// Jeder Online-Termin hat einen eigenen, nicht erratbaren Raum. Zutritt ab 15 Minuten vor Beginn
// bis zum Ende; Lehrende jederzeit. Einschränkung des öffentlichen Servers meet.jit.si:
// eingebettete Konferenzen enden nach 5 Minuten, als eigener Tab gibt es keine Grenze.
// Für den Betrieb: eigener Jitsi-Server oder JaaS, dann nur JITSI_DOMAIN ändern.

const JITSI_DOMAIN = 'meet.jit.si';
let jitsiApi = null;

const konferenzRaum = t => `OnlineCampus-${modulVon(byId('kurs', t.kurs_id)).kuerzel}-${pseudoHash('raum' + t.id + t.kurs_id).slice(0, 14)}`;
function konferenzOffen(t) {
  const jetzt = Date.now();
  return jetzt >= D(t.beginn) - 15 * 6e4 && jetzt <= D(t.ende).getTime();
}
function darfBeitreten(t, u = ich()) {
  if (u.rolle === 'lehrend') return lehrendeVon(t.kurs_id).some(l => l.id === u.id) || t.vertretung_id === u.id;
  if (u.rolle === 'studierend') return kurseVon(u.id).some(k => k.id === t.kurs_id);
  return true;
}
// Knopf für Termin-Karten und Listen
function konferenzKnopf(t, klein = true) {
  if (t.raum_id || t.status === 'ausgefallen' || !darfBeitreten(t)) return '';
  const offen = konferenzOffen(t) || rolle() === 'lehrend';
  return `<a class="knopf ${klein ? 'klein' : ''} ${offen ? 'primaer' : ''}" href="#/konferenz/${t.id}">${I('video')} ${offen ? (rolle() === 'lehrend' ? 'Online-Raum starten' : 'Jetzt beitreten') : 'Online-Raum'}</a>`;
}

function konferenz(tid) {
  const u = ich(), t = byId('termin', tid);
  if (!t || t.raum_id || !darfBeitreten(t, u)) throw new Error('kein Zugriff');
  const offen = konferenzOffen(t) || u.rolle === 'lehrend';
  const raum = konferenzRaum(t), modul = modulVon(byId('kurs', t.kurs_id));
  const zurueck = u.rolle === 'studierend' ? `#/module/${t.kurs_id}/termine` : `#/kurse/${t.kurs_id}`;
  setTimeout(() => offen && jitsiStarten(t), 0);
  return `<a class="klein zeile" href="${zurueck}" style="gap:4px;margin-bottom:10px">${I('zurueck')} ${esc(modul.kurztitel)}</a>
  ${kopfzeile(`${esc(modul.kurztitel)} · Online`, `${fmtLang(D(t.beginn))}, ${fmtZeit(t.beginn)}–${fmtZeit(t.ende)} Uhr · ${lehrendeVon(t.kurs_id).map(l => esc(name(l))).join(', ')}`)}
  ${offen ? `<div class="konferenz-huelle"><div id="jitsi" class="konferenz"><p class="leer">Konferenz wird geladen …</p></div></div>
    <div class="zeile abstand" style="flex-wrap:wrap;gap:10px">
      <a class="knopf" href="https://${JITSI_DOMAIN}/${raum}#userInfo.displayName=%22${encodeURIComponent(name(u))}%22" target="_blank" rel="noopener">${I('pfeil')} In eigenem Tab öffnen</a>
      <button class="knopf" data-action="konferenz-verlassen" data-ziel="${zurueck}">Verlassen</button>
      <span class="klein leise" style="flex:1 1 280px">Der kostenlose Jitsi-Server beendet eingebettete Konferenzen nach 5 Minuten. Für eine ganze Vorlesung „In eigenem Tab öffnen“. Wer den Raum als erste Person betritt, muss sich bei Jitsi einmal anmelden (Google, GitHub oder Facebook) und wird Moderator.</span>
    </div>`
    : `<div class="hinweis">${I('uhr')}<div>Der Online-Raum öffnet 15 Minuten vor Beginn, also ${relTag(t.beginn)} um ${fmtZeit(new Date(D(t.beginn) - 15 * 6e4).toISOString())} Uhr. Kamera und Mikrofon kannst du vorher testen.</div></div>
    <section class="karte abstand"><h2>Technik testen</h2><video id="vorschau" autoplay muted playsinline style="width:100%;max-width:420px;border-radius:12px;background:#000;aspect-ratio:16/9"></video>
      <div class="zeile abstand"><button class="knopf" data-action="kamera-test">${I('video')} Kamera und Mikrofon testen</button></div><p id="testergebnis" class="klein leise"></p></section>`}`;
}
function jitsiStarten(t) {
  const box = document.getElementById('jitsi');
  if (!box) return;
  const los = () => {
    if (jitsiApi) { jitsiApi.dispose(); jitsiApi = null; }
    box.innerHTML = '';
    const u = ich();
    jitsiApi = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
      roomName: konferenzRaum(t), parentNode: box, width: '100%', height: '100%', lang: 'de',
      userInfo: { displayName: name(u), email: u.email },
      configOverwrite: { prejoinConfig: { enabled: true }, startWithAudioMuted: true, startWithVideoMuted: u.rolle !== 'lehrend', subject: `${modulVon(byId('kurs', t.kurs_id)).kurztitel} · Online-Campus`, disableDeepLinking: true },
      interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, MOBILE_APP_PROMO: false },
    });
    jitsiApi.addListener('videoConferenceLeft', () => { jitsiApi?.dispose(); jitsiApi = null; location.hash = u.rolle === 'studierend' ? `#/module/${t.kurs_id}/termine` : `#/kurse/${t.kurs_id}`; });
  };
  if (window.JitsiMeetExternalAPI) { los(); return; }
  const s = document.createElement('script');
  s.src = `https://${JITSI_DOMAIN}/external_api.js`;
  s.onload = los;
  s.onerror = () => { box.innerHTML = `<div class="hinweis fehler" style="margin:20px">${I('warn')}<div>Jitsi ist gerade nicht erreichbar. Prüfe die Internetverbindung oder öffne den Raum in einem eigenen Tab.</div></div>`; };
  document.head.appendChild(s);
}
// Beim Verlassen der Seite die Konferenz sauber beenden
window.addEventListener('hashchange', () => { if (jitsiApi && !location.hash.startsWith('#/konferenz/')) { jitsiApi.dispose(); jitsiApi = null; } });
AKTIONEN['konferenz-verlassen'] = el => { jitsiApi?.dispose(); jitsiApi = null; location.hash = el.dataset.ziel; };
AKTIONEN['kamera-test'] = async () => {
  const erg = document.getElementById('testergebnis');
  try {
    const strom = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('vorschau').srcObject = strom;
    erg.textContent = `Funktioniert: ${strom.getVideoTracks()[0]?.label || 'Kamera'} und ${strom.getAudioTracks()[0]?.label || 'Mikrofon'}.`;
    window.addEventListener('hashchange', () => strom.getTracks().forEach(x => x.stop()), { once: true });
  } catch (e) {
    erg.textContent = e.name === 'NotAllowedError' ? 'Zugriff verweigert. Erlaube Kamera und Mikrofon in den Einstellungen deines Browsers.' : 'Keine Kamera oder kein Mikrofon gefunden.';
  }
};
