#!/bin/sh

# ============================================================
# cultvshn-bot deploy & auto-update script
# Target: Keenetic OS 5 (Entware, /bin/sh, POSIX)
#
# - Скачивает zip-архив main-ветки с GitHub
# - Распаковывает, ставит зависимости, запускает демона
# - Каждые 60 минут проверяет новую версию через GitHub API
# - При обнаружении — обновляет и перезапускает
# ============================================================

BASE_DIR="/tmp/mnt/181ADB641ADB3E06/projects/cultvshn"
PROJECT_DIR="${BASE_DIR}/cultvshn-bot-main"
PROJECT_DIR_OLD="${BASE_DIR}/cultvshn-bot-main.old"
ENV_FILE="${BASE_DIR}/.env"
SHA_FILE="${BASE_DIR}/.current-sha"
DEPLOY_PID_FILE="${BASE_DIR}/deploy.pid"

ARCHIVE_URL="https://github.com/Leonhelm/cultvshn-bot/archive/refs/heads/main.zip"
SHA_API_URL="https://api.github.com/repos/Leonhelm/cultvshn-bot/commits/main"

BOT_LOG="/opt/var/log/cultvshn-bot.log"
NODE_BIN="/opt/bin/node"
NPM_BIN="/opt/bin/npm"

CHECK_INTERVAL=3600

# ======================== Logging ========================

log_msg() {
    stamp=$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || date)
    printf '[%s] DEPLOY: %s\n' "$stamp" "$1"
}

# ======================== SHA management ========================

get_remote_sha() {
    sha=$(curl -s -f -m 30 \
        -H "Accept: application/vnd.github.sha" \
        "$SHA_API_URL" 2>/dev/null)
    if [ $? -ne 0 ] || [ -z "$sha" ]; then
        return 1
    fi
    printf '%s' "$sha"
}

get_local_sha() {
    if [ -f "$SHA_FILE" ]; then
        cat "$SHA_FILE"
    fi
}

# ======================== Bot management ========================

stop_bot() {
    if [ ! -d "$PROJECT_DIR" ]; then
        return 0
    fi

    if [ ! -f "${PROJECT_DIR}/poll-daemon.pid" ]; then
        log_msg "No PID file, daemon not running"
        return 0
    fi

    pid=$(cat "${PROJECT_DIR}/poll-daemon.pid" 2>/dev/null)
    if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
        log_msg "Stale PID file, cleaning up"
        rm -f "${PROJECT_DIR}/poll-daemon.pid"
        return 0
    fi

    log_msg "Stopping daemon (PID $pid)..."
    cd "$PROJECT_DIR" || return 1
    "$NODE_BIN" src/entrypoints/poll-daemon.js stop 2>&1

    i=0
    while [ "$i" -lt 20 ]; do
        if ! kill -0 "$pid" 2>/dev/null; then
            log_msg "Daemon stopped"
            return 0
        fi
        sleep 1
        i=$((i + 1))
    done

    log_msg "WARN: Daemon did not stop, sending SIGKILL"
    kill -9 "$pid" 2>/dev/null
    rm -f "${PROJECT_DIR}/poll-daemon.pid"
    sleep 1
    return 0
}

start_bot() {
    cd "$PROJECT_DIR" || return 1
    log_msg "Starting poll-daemon..."
    "$NODE_BIN" src/entrypoints/poll-daemon.js >> "$BOT_LOG" 2>&1 &
    sleep 2

    if [ -f "poll-daemon.pid" ] && kill -0 "$(cat poll-daemon.pid)" 2>/dev/null; then
        log_msg "Poll-daemon started (PID $(cat poll-daemon.pid))"
        return 0
    fi

    log_msg "ERROR: Poll-daemon failed to start"
    return 1
}

# ======================== Deploy operations ========================

download_and_extract() {
    cd "$BASE_DIR" || return 1
    rm -f main.zip

    if [ -d "$PROJECT_DIR" ]; then
        rm -rf "$PROJECT_DIR_OLD"
        mv "$PROJECT_DIR" "$PROJECT_DIR_OLD"
    fi

    log_msg "Downloading archive..."
    curl -sL -f -m 120 -o main.zip "$ARCHIVE_URL"
    if [ $? -ne 0 ] || [ ! -f main.zip ]; then
        log_msg "ERROR: Download failed"
        restore_old_dir
        return 1
    fi

    log_msg "Extracting archive..."
    unzip -q -o main.zip
    if [ $? -ne 0 ] || [ ! -d "$PROJECT_DIR" ]; then
        log_msg "ERROR: Extract failed"
        rm -f main.zip
        restore_old_dir
        return 1
    fi

    rm -f main.zip
    log_msg "Archive downloaded and extracted"
    return 0
}

link_env() {
    if [ ! -f "$ENV_FILE" ]; then
        log_msg "FATAL: .env not found at $ENV_FILE"
        return 1
    fi

    rm -f "${PROJECT_DIR}/.env"
    ln -s "$ENV_FILE" "${PROJECT_DIR}/.env" 2>/dev/null
    if [ $? -ne 0 ]; then
        log_msg "WARN: Symlink failed, copying .env"
        cp "$ENV_FILE" "${PROJECT_DIR}/.env"
    fi

    log_msg ".env linked"
    return 0
}

