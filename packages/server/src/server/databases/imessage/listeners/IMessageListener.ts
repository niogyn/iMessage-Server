import fs from "fs";
import { MultiFileWatcher } from "@server/lib/MultiFileWatcher";
import type { FileChangeEvent } from "@server/lib/MultiFileWatcher";
import { Loggable } from "@server/lib/logging/Loggable";
import { Sema } from "async-sema";
import { IMessageCache, IMessagePoller } from "../pollers";
import { MessageRepository } from "..";
import { waitMs } from "@server/helpers/utils";
import { DebounceSubsequentWithWait } from "@server/lib/decorators/DebounceDecorator";
import { isMinTahoe } from "@server/env";

export class IMessageListener extends Loggable {
    tag = "IMessageListener";

    stopped: boolean;

    filePaths: string[];

    watcher: MultiFileWatcher;

    repo: MessageRepository;

    processLock: Sema;

    pollers: IMessagePoller[];

    cache: IMessageCache;

    lastCheck = 0;

    constructor({ filePaths, repo, cache }: { filePaths: string[], repo: MessageRepository, cache: IMessageCache }) {
        super();

        this.filePaths = filePaths;
        this.repo = repo;
        this.pollers = [];
        this.cache = cache;
        this.stopped = false;
        this.processLock = new Sema(1);
    }

    stop() {
        this.stopped = true;
        this.watcher?.stop();
        this.removeAllListeners();
    }

    addPoller(poller: IMessagePoller) {
        this.pollers.push(poller);
    }

    getEarliestModifiedDate() {
        let earliest = new Date();
        let found = false;

        for (const filePath of this.filePaths) {
            try {
                if (!fs.existsSync(filePath)) continue;
                const stat = fs.statSync(filePath);
                if (stat.mtime < earliest) {
                    earliest = stat.mtime;
                }
                found = true;
            } catch {
                // File may have been removed between exists check and stat
            }
        }

        if (!found) {
            this.log.warn("No watched files found yet, using current time as baseline");
            return new Date();
        }

        return earliest;
    }

    async start() {
        this.lastCheck = this.getEarliestModifiedDate().getTime() - 60000;
        this.stopped = false;

        await this.poll(new Date(this.lastCheck), false);

        const pollingIntervalMs = isMinTahoe ? 15000 : 0;
        this.watcher = new MultiFileWatcher(this.filePaths, { pollingIntervalMs });
        this.watcher.on("change", async (event: FileChangeEvent) => {
            await this.handleChangeEvent(event);
        });

        this.watcher.on("error", (error) => {
            this.log.error(`Failed to watch database files: ${this.filePaths.join(", ")}`);
            this.log.debug(`Error: ${error}`);
        });

        this.watcher.start();
    }

    @DebounceSubsequentWithWait('IMessageListener.handleChangeEvent', 500)
    async handleChangeEvent(event: FileChangeEvent) {
        await this.processLock.acquire();
        try {
            const now = Date.now();
            let prevTime = this.lastCheck;
    
            if (prevTime <= 0 || prevTime > now) {
                this.log.debug(`Previous time is invalid (${prevTime}), setting to now...`);
                prevTime = now;
            } else if (now - prevTime > 86400000) {
                this.log.debug(`Previous time is > 24 hours ago, setting to 24 hours ago...`);
                prevTime = now - 86400000;
            }
    
            let afterTime = prevTime - 30000;
            if (afterTime > now) {
                afterTime = now;
            }
            await this.poll(new Date(afterTime));
            this.lastCheck = now;
    
            this.cache.trimCaches();
            if (this.processLock.nrWaiting() > 0) {
                await waitMs(100);
            }
        } catch (error) {
            this.log.error(`Error handling change event: ${error}`);
        } finally {
            this.processLock.release();
        }
    }

    async poll(after: Date, emitResults = true) {
        for (const poller of this.pollers) {
            try {
                const results = await poller.poll(after);

                if (emitResults) {
                    for (const result of results) {
                        this.emit(result.eventType, result.data);
                        await waitMs(10);
                    }
                }
            } catch (error) {
                this.log.error(`Poll failed for ${poller.tag}: ${error}`);

                try {
                    const healthy = await this.repo.healthCheck();
                    if (!healthy) {
                        this.log.warn("Database health check failed, attempting reconnect...");
                        await this.repo.reconnect();
                    }

                    const retryResults = await poller.poll(after);
                    if (emitResults) {
                        for (const result of retryResults) {
                            this.emit(result.eventType, result.data);
                            await waitMs(10);
                        }
                    }
                } catch (retryError) {
                    this.log.error(`Retry failed for ${poller.tag}: ${retryError}`);
                }
            }
        }
    }
}
