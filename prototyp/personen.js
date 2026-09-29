'use strict';
// Personen & Rollen (Verwaltung): anlegen, deaktivieren, wieder aktivieren. Dazu "Passwort ändern" im Profil.
// Mit Backend legt die Verwaltung das Firebase-Konto über eine zweite App-Instanz an, damit sie selbst angemeldet bleibt.
// Das Startpasswort wird genau einmal angezeigt und nirgends gespeichert.

const PERSON_ROLLEN = { studierend: ['Studierende', 'm-akzent'], lehrend: ['Lehrende', 'm-info'], verwaltung: ['Verwaltung', 'm-warn'] };
const istDemoKonto = id => ['s1', 's2', 's3', 's4', 's5', 'l1', 'l2', 'l3', 'l4', 'l5', 'v1'].includes(id);

function vPersonen(q) {
  const f = q.get('rolle') || '';
  const liste = db.user.filter(x => !f || x.rolle === f).sort((a, b) => (a.aktiv === false) - (b.aktiv === false) || a.nachname.localeCompare(b.nachname));
  const fk = (k, t) => `<button data-action="gehe" data-ziel="#/personen${k ? '?rolle=' + k : ''}" aria-pressed="${f === k}">${t}</button>`;
  const zuordnung = x => x.rolle === 'studierend' ? `${esc(gruppeVon(x.id)?.name || '–')} · ${esc(x.matrikelnummer || '–')}${schwerpunktVon(x.id) ? ' · Schwerpunkt ' + (schwerpunktVon(x.id) === 'M' ? 'Medien' : 'IT') : ''}`
    : x.rolle === 'lehrend' ? (kurseVon(x.id).map(k => esc(kursName(k.id))).join(', ') || 'noch kein Lehrauftrag') : 'Studienorganisation';
  return `${kopfzeile('Personen & Rollen', 'Rechte hängen an der Rolle, nicht an der einzelnen Person.')}
  <section class="karte"><div class="zeile dazwischen" style="flex-wrap:wrap;padding:0 0 12px"><div class="filter" style="padding:0">${fk('', 'Alle')}${fk('studierend', 'Studierende')}${fk('lehrend', 'Lehrende')}${fk('verwaltung', 'Verwaltung')}</div>
    <button class="knopf primaer" data-action="person-neu">${I('plus')} Person anlegen</button></div>
  <div class="tabelle-huelle"><table><thead><tr><th>Name</th><th>Rolle</th><th>E-Mail</th><th>Zuordnung</th><th>Status</th><th></th></tr></thead><tbody>
  ${liste.map(x => { const aus = x.aktiv === false;
    return `<tr${aus ? ' class="leise"' : ''}><td class="fett">${esc(name(x))}</td><td><span class="marke-klein ${PERSON_ROLLEN[x.rolle][1]}">${PERSON_ROLLEN[x.rolle][0]}</span></td><td class="klein">${esc(x.email)}</td>
    <td class="klein">${zuordnung(x)}</td><td><span class="marke-klein ${aus ? 'm-fehler' : 'm-gut'}">${aus ? 'deaktiviert' : 'aktiv'}</span></td>
    <td>${x.id === ich().id || x.id === 'v1' ? '' : `<button class="knopf klein${aus ? '' : ' gefahr'}" data-action="person-aktiv" data-id="${x.id}">${aus ? 'Aktivieren' : 'Deaktivieren'}</button>`}</td></tr>`; }).join('')}
  </tbody></table></div>
  <p class="klein leise abstand">Deaktivierte Personen können sich nicht mehr anmelden. Ihre Noten, Abgaben und Nachrichten bleiben erhalten, deshalb wird niemand gelöscht.</p></section>`;
}

function naechsteMatrikel() {
  const jahr = new Date().getFullYear(), nr = db.user.map(u => Number(String(u.matrikelnummer || '').split('-')[1]) || 0);
  return `${jahr}-${String(Math.max(0, ...nr) + 1).padStart(4, '0')}`;
}

