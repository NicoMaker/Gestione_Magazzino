# 🏍️ Gestione Magazzino

Benvenuto nel sistema di gestione del magazzino, uno strumento essenziale per monitorare, valorizzare e tenere traccia di tutti i movimenti dei prodotti e ricambi.

Questo documento ti guiderà attraverso le funzionalità principali dell'applicazione dal punto di vista dell'utente.

## 🔑 Accesso al Sistema

### 1. Pagina di Login

- **URL:** Accedi all'applicazione tramite l'indirizzo fornito.
- **Credenziali:** Inserisci il tuo **Username** e la **Password** forniti dall'amministratore.
  - **Nota per il primo accesso:** L'utente predefinito è `Admin` con password `Admin123!`. È fortemente raccomandato cambiarla dopo il primo login.
- **Accesso:** Clicca sul pulsante **"Accedi"** per entrare nella dashboard principale.
  - _Il sistema verifica le credenziali con il backend (`routes/auth.js`) e, in caso di successo, ti reindirizza alla pagina principale._

### 2. Dashboard Principale

Una volta effettuato l'accesso, verrai indirizzato alla dashboard, dove potrai navigare tra le diverse sezioni tramite la **barra laterale (Sidebar)**. Il tuo nome utente sarà visibile in alto a destra.

## 📋 Sezioni e Funzionalità Principali

Il sistema è suddiviso nelle seguenti aree tematiche.

### 1. Magazzino - Riepilogo (Giacenze e Valore)

Questa è la sezione principale per il controllo delle scorte.

- **Valore Totale:** In alto, vedrai il **Valore Totale del Magazzino** (somma del valore di tutti i lotti attivi).
- **Tabella Riepilogo:**
  - Mostra tutti i **Prodotti** con la loro **Marca** e **Descrizione**.
  - Indica la **Giacenza** attuale (quantità totale disponibile) e il **Valore Totale** di quella giacenza (calcolato con il metodo FIFO, First-In, First-Out).
- **Dettagli Lotti:** Cliccando sul pulsante **"Dettagli Lotti"** per un prodotto specifico, si aprirà un modale che mostra:
  - I **Lotti** specifici di quel prodotto ancora in giacenza, ordinati per data di carico (FIFO).
  - La **Quantità Rimanente** in quel lotto.
  - Il **Prezzo di Acquisto** unitario del lotto.
  - Il **Documento/Fattura** e il **Fornitore** associati a quel carico.

### 2. Movimenti (Carico/Scarico)

Questa sezione permette di registrare le entrate e le uscite dei prodotti.

- **Carico (Entrata in Magazzino):**
  - Utilizzato per registrare l'acquisto di nuovi prodotti.
  - Richiede: **Prodotto**, **Quantità**, **Prezzo Unitario** (costo di acquisto), **Data Movimento**, e opzionalmente **Fattura/Doc** e **Fornitore**.
  - _Aggiunge un nuovo lotto al magazzino._
- **Scarico (Uscita dal Magazzino):**
  - Utilizzato per registrare la vendita o l'utilizzo di prodotti.
  - Richiede: **Prodotto**, **Quantità**, **Data Movimento**, e opzionalmente **Fattura/Doc** e **Cliente/Destinatario**.
  - _Il sistema preleva automaticamente la quantità dai lotti più vecchi (FIFO)._
  - È possibile registrare il **Prezzo Totale di Vendita/Scarico** per tracciare il valore di uscita.
- **Visualizzazione Movimenti:** La tabella mostra la cronologia di tutti i carichi e scarichi, inclusi i dettagli come il prezzo totale del movimento e, per gli scarichi, il prezzo unitario di scarico calcolato.
- **Eliminazione Movimenti:** È possibile **eliminare un movimento** (carico o scarico).
  - **Importante:** L'eliminazione di un **Carico** rimuove il lotto e riduce la giacenza. L'eliminazione di uno **Scarico** ripristina la quantità prelevata nei lotti originali (annullando l'operazione).

### 3. Prodotti

Gestione dell'anagrafica dei ricambi e prodotti.

- **Creazione:** Aggiungi un nuovo prodotto specificando il **Nome**, la **Marca** e la **Descrizione**.
  - _Il Nome deve essere univoco._
- **Modifica:** Puoi modificare il nome, la marca o la descrizione di un prodotto esistente.
- **Eliminazione:**
  - Un prodotto può essere eliminato **solo se la sua Giacenza attuale è zero**. In caso contrario, l'eliminazione verrà bloccata.

### 4. Marche

Gestione dell'anagrafica delle marche dei prodotti.

- **Creazione:** Aggiungi una nuova marca specificando il **Nome**.
  - _Il Nome deve essere univoco._
- **Modifica:** Modifica il nome di una marca esistente.
- **Eliminazione:**
  - Una marca può essere eliminata **solo se nessun prodotto è collegato ad essa**. In caso contrario, l'eliminazione verrà bloccata.

### 5. Utenti

Gestione degli account utente (accessibile agli utenti con privilegi amministrativi).

- **Lista Utenti:** Visualizza la lista degli utenti registrati.
- **Creazione/Modifica:**
  - Aggiungi nuovi utenti con **Username** e una **Password forte** (minimo 8 caratteri, almeno una minuscola, una maiuscola, un numero).
  - Modifica l'username o la password di un utente esistente.
  - _Quando si modifica un utente, la password è opzionale: se lasciata vuota, non verrà cambiata._
- **Eliminazione:**
  - È possibile eliminare un utente **solo se non è l'unico utente rimasto** nel sistema (per evitare di perdere l'accesso).

## ⚙️ Funzionamento Interno (Concetti Chiave)

- **FIFO (First-In, First-Out):** Il sistema utilizza la logica FIFO per la gestione delle giacenze e del valore. Quando registri uno scarico, il sistema preleva la quantità dai lotti di acquisto **più vecchi** fino a esaurimento, garantendo una valorizzazione corretta del magazzino.
- **Giacenza:** La giacenza è la somma delle `quantita_rimanente` di tutti i lotti di quel prodotto.
- **Lotti:** Ogni **Carico** crea un nuovo _Lotto_ (un record nella tabella `lotti`) che traccia la quantità, il prezzo di acquisto e la data di entrata. Gli _Scarichi_ riducono la quantità rimanente in questi lotti, seguendo la regola FIFO.

## 🚪 Logout

Per uscire dal sistema in modo sicuro, clicca sul pulsante **"Logout"** nella barra laterale. Questo cancella le tue informazioni di sessione salvate localmente.
