pipeline {
    agent any

    environment {
        GIT_REPO_URL  = 'https://github.com/askmuhammadtayyab786-max/mobile.git'
        GIT_BRANCH    = 'main'
        SERVER_IP     = '3.26.216.172'
        COMPOSE_FILE  = 'docker-compose.yaml'
        HEALTH_URL    = 'http://3.26.216.172'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {

        // ══════════════════════════════════════════════════════════════════
        // STEP 1 — STOP RUNNING CONTAINERS
        // ══════════════════════════════════════════════════════════════════
        stage('Stop Running Containers') {
            steps {
                echo '🛑 Stopping all running containers...'
                sh '''
                    docker-compose -f ${COMPOSE_FILE} down --remove-orphans || true

                    for NAME in nginx frontend backend mongo; do
                        if [ "$(docker ps -q -f name=^${NAME}$)" ]; then
                            echo "  Force-stopping: ${NAME}"
                            docker stop ${NAME} && docker rm ${NAME} || true
                        fi
                    done

                    echo "✅ All containers stopped."
                    docker ps
                '''
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // STEP 2 — PULL CODE FROM GITHUB
        // ══════════════════════════════════════════════════════════════════
        stage('Pull Code from GitHub') {
            steps {
                echo "📥 Pulling code from: ${GIT_REPO_URL} (branch: ${GIT_BRANCH})"
                git(
                    url: "${GIT_REPO_URL}",
                    branch: "${GIT_BRANCH}",
                    changelog: true,
                    poll: true
                )
                echo '✅ Code pulled successfully.'
                sh '''
                    echo "--- Repo structure ---"
                    ls -la
                '''
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // STEP 3 — BUILD DOCKER IMAGES
        // ══════════════════════════════════════════════════════════════════
        stage('Build Docker Images') {
            steps {
                echo '🔨 Building Docker images...'
                sh '''
                    echo "[1/2] Building frontend image..."
                    docker build \
                        --no-cache \
                        --tag frontend:latest \
                        --tag frontend:${BUILD_NUMBER} \
                        --file frontend/Dockerfile \
                        ./frontend

                    echo "[2/2] Building backend image..."
                    docker build \
                        --no-cache \
                        --tag backend:latest \
                        --tag backend:${BUILD_NUMBER} \
                        --file backend/Dockerfile \
                        ./backend

                    echo "✅ Both images built successfully."
                    docker images | grep -E "frontend|backend"
                '''
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // STEP 4 — DEPLOY
        // MongoDB is NOT recreated — data volume stays safe.
        // ══════════════════════════════════════════════════════════════════
        stage('Deploy') {
            steps {
                echo "🚀 Deploying FileForge PRO to ${SERVER_IP}..."
                sh '''
                    # Start MongoDB first (skip if already running)
                    docker-compose -f ${COMPOSE_FILE} up -d mongo
                    sleep 5

                    # Recreate app containers with newly built images
                    docker-compose -f ${COMPOSE_FILE} up -d \
                        --force-recreate \
                        --remove-orphans \
                        backend frontend nginx

                    echo "--- Running containers after deploy ---"
                    docker-compose -f ${COMPOSE_FILE} ps
                '''
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // STEP 5 — HEALTH CHECK ON PRODUCTION IP
        // ══════════════════════════════════════════════════════════════════
        stage('Health Check') {
            steps {
                echo "❤️  Verifying production server at ${HEALTH_URL} ..."
                retry(6) {
                    sleep(time: 10, unit: 'SECONDS')
                    sh "curl --fail --silent --max-time 10 ${HEALTH_URL}"
                }
                echo "✅ FileForge PRO is LIVE at http://${SERVER_IP}"
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // STEP 6 — CLEANUP OLD IMAGES
        // ══════════════════════════════════════════════════════════════════
        stage('Cleanup Old Images') {
            steps {
                echo '🧹 Removing dangling/old Docker images...'
                sh '''
                    docker image prune -f

                    docker images frontend --format "{{.Tag}}" | \
                        grep -E "^[0-9]+$" | sort -rn | tail -n +4 | \
                        xargs -r -I{} docker rmi frontend:{} || true

                    docker images backend --format "{{.Tag}}" | \
                        grep -E "^[0-9]+$" | sort -rn | tail -n +4 | \
                        xargs -r -I{} docker rmi backend:{} || true

                    echo "✅ Cleanup done."
                '''
            }
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // POST ACTIONS
    // ══════════════════════════════════════════════════════════════════════
    post {
        success {
            echo """
╔═══════════════════════════════════════════════════════╗
║   ✅  FileForge PRO — Build #${BUILD_NUMBER} DEPLOYED OK     ║
║   🌐  Live at → http://3.26.216.172                  ║
╚═══════════════════════════════════════════════════════╝
            """
        }

        failure {
            echo '❌ Pipeline FAILED — rolling back to previous build...'
            sh '''
                PREV=$((BUILD_NUMBER - 1))
                FRONTEND_EXISTS=$(docker image inspect frontend:${PREV} > /dev/null 2>&1 && echo yes || echo no)
                BACKEND_EXISTS=$(docker image inspect backend:${PREV}  > /dev/null 2>&1 && echo yes || echo no)

                if [ "$FRONTEND_EXISTS" = "yes" ] && [ "$BACKEND_EXISTS" = "yes" ]; then
                    echo "Rolling back to build #${PREV}..."
                    docker tag frontend:${PREV} frontend:latest
                    docker tag backend:${PREV}  backend:latest
                    docker-compose -f ${COMPOSE_FILE} up -d \
                        --force-recreate frontend backend nginx
                    echo "✅ Rolled back to build #${PREV}."
                else
                    echo "⚠️  No rollback images found. Manual intervention required."
                fi
            '''
        }

        always {
            echo "Build #${BUILD_NUMBER} finished → ${currentBuild.currentResult}"
        }
    }
}
