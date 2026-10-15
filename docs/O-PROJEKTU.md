# EsportsHub: o projektu

Ovaj dokument objašnjava **šta je EsportsHub, koji problem rješava i kako je zamišljen**, bez uputstava za pokretanje (ona su u [README.md](../README.md)). Pisan je za čitaoca koji je iskusan programer, ali ne mora poznavati esport ni League of Legends. Na kraju je kratak rječnik pojmova iz svijeta igara.

## Ukratko

EsportsHub je web platforma za **amaterska esport takmičenja**. Na jednom mjestu spaja tri stvari koje se danas na amaterskoj sceni rade ručno i razbacano: **igrače i timove** (ko igra koju igru, na kojoj poziciji i kojem nivou), **turnire** (prijave, žrijeb, raspored mečeva, rezultati) i **praćenje mečeva uživo** (gledalac u browseru vidi rezultat i stanje igre u stvarnom vremenu, bez osvježavanja stranice).

Prva podržana igra je League of Legends, ali je sistem od početka zamišljen kao višeigrovni: nova igra je podatak u bazi, a ne nova funkcionalnost u kodu.

## Kontekst: kako izgleda amaterski esport danas

Za čitaoca koji ne igra: esport su organizovana takmičenja u video igrama. Profesionalna scena ima lige, sudije i produkciju kao sport na televiziji. **Amaterska scena** (lokalni klubovi, studentski turniri, regionalni kupovi) to uglavnom nema, pa se snalazi ovako:

- prijave timova idu preko Google obrazaca ili poruka na Discordu;
- žrijeb i raspored se crtaju u Excelu ili na slici;
- rezultate kapiteni javljaju porukom, a organizator ih ručno upisuje;
- ko želi pratiti meč, gleda nečiji stream ili čeka da neko objavi rezultat;
- timovi traže igrače po grupama i forumima, bez ikakvog pregleda ko je slobodan i koliko je dobar.

Posljedice su sporost, greške, sporovi oko rezultata i slab doživljaj za publiku. EsportsHub te korake pretvara u jedan sistem s jasnim pravilima i ulogama.

## Cilj projekta

1. **Jedan izvor istine** za igrače, timove, turnire i rezultate.
2. **Automatizovati ono što se može automatizovati**: žrijeb i bracket, prelazak pobjednika u sljedeću rundu, dodjelu sudija, prikupljanje podataka iz igre.
3. **Prijenos uživo** za gledaoce: rezultat, sat igre i osnovna statistika osvježavaju se sami.
4. **Integritet takmičenja**: jasna pravila ko smije šta, zapis svake odluke i zaštita od sukoba interesa.
5. Kao akademski projekat: demonstrirati dizajn paterne, WebSocket, state machine, RabbitMQ i testiranje na problemu koji ima stvarnu poslovnu logiku.

## Ko koristi sistem (uloge)

| Uloga | Ko je to | Šta radi u sistemu |
|---|---|---|
| **Igrač** | svaki registrovani korisnik | ima profil i po jedan nalog za svaku igru koju igra; može se staviti na transfer listu; pravljenjem tima postaje njegov **kapiten** |
| **Kapiten** (nije posebna uloga, nego vlasnik tima) | igrač koji je napravio tim | vodi sastav tima, šalje ponude igračima na marketu, prijavljuje tim na turnire |
| **Organizator** | korisnik kojem admin dodijeli ulogu | pravi turnire, nakon odobrenja generiše bracket i po potrebi mijenja sudije na mečevima svog turnira |
| **Sudija** | korisnik kojem admin dodijeli ulogu | vodi mečeve koji su mu dodijeljeni: pokreće meč, unosi rezultat, završava meč i pokreće agenta za prikupljanje podataka iz igre |
| **Admin** | upravitelj platforme | odobrava ili odbija turnire, dodjeljuje i oduzima uloge, ima uvid u cijeli sistem |
| **Gledalac** | bilo ko | prati turnire, brackete i mečeve uživo |

Jedan korisnik može imati više uloga (npr. igrač i sudija).

## Šta sistem radi: glavni tokovi

### 1. Igrač i njegovi nalozi po igrama

Ista osoba u različitim igrama ima različita imena i nivoe. Zato je **osoba** (korisnički nalog na platformi) odvojena od **naloga u igri**: Dino Ruznic je jedan korisnik, a u League of Legends je `yueen8#EUW` (rang Diamond, pozicija MID), u Counter-Strike 2 `dino_awp` (rating 18.450). Sistem dozvoljava po jedan nalog za svaku igru.

Igre se razlikuju po tome kako mjere nivo igrača: neke imaju rangove (stepenice poput Gold, Platinum, Diamond), neke brojčani rating. To je zapisano kao podatak o igri, pa se forma za unos naloga sama prilagodi igri, a backend provjerava da rang, pozicija i regija pripadaju toj igri.

### 2. Transfer market

Ideja je preuzeta iz fudbala. Igrač uključi „Dostupan za transfer" na svom nalogu za određenu igru, i taj nalog se pojavi na marketu. Kapiteni timova iste igre šalju ponude (iznos i poruku). Igrač vidi sve ponude i prihvata jednu, i tada se u jednoj transakciji desi sve odjednom:

