import { isJson } from "./json";
import { BiosphereMessage } from "./message";
import { require } from "./guards";
import { regExpEquals } from "./regexp";

export type BiosphereClientOptions = Readonly<{
    csrf: string;
    url: string | undefined;
    newTokenUri?: string;
}>;

export type BiosphereMessageHandler = (message: BiosphereMessage, event: string, channel: BiosphereChannel) => void;
export type BiosphereChannelOptions = Partial<{
    debug: boolean,
}>;

export class BiosphereChannel {
    private readonly name: string;
    private readonly handlers: Map<RegExp, BiosphereMessageHandler>;
    private readonly websocket: WebSocket;
    private readonly debug: (message: any) => any;
    public constructor(
        websocket: WebSocket,
        name: string, {
            debug = false,
        }: BiosphereChannelOptions = {}) {
        require('websocket', websocket);
        require('channel name', name);

        this.name = name;
        this.debug = debug ? (message) => console.info(`Channel '${name}': ${message}`) : () => { };
        this.handlers = new Map();
        this.websocket = websocket;
        this.websocket.onmessage = this.receive.bind(this);
        this.websocket.onclose = this.close.bind(this);
        this.websocket.onopen = this.open.bind(this);
        this.websocket.onerror = this.error.bind(this);
    }

    public on(pattern: RegExp, handler: BiosphereMessageHandler): void {
        this.debug(`${pattern}: +handler`);
        this.handlers.set(pattern, handler);
    }

    public off(pattern: RegExp): void {
        this.debug(`${pattern}: -handler`);
        for (const [key] of this.handlers) {
            if (regExpEquals(key, pattern)) {
                this.handlers.delete(key);
                break;
            }
        }
    }

    public offAll(): void {
        this.debug(`-all handlers`);
        this.handlers.clear();
    }

    public send(event: string, data: Record<string, unknown>): void {
        this.debug(`🗣️ ${event}: ${JSON.stringify(data, null, 4)}`);
        const message: BiosphereMessage = {
            channel: this.name,
            event,
            ...data,
        };


        const json: string = JSON.stringify(message);
        this.websocket.send(json);
    }

    private receive(messageEvent: MessageEvent): void {
        const messageData = messageEvent.data;

        if (!isJson(messageData)) {
            console.error(messageData);
            return;
        }

        const message = JSON.parse(messageData as string) satisfies BiosphereMessage;
        this.debug(`👂 ${message.event}: ${JSON.stringify(message, null, 4)} `);
        this.handle(message);
    }

    private handle(message: BiosphereMessage): void {
        const event: string = message.event;

        for (const [pattern, handler] of this.handlers.entries()) {
            if (pattern.test(event)) {
                handler(message, event, this);
                this.debug(`${message.event}: handled.`);
            }
        }

    }

    private open(_: Event): void {
        this.debug(`open!`);
        this.on(/ping/, () => this.send('pong', {}));
        this.handle({
            event: 'open',
            channel: this.name,
        })
    }

    public close(closeEvent: CloseEvent | undefined = undefined): void {
        this.debug(`close!`);
        const reason: string = closeEvent?.reason ?? 'manual';
        this.websocket.close();
        this.handle({
            event: 'close',
            channel: this.name,
        });
        this.offAll();
    }

    private error(event: Event): void {
        console.error(`Channel '${this.name}' had an error`, event);
    }
}

class BiosphereClient {
    private readonly csrf: Required<BiosphereClientOptions['csrf']>;
    private readonly url: Exclude<BiosphereClientOptions['url'], undefined>;
    private readonly newTokenUri: Exclude<BiosphereClientOptions['newTokenUri'], undefined>;
    private readonly channels: BiosphereChannel[];

    public constructor({
        csrf,
        url = 'http://localhost:3000/',
        newTokenUri = '/biosphere/new-token/',
    }: BiosphereClientOptions) {
        require('CSRF token', csrf);
        require("Biosphere server URL", url);
        require("Biosphere new token URI", newTokenUri);

        this.csrf = csrf;
        this.url = url;
        this.newTokenUri = newTokenUri;
        this.channels = [];
    }

    public async channel(name: string, options: BiosphereChannelOptions = {}): Promise<BiosphereChannel> {
        require('channel name', name);
        const websocket = await this.createWebsocket(name);
        const channel = new BiosphereChannel(websocket, name, options);
        this.channels.push(channel);

        return channel;
    }

    public disconnect(): void {
        for (const channel of this.channels) {
            channel.offAll();
            channel.close();
        }
    }

    private async createWebsocket(channel: string): Promise<WebSocket> {
        const token = await this.requestToken();
        const url = new URL(this.url);
        url.searchParams.set('channel', channel);
        url.searchParams.set('token', token);

        const websocket = new WebSocket(url, ['ws', 'wss']);
        return websocket;
    }

    private async requestToken(): Promise<string> {
        const response = await fetch(this.newTokenUri, {
            method: 'post',
            headers: {
                'X-CSRF-Token': this.csrf,
            },
        });

        const data = await response.json() satisfies { token: string };
        return data.token;
    }
}

export function biosphere(options: BiosphereClientOptions): BiosphereClient {
    return new BiosphereClient(options);
}