AKTIONEN['person-neu'] = () => {
  const kurse = db.kurs.filter(k => k.semester_id === aktSem().id).sort((a, b) => kursName(a.id).localeCompare(kursName(b.id)));
  dialog(`<form data-form="person-neu" class="person-form" data-rolle="studierend"><div class="dialog-inhalt">
    <h2>Person anlegen</h2>
    <label class="feld"><span>Rolle</span><select name="rolle" data-change="person-rolle"><option value="studierend">Studierende</option><option value="lehrend">Lehrende</option><option value="verwaltung">Verwaltung</option></select></label>
    <div class="raster raster-2" style="gap:0 12px">
      <label class="feld"><span>Vorname</span><input name="vorname" required autocomplete="off"></label>
      <label class="feld"><span>Nachname</span><input name="nachname" required autocomplete="off"></label>
    </div>
    <label class="feld" data-nur="lehrend"><span>Titel (optional)</span><input name="titel" placeholder="z. B. Prof. Dr." autocomplete="off"></label>
    <label class="feld"><span>E-Mail (Anmeldename)</span><input name="email" type="email" required placeholder="vorname.nachname@campus.example" autocomplete="off"></label>
    <div data-nur="studierend">
      <div class="raster raster-2" style="gap:0 12px">
        <label class="feld"><span>Studiengruppe</span><select name="gruppe">${db.studiengruppe.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></label>
        <label class="feld"><span>Matrikelnummer</span><input name="matrikelnummer" value="${naechsteMatrikel()}"></label>
      </div>
      <label class="feld"><span>Schwerpunkt</span><select name="schwerpunkt"><option value="">noch nicht gewählt (1. Semester)</option><option value="M">Medienmanagement</option><option value="I">IT-Management</option></select></label>
    </div>
    <fieldset class="feld" data-nur="lehrend" style="border:0;padding:0;margin:0 0 12px"><legend class="klein fett" style="margin-bottom:6px">Lehraufträge ${esc(aktSem().bezeichnung)}</legend>
      <div class="person-kurse">${kurse.map(k => `<label class="zeile klein" style="gap:8px"><input type="checkbox" name="kurse" value="${k.id}"> ${esc(kursName(k.id))}</label>`).join('')}</div></fieldset>
    <p class="klein leise">${BACKEND.aktiv ? 'Der Campus erzeugt ein Startpasswort. Du siehst es gleich einmalig und gibst es der Person weiter, sie ändert es danach im Profil.' : 'Lokaler Modus: Die Person meldet sich über das Anmeldeformular mit ihrer E-Mail an.'}</p>
    </div><div class="dialog-fuss"><button type="button" class="knopf" data-action="dialog-zu">Abbrechen</button><button class="knopf primaer">Anlegen</button></div>
  </form>`);
};
AENDERUNGEN['person-rolle'] = el => { el.form.dataset.rolle = el.value; };

function startpasswort() {
  const zeichen = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', z = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(z, n => zeichen[n % zeichen.length]).join('').replace(/(.{4})(?!$)/g, '$1-');
}
// Konto in einer zweiten Firebase-Instanz anlegen: die Verwaltung bleibt in der Hauptinstanz angemeldet
async function kontoAnlegen(email, passwort) {
  const app = firebase.apps.find(a => a.name === 'anlegen') || firebase.initializeApp(FIREBASE_KONFIG, 'anlegen');
  const auth = app.auth();
  await auth.setPersistence(firebase.auth.Auth.Persistence.NONE);
  const cred = await auth.createUserWithEmailAndPassword(email, passwort);
  const uid = cred.user.uid;
  await auth.signOut();
  return uid;
}

