pipeline {
    agent any

    options {
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    environment {
        DOCKER_CLI = 'C:\\Users\\THOUGHTCLAN\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe'
        KUBECTL = 'C:\\Users\\THOUGHTCLAN\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\kubectl.exe'
        DOCKER_HOST = 'npipe:////./pipe/dockerDesktopLinuxEngine'
        COMPOSE_PROJECT_NAME = 'fast_api_baknd'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Frontend Tests') {
            steps {
                bat '''
                    "%DOCKER_CLI%" run --rm ^
                        -v "%CD%:/app" ^
                        -w /app/frontend ^
                        node:24-alpine ^
                        sh -c "npm ci && npm run test && npm run build"
                '''
            }
        }

        stage('Backend Tests') {
            steps {
                bat '''
                    "%DOCKER_CLI%" run --rm ^
                        -v "%CD%:/app" ^
                        -w /app ^
                        python:3.13-slim ^
                        sh -c "pip install --no-cache-dir uv==0.12.18 && export UV_PROJECT_ENVIRONMENT=/tmp/gisthub-venv && uv sync --frozen && uv run pytest"
                '''
            }
        }

        stage('Build Application Images') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-app-env', variable: 'APP_ENV_FILE'),
                    file(credentialsId: 'gisthub-docker-env', variable: 'DOCKER_ENV_FILE')
                ]) {
                    bat '''
                        "%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" build backend frontend
                    '''
                }
            }
        }

        stage('Publish Images to Docker Hub') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-gisthub',
                        usernameVariable: 'DOCKERHUB_USERNAME',
                        passwordVariable: 'DOCKERHUB_TOKEN'
                    )
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'

                        $docker = $env:DOCKER_CLI
                        $namespace = 'sr1r22m'

                        if (-not (Test-Path -LiteralPath $docker -PathType Leaf)) {
                            throw "Docker CLI executable was not found: $docker"
                        }

                        # Get the Git commit used for this build
                        $commitSha = (& git rev-parse --short=12 HEAD).Trim()

                        if ($LASTEXITCODE -ne 0 -or
                            [string]::IsNullOrWhiteSpace($commitSha)) {
                            throw "Unable to determine Git commit SHA."
                        }

                        Write-Host "Git commit: $commitSha"

                        # Use a temporary Docker configuration directory
                        # so registry credentials are not retained in
                        # the Jenkins service account profile.
                        $dockerConfig = Join-Path `
                            $env:WORKSPACE `
                            ".docker-config-$env:BUILD_NUMBER"

                        $previousDockerConfig = $env:DOCKER_CONFIG

                        try {
                            New-Item -ItemType Directory `
                                -Path $dockerConfig -Force | Out-Null

                            $env:DOCKER_CONFIG = $dockerConfig
                            Write-Host "`n========== JENKINS ENVIRONMENT DIAGNOSTICS =========="

                            $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
                            Write-Host "Execution identity: $identity"
                            Write-Host "PowerShell version: $($PSVersionTable.PSVersion)"
                            Write-Host "64-bit process: $([Environment]::Is64BitProcess)"
                            Write-Host "User profile: $env:USERPROFILE"
                            Write-Host "DOCKER_HOST: $env:DOCKER_HOST"
                            Write-Host "DOCKER_CONTEXT: $env:DOCKER_CONTEXT"
                            Write-Host "DOCKER_CONFIG: $env:DOCKER_CONFIG"

                            Write-Host "DOCKER_AUTH_CONFIG configured: $([bool]$env:DOCKER_AUTH_CONFIG)"

                            foreach ($name in @('HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'NO_PROXY')) {
                                $value = [Environment]::GetEnvironmentVariable($name)
                                Write-Host "$name configured: $([bool]$value)"
                            }

                            Write-Host "`nDocker client/server version:"
                            & $docker version --format 'Client={{.Client.Version}} Server={{.Server.Version}}'

                            Write-Host "Docker version command exit code: $LASTEXITCODE"
                            if ($LASTEXITCODE -ne 0) {
                                throw "Docker CLI could not communicate with the Docker Engine."
                            }
                            Write-Host "=====================================================`n"
                            # Validate Jenkins credentials without displaying the token.
                            if ([string]::IsNullOrWhiteSpace($env:DOCKERHUB_USERNAME)) {
                                throw "Docker Hub username is missing from Jenkins credentials."
                            }

                            if ([string]::IsNullOrWhiteSpace($env:DOCKERHUB_TOKEN)) {
                                throw "Docker Hub token is missing from Jenkins credentials."
                            }

                            $dockerHubUsername = $env:DOCKERHUB_USERNAME.Trim()
                            $dockerHubToken = $env:DOCKERHUB_TOKEN.Trim()

                            Write-Host "Docker Hub username from Jenkins: $dockerHubUsername"

                            # Diagnostic 1: validate the PAT against the Docker Hub account API.
                            Write-Host "`n========== DOCKER HUB API AUTH TEST =========="
                            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

                            $hubBody = @{
                                identifier = $dockerHubUsername
                                secret = $dockerHubToken
                            } | ConvertTo-Json -Compress

                            try {
                                $hubResponse = Invoke-RestMethod `
                                    -Uri 'https://hub.docker.com/v2/auth/token' `
                                    -Method Post `
                                    -ContentType 'application/json' `
                                    -Headers @{ Accept = 'application/json' } `
                                    -Body $hubBody `
                                    -TimeoutSec 30 `
                                    -ErrorAction Stop

                                if ([string]::IsNullOrWhiteSpace([string]$hubResponse.access_token)) {
                                    throw "Docker Hub did not return an access token."
                                }

                                Write-Host "[SUCCESS] Docker Hub API accepted the Jenkins PAT."
                            }
                            catch {
                                $statusCode = $null
                                try {
                                    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                                        $statusCode = [int]$_.Exception.Response.StatusCode
                                    }
                                }
                                catch {}

                                if ($statusCode) {
                                    Write-Host "Docker Hub API HTTP status: $statusCode"
                                }
                                else {
                                    Write-Host "Docker Hub API request error: $($_.Exception.Message)"
                                }

                                throw "Docker Hub API authentication test failed."
                            }
                            finally {
                                $hubBody = $null
                                $hubResponse = $null
                            }

                            Write-Host "==============================================`n"

                            # Diagnostic 2: validate registry bearer-token authentication
                            # independently from the Docker CLI login operation.
                            Write-Host "`n========== REGISTRY BEARER TOKEN TEST =========="

                            $credentialPair = "${dockerHubUsername}:$dockerHubToken"
                            $credentialBytes = [System.Text.Encoding]::UTF8.GetBytes($credentialPair)
                            $basicAuth = [Convert]::ToBase64String($credentialBytes)
                            $registryTokenUrl = 'https://auth.docker.io/token?service=registry.docker.io&scope=repository:sr1r22m/gisthub-backend:pull,push'

                            try {
                                $registryResponse = Invoke-RestMethod `
                                    -Uri $registryTokenUrl `
                                    -Method Get `
                                    -Headers @{
                                        Authorization = "Basic $basicAuth"
                                        Accept = 'application/json'
                                    } `
                                    -TimeoutSec 30 `
                                    -ErrorAction Stop

                                $bearerToken = $registryResponse.token
                                if ([string]::IsNullOrWhiteSpace($bearerToken)) {
                                    $bearerToken = $registryResponse.access_token
                                }

                                if ([string]::IsNullOrWhiteSpace($bearerToken)) {
                                    throw "Registry did not return a bearer token."
                                }

                                Write-Host "[SUCCESS] Registry authentication accepted the credentials."
                                Write-Host "Registry bearer token received (value hidden)."
                            }
                            catch {
                                $statusCode = $null
                                try {
                                    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
                                        $statusCode = [int]$_.Exception.Response.StatusCode
                                    }
                                }
                                catch {}

                                if ($statusCode) {
                                    Write-Host "Registry authentication HTTP status: $statusCode"
                                }
                                else {
                                    Write-Host "Registry request error: $($_.Exception.Message)"
                                }

                                throw "Registry bearer-token authentication failed."
                            }
                            finally {
                                $credentialPair = $null
                                $credentialBytes = $null
                                $basicAuth = $null
                                $bearerToken = $null
                                $registryResponse = $null
                            }

                            Write-Host "==============================================`n"
                            # Diagnostic 3: Test Docker Engine authentication directly.
                            Write-Host "`n========== DOCKER ENGINE AUTH API TEST =========="

                            $serverApiVersion = (
                                & $docker version --format '{{.Server.APIVersion}}'
                            ).Trim()

                            if ([string]::IsNullOrWhiteSpace($serverApiVersion)) {
                                throw "Could not determine Docker Engine API version."
                            }

                            $pipeName = ($env:DOCKER_HOST.TrimEnd('/') -split '/')[-1]

                            $authPayload = @{
                                username     = $dockerHubUsername
                                password     = $dockerHubToken
                                serveraddress = 'https://index.docker.io/v1/'
                            } | ConvertTo-Json -Compress

                            $authPayloadBytes = [System.Text.Encoding]::UTF8.GetBytes(
                                $authPayload
                            )

                            $authPipe = $null
                            $responseMemory = $null

                            try {
                                $authPipe = New-Object System.IO.Pipes.NamedPipeClientStream(
                                    '.',
                                    $pipeName,
                                    [System.IO.Pipes.PipeDirection]::InOut
                                )

                                $authPipe.Connect(10000)
                                # NamedPipeClientStream does not support synchronous
                                # ReadTimeout or WriteTimeout properties.
                                # Continue using synchronous stream operations.

                                $requestHeaders = (
                                    "POST /v$serverApiVersion/auth HTTP/1.1`r`n" +
                                    "Host: docker`r`n" +
                                    "Content-Type: application/json`r`n" +
                                    "Accept: application/json`r`n" +
                                    "Content-Length: $($authPayloadBytes.Length)`r`n" +
                                    "Connection: close`r`n`r`n"
                                )

                                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes(
                                    $requestHeaders
                                )

                                $authPipe.Write(
                                    $headerBytes,
                                    0,
                                    $headerBytes.Length
                                )

                                $authPipe.Write(
                                    $authPayloadBytes,
                                    0,
                                    $authPayloadBytes.Length
                                )

                                $authPipe.Flush()

                                $responseMemory = New-Object System.IO.MemoryStream
                                $buffer = New-Object byte[] 8192

                                while (($bytesRead = $authPipe.Read(
                                    $buffer,
                                    0,
                                    $buffer.Length
                                )) -gt 0) {
                                    $responseMemory.Write(
                                        $buffer,
                                        0,
                                        $bytesRead
                                    )
                                }

                                $responseText = [System.Text.Encoding]::UTF8.GetString(
                                    $responseMemory.ToArray()
                                )

                                # Inspect the Docker Engine AuthResponse without exposing credentials.

                                $statusMarker = '"Status":'
                                $statusIndex = $responseText.IndexOf(
                                    $statusMarker,
                                    [System.StringComparison]::OrdinalIgnoreCase
                                )

                                if ($statusIndex -ge 0) {
                                    $valueStart = $responseText.IndexOf(
                                        '"',
                                        $statusIndex + $statusMarker.Length
                                    )

                                    $valueEnd = $responseText.IndexOf('"', $valueStart + 1)

                                    if ($valueStart -ge 0 -and $valueEnd -gt $valueStart) {
                                        $engineAuthStatus = $responseText.Substring(
                                            $valueStart + 1,
                                            $valueEnd - $valueStart - 1
                                        )

                                        Write-Host "Docker Engine Auth status: $engineAuthStatus"
                                    }
                                }
                                else {
                                    Write-Host "Docker Engine Auth status field not found."
                                }

                                $identityMarker = '"IdentityToken":'
                                $identityIndex = $responseText.IndexOf(
                                    $identityMarker,
                                    [System.StringComparison]::OrdinalIgnoreCase
                                )

                                $identityTokenPresent = $false

                                if ($identityIndex -ge 0) {
                                    $tokenStart = $responseText.IndexOf(
                                        '"',
                                        $identityIndex + $identityMarker.Length
                                    )

                                    $tokenEnd = $responseText.IndexOf('"', $tokenStart + 1)

                                    $identityTokenPresent = (
                                        $tokenStart -ge 0 -and
                                        $tokenEnd -gt $tokenStart + 1
                                    )
                                }

                                Write-Host "Identity token returned: $identityTokenPresent"

                                $statusLine = ($responseText -split "`r`n", 2)[0]

                                Write-Host "Docker Engine API response: $statusLine"

                                if ($statusLine -match '^HTTP/[^ ]+ +(200|204)( |$)') {
                                    Write-Host "[SUCCESS] Docker Engine accepted the registry credentials."
                                }
                                else {
                                    Write-Host "[FAILURE] Docker Engine rejected the registry credentials."
                                }
                            }
                            catch {
                                Write-Host "[ERROR] Direct Docker Engine authentication test failed."
                                Write-Host "Diagnostic: $($_.Exception.Message)"
                            }
                            finally {
                                if ($responseMemory) {
                                    $responseMemory.Dispose()
                                }

                                if ($authPipe) {
                                    $authPipe.Dispose()
                                }

                                $authPayload = $null
                                $authPayloadBytes = $null
                                $responseText = $null
                            }

                            # Create Docker CLI authentication configuration directly.
                            Write-Host "`n========== DOCKER CLI AUTH CONFIGURATION =========="

                            if ([string]::IsNullOrWhiteSpace($env:DOCKER_CONFIG)) {
                                throw "DOCKER_CONFIG is not configured."
                            }

                            $configPath = Join-Path $env:DOCKER_CONFIG 'config.json'

                            # Encode Docker Hub username and PAT in the format expected by Docker.
                            $credentialText = "${dockerHubUsername}:$dockerHubToken"

                            $credentialBytes = [System.Text.Encoding]::UTF8.GetBytes(
                                $credentialText
                            )

                            $authBase64 = [Convert]::ToBase64String($credentialBytes)

                            # Use Docker's standard Docker Hub authentication key.
                            $dockerAuthConfig = @{
                                auths = @{
                                    'https://index.docker.io/v1/' = @{
                                        auth = $authBase64
                                    }
                                }
                            }

                            # Write config.json as UTF-8 without BOM.
                            $configJson = $dockerAuthConfig | ConvertTo-Json -Depth 5

                            $utf8NoBom = New-Object `
                                -TypeName System.Text.UTF8Encoding `
                                -ArgumentList $false

                            [System.IO.File]::WriteAllText(
                                $configPath,
                                $configJson,
                                $utf8NoBom
                            )

                            # Verify that the configuration was written correctly.
                            $storedConfig = Get-Content `
                                -LiteralPath $configPath `
                                -Raw |
                                ConvertFrom-Json -ErrorAction Stop

                            $storedAuth = $storedConfig.auths.'https://index.docker.io/v1/'.auth

                            if ([string]::IsNullOrWhiteSpace($storedAuth) -or
                                $storedAuth -ne $authBase64) {

                                throw "Docker Hub authentication configuration verification failed."
                            }

                            Write-Host "[SUCCESS] Docker Hub authentication configuration created."
                            Write-Host "[SUCCESS] Docker Hub credentials verified in Docker config."

                            # Clear sensitive values from PowerShell variables.
                            $dockerHubToken = $null
                            $credentialText = $null
                            $credentialBytes = $null
                            $authBase64 = $null
                            $dockerAuthConfig = $null
                            $configJson = $null
                            $storedConfig = $null
                            $storedAuth = $null

                            Write-Host "====================================================`n"
                            
                            # Image tagging and publishing
                            $images = @(
                                @{
                                    LocalImage = 'gisthub-frontend:local'
                                    Repository = "$namespace/gisthub-frontend"
                                },
                                @{
                                    LocalImage = 'fastapi-gist-backend:phase2'
                                    Repository = "$namespace/gisthub-backend"
                                }
                            )

                            foreach ($image in $images) {
                                $repository = $image.Repository
                                $shaTag = "${repository}:$commitSha"
                                $latestTag = "${repository}:latest"

                                Write-Host "`n========================================"
                                Write-Host "Publishing: $repository"
                                Write-Host "========================================"

                                # Create both image tags.
                                & $docker tag $image.LocalImage $shaTag

                                if ($LASTEXITCODE -ne 0) {
                                    throw "Failed to tag $shaTag"
                                }

                                & $docker tag $image.LocalImage $latestTag

                                if ($LASTEXITCODE -ne 0) {
                                    throw "Failed to tag $latestTag"
                                }

                                # Push the commit-specific tag first.
                                & $docker push $shaTag

                                if ($LASTEXITCODE -ne 0) {
                                    throw "Failed to push $shaTag"
                                }

                                # Update the latest tag.
                                & $docker push $latestTag

                                if ($LASTEXITCODE -ne 0) {
                                    throw "Failed to push $latestTag"
                                }

                                # Verify that both tags exist in the registry.
                                & $docker manifest inspect $shaTag *> $null

                                if ($LASTEXITCODE -ne 0) {
                                    throw "Registry verification failed for $shaTag"
                                }

                                & $docker manifest inspect $latestTag *> $null

                                if ($LASTEXITCODE -ne 0) {
                                    throw "Registry verification failed for $latestTag"
                                }

                                Write-Host "[OK] Published and verified:"
                                Write-Host "     $shaTag"
                                Write-Host "     $latestTag"
                            }

                            Write-Host "`n[SUCCESS] Both images published to Docker Hub."

                        }
                        finally {
                            $dockerHubToken = $null

                            # Restore previous Docker config and remove
                            # the temporary directory containing auth data.
                            if ($previousDockerConfig) {
                                $env:DOCKER_CONFIG = $previousDockerConfig
                            }
                            else {
                                Remove-Item Env:DOCKER_CONFIG `
                                    -ErrorAction SilentlyContinue
                            }

                            if (Test-Path $dockerConfig) {
                                Remove-Item $dockerConfig `
                                    -Recurse -Force `
                                    -ErrorAction SilentlyContinue
                            }
                        }
                    '''
                }
            }
        }

        stage('Kubernetes Preflight') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'

                        $kubectl = $env:KUBECTL
                        if (-not (Test-Path -LiteralPath $kubectl -PathType Leaf)) {
                            throw "kubectl.exe was not found: $kubectl"
                        }

                        if (-not (Test-Path -LiteralPath $env:KUBECONFIG_FILE -PathType Leaf)) {
                            throw "Jenkins Kubernetes credential is unavailable."
                        }

                        Write-Host "===== KUBERNETES ACCESS PREFLIGHT ====="

                        $podOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE get pods -n gisthub 2>&1
                        $podExitCode = $LASTEXITCODE
                        $podOutput | ForEach-Object { Write-Host $_ }
                        if ($podExitCode -ne 0) {
                            throw "Kubernetes API access failed (kubectl exit code $podExitCode)."
                        }

                        $checks = @(
                            @{ Name = 'Patch ConfigMaps'; Args = @('auth','can-i','patch','configmaps','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Patch application Secret'; Args = @('auth','can-i','patch','secret/gisthub-secrets','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Create migration Jobs'; Args = @('auth','can-i','create','jobs','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Delete previous migration Job'; Args = @('auth','can-i','delete','job/gisthub-db-migrate','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Create Deployments'; Args = @('auth','can-i','create','deployments','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Patch Deployments'; Args = @('auth','can-i','patch','deployments','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Create Services'; Args = @('auth','can-i','create','services','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Patch Services'; Args = @('auth','can-i','patch','services','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Read Pod Logs'; Args = @('auth','can-i','get','pods/log','-n','gisthub'); Expected = 'yes' }
                            @{ Name = 'Cannot create arbitrary Secrets'; Args = @('auth','can-i','create','secrets','-n','gisthub'); Expected = 'no' }
                            @{ Name = 'Cannot modify PostgreSQL StatefulSet'; Args = @('auth','can-i','patch','statefulsets','-n','gisthub'); Expected = 'no' }
                        )

                        foreach ($check in $checks) {
                            $checkArgs = @($check.Args)
                            $resultOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE @checkArgs 2>$null
                            $resultExitCode = $LASTEXITCODE
                            $actual = ($resultOutput | Out-String).Trim()

                            if ($actual -ne $check.Expected) {
                                throw "RBAC preflight failed for '$($check.Name)': expected '$($check.Expected)', received '$actual'."
                            }

                            if ($check.Expected -eq 'yes' -and $resultExitCode -ne 0) {
                                throw "RBAC check '$($check.Name)' returned exit code $resultExitCode."
                            }

                            Write-Host "[PASS] $($check.Name): $actual"
                        }

                        Write-Host "[SUCCESS] Kubernetes API and namespace-scoped permissions verified."

                        # Expected RBAC denials return kubectl exit code 1.
                        # Clear that expected status so Jenkins accepts this successful preflight.
                        $global:LASTEXITCODE = 0
                        exit 0
                    '''
                }
            }
        }

        stage('Prepare Kubernetes Manifests') {
            steps {
                powershell '''
                    $ErrorActionPreference = 'Stop'

                    $commitSha = (& git rev-parse --short=12 HEAD).Trim()
                    if ($LASTEXITCODE -ne 0 -or $commitSha -notmatch '^[0-9a-f]{12}$') {
                        throw "Unable to determine a valid 12-character Git commit SHA."
                    }

                    $sourceDir = Join-Path $env:WORKSPACE 'k8s'
                    $renderDir = Join-Path $env:WORKSPACE ".k8s-rendered-$env:BUILD_NUMBER"

                    if (-not (Test-Path -LiteralPath $sourceDir -PathType Container)) {
                        throw "Kubernetes manifest directory was not found: $sourceDir"
                    }

                    if (Test-Path -LiteralPath $renderDir) {
                        Remove-Item -LiteralPath $renderDir -Recurse -Force
                    }
                    New-Item -ItemType Directory -Path $renderDir -Force | Out-Null

                    $manifestNames = @(
                        '03-backend.yaml',
                        '04-frontend.yaml',
                        '05-migration-job.yaml'
                    )

                    foreach ($name in $manifestNames) {
                        $sourcePath = Join-Path $sourceDir $name
                        $targetPath = Join-Path $renderDir $name

                        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
                            throw "Required Kubernetes manifest is missing: $sourcePath"
                        }

                        $content = Get-Content -LiteralPath $sourcePath -Raw
                        $placeholderCount = ([regex]::Matches($content, '__IMAGE_TAG__')).Count

                        if ($placeholderCount -ne 1) {
                            throw "Expected exactly one __IMAGE_TAG__ placeholder in $name; found $placeholderCount."
                        }

                        $rendered = $content.Replace('__IMAGE_TAG__', $commitSha)
                        if ($rendered.Contains('__IMAGE_TAG__')) {
                            throw "Unresolved image tag placeholder remains in $name."
                        }

                        Set-Content -LiteralPath $targetPath -Value $rendered -Encoding ASCII
                        Write-Host "[RENDERED] $name -> commit $commitSha"
                    }

                    Write-Host "Rendered manifests directory: $renderDir"
                '''
            }
        }

        stage('Update Kubernetes Configuration') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-kubeconfig', variable: 'KUBECONFIG_FILE'),
                    file(credentialsId: 'gisthub-docker-env', variable: 'DOCKER_ENV_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $kubectl = $env:KUBECTL

                        Write-Host "===== APPLY APPLICATION CONFIGMAP ====="
                        $configMapPath = Join-Path (Join-Path $env:WORKSPACE 'k8s') '01-configmap.yaml'
                        $configMapOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE apply -f $configMapPath 2>&1
                        $configMapExitCode = $LASTEXITCODE
                        $configMapOutput | ForEach-Object { Write-Host $_ }
                        if ($configMapExitCode -ne 0) {
                            throw "ConfigMap apply failed (kubectl exit code $configMapExitCode)."
                        }

                        Write-Host "===== VERIFY EXISTING APPLICATION SECRET ====="
                        & $kubectl --kubeconfig $env:KUBECONFIG_FILE get secret/gisthub-secrets -n gisthub 2>$null | Out-Null
                        if ($LASTEXITCODE -ne 0) {
                            throw "The pre-provisioned gisthub-secrets Secret is missing. Jenkins is intentionally not allowed to create arbitrary Secrets."
                        }

                        if (-not (Test-Path -LiteralPath $env:DOCKER_ENV_FILE -PathType Leaf)) {
                            throw "Jenkins Docker environment credential file is unavailable."
                        }

                        Write-Host "===== UPDATE EXISTING APPLICATION SECRET ====="

                        # Read and compare the existing Secret with the desired Secret.
                        # Database credentials must not silently rotate during an ordinary
                        # application release: PostgreSQL's initialized user password is
                        # not changed merely by updating its environment Secret.
                        $currentSecretJson = & $kubectl --kubeconfig $env:KUBECONFIG_FILE get secret/gisthub-secrets -n gisthub -o json 2>$null
                        $currentSecretExitCode = $LASTEXITCODE
                        if ($currentSecretExitCode -ne 0 -or -not $currentSecretJson) {
                            throw "Could not read the existing application Secret for consistency checks."
                        }

                        # Generate the desired Secret as JSON in memory only. Do not write
                        # it to the workspace or print it because it contains credentials.
                        $secretJson = & $kubectl --kubeconfig $env:KUBECONFIG_FILE create secret generic gisthub-secrets `
                            --namespace gisthub `
                            --from-env-file=$env:DOCKER_ENV_FILE `
                            --dry-run=client -o json 2>$null

                        $secretGenerateExitCode = $LASTEXITCODE
                        if ($secretGenerateExitCode -ne 0 -or -not $secretJson) {
                            $secretJson = $null
                            $currentSecretJson = $null
                            throw "Could not generate the Kubernetes Secret manifest from the Jenkins credential."
                        }

                        $currentSecret = ($currentSecretJson | Out-String) | ConvertFrom-Json
                        $desiredSecret = ($secretJson | Out-String) | ConvertFrom-Json

                        foreach ($key in @('POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DATABASE_URL')) {
                            $currentValue = $currentSecret.data.PSObject.Properties[$key].Value
                            $desiredValue = $desiredSecret.data.PSObject.Properties[$key].Value

                            if ([string]::IsNullOrWhiteSpace($currentValue) -or
                                [string]::IsNullOrWhiteSpace($desiredValue) -or
                                $currentValue -ne $desiredValue) {
                                $secretJson = $null
                                $currentSecretJson = $null
                                throw "Database setting '$key' differs from the provisioned Kubernetes Secret. Refusing automatic DB credential changes during application deployment."
                            }
                        }

                        $currentSecret = $null
                        $desiredSecret = $null
                        $currentSecretJson = $null

                        $secretApplyOutput = $secretJson | & $kubectl --kubeconfig $env:KUBECONFIG_FILE apply -f - 2>&1
                        $secretApplyExitCode = $LASTEXITCODE
                        $secretJson = $null

                        $secretApplyOutput | ForEach-Object { Write-Host $_ }
                        if ($secretApplyExitCode -ne 0) {
                            throw "Updating gisthub-secrets failed (kubectl exit code $secretApplyExitCode)."
                        }

                        Write-Host "[SUCCESS] ConfigMap and existing application Secret synchronized."
                    '''
                }
            }
        }

        stage('Wait for PostgreSQL') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $kubectl = $env:KUBECTL

                        Write-Host "Waiting for the pre-provisioned PostgreSQL pod to become Ready..."

                        $output = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                            wait --for=condition=Ready pod/db-0 `
                            -n gisthub --timeout=180s 2>&1

                        $exitCode = $LASTEXITCODE
                        $output | ForEach-Object { Write-Host $_ }

                        if ($exitCode -ne 0) {
                            throw "PostgreSQL pod db-0 is not Ready (kubectl exit code $exitCode)."
                        }

                        Write-Host "[SUCCESS] PostgreSQL is Ready. No StatefulSet or PVC changes were made."
                    '''
                }
            }
        }

        stage('Run Alembic Migrations') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $kubectl = $env:KUBECTL
                        $renderDir = Join-Path $env:WORKSPACE ".k8s-rendered-$env:BUILD_NUMBER"
                        $migrationPath = Join-Path $renderDir '05-migration-job.yaml'

                        if (-not (Test-Path -LiteralPath $migrationPath -PathType Leaf)) {
                            throw "Rendered migration manifest was not found."
                        }

                        Write-Host "===== REMOVE PREVIOUS MIGRATION JOB ====="
                        $deleteOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                            delete job/gisthub-db-migrate -n gisthub `
                            --ignore-not-found=true --wait=true --timeout=60s 2>&1
                        $deleteExitCode = $LASTEXITCODE
                        $deleteOutput | ForEach-Object { Write-Host $_ }
                        if ($deleteExitCode -ne 0) {
                            throw "Could not remove the previous migration Job (kubectl exit code $deleteExitCode)."
                        }

                        Write-Host "===== CREATE MIGRATION JOB FOR THIS COMMIT ====="
                        $applyOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE apply -f $migrationPath 2>&1
                        $applyExitCode = $LASTEXITCODE
                        $applyOutput | ForEach-Object { Write-Host $_ }
                        if ($applyExitCode -ne 0) {
                            throw "Could not create the migration Job (kubectl exit code $applyExitCode)."
                        }

                        Write-Host "===== WAIT FOR ALEMBIC MIGRATION ====="
                        $waitOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                            wait --for=condition=complete job/gisthub-db-migrate `
                            -n gisthub --timeout=180s 2>&1
                        $waitExitCode = $LASTEXITCODE
                        $waitOutput | ForEach-Object { Write-Host $_ }

                        if ($waitExitCode -ne 0) {
                            Write-Host "Migration Job did not complete. Collecting diagnostics..."
                            $describeOutput = & $kubectl --kubeconfig $env:KUBECONFIG_FILE describe job/gisthub-db-migrate -n gisthub 2>&1
                            $describeOutput | ForEach-Object { Write-Host $_ }
                            $failureLogs = & $kubectl --kubeconfig $env:KUBECONFIG_FILE logs job/gisthub-db-migrate -n gisthub --all-containers=true --tail=100 2>&1
                            $failureLogs | ForEach-Object { Write-Host $_ }
                            throw "Alembic migration failed or timed out (kubectl exit code $waitExitCode). Application deployment was stopped."
                        }

                        Write-Host "===== ALEMBIC MIGRATION LOGS ====="
                        $migrationLogs = & $kubectl --kubeconfig $env:KUBECONFIG_FILE logs job/gisthub-db-migrate -n gisthub --all-containers=true --tail=100 2>&1
                        $logsExitCode = $LASTEXITCODE
                        $migrationLogs | ForEach-Object { Write-Host $_ }
                        if ($logsExitCode -ne 0) {
                            throw "Migration completed but its logs could not be retrieved."
                        }

                        Write-Host "[SUCCESS] Alembic migration Job completed."
                    '''
                }
            }
        }

        stage('Deploy Backend and Frontend') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $kubectl = $env:KUBECTL
                        $renderDir = Join-Path $env:WORKSPACE ".k8s-rendered-$env:BUILD_NUMBER"
                        $backendPath = Join-Path $renderDir '03-backend.yaml'
                        $frontendPath = Join-Path $renderDir '04-frontend.yaml'

                        if (-not (Test-Path -LiteralPath $backendPath -PathType Leaf) -or
                            -not (Test-Path -LiteralPath $frontendPath -PathType Leaf)) {
                            throw "Rendered backend or frontend manifest is missing."
                        }

                        Write-Host "===== APPLY FASTAPI BACKEND ====="
                        $backendApply = & $kubectl --kubeconfig $env:KUBECONFIG_FILE apply -f $backendPath 2>&1
                        $backendApplyCode = $LASTEXITCODE
                        $backendApply | ForEach-Object { Write-Host $_ }
                        if ($backendApplyCode -ne 0) {
                            throw "Backend manifest apply failed (kubectl exit code $backendApplyCode)."
                        }

                        Write-Host "===== WAIT FOR BACKEND ROLLOUT ====="
                        $backendRollout = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                            rollout status deployment/backend -n gisthub --timeout=180s 2>&1
                        $backendRolloutCode = $LASTEXITCODE
                        $backendRollout | ForEach-Object { Write-Host $_ }

                        if ($backendRolloutCode -ne 0) {
                            Write-Host "Backend rollout failed. Collecting diagnostics..."
                            $backendDescribe = & $kubectl --kubeconfig $env:KUBECONFIG_FILE describe deployment/backend -n gisthub 2>&1
                            $backendDescribe | ForEach-Object { Write-Host $_ }
                            $backendLogs = & $kubectl --kubeconfig $env:KUBECONFIG_FILE logs deployment/backend -n gisthub --all-containers=true --tail=100 2>&1
                            $backendLogs | ForEach-Object { Write-Host $_ }
                            throw "Backend rollout failed (kubectl exit code $backendRolloutCode)."
                        }

                        Write-Host "===== APPLY REACT FRONTEND ====="
                        $frontendApply = & $kubectl --kubeconfig $env:KUBECONFIG_FILE apply -f $frontendPath 2>&1
                        $frontendApplyCode = $LASTEXITCODE
                        $frontendApply | ForEach-Object { Write-Host $_ }
                        if ($frontendApplyCode -ne 0) {
                            throw "Frontend manifest apply failed (kubectl exit code $frontendApplyCode)."
                        }

                        Write-Host "===== WAIT FOR FRONTEND ROLLOUT ====="
                        $frontendRollout = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                            rollout status deployment/frontend -n gisthub --timeout=180s 2>&1
                        $frontendRolloutCode = $LASTEXITCODE
                        $frontendRollout | ForEach-Object { Write-Host $_ }

                        if ($frontendRolloutCode -ne 0) {
                            Write-Host "Frontend rollout failed. Collecting diagnostics..."
                            $frontendDescribe = & $kubectl --kubeconfig $env:KUBECONFIG_FILE describe deployment/frontend -n gisthub 2>&1
                            $frontendDescribe | ForEach-Object { Write-Host $_ }
                            $frontendLogs = & $kubectl --kubeconfig $env:KUBECONFIG_FILE logs deployment/frontend -n gisthub --all-containers=true --tail=100 2>&1
                            $frontendLogs | ForEach-Object { Write-Host $_ }
                            throw "Frontend rollout failed (kubectl exit code $frontendRolloutCode)."
                        }

                        Write-Host "[SUCCESS] Backend and frontend deployments rolled out."
                    '''
                }
            }
        }

        stage('Verify Kubernetes Deployment') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-kubeconfig', variable: 'KUBECONFIG_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'
                        $kubectl = $env:KUBECTL

                        Write-Host "=========================================="
                        Write-Host "    VERIFYING GISTHUB KUBERNETES RELEASE"
                        Write-Host "=========================================="

                        $output = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                            get deployments,pods,services -n gisthub -o wide 2>&1
                        $exitCode = $LASTEXITCODE
                        $output | ForEach-Object { Write-Host $_ }

                        if ($exitCode -ne 0) {
                            throw "Could not retrieve Kubernetes deployment status."
                        }

                        # Verify each application Deployment is available.
                        foreach ($deploymentName in @('backend', 'frontend')) {
                            $json = & $kubectl --kubeconfig $env:KUBECONFIG_FILE `
                                get deployment $deploymentName -n gisthub -o json 2>$null
                            $jsonExitCode = $LASTEXITCODE
                            if ($jsonExitCode -ne 0 -or -not $json) {
                                throw "Could not inspect Deployment '$deploymentName'."
                            }

                            $deployment = ($json | Out-String) | ConvertFrom-Json
                            $desired = [int]$deployment.spec.replicas
                            $ready = [int]$deployment.status.readyReplicas
                            $available = [int]$deployment.status.availableReplicas

                            if ($ready -lt $desired -or $available -lt $desired) {
                                throw "Deployment '$deploymentName' is not fully available. Desired=$desired Ready=$ready Available=$available"
                            }

                            Write-Host "[OK] $deploymentName available: $available/$desired replicas."
                        }

                        Write-Host "[SUCCESS] GistHub Kubernetes release verified."
                    '''
                }
            }
        }

    }

    post {
        always {
            powershell '''
                $renderDir = Join-Path $env:WORKSPACE ".k8s-rendered-$env:BUILD_NUMBER"
                if (Test-Path -LiteralPath $renderDir) {
                    Remove-Item -LiteralPath $renderDir -Recurse -Force -ErrorAction SilentlyContinue
                    Write-Host "Temporary rendered Kubernetes manifests cleaned up."
                }
            '''
        }
        failure {
            echo "Pipeline failed. Review the stage logs above for failure details."
        }
        success {
            echo "Pipeline succeeded! Tests passed, images were published, migrations completed, and Kubernetes workloads are available."
        }
    }
}
