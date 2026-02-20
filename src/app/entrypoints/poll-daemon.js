import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { logInfo, logError } from "../../shared/lib/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const POLL_SCRIPT = join(__dirname, "poll.js");
const PROJECT_ROOT = join(__dirname, "..", "..", "..");
const PID_FILE = join(PROJECT_ROOT, "poll-daemon.pid");

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 60_000;
const STABLE_THRESHOLD_MS = 60_000;
const STOP_TIMEOUT_MS = 15_000;
const STOP_CHECK_INTERVAL_MS = 500;

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function removePidFile() {
  try {
    unlinkSync(PID_FILE);
  } catch {}
}

function stopDaemon() {
  if (!existsSync(PID_FILE)) {
    logInfo("Daemon: PID file not found, not running");
    return;
  }

  let pid;
  try {
    pid = Number(readFileSync(PID_FILE, "utf-8").trim());
  } catch (error) {
    logError("Daemon: failed to read PID file", error);
    removePidFile();
    return;
  }

  if (!isProcessRunning(pid)) {
    logInfo("Daemon: process not running (stale PID file), cleaning up");
    removePidFile();
    return;
  }

  logInfo(`Daemon: sending SIGTERM to process ${pid}`);
  process.kill(pid, "SIGTERM");

  const deadline = Date.now() + STOP_TIMEOUT_MS;

  const waitForExit = () => {
    if (!isProcessRunning(pid)) {
      logInfo("Daemon: process stopped");
      removePidFile();
      return;
    }

    if (Date.now() >= deadline) {
      logInfo(`Daemon: process ${pid} did not stop in time, sending SIGKILL`);
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
      removePidFile();
      return;
    }

    setTimeout(waitForExit, STOP_CHECK_INTERVAL_MS);
  };

  waitForExit();
}

function startDaemon() {
  if (existsSync(PID_FILE)) {
    let pid;
    try {
      pid = Number(readFileSync(PID_FILE, "utf-8").trim());
    } catch {}

    if (pid && isProcessRunning(pid)) {
      logError(`Daemon: already running (PID ${pid})`);
      process.exit(1);
    }

    removePidFile();
  }

  writeFileSync(PID_FILE, String(process.pid), "utf-8");

  let backoffMs = INITIAL_BACKOFF_MS;
  let stopping = false;
  let child = null;
  let restartTimer = null;

  function cleanup() {
    removePidFile();
  }

  function shutdown(signal) {
    if (stopping) return;
    stopping = true;

    logInfo(`Daemon: received ${signal}, forwarding to child and stopping`);

    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    if (child) {
      child.kill(signal);
    } else {
      cleanup();
      process.exit(0);
    }
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGHUP", () => {});
  process.on("exit", cleanup);

  function startChild() {
    const startedAt = Date.now();

    child = spawn(process.execPath, [POLL_SCRIPT], {
      stdio: "inherit",
    });

    logInfo(`Daemon: poll process spawned (PID ${child.pid})`);

    child.on("exit", (code, signal) => {
      const uptimeMs = Date.now() - startedAt;
      child = null;

      if (stopping) {
        logInfo(
          `Daemon: poll process exited (code=${code}, signal=${signal}), daemon is stopping`,
        );
        return;
      }

      if (code === 0) {
        logInfo("Daemon: poll process exited cleanly (code=0), not restarting");
        cleanup();
        return;
      }

      if (uptimeMs >= STABLE_THRESHOLD_MS) {
        backoffMs = INITIAL_BACKOFF_MS;
        logInfo(
          `Daemon: poll process was stable (${Math.round(uptimeMs / 1000)}s), backoff reset`,
        );
      }

      logInfo(
        `Daemon: poll process exited (code=${code}, signal=${signal}), restarting in ${backoffMs}ms`,
      );

      restartTimer = setTimeout(() => {
        restartTimer = null;
        if (!stopping) {
          startChild();
        }
      }, backoffMs);

      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
    });

    child.on("error", (error) => {
      logError("Daemon: failed to spawn poll process", error);
    });
  }

  logInfo("Daemon: starting");
  startChild();
}

const command = process.argv[2];

if (command === "stop") {
  stopDaemon();
} else {
  startDaemon();
}