FORMULARE['person-neu'] = async (f, fd) => {
  const rolle = fd.get('rolle'), email = String(fd.get('email')).trim().toLowerCase();
  const vorname = String(fd.get('vorname')).trim(), nachname = String(fd.get('nachname')).trim();
  if (db.user.some(u => u.email.toLowerCase() === email)) { toast('E-Mail schon vergeben', 'Zu dieser E-Mail gibt es bereits eine Person im Campus.'); return; }
  const matrikel = String(fd.get('matrikelnummer') || '').trim();
  if (rolle === 'studierend' && !/^\d{4}-\d{4}$/.test(matrikel)) { toast('Matrikelnummer prüfen', 'Format: Jahr-Nummer, zum Beispiel 2026-0201.'); return; }
  if (rolle === 'studierend' && db.user.some(u => u.matrikelnummer === matrikel)) { toast('Matrikelnummer schon vergeben', `Vorschlag: ${naechsteMatrikel()}`); return; }
  const knopf = f.querySelector('button.primaer'); knopf.disabled = true; knopf.textContent = 'Wird angelegt …';
  let id, passwort = null;
  try {
    if (BACKEND.aktiv) { passwort = startpasswort(); id = await kontoAnlegen(email, passwort); }
    else id = 'p' + Date.now().toString(36);
  } catch (e) {
    knopf.disabled = false; knopf.textContent = 'Anlegen';
    toast('Konto nicht angelegt', { 'auth/email-already-in-use': 'Für diese E-Mail gibt es schon ein Anmeldekonto. Bitte eine andere E-Mail wählen.', 'auth/invalid-email': 'Die E-Mail-Adresse ist ungültig.' }[e.code] || e.message);
    return;
  }
  const u = { id, vorname, nachname, email, rolle, aktiv: true, angelegt_am: new Date().toISOString(), angelegt_von: ich().id };
  if (rolle === 'lehrend') u.titel = String(fd.get('titel') || '').trim();
  if (rolle === 'studierend') {
    u.matrikelnummer = matrikel;
    db.gruppenmitglied.push({ user_id: id, gruppe_id: Number(fd.get('gruppe')), von: new Date().toISOString().slice(0, 10), bis: null });
    if (fd.get('schwerpunkt')) db.schwerpunkt_wahl.push({ user_id: id, schwerpunkt: fd.get('schwerpunkt'), gewaehlt_am: new Date().toISOString() });
  }
  db.user.push(u);
  if (rolle === 'lehrend') fd.getAll('kurse').forEach(k => db.lehrauftrag.push({ kurs_id: Number(k), lehrender_id: id, rolle: lehrendeVon(Number(k)).length ? 'mitwirkend' : 'verantwortlich' }));
  speichern(); render();
  if (!passwort) { dialogZu(); toast(`${name(u)} angelegt`, 'Anmeldung über das Formular mit der E-Mail.'); return; }
  dialog(`<div class="dialog-inhalt"><h2>${esc(name(u))} ist angelegt</h2>
    <p>Anmeldung mit <b>${esc(email)}</b> und diesem Startpasswort:</p>
    <p class="startpasswort"><code>${passwort}</code> <button class="knopf klein" data-action="kopieren" data-text="${passwort}">Kopieren</button></p>
    <div class="hinweis">${I('info')}<div>Das Passwort wird nur jetzt angezeigt und nicht gespeichert. Die Person ändert es nach der ersten Anmeldung unter Profil › Passwort ändern.</div></div>
    </div><div class="dialog-fuss"><button class="knopf primaer" data-action="dialog-zu">Fertig</button></div>`);
};
AKTIONEN.kopieren = async el => { try { await navigator.clipboard.writeText(el.dataset.text); toast('Kopiert'); } catch { toast('Kopieren nicht möglich', 'Bitte markieren und von Hand kopieren.'); } };

AKTIONEN['person-aktiv'] = el => {
  const u = byId('user', el.dataset.id); if (!u || u.id === ich().id) return;
  const neu = u.aktiv === false;
  if (!neu && !confirm(`${name(u)} deaktivieren? Die Person kann sich danach nicht mehr anmelden, ihre Daten bleiben erhalten.`)) return;
  u.aktiv = neu; speichern(); render();
  toast(neu ? `${name(u)} ist wieder aktiv` : `${name(u)} ist deaktiviert`);
};

// ---------- Profil: Passwort ändern ----------
AKTIONEN['passwort-aendern'] = () => {
  if (!BACKEND.aktiv) { toast('Nur mit Backend', 'Im lokalen Modus gibt es keine echten Passwörter.'); return; }
  if (istDemoKonto(ich().id)) { toast('Demo-Konto', 'Die Beispielkonten teilen sich ein Passwort, damit alle im Team testen können. Es lässt sich hier nicht ändern.'); return; }
  dialog(`<form data-form="passwort-aendern"><div class="dialog-inhalt"><h2>Passwort ändern</h2>
    <label class="feld"><span>Bisheriges Passwort</span><input name="alt" type="password" autocomplete="current-password" required></label>
    <label class="feld"><span>Neues Passwort (mindestens 10 Zeichen)</span><input name="neu" type="password" autocomplete="new-password" minlength="10" required></label>
    <label class="feld"><span>Neues Passwort wiederholen</span><input name="neu2" type="password" autocomplete="new-password" minlength="10" required></label>
    </div><div class="dialog-fuss"><button type="button" class="knopf" data-action="dialog-zu">Abbrechen</button><button class="knopf primaer">Speichern</button></div></form>`);
};
FORMULARE['passwort-aendern'] = async (f, fd) => {
  if (fd.get('neu') !== fd.get('neu2')) { toast('Passwörter stimmen nicht überein', 'Bitte das neue Passwort zweimal gleich eingeben.'); return; }
  const nutzer = BACKEND.auth.currentUser;
  try {
    await nutzer.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(nutzer.email, String(fd.get('alt'))));
    await nutzer.updatePassword(String(fd.get('neu')));
    dialogZu(); toast('Passwort geändert', 'Ab der nächsten Anmeldung gilt das neue Passwort.');
  } catch (e) {
    toast('Nicht geändert', ['auth/invalid-credential', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(e.code) ? 'Das bisherige Passwort stimmt nicht.' : e.code === 'auth/weak-password' ? 'Das neue Passwort ist zu schwach.' : e.message);
  }
};
