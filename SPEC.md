# Maintainer's Will – Spec

Sep 27, 2026 · @Loopius

## Zusammenfassung

Maintainer's Will ist eine GitHub Action plus eine Datei `WILL.md`, die ein Open-Source-Projekt an vorab benannte Nachfolger übergibt, wenn der Maintainer über eine definierte Zeit inaktiv bleibt – öffentlich, in Stufen und jederzeit vom Maintainer abbrechbar. Zielgruppe sind Solo-Maintainer und kleine Teams, deren Projekt an einem persönlichen GitHub-Account hängt.

- **Trigger:** Inaktivität des Maintainers (Standard 180 Tage), danach 30 Tage Karenz mit öffentlicher Warnung.
- **Nachfolger:** vorab benannt, müssen ihre Nominierung bestätigen; keine offene Adoption.
- **Übergabe:** Rechte-Eskalation im Repo erst nach Zustimmung eines Nachfolgers, dazu README-Banner, Sponsoren- und Nutzerinfo, vorbereitete Registry-Anträge.
- **Kein Hosting nötig:** alles läuft als Action im Repo; ein gehosteter Modus kommt später.
- **Name:** provisorisch. Kandidaten: `maintainers-will`, `bequest`, `heir`. Lizenz MIT.

## Problem & Ausgangslage

Projekte sterben meist nicht durch den Tod des Maintainers, sondern weil er still verschwindet – und für diesen Fall gibt es heute kein Werkzeug. Was existiert, greift entweder nur beim Todesfall, erst nach dem Verschwinden oder wird von keinem Tool gelesen.

