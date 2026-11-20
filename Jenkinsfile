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
                    bat '''
                        @echo off
                        echo --- Running Services ---
                        "%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" ps --status running
                        echo.

                        set DB_ID=
                        for /f "tokens=*" %%i in ('"%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" ps --status running db -q') do set DB_ID=%%i
                        if not defined DB_ID (
                            echo [ERROR] Service 'db' is NOT running!
                            exit /b 1
                        )
                        echo [OK] Service 'db' is running (Container: %DB_ID%).

                        set BACKEND_ID=
                        for /f "tokens=*" %%i in ('"%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" ps --status running backend -q') do set BACKEND_ID=%%i
                        if not defined BACKEND_ID (
                            echo [ERROR] Service 'backend' is NOT running!
                            exit /b 1
                        )
                        echo [OK] Service 'backend' is running (Container: %BACKEND_ID%).

                        set FRONTEND_ID=
                        for /f "tokens=*" %%i in ('"%DOCKER_CLI%" compose -p fast_api_baknd --env-file "%APP_ENV_FILE%" --env-file "%DOCKER_ENV_FILE%" ps --status running frontend -q') do set FRONTEND_ID=%%i
                        if not defined FRONTEND_ID (
                            echo [ERROR] Service 'frontend' is NOT running!
                            exit /b 1
                        )
                        echo [OK] Service 'frontend' is running (Container: %FRONTEND_ID%).

                        echo [SUCCESS] All expected services (db, backend, frontend) are confirmed running.
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
