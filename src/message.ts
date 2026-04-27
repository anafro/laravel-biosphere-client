export type BiosphereMessage = {
    channel: string,
    event: string,
} & Record<string, unknown>;
