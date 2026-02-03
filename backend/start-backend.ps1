# Script de demarrage du backend OMEGA
# Charge automatiquement les variables depuis .env.production et lance le serveur

Write-Host "Demarrage du backend OMEGA..." -ForegroundColor Green
Write-Host ""

# Determiner le chemin du fichier .env
$envFile = ".env.production"
if (Test-Path ".env") {
    $envFile = ".env"
}

if (-Not (Test-Path $envFile)) {
    Write-Host "Fichier d'environnement introuvable: $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "Chargement des variables depuis: $envFile" -ForegroundColor Cyan
Write-Host ""

# Lire et charger les variables d'environnement
$envVars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    # Ignorer les lignes vides et les commentaires
    if ($line -and -not $line.StartsWith('#')) {
        if ($line -match '^([^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            
            # Retirer les guillemets si presents
            $value = $value -replace '^["'']|["'']$', ''
            
            # Definir la variable d'environnement
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            $envVars[$name] = $value
            
            # Afficher (masquer les mots de passe)
            if ($name -match 'PWD|PASSWORD|SECRET') {
                Write-Host "  OK $name = ***" -ForegroundColor Gray
            } else {
                Write-Host "  OK $name = $value" -ForegroundColor Gray
            }
        }
    }
}

Write-Host ""
Write-Host "Variables d'environnement chargees: $($envVars.Count)" -ForegroundColor Green
Write-Host ""

# Verifier les variables critiques
$criticalVars = @("POSTGRES_HOST", "POSTGRES_DB", "POSTGRES_USR")
$missing = @()
foreach ($var in $criticalVars) {
    if (-not $envVars.ContainsKey($var)) {
        $missing += $var
    }
}

if ($missing.Count -gt 0) {
    Write-Host "ATTENTION - Variables manquantes: $($missing -join ', ')" -ForegroundColor Yellow
}

# Lancer le serveur
Write-Host "Demarrage du serveur Node.js..." -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:$($envVars['PORT'])" -ForegroundColor White
Write-Host ""

# Verifier si server.js existe
if (Test-Path "server.js") {
    Write-Host "Lancement depuis le repertoire courant..." -ForegroundColor Gray
    node server.js
} elseif (Test-Path ".next\standalone\server.js") {
    Write-Host "Navigation vers .next\standalone..." -ForegroundColor Gray
    Set-Location ".next\standalone"
    node server.js
} else {
    Write-Host "ERREUR: server.js introuvable" -ForegroundColor Red
    Write-Host "Repertoire courant: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}
