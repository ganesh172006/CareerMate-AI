$ErrorActionPreference = 'Stop'
$base = 'http://127.0.0.1:8000'
try {
    $health = Invoke-RestMethod "$base/api/health"
    Write-Host "Backend health: $($health.status)"
    $spec = Invoke-RestMethod "$base/openapi.json"
    $paths = @($spec.paths.PSObject.Properties.Name)
    Write-Host "Routes discovered: $($paths.Count)"
    $required = @('/api/question-bank', '/api/question-bank/generate')
    foreach ($route in $required) {
        if ($paths -contains $route) {
            Write-Host "PASS  $route" -ForegroundColor Green
        } else {
            Write-Host "FAIL  $route is missing from the live server OpenAPI document" -ForegroundColor Red
        }
    }
    Write-Host "`nFull route list:"
    $paths | Sort-Object
} catch {
    Write-Host "Could not reach backend at $base. Start Uvicorn from the backend folder first." -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}
