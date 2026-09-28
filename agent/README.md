# EsportsHub agent

Mali Java program koji sudija pokrece na racunaru na kojem se igra League of Legends partija.
Agent svakih nekoliko sekundi procita stanje partije i posalje ga u RabbitMQ, a backend ga
prikaze gledaocima uzivo (spectator stranica, WebSocket).

```
League klijent (127.0.0.1:2999)  ->  agent  ->  RabbitMQ (esportshub.live)  ->  backend  ->  gledaoci
```

Agent je zaseban Maven projekat i ne zavisi od backenda. Treba mu samo Java 21 i pristup RabbitMQ-u.

## Build

```bash
cd agent
./mvnw package
```

Rezultat je `agent/target/esportshub-agent.jar` (sve zavisnosti su unutra).

## Kljuc meca

Agent ne zna ID meca, nego tajni kljuc meca. Kljuc nije javan: vidi ga samo sudija meca,
organizator turnira ili admin.

```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/matches/<id>/agent-key
```

Odgovor: `{"matchKey":"de7bdb69-..."}`. Mec mora biti u statusu `LIVE`, inace backend odbija snapshot
i poruka zavrsi u redu `live.snapshots.dlq`.

## Stvarni mod (prava partija)

```bash
java -jar target/esportshub-agent.jar --match-key=<kljuc> --side-a=ORDER
```

- Agent cita Riot Live Client Data API na `https://127.0.0.1:2999/liveclientdata/allgamedata`.
  Riot koristi vlastiti certifikat; agent mu vjeruje samo za tu jednu adresu, TLS provjera za sve ostalo ostaje ukljucena.
- Dok partija ne pocne, agent pise `cekam partiju...` i nista ne salje.
- Kad partija krene, salje vrijeme, kills i unistene tornjeve po strani, plus broj zmajeva i barona.
  Gold po timu ovaj API ne daje, pa je `goldA`/`goldB` prazan (na stranici se vidi `–`).
- Kad klijent 3 intervala zaredom ne odgovara, agent pise `partija zavrsena` i sam se ugasi.
- `--side-a` kaze koja strana u igri je tim A u nasem mecu: `ORDER` (plava) ili `CHAOS` (crvena).

## Mock mod (bez igre)

```bash
java -jar target/esportshub-agent.jar --match-key=<kljuc> --mock --interval=5
```

Generise uvjerljive podatke koji rastu kroz vrijeme (vrijeme, kills, gold, tornjevi). Radi dok ga ne zaustavis sa Ctrl+C.

## Opcije

| Opcija | Env varijabla | Zadano |
|---|---|---|
| `--match-key=<kljuc>` | `AGENT_MATCH_KEY` | obavezno |
| `--mock` | `AGENT_MOCK=true` | iskljuceno |
| `--interval=<sekunde>` | `AGENT_INTERVAL` | `5` |
| `--side-a=ORDER\|CHAOS` | `AGENT_SIDE_A` | `ORDER` |
| `--rabbit-host=<host>` | `AGENT_RABBIT_HOST` | `localhost` |
| `--rabbit-port=<port>` | `AGENT_RABBIT_PORT` | `5672` |
| `--rabbit-user=<user>` | `AGENT_RABBIT_USER` | `agent` |
| `--rabbit-pass=<lozinka>` | `AGENT_RABBIT_PASS` | `agent123` |

Argumenti imaju prednost nad env varijablama. Lozinku je bolje proslijediti kroz env varijablu
nego kroz komandnu liniju.

## RabbitMQ korisnik `agent`

Agent se ne spaja kao admin, nego kao korisnik `agent` sa minimalnim pravima
(definisano u `infra/rabbitmq/definitions.json`):

| Pravo | Vrijednost | Znacenje |
|---|---|---|
| configure | `^$` | ne moze praviti ni brisati exchange/redove |
| write | `^esportshub\.live$` | moze slati samo u exchange `esportshub.live` |
| read | `^$` | ne moze citati nijedan red |

Nema ni pristup management UI-ju. Ako neko ukrade lozinku agenta, moze samo slati snapshote,
a backend prihvata samo one sa ispravnim kljucem meca koji je uzivo.

Promjena lozinke (vazi dok se kontejner ne napravi ponovo, tada se vraca na vrijednost iz definicija):

```bash
docker exec esportshub-rabbitmq rabbitmqctl change_password agent <nova-lozinka>
```

## Testovi

```bash
./mvnw test
```

Pokrivaju mapiranje Riot JSON-a (primjer u `src/test/resources/allgamedata.json`), zamjenu strana
sa `--side-a=CHAOS`, racunanje tornjeva, mock generator i citanje konfiguracije.
