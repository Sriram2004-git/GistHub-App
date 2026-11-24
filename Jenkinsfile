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
                            # Validate Jenkins credentials without displaying the token
                            if ([string]::IsNullOrWhiteSpace($env:DOCKERHUB_USERNAME)) {
                                throw "Docker Hub username is missing from Jenkins credentials."
                            }
                            
                            if ([string]::IsNullOrWhiteSpace($env:DOCKERHUB_TOKEN)) {
                                throw "Docker Hub token is missing from Jenkins credentials."
                            }
                            
                            Write-Host "Docker Hub username from Jenkins: $env:DOCKERHUB_USERNAME"
                            
                            # Start Docker login with explicit stdin redirection.
                            # This avoids the PowerShell pipeline to native executable.
                            $loginInfo = New-Object System.Diagnostics.ProcessStartInfo
                            $loginInfo.FileName = $docker
                            $loginInfo.Arguments = "login --username $($env:DOCKERHUB_USERNAME) --password-stdin"
                            $loginInfo.UseShellExecute = $false
                            $loginInfo.CreateNoWindow = $true
                            $loginInfo.RedirectStandardInput = $true
                            $loginInfo.RedirectStandardOutput = $true
                            $loginInfo.RedirectStandardError = $true
                            
                            $loginProcess = New-Object System.Diagnostics.Process
                            $loginProcess.StartInfo = $loginInfo
                            
                            try {
                                [void]$loginProcess.Start()
                            
                                # Send PAT directly through standard input.
                                $loginProcess.StandardInput.WriteLine($env:DOCKERHUB_TOKEN)
                                $loginProcess.StandardInput.Close()
                            
                                $loginOutput = $loginProcess.StandardOutput.ReadToEnd()
                                $loginError = $loginProcess.StandardError.ReadToEnd()
                            
                                $loginProcess.WaitForExit()
                            
                                if ($loginOutput) {
                                    Write-Host $loginOutput.Trim()
                                }
                            
                                if ($loginProcess.ExitCode -ne 0) {
                                    if ($loginError) {
                                        Write-Host $loginError.Trim()
                                    }
                            
                                    throw "Docker Hub authentication failed. Check the Jenkins PAT credential."
                                }
                            
                                Write-Host "[SUCCESS] Docker Hub authentication successful!"
                            }
                            finally {
                                $loginProcess.Dispose()
                            }

                            Write-Host "`nDocker Hub login successful."

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
