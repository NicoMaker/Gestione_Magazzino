# 🏍️ Gestione Magazzino

Benvenuto nel sistema di gestione del magazzino, uno strumento essenziale per monitorare, valorizzare e tenere traccia di tutti i movimenti dei prodotti e ricambi.

Questo documento ti guiderà attraverso le funzionalità principali dell'applicazione dal punto di vista dell'utente.

## 🔑 Accesso al Sistema

### 1. Pagina di Login

- **URL:** Accedi all'applicazione tramite l'indirizzo fornito.
- **Credenziali:** Inserisci il tuo **Username** e la **Password** forniti dall'amministratore.
- **Accesso:** Clicca sul pulsante **"Accedi"** per entrare nella dashboard principale.

### 2. Dashboard Principale

Una volta effettuato l'accesso, verrai indirizzato alla dashboard, dove potrai navigare tra le diverse sezioni tramite la **barra laterale (Sidebar)**. Il tuo nome utente sarà visibile sotto a essa.

## 📋 Sezioni e Funzionalità Principali

Il sistema è suddiviso nelle seguenti aree tematiche.

### 1. Marche

Gestione dell'anagrafica delle marche dei prodotti.
cliccando sul bottone nuova marca

- **Creazione:** Aggiungi una nuova marca specificando il **Nome**.
  - _Il Nome deve essere univoco._
- **Modifica:** Modifica il nome di una marca esistente.
- **Eliminazione:**

  - Una marca può essere eliminata **solo se nessun prodotto è collegato ad essa**. In caso contrario, l'eliminazione verrà bloccata.

### 2. Prodotti

Gestione dell'anagrafica dei prodotti.
cliccando sul bottone nuovo prodotto

- **Creazione:** Aggiungi un nuovo prodotto specificando il **Nome**, la **Marca** e la **Descrizione**.
  - _Il Nome deve essere univoco._
- **Modifica:** Puoi modificare il nome, la marca o la descrizione di un prodotto esistente.
- **Eliminazione:**
  - Un prodotto può essere eliminato **solo se la sua Giacenza attuale è zero**. In caso contrario, l'eliminazione verrà bloccata.

### 3. Movimenti (Carico/Scarico)

Questa sezione permette di registrare le entrate e le uscite dei prodotti.

- **Carico (Entrata in Magazzino):**
  cliccando sul bottone nuovo movimento
  - Utilizzato per registrare l'acquisto di nuovi prodotti.
  - Richiede: **Prodotto**, **Quantità**, **Prezzo Unitario** (costo di acquisto), **Data Movimento**, e opzionalmente **Fattura/Doc** e **Fornitore**.
  - _Aggiunge un nuovo lotto al magazzino._
- **Scarico (Uscita dal Magazzino):**
  cliccando sul bottone nuovo movimento
  - Utilizzato per registrare la vendita o l'utilizzo di prodotti.
  - Richiede: **Prodotto**, **Quantità**, **Data Movimento**, e opzionalmente **Fattura/Doc** e **Cliente/Destinatario**.
  - _Il sistema preleva automaticamente la quantità dai lotti più vecchi._
  - È possibile registrare il **Prezzo Totale di Vendita/Scarico** per tracciare il valore di uscita.
  - non è possibile scaricare più prodotti di quelli presenti in magazzino.
- **Visualizzazione Movimenti:** La tabella mostra la cronologia di tutti i carichi e scarichi, inclusi i dettagli come il prezzo totale del movimento e, per gli scarichi, il prezzo unitario di scarico calcolato.
- **Eliminazione Movimenti:** È possibile **eliminare un movimento** (carico o scarico).
  - **Importante:** L'eliminazione di un **Carico** rimuove il lotto e riduce la giacenza. L'eliminazione di uno **Scarico** ripristina la quantità prelevata nei lotti originali (annullando l'operazione).

### 4. Magazzino - Riepilogo (Giacenze e Valore)

Questa è la sezione principale per il controllo delle scorte.

- **Valore Totale:** In alto, vedrai il **Valore Totale del Magazzino** (somma del valore di tutti i lotti attivi).
- **Tabella Riepilogo:**
  - Mostra tutti i **Prodotti** con la loro **Marca** e **Descrizione**.
  - Indica la **Giacenza** attuale (quantità totale disponibile) e il **Valore Totale** di quella giacenza.
- sotto a ogni prodotto vedi la scritta **Dettagli Lotti:** dove vedrai:

  - I **Lotti** specifici di quel prodotto ancora in giacenza, ordinati per data di carico.
  - La **Quantità Rimanente** in quel lotto.
  - Il **Prezzo di Acquisto** unitario del lotto.
  - Il **Documento/Fattura** e il **Fornitore** associati a quel carico.

- il bottone stampa vede quello che vedi nella tabella, con una stampa a schermo del riepilogo.

### 5. Magazzino - Riepilogo (Giacenze e Valore)

Questa è la sezione principale per il controllo delle scorte a una data specifica.

- accanto al bottone cerca si trova il campo per inserire la data di ricerca.
  e succesivamente inserita la data cliccando il bottone cerca trova tutti i prodotti con giacenza per quella data.

- **Valore Totale:** In alto, vedrai il **Valore Totale del Magazzino** alla data selezionata (somma del valore di tutti i lotti attivi).
- **Tabella Riepilogo:**
  - Mostra tutti i **Prodotti** con la loro **Marca** e **Descrizione**.
  - Indica la **Giacenza** attuale (quantità totale disponibile) e il **Valore Totale** di quella giacenza.
- sotto a ogni prodotto vedi la scritta **Dettagli Lotti:** dove vedrai:

  - I **Lotti** specifici di quel prodotto ancora in giacenza, ordinati per data di carico.
  - La **Quantità Rimanente** in quel lotto.
  - Il **Prezzo di Acquisto** unitario del lotto.
  - Il **Documento/Fattura** e il **Fornitore** associati a quel carico.

- il bottone stampa vede quello che vedi nella tabella, con una stampa a schermo del riepilogo.

### 6. Utenti

Gestione degli account utente (accessibile agli utenti con privilegi amministrativi).

- **Lista Utenti:** Visualizza la lista degli utenti registrati.
- **Creazione/Modifica:**
  - Aggiungi nuovi utenti con **Username** e una **Password forte** (minimo 8 caratteri, almeno una minuscola, una maiuscola, un numero).
    cliccando il bottone nuovo utente.
  - Modifica l'username o la password di un utente esistente con l'icona della penna.
  - _Quando si modifica un utente, la password è opzionale: se lasciata vuota, non verrà cambiata._
- **Eliminazione:**
  - È possibile eliminare un utente **solo se non è l'unico utente rimasto** nel sistema (per evitare di perdere l'accesso).

- se elimini modifici o elimini utente che sono entrato esce in automatico.

## 🚪 Esci

Per uscire dal sistema in modo sicuro, clicca sul pulsante **"Esci"** nella barra laterale. Questo cancella le tue informazioni di sessione salvate localmente.