- potpisuje se ugovor između igrača i tima;
- igrač postaje član tima;
- sve ostale ponude se automatski odbijaju;
- oglas se zatvara.

Iznosi su u KM i služe kao dio simulacije tržišta, platforma ne obrađuje stvarna plaćanja.

### 3. Životni ciklus turnira

1. **Organizator** napravi turnir (igra, broj mjesta: 2, 4, 8 ili 16, nagradni fond, datum). Turnir je *na odobrenju*.
2. **Admin** ga odobri i otvaraju se *prijave*.
3. **Kapiteni** prijavljuju timove dok ima mjesta. Organizator ne smije prijaviti svoj tim na svoj turnir.
4. Organizator klikne **„Generiši bracket"**: sistem napravi stablo eliminacije (četvrtfinale, polufinale, finale) i rasporedi timove po nosiocima (1. protiv posljednjeg, 2. protiv pretposljednjeg…). Turnir prelazi u stanje *u toku*.
5. Sistem **automatski dodjeljuje sudije** mečevima: bira sudiju koji nije član nijednog tima u tom meču i koji trenutno ima najmanje mečeva.
6. Mečevi se igraju. Kad se meč završi, **pobjednik sam prelazi** u svoje mjesto u sljedećoj rundi.
7. Kad se završi finale, turnir je *završen* i ima **prvaka**.

Turnir i meč su **state machine**: dozvoljeni su samo određeni prelazi stanja (npr. meč ide samo *zakazan → uživo → završen*, a neriješeno nije dozvoljeno). Svaki nedozvoljen pokušaj backend odbija.

### 4. Meč uživo

Ovo je središnji dio projekta. Podaci o meču dolaze iz **tri izvora**, a svi završavaju kao isti tip događaja u sistemu:

1. **Server**: logika bracketa, npr. „pobjednik ide u finale" ili „turnir završen".
2. **Sudija**: kroz sudijski panel pokreće meč, unosi rezultat serije i završava meč.
3. **Igra**: dok traje igra, League of Legends na računaru otvara lokalni API (Riot Live Client Data API, `127.0.0.1:2999`) s vremenom igre, killovima, goldom i srušenim tornjevima. Taj API postoji samo na računaru gdje je igra otvorena, pa ga web server ne može čitati direktno.

Zato postoji **agent**: mali zaseban Java program koji sudija pokreće na svom računaru dok prati meč kao *spectator* (posmatrač unutar igre). Agent svakih par sekundi čita podatke iz igre i šalje ih kao poruku u **RabbitMQ** red, uz tajni ključ meča. Backend poruku preuzima iz reda, provjerava ključ i da je meč stvarno uživo, sprema je i preko **WebSocketa** šalje svim gledaocima. U browseru se sat, rezultat i statistika mijenjaju sami.

