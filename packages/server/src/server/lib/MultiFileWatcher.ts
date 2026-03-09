import EventEmitter from "events";
import fs from "fs";

export type FileStat = fs.Stats | null | undefined;

export type FileChangeHandlerCallback = (event: FileChangeEvent) => Promise<void>;

export type FileChangeEvent = {
    currentStat: FileStat;
    prevStat: FileStat;
    filePath: string;
};

export type MultiFileWatcherOptions = {
    pollingIntervalMs?: number;
};

export class MultiFileWatcher extends EventEmitter {
    tag = "MultiFileWatcher";

    private readonly filePaths: string[];

    private watchers: fs.FSWatcher[] = [];

    private previousStats: Record<string, FileStat> = {};

    private pollingIntervalMs: number;

    private pollTimer: ReturnType<typeof setInterval> | null = null;

    constructor(filePaths: string[], options?: MultiFileWatcherOptions) {
        super();
        this.filePaths = filePaths;
        this.pollingIntervalMs = options?.pollingIntervalMs ?? 0;
    }

    start() {
        for (const filePath of this.filePaths) {
            this.watchFile(filePath);
        }

        if (this.pollingIntervalMs > 0) {
            this.startPolling();
        }
    }

    private watchFile(filePath: string) {
        if (fs.existsSync(filePath)) {
            this.previousStats[filePath] = fs.statSync(filePath);
        }

        try {
            const watcher = fs.watch(filePath, { encoding: "utf8", persistent: false, recursive: false });
            watcher.on("change", async (eventType, _) => {
                if (eventType !== "change") return;
                await this.emitStatChange(filePath);
            });

            watcher.on("error", error => {
                this.emit("error", error);
            });

            this.watchers.push(watcher);
        } catch {
            // File may not exist yet (e.g. chat.db-wal before first write).
            // Polling will pick it up when it appears.
        }
    }

    private async emitStatChange(filePath: string) {
        try {
            const currentStat = await fs.promises.stat(filePath);
            this.emit("change", {
                filePath,
                prevStat: this.previousStats[filePath] ? { ...this.previousStats[filePath] } : null,
                currentStat: { ...currentStat }
            });
            this.previousStats[filePath] = currentStat;
        } catch {
            // File may have been deleted between event and stat call
        }
    }

    private startPolling() {
        this.pollTimer = setInterval(async () => {
            for (const filePath of this.filePaths) {
                try {
                    const currentStat = await fs.promises.stat(filePath);
                    const prev = this.previousStats[filePath];
                    const mtimeChanged = !prev || currentStat.mtimeMs !== (prev as fs.Stats).mtimeMs;
                    const sizeChanged = !prev || currentStat.size !== (prev as fs.Stats).size;

                    if (mtimeChanged || sizeChanged) {
                        this.emit("change", {
                            filePath,
                            prevStat: prev ? { ...prev } : null,
                            currentStat: { ...currentStat }
                        });
                        this.previousStats[filePath] = currentStat;
                    }
                } catch {
                    // File doesn't exist yet; will be picked up on next poll
                }
            }
        }, this.pollingIntervalMs);
    }

    stop() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        for (const watcher of this.watchers) {
            watcher.close();
        }

        this.watchers = [];
    }
}
