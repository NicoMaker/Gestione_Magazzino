# Script per aprire la porta 3000 nel Firewall di Windows
# ESECUZIONE: Tasto destro su PowerShell -> "Esegui come amministratore"
# Poi esegui: .\apri-porta-firewall.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Apertura Porta 3000 nel Firewall" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se lo script è eseguito come amministratore
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERRORE: Devi eseguire questo script come Amministratore!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Istruzioni:" -ForegroundColor Yellow
    Write-Host "1. Tasto destro su PowerShell" -ForegroundColor Yellow
    Write-Host "2. Seleziona 'Esegui come amministratore'" -ForegroundColor Yellow
    Write-Host "3. Naviga nella cartella Backend: cd D:\Gestione_Magazzino\Backend" -ForegroundColor Yellow
    Write-Host "4. Esegui: .\apri-porta-firewall.ps1" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit
}

Write-Host "Verifica regole esistenti per la porta 3000..." -ForegroundColor Yellow

# Verifica se la regola esiste già
$existingRule = Get-NetFirewallRule -DisplayName "Gestione Magazzino Node.js" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "La regola esiste già. La rimuovo per ricrearla..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Gestione Magazzino Node.js" -ErrorAction SilentlyContinue
}

Write-Host "Creazione nuova regola firewall..." -ForegroundColor Yellow

# Crea la regola firewall
try {
    New-NetFirewallRule `
        -DisplayName "Gestione Magazzino Node.js" `
        -Description "Permette connessioni in entrata sulla porta 3000 per il server Node.js Gestione Magazzino" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Domain,Private,Public `
        -Enabled True | Out-Null
    
    Write-Host ""
    Write-Host "✅ SUCCESSO! Porta 3000 aperta nel firewall." -ForegroundColor Green
    Write-Host ""
    Write-Host "La regola è stata creata con successo:" -ForegroundColor Cyan
    Write-Host "  Nome: Gestione Magazzino Node.js" -ForegroundColor White
    Write-Host "  Porta: 3000" -ForegroundColor White
    Write-Host "  Protocollo: TCP" -ForegroundColor White
    Write-Host "  Direzione: Inbound (in entrata)" -ForegroundColor White
    Write-Host "  Profili: Domain, Private, Public" -ForegroundColor White
    Write-Host ""
    Write-Host "Ora puoi accedere al server dal cellulare usando:" -ForegroundColor Yellow
    Write-Host "  http://[IP_DEL_PC]:3000" -ForegroundColor White
    Write-Host ""
    
    # Mostra l'IP locale
    $ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress
    if ($ipAddress) {
        Write-Host "Il tuo IP locale è probabilmente: $ipAddress" -ForegroundColor Cyan
        Write-Host "Prova da cellulare: http://$ipAddress:3000" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRORE durante la creazione della regola:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "Premi un tasto per uscire..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

