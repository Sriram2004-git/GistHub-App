pipeline {
    agent any

    options {
        disableConcurrentBuilds()
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
