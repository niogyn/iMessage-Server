import { BrowserWindow } from "electron";
import { Window } from ".";
import { Server } from "@server";
import { ProgressStatus } from "@server/types";

export class FirebaseOAuthWindow extends Window {
    private url: string = null;

    private static self: FirebaseOAuthWindow;

    private constructor(url: string) {
        super();
        this.url = url;
    }

    public static getInstance(url: string): FirebaseOAuthWindow {
        if (!FirebaseOAuthWindow.self) {
            FirebaseOAuthWindow.self = new FirebaseOAuthWindow(url);
        }

        return FirebaseOAuthWindow.self;
    }

    build(): FirebaseOAuthWindow {
        if (this.instance && !this.instance.isDestroyed) this.instance.destroy();
        this.instance = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: true,
            }
        });

        this.instance.loadURL(this.url);

        // With PKCE, the code exchange happens on the Koa callback server.
        // The window just navigates through OAuth and redirects to the callback URL.
        // The Koa handler exchanges the code, stores tokens, and emits oauth-authenticated.
        this.instance.webContents.on("did-navigate", (_, navUrl) => {
            if (navUrl.startsWith(Server().oauthService?.callbackUrl)) {
                setTimeout(() => {
                    if (this.instance && !this.instance.isDestroyed()) {
                        this.instance.close();
                        this.instance = null;
                    }
                }, 1500);
            }
        });

        this.instance.on("close", () => {
            if (Server().oauthService?.status !== ProgressStatus.IN_PROGRESS) {
                Server().oauthService.stop();
            }
        });

        return this;
    }
}
