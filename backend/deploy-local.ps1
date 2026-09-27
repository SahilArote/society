# Local 1-Click Deploy Script for GreenGate Backend
# Builds TypeScript locally and uploads only 'dist' + configs to AWS Lightsail

$ErrorActionPreference = "Stop"

$HOST_IP = "13.206.135.130"
$USER = "ec2-user"
$KEY_PATH = "$HOME\Downloads\LightsailDefaultKey-ap-south-1.pem"
$REMOTE_DIR = "/home/ec2-user/society"

if (!(Test-Path $KEY_PATH)) {
    Write-Error "SSH key not found at $KEY_PATH! Please check key path."
    exit 1
}

Write-Host "==> 1. Building backend locally (tsc -> dist)..." -ForegroundColor Cyan
npm run build

Write-Host "==> 2. Creating lightweight bundle (dist + configs)..." -ForegroundColor Cyan
tar -czf deploy.tar.gz dist package.json package-lock.json ecosystem.config.js firebase-service-account.json

Write-Host "==> 3. Uploading bundle to AWS Lightsail ($HOST_IP)..." -ForegroundColor Cyan
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no deploy.tar.gz ${USER}@${HOST_IP}:${REMOTE_DIR}/deploy.tar.gz

Write-Host "==> 4. Extracting and reloading PM2 zero-downtime..." -ForegroundColor Cyan
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ${USER}@${HOST_IP} "cd ${REMOTE_DIR} && tar -xzf deploy.tar.gz && rm -f deploy.tar.gz && npm ci --omit=dev && pm2 reload society --update-env && pm2 save && echo '' && curl -s http://localhost:5001/api/health"

Remove-Item -Force deploy.tar.gz -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "==> [SUCCESS] Backend deployed and live on AWS Lightsail!" -ForegroundColor Green
