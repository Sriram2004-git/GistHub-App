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

                            # Docker CLI login using native PowerShell standard input.
                            Write-Host "`n========== DOCKER CLI LOGIN =========="

                            $dockerHubToken |
                                & $docker login `
                                    --username $dockerHubUsername `
                                    --password-stdin `
                                    'https://index.docker.io/v1/'

                            $loginExitCode = $LASTEXITCODE

                            if ($loginExitCode -ne 0) {
                                throw "Docker Hub login failed with exit code $loginExitCode."
                            }

                            Write-Host "[SUCCESS] Docker Hub authentication successful."

                            $dockerHubToken = $null

                            Write-Host "======================================`n"
                            Write-Host "Docker Hub login successful."
                            
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

        stage('Start or Update Compose Services') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-app-env', variable: 'APP_ENV_FILE'),
                    file(credentialsId: 'gisthub-docker-env', variable: 'DOCKER_ENV_FILE')
                ]) {
                    bat '''
                        "%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" up -d --no-build
                    '''
                }
            }
        }

        stage('Verify') {
            steps {
                withCredentials([
                    file(credentialsId: 'gisthub-app-env', variable: 'APP_ENV_FILE'),
                    file(credentialsId: 'gisthub-docker-env', variable: 'DOCKER_ENV_FILE')
                ]) {
                    powershell '''
                        $ErrorActionPreference = 'Stop'

                        Write-Host "========================================"
                        Write-Host "       VERIFYING COMPOSE SERVICES"
                        Write-Host "========================================"

                        $docker = $env:DOCKER_CLI

                        $dockerArgs = @(
                            'compose'
                            '-p'
                            'fast_api_baknd'
                            '--env-file'
                            $env:APP_ENV_FILE
                            '--env-file'
                            $env:DOCKER_ENV_FILE
                            'ps'
                            '--status'
                            'running'
                            '--services'
                        )

                        Write-Host "`nChecking running Docker Compose services..."

                        $runningServices = @(& $docker @dockerArgs)
                        $dockerExitCode = $LASTEXITCODE

                        if ($dockerExitCode -ne 0) {
                            throw "Docker Compose query failed with exit code $dockerExitCode"
                        }

                        $runningServices = @(
                            $runningServices |
                            ForEach-Object { ([string]$_).Trim() } |
                            Where-Object { $_ -ne '' }
                        )

                        Write-Host "`n--- Running Services ---"
                        $runningServices | ForEach-Object { Write-Host $_ }

                        $expectedServices = @('db', 'backend', 'frontend')

                        $missingServices = @(
                            $expectedServices |
                            Where-Object { $runningServices -notcontains $_ }
                        )

                        if ($missingServices.Count -gt 0) {
                            throw "The following services are NOT running: $($missingServices -join ', ')"
                        }

                        Write-Host "`n[OK] Database service is running."
                        Write-Host "[OK] Backend service is running."
                        Write-Host "[OK] Frontend service is running."

                        Write-Host "`n========================================"
                        Write-Host "[SUCCESS] All three services are running!"
                        Write-Host "========================================"
                    '''
                }
            }
        }
    }

    post {
        failure {
            echo "Pipeline failed. Review stage logs above for failure details."
        }
        success {
            echo "Pipeline succeeded! All tests passed, images built, and services are running."
        }
    }
}
