<#
Playbook Autodeploy - AdminMenu
Requisitos:
- Windows Server 2022
- Ejecutar como Administrador
#>

Write-Host "=== INICIANDO DEPLOY AUTOMÁTICO ===" -ForegroundColor Cyan

### EDITA ESTO ###
$repoUrl = "https://github.com/jcaracas/AdminMenuKiosko.git"   # <- URL repo GitHub
$appDir = "C:\apps\adminMenu"
$nodeVersion = "lts"  # opc: 18, 20, lts
$serviceName = "pm2-adminmenu"

#============================
# 1) Instalar Chocolatey
#============================


#============================
# 3) Crear carpeta del proyecto
#============================

git clone $repoUrl $appDir

cd $appDir

#============================
# 4) Instalar dependencias server y client
#============================

Write-Host "Instalando dependencias del backend..." -ForegroundColor Yellow
npm install

