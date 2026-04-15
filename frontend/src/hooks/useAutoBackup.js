import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "cp_auto_backup_config";
const IDB_DB_NAME  = "cinema_fs";
const IDB_STORE    = "dir_handles";

// ─── IndexedDB helpers (for persisting FileSystem handle) ───────────────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(IDB_STORE);
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = () => reject(req.error);
  });
}

async function saveDirHandle(handle) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, "main");
    tx.oncomplete = resolve;
    tx.onerror    = () => reject(tx.error);
  });
}

async function loadDirHandle() {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx  = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get("main");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  } catch { return null; }
}

async function deleteDirHandle() {
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete("main");
      tx.oncomplete = resolve;
      tx.onerror    = resolve;
    });
  } catch {}
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `cinema_backup_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

// ─── Default config ─────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabled:         false,
  intervalMinutes: 60,   // 30 | 60 | 120 | 360 | 720 | 1440
  mode:            "downloads", // "downloads" | "folder"
  folderName:      null,
};

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useAutoBackup(backupApiUrl) {
  const [config, setConfig] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...DEFAULT_CONFIG, ...(stored || {}) };
    } catch { return DEFAULT_CONFIG; }
  });

  const [dirHandle,     setDirHandle]     = useState(null);
  const [folderPerm,    setFolderPerm]    = useState("unknown"); // "granted"|"prompt"|"unknown"
  const [lastBackup,    setLastBackup]    = useState(null);      // Date
  const [nextBackup,    setNextBackup]    = useState(null);      // Date
  const [backupCount,   setBackupCount]   = useState(0);
  const [isBacking,     setIsBacking]     = useState(false);
  const [lastError,     setLastError]     = useState(null);

  const timerRef = useRef(null);

  // Persist config to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  // Load saved dir handle on mount
  useEffect(() => {
    loadDirHandle().then(async (handle) => {
      if (!handle) return;
      setDirHandle(handle);
      try {
        const perm = await handle.queryPermission({ mode: "readwrite" });
        setFolderPerm(perm);
        setConfig((prev) => ({ ...prev, folderName: handle.name }));
      } catch { setFolderPerm("prompt"); }
    });
  }, []);

  // ── Core backup trigger ──────────────────────────────────────────────────
  const triggerBackup = useCallback(async () => {
    if (isBacking) return;
    setIsBacking(true);
    setLastError(null);
    try {
      const res = await fetch(backupApiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const filename = buildFilename();

      if (config.mode === "folder" && dirHandle) {
        // Check / request permission
        let perm = await dirHandle.queryPermission({ mode: "readwrite" });
        if (perm === "prompt") {
          perm = await dirHandle.requestPermission({ mode: "readwrite" });
        }
        if (perm === "granted") {
          const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          const writable   = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          setFolderPerm("granted");
        } else {
          // Permission denied — fallback to download
          downloadBlob(blob, filename);
          setFolderPerm("denied");
        }
      } else {
        downloadBlob(blob, filename);
      }

      const now = new Date();
      setLastBackup(now);
      setNextBackup(new Date(now.getTime() + config.intervalMinutes * 60_000));
      setBackupCount((c) => c + 1);
    } catch (e) {
      setLastError(e.message || "Error desconocido");
    } finally {
      setIsBacking(false);
    }
  }, [backupApiUrl, config.mode, config.intervalMinutes, dirHandle, isBacking]);

  // ── Start / stop interval ────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (config.enabled) {
      const ms = config.intervalMinutes * 60_000;
      timerRef.current = setInterval(triggerBackup, ms);
      setNextBackup(new Date(Date.now() + ms));
    } else {
      setNextBackup(null);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [config.enabled, config.intervalMinutes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pick folder ──────────────────────────────────────────────────────────
  const pickFolder = useCallback(async () => {
    if (!window.showDirectoryPicker) return false;
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      setDirHandle(handle);
      setFolderPerm("granted");
      await saveDirHandle(handle);
      setConfig((prev) => ({ ...prev, folderName: handle.name, mode: "folder" }));
      return true;
    } catch (e) {
      if (e.name !== "AbortError") setLastError(e.message);
      return false;
    }
  }, []);

  const clearFolder = useCallback(async () => {
    setDirHandle(null);
    setFolderPerm("unknown");
    await deleteDirHandle();
    setConfig((prev) => ({ ...prev, folderName: null, mode: "downloads" }));
  }, []);

  const updateConfig = useCallback((updates) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const fsSupportado = typeof window !== "undefined" && "showDirectoryPicker" in window;

  return {
    config, updateConfig,
    dirHandle, folderPerm,
    lastBackup, nextBackup,
    backupCount, isBacking, lastError,
    triggerBackup, pickFolder, clearFolder,
    fsSupportado,
  };
}