| Mechanismus | Was er leistet | Lücke |
| --- | --- | --- |
| [GitHub Successor-Einstellung](https://nesbitt.io/2026/06/16/how-open-source-projects-change-hands.html) (seit 2020) | Benannte Person darf nach Sterbeurkunde + 7 Tagen (oder Todesanzeige + 21 Tagen) Repos archivieren oder übernehmen | Nur Todesfall; deckt Repos, nicht Registry-Konten |
| Registry-Prozesse (CPAN ADOPTME/HANDOFF, RubyGems Ownership Calls, PyPI [PEP 541](https://peps.python.org/pep-0541/)) | Übernahme verwaister Paketnamen nach Antrag | Manuell, erst nach dem Verschwinden; PEP 541 verlangt Kontaktversuche und einen funktionierenden Fork als Nachweis |
| Distro-Orphan-Prozesse (Debian RFA, Fedora Orphan-User, AUR, CRAN) | Formale Zustandsautomaten für herrenlose Pakete | Nur für Distributionen, nicht für Sprach-Registries oder Repos |
| [repostatus](https://www.repostatus.org/)-Badge, „looking for maintainers" im README | Signal an Menschen | Kein Tool wertet es aus |
| [Stale Repos Action](https://github.blog/open-source/maintainers/announcing-the-stale-repos-action/) (GitHub OSPO, 2023) | Report inaktiver Repos einer Organisation | Report, keine Übergabe |
| Generische Dead-Man's-Switches | Passwörter, Wallets, Nachrichten | Kein Bezug zu Repos oder Registries |

Der Bedarf ist dokumentiert: eine [GitHub-Diskussion von 2020](https://github.com/orgs/community/discussions/23164) wünscht sich, dass Maintainer regelmäßig bestätigen müssen, ihr Repo noch zu betreuen, und ein [Docs-Issue vom Oktober 2025](https://github.com/github/docs/issues/40673) fragt, ob der Successor-Mechanismus auch für einen lebenden, aber unerreichbaren Maintainer gilt – ohne klare Antwort. Andrew Nesbitts Inventar vom Juni 2026 hält fest, dass der gewählte Nachfolger als Modell praktisch keine unterstützende Infrastruktur hat.

Die Gegenseite ist ebenso dokumentiert: Im Juni 2026 übernahm ein Angreifer über 400 verwaiste AUR-Pakete und fügte jedem einen Schadcode-Download hinzu; event-stream (2018) und xz (2024) waren Übergaben an Fremde ohne Prüfung. Offene Adoption ohne Gatekeeping ist deshalb keine Option, sondern ein Angriffsvektor.

## Designprinzipien

Sechs Regeln entscheiden jede Detailfrage; wo sie sich widersprechen, gewinnt die höhere.

1. **Inaktivität, nicht Tod.** Burnout, Jobwechsel, Kind, Krankheit sind der häufige Fall. Der Todesfall bleibt bei GitHubs Successor-Einstellung; beides ergänzt sich.
2. **Vorab benannt, vorab bestätigt.** Nur Nachfolger, die in `WILL.md` stehen und ihre Nominierung öffentlich angenommen haben, kommen infrage. Offene Adoption ist kein Standard, sondern ein separater, langsamerer Opt-in-Modus ohne automatische Rechtevergabe.
3. **Öffentlich und umkehrbar.** Jede Stufe ist im Repo sichtbar (Issue, Badge, README), jede Frist ist bekannt, und ein einziges Lebenszeichen des Maintainers setzt alles zurück. Nichts passiert im Verborgenen, nichts passiert sofort.
4. **Maschinenlesbar.** `WILL.md` hat ein festes Front-Matter-Schema, damit Badges, Dashboards, Registries und andere Tools es lesen können. Ein Badge, das kein Tool liest, hat niemandem geholfen.
5. **Minimale Rechte, gated.** Die Action hält im Normalbetrieb nur Leserechte. Der eine Schritt, der Rechte vergibt, läuft in einem geschützten Environment und erst nach Freigabe durch einen Nachfolger.
6. **Kein Hosting, kein Konto.** v1 ist eine Action im Repo plus eine CLI. Alles Wissen liegt im Repo, nichts bei uns – auch damit das Tool selbst keinen Bus-Faktor 1 hat.

## Ablauf in Stufen

&#91;embedded content: Ablauf · 4 Stufen, 2 Ausgänge, 1 Rückweg\]

Die Stufen laufen von links nach rechts mit festen Fristen; die Rückkehr des Maintainers führt aus jeder Stufe zurück auf Aktiv, das Protokoll bleibt erhalten.

| Stufe | Auslöser | Was die Action tut | Badge |
| --- | --- | --- | --- |
| Aktiv | wöchentlicher Lauf | letzte Maintainer-Aktivität in `.will/state.json` festhalten | active · seen 3d ago |
| Erinnerung | 90 Tage ohne Signal (50 % des Fensters) | Maintainer im Will-Issue erwähnen (löst GitHub-Mail aus); optional Mail an hinterlegte Adresse | active |
| Warnung | 180 Tage ohne Signal | öffentliches, gepinntes Issue mit Fristende, Nachfolger erwähnen, Hinweis oben im README | warning |
| Übergabe | 30 Tage Karenz verstrichen | Handover-Job startet und wartet auf Freigabe eines Nachfolgers; Sponsoren aus `FUNDING.yml` informieren | succession |
| Übergeben | ein Nachfolger hat freigegeben | Rolle je nach Repo-Typ: write, admin oder Org-Owner, README-Banner, Registry-Anträge generiert, Protokoll im Issue | handed over |
| Fallback | 60 Tage ohne Freigabe | je nach `fallback`: Adoption öffentlich ausschreiben (ohne Rechte) oder Repo archivieren | seeking adopter |

## WILL.md – das Format

`WILL.md` liegt im Repo-Root und besteht aus einem YAML-Front-Matter, das Tools lesen, und einem Markdown-Teil, den Menschen lesen. Ein einziges Dokument für beide, damit es gefunden wird (GitHub-Codesuche `path:WILL.md`) und damit Änderungen als normale Commits nachvollziehbar sind.

```markdown
---
will: 1
maintainer: octocat
heartbeat:
  inactivity: 180d        # ohne Signal → Warnung
  remind_at: 50%          # Erinnerung bei der Hälfte
  grace: 30d              # Warnung → Übergabe
  accept_within: 60d      # Übergabe → Fallback
  signals: [commits, comments, reviews, releases, check-in]
  scope: repo             # oder: account (alle öffentlichen Events)
successors:
  - login: alice
    role: primary
    acknowledged: 2026-09-27   # setzt der Bot, wenn alice zusagt
  - login: bob
    role: backup
quorum: 1                 # wie viele Nachfolger freigeben müssen
grant: write              # write | admin | org-owner
fallback: adopt           # adopt | archive | none
registries:
  - type: npm
    name: my-package
  - type: pypi
    name: my_package
notify:
  sponsors: true          # aus FUNDING.yml
  channels: [issue, readme, discussions]
change_cooldown: 30d      # Änderungen an successors/grant werden erst danach wirksam
---

# Maintainer's Will für my-package

Warum ich das schreibe, was mir für das Projekt wichtig ist, was die
Nachfolger wissen sollten (Lizenz bleibt MIT, keine Telemetrie,
Release-Prozess steht in RELEASING.md).
```

| Feld | Pflicht | Bedeutung |
| --- | --- | --- |
| `will` | ja | Schema-Version; Tools lehnen unbekannte Versionen ab |
| `maintainer` | ja | GitHub-Login, dessen Aktivität gemessen wird; mehrere Logins erlaubt, dann zählt der letzte Aktive |
| `heartbeat.inactivity` | ja | Fenster ohne Signal bis zur Warnung; Suffixe `d`, `w`, `m` |
| `heartbeat.signals` | nein | welche Ereignisse als Lebenszeichen gelten; Standard alle fünf |
| `successors[].login` | ja | mindestens einer; `acknowledged` schreibt nur der Bot nach öffentlicher Zusage |
| `quorum` | nein | 1 für kleine Projekte; 2 für Pakete mit vielen Abhängigen |
| `grant` | nein | Rolle, die vergeben wird; `admin` und org-owner gibt es nur in Organisationen; auf persönlichen Repos ist write die einzige Option |
| `fallback` | nein | was passiert, wenn kein Nachfolger freigibt; `adopt` vergibt nie Rechte automatisch |
| `registries[]` | nein | Pakete, für die Anträge vorbereitet werden; die CLI schlägt sie aus den Manifesten vor |
| `change_cooldown` | nein | Schutz gegen gekaperte Accounts: geänderte Nachfolger gelten erst nach Frist und öffentlicher Ankündigung |

Der Markdown-Teil ist frei. Empfohlene Abschnitte: Wünsche für das Projekt, Hinweise zu Release und Infrastruktur, Kontaktwege zu den Nachfolgern. Nichts davon ist rechtlich bindend; es ist ein öffentliches Versprechen, kein Testament im juristischen Sinn.

## Trigger-Logik & Zustandsmaschine

Gemessen wird nicht „Aktivität im Repo", sondern „Aktivität des Maintainers": Commits des Bots, Dependabot-PRs oder fremde Issues halten den Zähler nicht am Leben. Ein einziges echtes Signal setzt ihn auf null.

**Signale (Standard, alle über die GitHub-API abfragbar):**

- Commits, deren Author oder Committer der Maintainer-Login ist, auf jedem Branch
- Kommentare, Reviews und Reaktionen des Maintainers in Issues und PRs
- Releases und Tags, die der Maintainer erstellt hat
- Expliziter Check-in: Kommentar `/alive` im Will-Issue, `workflow_dispatch` des Heartbeat-Workflows oder `will check-in` aus der CLI
- Optional `scope: account`: jedes öffentliche Ereignis des Accounts (Events-API), damit ein Maintainer, der nur an anderen Repos arbeitet, nicht als verschwunden gilt

**Zustand** liegt in `.will/state.json`, das der Bot per Commit fortschreibt: `stage`, `last_seen`, `last_signal`, `stage_since`, `notified[]`. Jeder Stufenwechsel wird zusätzlich als Kommentar im Will-Issue protokolliert, damit er auch ohne Git-Log lesbar ist.

**Übergänge:**

1. `active → reminder`: `now − last_seen ≥ inactivity × remind_at`
2. `reminder → warning`: `now − last_seen ≥ inactivity`
3. `warning → handover`: `now − stage_since ≥ grace`
4. `handover → handed_over`: Freigaben ≥ `quorum`
5. `handover → fallback`: `now − stage_since ≥ accept_within` ohne Quorum
6. `* → active`: jedes Signal des Maintainers; Warn-Issue wird geschlossen, README-Hinweis entfernt, Vermerk „Maintainer zurück am …" bleibt

**Die 60-Tage-Falle.** GitHub deaktiviert `schedule`-Workflows in Repos ohne Commit-Aktivität nach 60 Tagen – genau in dem Moment, in dem ein Dead-Man's-Switch arbeiten müsste. Lösung: Der wöchentliche Heartbeat-Lauf committet `.will/state.json` mit Bot-Identität; das zählt für GitHub als Aktivität und hält den Schedule am Leben, wird aber vom Bot selbst nicht als Maintainer-Signal gewertet. Als zweite Absicherung kann `will doctor` einen externen Pinger eintragen (z. B. ein Cron auf einem anderen Repo des Nachfolgers, das per `repository_dispatch` anstößt). Der gehostete Modus (v1.0) löst das Problem grundsätzlich.

## Die Übergabe technisch

&#91;embedded content: Architektur · 2 Rechtezonen, 1 Freigabe\]

Oben läuft alles mit dem normalen `GITHUB_TOKEN`; erst der Handover-Job unten hat Zugriff auf das App-Secret, und den bekommt er nur, wenn ein Nachfolger den Environment-Review freigibt.

**Environment-Gating statt eigenem Auth-System.** GitHub Environments können Required Reviewers und eigene Secrets tragen; in öffentlichen Repos ist das kostenlos. `will init` legt das Environment `maintainer-will` an, trägt die bestätigten Nachfolger als Reviewer ein und hinterlegt dort App-ID und Private Key. Die Freigabe des wartenden Jobs ist damit zugleich die Zustimmung des Nachfolgers, mit Zeitstempel und Namen im Actions-Log. Bei `quorum: 2` wartet der Job auf zwei Freigaben (Environment-Regel „prevent self-review“ + Mindestzahl).

**Warum eine GitHub App und kein PAT.** Ein Personal Access Token hängt am Konto des Maintainers, läuft ab oder wird mit dem Konto ungültig – genau dann, wenn es gebraucht würde. Eine App-Installation ist davon entkoppelt. Ohne Hosting muss der Maintainer die App selbst anlegen (fünf Minuten, `will init` führt durch): Berechtigungen `Administration: write`, `Contents: write`, `Issues: write`, installiert nur auf diesem Repo. Der Handover-Job mintet daraus per `actions/create-github-app-token` ein Token, das nach einer Stunde verfällt.

**Rechte-Eskalation.** Persönliche Repos kennen nur Owner und Collaborator (write); die API ignoriert dort jede feinere Rolle. Auf persönlichen Repos lädt der Handover-Job den Nachfolger deshalb erst bei der Übergabe als Collaborator ein – der Nachfolger ist in diesem Moment ohnehin anwesend, weil er gerade freigegeben hat, und nimmt die Einladung an. Damit hat er Push, Merge und Releases (über Trusted Publishing aus dem Repo-Workflow), aber keine Settings, keine Secrets und keine Übertragung: Das ist die Obergrenze persönlicher Repos. Wer volle Nachfolge will, legt das Repo in eine eigene Organisation; `will init` bietet das an (Übertragung mit dauerhafter Weiterleitung, fünf Minuten). Dort bekommt der Nachfolger bei der Nominierung `triage`, und der Handover-Job setzt per `PUT /repos/{owner}/{repo}/collaborators/{login}` die Rolle `admin` oder per `PUT /orgs/{org}/memberships/{login}` die Rolle Org-Owner (`grant: org-owner`), sodass der Nachfolger alles übernehmen kann.

**Sichtbar machen.** Der Job committet einen Block oben ins README (Stand, Nachfolger, Link zum Will-Issue), aktualisiert `.will/badge.json` für das shields.io-Endpoint-Badge, setzt einen vorhandenen repostatus-Badge um und schreibt den Abschluss ins Will-Issue. Sponsoren aus `FUNDING.yml` werden per Issue-Erwähnung informiert, Registry-Anträge landen als Dateien unter `.will/registry/`.

## Registry-Brücke

Keine Registry erlaubt es, Paket-Eigentum per API zu übertragen – die eigentliche Brücke wird deshalb *vor* dem Ernstfall gebaut: Nachfolger werden heute als Mit-Eigentümer eingetragen, und Publishing wird ans Repo statt ans Konto gebunden. Im Ernstfall bleibt nur noch Papierkram, und den bereitet das Tool vor.

| Registry | Vorher (Prävention, prüft `will doctor`) | Im Ernstfall (generiert der Handover-Job) |
| --- | --- | --- |
| npm | Nachfolger per `npm owner add`; Trusted Publishing aus dem Repo-Workflow | Kein Transfer durch npm („we do not transfer package ownership"). Vorlage für `npm deprecate` mit Verweis auf Nachfolgepaket, falls noch ein Owner erreichbar ist |
| PyPI | Nachfolger als Collaborator mit Rolle Owner; Trusted Publisher auf Repo + Workflow + Environment | [PEP 541](https://peps.python.org/pep-0541/)-Antrag als Issue-Text: Kontaktversuche, Daten, Link auf das öffentliche Will-Issue – genau die Nachweise, die PEP 541 verlangt |
| RubyGems | `gem owner --add`; Trusted Publishing | Vorlage für einen Ownership Call bzw. Request |
| crates.io | Nachfolger als Owner (`cargo owner --add`); Trusted Publishing | Kein Mediationsprozess mehr; Hinweis: Fork unter neuem Namen plus `[badges]`/Deprecation im alten Crate, falls Zugriff besteht |
| CPAN | Nachfolger als Co-Maintainer über PAUSE | Anleitung für HANDOFF/ADOPTME-Flag und PAUSE-Admin-Anfrage |

**Trusted Publishing ist der Hebel.** Wenn PyPI, npm, RubyGems oder crates.io dem Repo-Workflow vertrauen statt einem Konto-Token, wandert das Veröffentlichungsrecht mit dem Repo: Wer `admin` auf dem Repo hat, kann releasen, ohne dass irgendwer ein Registry-Passwort kennt. `will doctor` prüft deshalb pro Manifest (`package.json`, `pyproject.toml`, `*.gemspec`, `Cargo.toml`), ob Trusted Publishing eingerichtet ist, ob der Release-Workflow das Environment nutzt und ob jeder bestätigte Nachfolger als Owner eingetragen ist – und meldet Lücken als Bus-Faktor-Befund.

**Grenzen, offen benannt:** Bei Trusted Publishing ist die Konfiguration an Owner/Repo-Name gebunden; überträgt der Nachfolger das Repo an sich, muss er den Publisher-Eintrag anpassen (das Tool erinnert daran). npm-Namen ohne erreichbaren Owner sind verloren; das ist Registry-Politik, kein Tool-Problem, und die Vorlage sagt das ehrlich.

## Sicherheit & Bedrohungsmodell

Das Tool vergibt Adminrechte auf Software, von der andere abhängen – es ist selbst ein Supply-Chain-Baustein und wird so entworfen. Grundsatz: Es macht Übergaben, die heute im Verborgenen und ungeprüft passieren, öffentlich, langsam und protokolliert; es schafft keinen neuen Weg, schneller an ein Projekt zu kommen.

| Angriff | Vorbild | Gegenmaßnahme |
| --- | --- | --- |
| Sockenpuppen setzen den Maintainer unter Druck, einen Fremden aufzunehmen | xz (2024) | Nominierung ist ein bewusster Commit des Maintainers mit 30 Tagen `change_cooldown` und öffentlicher Ankündigung im Will-Issue; das Tool nominiert nie von selbst und empfiehlt, keinen zu nominieren, der nicht schon Beiträge im Repo hat |
| Jemand „fragt nett" und bekommt das Paket | event-stream (2018) | Offene Adoption ist kein Standardpfad; `fallback: adopt` schreibt nur aus und vergibt keine Rechte, die Vergabe bleibt ein manueller Schritt mit Wartefrist |
| Massenübernahme verwaister Pakete | AUR, Juni 2026 | Nur vorab benannte, bestätigte Logins kommen infrage; kein Prozess, den ein Fremder anstoßen kann |
| Maintainer-Konto gekapert, Angreifer trägt sich als Nachfolger ein | – | Änderungen an `successors`, `grant`, `quorum` werden erst nach `change_cooldown` wirksam, alle bisherigen Nachfolger werden erwähnt; optional: nur signierte Commits (`require_signed: true`) ändern die Liste |
| Nachfolger-Konto gekapert | – | Bestätigung setzt 2FA voraus (API-Feld prüfbar); Freigabe im Environment ist ein zweiter, geloggter Schritt; `quorum: 2` für Pakete mit vielen Abhängigen |
| Angreifer mit Write-Zugriff ändert den Workflow, um an das App-Secret zu kommen | – | Das Secret liegt im Environment, das nur nach Reviewer-Freigabe erreichbar ist; Wer Write hat, ist ohnehin schon vertrauenswürdig – die Grenze wird nicht verschoben |
| Falscher Alarm: Maintainer im Sabbatical | – | Erinnerung bei 50 %, Warnung öffentlich mit 30 Tagen Karenz, Reset mit einem Kommentar; `scope: account` zählt Aktivität in anderen Repos mit |
| Das Tool selbst wird gekapert (Action aus dem Marketplace) | – | Action per Commit-SHA pinnen, Releases signiert; das Tool hat selbst eine `WILL.md` |

Was das Tool bewusst **nicht** kann: Registry-Eigentum übertragen, private Schlüssel oder Passwörter weitergeben, Rechte ohne menschliche Freigabe vergeben. Wer das braucht, braucht ein anderes Werkzeug – und sollte misstrauisch sein, wenn eines es verspricht.

## Bedienung: CLI, Kommandos, Badge

Ein Maintainer soll in unter zehn Minuten fertig sein: `npx maintainers-will init`, drei Fragen, ein PR. Alles Weitere passiert im Will-Issue per Kommentar, damit auch Nachfolger ohne CLI mitmachen können.

**CLI** (Node, damit `npx` ohne Installation läuft; teilt sich den Kern mit der Action):

| Befehl | Was er tut |
| --- | --- |
| `will init` | fragt Maintainer-Login, Nachfolger, Fenster; erzeugt `WILL.md`, den Workflow, das Environment, das gepinnte Will-Issue und einen PR; führt durch das Anlegen der GitHub App |
| `will nominate <login>` | trägt einen Nachfolger ein, fügt ihn in Org-Repos als Collaborator (`triage`) hinzu, erwähnt ihn im Will-Issue zur Bestätigung |
| `will check-in` | setzt `last_seen` per `workflow_dispatch`; für Maintainer, die gerade nichts committen |
| `will doctor` | Bus-Faktor-Check: unbestätigte Nachfolger, fehlende Registry-Owner, kein Trusted Publishing, App-Installation fehlt, Schedule deaktiviert, PAT statt App |
| `will status` | aktuelle Stufe, Tage bis zur nächsten, letzte Signale |
| `will simulate` | spielt den Ablauf im Trockenlauf durch und zeigt, wer wann was sehen würde |

**Kommentar-Kommandos im Will-Issue** (der Bot prüft, wer schreibt):

- `/alive` – Maintainer setzt auf Aktiv zurück
- `/accept-nomination` – Nachfolger bestätigt; der Bot schreibt `acknowledged` in `WILL.md`
- `/decline` – Nachfolger tritt zurück; Maintainer wird erwähnt
- `/pause 90d` – Maintainer pausiert den Zähler mit Ankündigung (Sabbatical, Elternzeit); öffentlich sichtbar
- `/handover` – Maintainer startet die Übergabe freiwillig und sofort, ohne Fristen

**Badge** über `.will/badge.json` (shields.io-Endpoint): `will: active · seen 3d ago` grün, `warning` orange, `succession` rot, `handed over` blau, `seeking adopter` grau. Das Badge ist gleichzeitig Werbung: Wer es im README sieht, findet das Tool.

**Verzeichnis:** Weil `WILL.md` einen festen Namen hat, ist die GitHub-Codesuche das Verzeichnis aller Projekte mit Nachfolgeplan – und eine kleine statische Seite kann daraus eine Liste „Projekte, die Nachfolger suchen" bauen. Das ist die Community-Fläche für v0.3.

## MVP-Roadmap

v0.1 ist heute Abend in drei bis vier Stunden machbar, weil es nur liest und kommentiert; alles, was Rechte vergibt, kommt erst in v0.2 mit dem Environment-Gating.

| Version | Umfang | Gate zum Weitermachen |
| --- | --- | --- |
| v0.1 – heute Abend | `WILL.md`-Parser mit Schema; Heartbeat-Action (schedule + `workflow_dispatch`): Maintainer-Aktivität per API, Stufen Aktiv/Erinnerung/Warnung, `.will/state.json`, Badge, Will-Issue mit Protokoll; Übergabe nur als Trockenlauf-Kommentar; `will init` erzeugt `WILL.md` + Workflow; `will simulate`; README mit Story | Läuft auf deinem eigenen Repo; mit `inactivity: 1d` lässt sich der ganze Ablauf in zwei Tagen provozieren |
| v0.2 – Woche 1 | Nominierung mit `/accept-nomination`, `/alive`, `/pause`, `/handover`; Environment-gated Handover-Job mit App-Token; `will nominate`; README-Banner; Org-Modus (`triage` → `admin` / Org-Owner) | Echte Übergabe auf einem Testrepo an einen zweiten Account, ohne Eingriff außer der Freigabe |
| v0.3 – Woche 2–3 | `will doctor` mit Registry- und Trusted-Publishing-Checks; Antragsvorlagen (PEP 541, RubyGems, npm deprecate); Sponsoren-Info; statische Verzeichnisseite aus der Codesuche | 20 fremde Repos mit `WILL.md`; erste externe PRs für Registry-Adapter |
| v1.0 – Monat 2–3 | Gehostete GitHub App (keine selbstgebaute App mehr, externer Scheduler statt 60-Tage-Workaround); `quorum: 2`; signierte Commits für `WILL.md`; Banner-Übersetzungen | Security-Review durch Dritte; erstes Paket mit über 1 Mio. Downloads pro Woche an Bord |

Stack: TypeScript, Node 20, ein Repo für Action und CLI (`packages/core`, `packages/action`, `packages/cli`), Octokit, `zod` für das Schema, Vitest; die Action wird mit `ncc` gebündelt. Der Kern ist reine Funktion mit injizierter Zeit, damit `will simulate` und die Tests denselben Code fahren.

## Launch-Plan

Heute Abend wird veröffentlicht, aber noch nicht auf Hacker News gepostet: Sonntagabend ist dort die schlechteste Zeit. Der „Show HN" kommt am Dienstag zwischen 14 und 16 Uhr UTC, wenn v0.1 zwei Tage auf echten Repos gelaufen ist.

1. **README als Geschichte** (heute): Bus-Faktor 1, GitHubs Successor gilt nur im Todesfall, das Inventar von Nesbitt, event-stream, xz, die 400 AUR-Pakete – dann der Satz „Your project needs a will." Danach in drei Zeilen: `npx maintainers-will init`, was passiert, was nie passiert (keine Rechte ohne menschliche Freigabe).
2. **Dogfooding** (heute): `WILL.md` im Tool-Repo selbst und in zwei eigenen Projekten, Badge im README.
3. **Demo** (Montag): GIF von `will simulate`, das den gesamten Ablauf in 30 Sekunden zeigt.
4. **Soft Launch** (Montag): Mastodon/fosstodon, Bluesky, Lobsters, r/opensource. Nachricht an Andrew Nesbitt mit Bitte um Feedback – sein ecosyste.ms könnte `WILL.md` indexieren; das wäre der größte Hebel für Sichtbarkeit.
5. **Show HN** (Dienstag): Titel „Show HN: Maintainer's Will – a dead man's switch for open source projects" oder „Show HN: WILL.md – succession plans for open source, enforced by a GitHub Action". Erste Stunde: jeden Kommentar beantworten, Sicherheitsfragen ernst nehmen, Bedrohungsmodell verlinken.
6. **Erste 20 Maintainer** (Woche 1): Solo-Maintainer beliebter Pakete, Leute mit „looking for maintainers" im README, Sponsors-Empfänger. Jedem einen fertigen PR mit `WILL.md` anbieten, nicht nur einen Link.
7. **Beitragsflächen** öffnen: Registry-Adapter (eine Datei pro Registry), Banner-Übersetzungen, `doctor`-Checks, Good-first-issues; GitHub Discussions statt Discord in den ersten Wochen.

## Offene Fragen & Risiken

- [ ] Name: ist `maintainers-will` auf npm frei? Alternativen `bequest`, `heir`, `succession-action`.
- [ ] Bestätigen, dass Required Reviewers für Environments in öffentlichen Repos auf dem Free-Plan verfügbar sind und Leserecht für Reviewer genügt.
- [ ] Aktivitätsmessung ohne Search-API (Rate-Limit 30/min): Events-API für die letzten 90 Tage, dann Commits mit `author=login` und `since`, dann Kommentare – reicht das für Repos mit 10.000 Commits?
- [ ] Öffentlichkeit der Warnung: optionaler Modus, in dem die ersten 7 Tage nur die Nachfolger informiert werden (Schutz vor „Dein Projekt ist tot"-Druck)?
- [ ] Persönliche Repos: reicht die Write-Obergrenze für die meisten, oder muss `will init` den Umzug in eine Organisation stärker empfehlen?
- [ ] Mehrere Maintainer: Inaktivität erst, wenn alle still sind (`maintainer` als Liste)?
- [ ] 2FA-Prüfung der Nachfolger ist per API nur für Org-Mitglieder möglich; auf persönlichen Repos bleibt es bei der Selbstauskunft im `/accept-nomination`.
- [ ] Rechtlicher Hinweis im README: kein Testament, keine Rechtsberatung; prüfen, ob GitHubs Nutzungsbedingungen für Apps Einschränkungen für Rechteänderungen enthalten.
- [ ] Missbrauch als Druckmittel gegen Maintainer: Warnungen sind nur vom Maintainer selbst konfigurierbar und nie durch Dritte anstoßbar – das bleibt Grundsatz.

## Quellen

- [How Open Source Projects Change Hands – Andrew Nesbitt, 16.06.2026](https://nesbitt.io/2026/06/16/how-open-source-projects-change-hands.html)
- [Dumb Ways for an Open Source Project to Die – Andrew Nesbitt, 19.05.2026](https://nesbitt.io/2026/05/19/dumb-ways-for-an-open-source-project-to-die.html)
- [PEP 541 – Package Index Name Retention](https://peps.python.org/pep-0541/)
- [GitHub Docs Issue #40673 – Maintaining ownership continuity](https://github.com/github/docs/issues/40673)
- [GitHub Community Discussion #23164 – abandoned repositories](https://github.com/orgs/community/discussions/23164)
- [Announcing the Stale Repos Action – GitHub Blog, 2023](https://github.blog/open-source/maintainers/announcing-the-stale-repos-action/)
- [repostatus.org](https://www.repostatus.org/)
