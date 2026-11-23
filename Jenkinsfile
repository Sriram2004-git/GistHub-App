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
                    bat '''
                        @echo off
                        setlocal

                        echo ========================================
                        echo       VERIFYING COMPOSE SERVICES
                        echo ========================================

                        set "RUNNING_SERVICES_FILE=%WORKSPACE%\\running-services-%BUILD_NUMBER%.txt"

                        echo.
                        echo Checking running Docker Compose services...

                        "%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" ps --status running --services > "%RUNNING_SERVICES_FILE%"

                        if errorlevel 1 (
                            echo [ERROR] Docker Compose service query failed.
                            if exist "%RUNNING_SERVICES_FILE%" type "%RUNNING_SERVICES_FILE%"
                            exit /b 1
                        )

                        echo.
                        echo --- Running Services ---
                        type "%RUNNING_SERVICES_FILE%"
                        echo.

                        echo Checking database service...
                        findstr /x /c:"db" "%RUNNING_SERVICES_FILE%" >nul
                        if errorlevel 1 (
                            echo [ERROR] Service db is NOT running!
                            del /q "%RUNNING_SERVICES_FILE%" 2>nul
                            exit /b 1
                        )
                        echo [OK] Database service is running.

                        echo.
                        echo Checking backend service...
                        findstr /x /c:"backend" "%RUNNING_SERVICES_FILE%" >nul
                        if errorlevel 1 (
                            echo [ERROR] Service backend is NOT running!
                            del /q "%RUNNING_SERVICES_FILE%" 2>nul
                            exit /b 1
                        )
                        echo [OK] Backend service is running.

                        echo.
                        echo Checking frontend service...
                        findstr /x /c:"frontend" "%RUNNING_SERVICES_FILE%" >nul
                        if errorlevel 1 (
                            echo [ERROR] Service frontend is NOT running!
                            del /q "%RUNNING_SERVICES_FILE%" 2>nul
                            exit /b 1
                        )
                        echo [OK] Frontend service is running.

                        del /q "%RUNNING_SERVICES_FILE%"

                        echo.
                        echo ========================================
                        echo [SUCCESS] All three services are running!
                        echo ========================================
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