Podjela posla je namjerna: agent automatski prenosi **statistiku iz igre**, a **sudija potvrđuje rezultat serije i kraj meča**. API igre zna samo za trenutnu igru, ne za seriju (npr. „ko je dobio 2 od 3 mape"), a službeni rezultat treba da potvrdi čovjek. Ako agent ne radi, sistem i dalje radi s ručnim unosom sudije, samo bez detaljne statistike.

**Trenutno stanje agenta:** agent je komandna aplikacija koju sudija pokreće iz terminala s ključem meča. Ima stvarni način rada (čita LoL klijent) i *mock* način. U prezentaciji se koristi mock, jer se uživo ne igra pravi meč. **Cilj** je da agent postane **Java desktop aplikacija** koju sudija preuzme na svoj računar: prozor s poljem za ključ meča, dugmadima Pokreni i Zaustavi i statusom veze, bez terminala i bez ručnog kucanja komandi. Logika prikupljanja i slanja podataka ostaje ista, mijenja se samo način na koji sudija pokreće agenta.

Za prezentaciju postoje dvije zamjene za stvarnu igru: agent ima *mock* način koji generiše realistične podatke, a admin može uključiti **demo režim** u kojem server sam igra mečeve. Oba šalju podatke istim putem kao pravi agent (RabbitMQ → backend → WebSocket), pa se prikazuje stvarna arhitektura.

## Integritet takmičenja

Na amaterskoj sceni najveći problem su sporovi i sumnja u rezultate, pa sistem ima nekoliko zaštita:

- **Uloge i prava** provjerava backend za svaki zahtjev, ne samo frontend.
- **Sukob interesa**: sudija ne može suditi meč u kojem igra njegov tim, a organizator ne može prijaviti svoj tim na svoj turnir.
- **Pravedna dodjela sudija**: automatska, prema opterećenju, a ne po izboru jedne osobe.
- **Trag svake odluke**: svaki događaj na meču (start, rezultat, kraj, podaci iz igre, automatske akcije sistema) upisuje se u dnevnik događaja s izvorom i imenom osobe, i vidljiv je gledaocima u feedu meča.
- **Tajni ključ meča**: samo sudija tog meča, organizator i admin vide ključ kojim agent šalje podatke. Agent u RabbitMQ-u ima korisnika koji smije samo slati poruke u jedan exchange.
- **Odbacivanje neispravnih podataka**: poruka s pogrešnim ključem ili za meč koji nije uživo ne ponavlja se beskonačno, nego ide u *dead letter queue* za kasniji pregled.

## Ključne odluke u dizajnu i zašto

- **Server je jedini autoritet.** Frontend i agent šalju zahtjeve i podatke, ali stanje turnira i meča mijenja samo backend, kroz pravila state machine-a.
- **Jedan tok događaja.** Logika meča samo objavljuje događaj (`MatchEvent`) i ne zna ko ga sluša (Observer). Jedan slušalac ga upisuje u bazu u istoj transakciji, drugi ga šalje gledaocima tek *nakon* commita, pa niko nikad ne vidi rezultat koji je kasnije poništen.
- **Agent je odvojen redom poruka.** Agent ne zove backend direktno, nego piše u RabbitMQ. Ako backend kratko nije dostupan, poruke čekaju u redu, a backend može obrađivati podatke svojim tempom.
- **Igre su podaci, ne kod.** Nova igra je red u tabeli plus njeni rangovi, pozicije i regije. Timovi, turniri, bracket i market rade za svaku igru bez izmjene koda.
- **Bracket kao Strategy + Builder.** Format turnira je zamjenjiv (sada single elimination), a dodavanje novog formata je nova klasa, bez izmjene servisa.
- **Market kao Facade.** Prihvatanje ponude je jedna operacija prema van, iako iznutra mijenja pet stvari, i sve se dešava atomski.

## Veza s temama akademije

| Tema | Gdje u projektu |
|---|---|
| Dizajn paterni | Strategy + Builder (bracket), Facade (prihvatanje ponude), Observer (događaji meča), State (turnir i meč) |
| WebSocket | prijenos uživo: bracket, stranica meča, stranica „Uživo", sudijski panel (STOMP) |
| State machine | stanja turnira i meča s dozvoljenim prelazima |
| RabbitMQ | agent i demo režim kao *producer*, backend kao *consumer*, dead letter queue, korisnik s minimalnim pravima |
| Testiranje | 226 backend testova (unit i integracioni kroz pravi PostgreSQL i RabbitMQ u Docker kontejnerima), 97% pokrivenost linija, 206 frontend testova, testovi agenta, CI na GitHub Actions |

## Šta sistem namjerno ne radi

- **Ne kontroliše igru.** Igra se igra u League of Legends klijentu, a platforma je samo evidencija i prijenos. Pauza ili prekid su stanje u bazi, ne komanda igri.
- **Ne obrađuje novac.** Iznosi na marketu i nagradni fondovi su informativni.
- **Ne provjerava rang automatski.** Rang u nalogu igrač upisuje sam. Provjera preko Riotovog javnog API-ja je moguć nastavak.
- **Podržava samo single elimination** format turnira, iako je arhitektura spremna za druge formate.

## Sljedeći korak i mogući nastavak

- **Java desktop aplikacija za agenta** (sljedeći planirani korak): sudija je preuzme i pokreće na svom računaru, unese ključ meča i klikne Pokreni;
- potvrda rezultata od oba kapitena, sa stanjem „sporno" o kojem odlučuje admin;
- double elimination i grupna faza;
- obavijesti (nova ponuda, meč počinje, prijava prihvaćena);
- automatska provjera ranga preko Riot API-ja.

## Rječnik pojmova

| Pojam | Značenje |
|---|---|
| **League of Legends (LoL)** | timska strateška igra 5 na 5; jedna igra traje oko 25–40 minuta |
| **Mapa / igra** | jedna odigrana partija |
| **Serija (BO3, BO5)** | meč se igra „best of 3" ili „best of 5": pobjeđuje tim koji prvi osvoji 2, odnosno 3 mape |
| **Bracket** | stablo eliminacije turnira: poraženi ispada, pobjednik ide u sljedeću rundu |
| **Single elimination** | format u kojem jedan poraz znači ispadanje |
| **Seed (nosilac)** | redoslijed timova pri žrijebu, tako da se najjači ne sretnu odmah |
| **Spectator** | posmatrač unutar igre koji vidi cijelu mapu, ali ne igra |
| **Kill** | eliminacija protivničkog igrača |
| **Gold** | resurs koji timovi skupljaju tokom igre; razlika u goldu pokazuje ko vodi |
| **Toranj (tower)** | odbrambena građevina; rušenje tornjeva vodi ka pobjedi |
| **Riot ID** | ime igrača u Riotovim igrama, u obliku `ime#TAG` (npr. `yueen8#EUW`) |
| **Rang / tier** | stepenica nivoa igrača (npr. Gold, Platinum, Diamond) |
| **Rating / MMR** | brojčana mjera nivoa igrača (npr. 18.450 u CS2) |
| **Pozicija** | uloga igrača u timu (u LoL-u: TOP, JUNGLE, MID, ADC, SUPPORT) |
| **Sastav (roster)** | igrači jednog tima |
| **Transfer** | prelazak igrača u tim na osnovu prihvaćene ponude |