install_deps() {
    cd "$PROJECT_DIR" || return 1
    log_msg "Running npm ci..."
    "$NPM_BIN" ci 2>&1
    if [ $? -ne 0 ]; then
        log_msg "ERROR: npm ci failed"
        return 1
    fi
    log_msg "Dependencies installed"
    return 0
}

restore_old_dir() {
    if [ -d "$PROJECT_DIR_OLD" ]; then
        log_msg "Restoring previous version..."
        rm -rf "$PROJECT_DIR"
        mv "$PROJECT_DIR_OLD" "$PROJECT_DIR"
    fi
}

deploy() {
    new_sha="$1"

    if ! download_and_extract; then
        return 1
    fi

    if ! link_env; then
        restore_old_dir
        return 1
    fi

    if ! install_deps; then
        restore_old_dir
        return 1
    fi

    rm -rf "$PROJECT_DIR_OLD"

    if ! start_bot; then
        return 1
    fi

    printf '%s' "$new_sha" > "$SHA_FILE"
    log_msg "Deployed successfully (SHA: $new_sha)"
    return 0
}

# ======================== Signal handling ========================

cleanup_and_exit() {
    log_msg "Received termination signal, shutting down..."
    stop_bot
    rm -f "$DEPLOY_PID_FILE"
    log_msg "Deploy script exited"
    exit 0
}

trap cleanup_and_exit TERM INT

# ======================== Main ========================

log_msg "========================================="
log_msg "Deploy script starting (PID $$)"
log_msg "========================================="

if [ ! -f "$ENV_FILE" ]; then
    log_msg "FATAL: $ENV_FILE not found"
    log_msg "Create it with TG_BOT_API_TOKEN, FIREBASE_SERVICE_ACCOUNT_JSON"
    exit 1
fi

printf '%s' "$$" > "$DEPLOY_PID_FILE"

remote_sha=$(get_remote_sha)
local_sha=$(get_local_sha)

need_deploy=0
if [ ! -d "$PROJECT_DIR" ]; then
    log_msg "No project directory found, initial deploy needed"
    need_deploy=1
elif [ -z "$local_sha" ]; then
    log_msg "No SHA file found, deploy needed"
    need_deploy=1
elif [ -n "$remote_sha" ] && [ "$local_sha" != "$remote_sha" ]; then
    log_msg "Version mismatch (local=$local_sha, remote=$remote_sha)"
    need_deploy=1
fi

if [ "$need_deploy" -eq 1 ]; then
    if [ -z "$remote_sha" ]; then
        if [ -d "$PROJECT_DIR" ] && [ -f "${PROJECT_DIR}/package.json" ]; then
            log_msg "WARN: Cannot reach GitHub, starting existing deployment"
            start_bot
        else
            log_msg "FATAL: No existing deployment and cannot reach GitHub"
            rm -f "$DEPLOY_PID_FILE"
            exit 1
        fi
    else
        stop_bot
        if ! deploy "$remote_sha"; then
            if [ -d "$PROJECT_DIR" ] && [ -f "${PROJECT_DIR}/package.json" ]; then
                log_msg "Deploy failed, attempting to start restored version"
                link_env
                start_bot
            else
                log_msg "FATAL: Initial deploy failed with no fallback"
                rm -f "$DEPLOY_PID_FILE"
                exit 1
            fi
        fi
    fi
else
    log_msg "Already at latest version ($local_sha)"
    bot_running=0
    if [ -f "${PROJECT_DIR}/poll-daemon.pid" ]; then
        pid=$(cat "${PROJECT_DIR}/poll-daemon.pid" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            bot_running=1
        fi
    fi

    if [ "$bot_running" -eq 0 ]; then
        log_msg "Bot not running, starting..."
        start_bot
    else
        log_msg "Bot already running (PID $pid)"
    fi
fi

log_msg "Entering update loop (check interval: ${CHECK_INTERVAL}s)"

while true; do
    sleep "$CHECK_INTERVAL"

    log_msg "Checking for updates..."
    remote_sha=$(get_remote_sha)
    if [ -z "$remote_sha" ]; then
        log_msg "WARN: GitHub API unreachable, skipping"
        continue
    fi

    local_sha=$(get_local_sha)
    if [ "$local_sha" = "$remote_sha" ]; then
        log_msg "Up to date ($local_sha)"
        continue
    fi

    log_msg "Update available: $local_sha -> $remote_sha"
    stop_bot

    if deploy "$remote_sha"; then
        log_msg "Update complete"
    else
        log_msg "ERROR: Update failed"
        if [ -d "$PROJECT_DIR" ] && [ -f "${PROJECT_DIR}/package.json" ]; then
            log_msg "Attempting to restart existing version"
            link_env
            start_bot
        else
            log_msg "CRITICAL: No working version available"
        fi
    fi
done
