import bunyan from "bunyan";

export const log = bunyan.createLogger({
    name: "entity-server",
    serializers: {
        ...bunyan.stdSerializers,
        err: (err) => ({
            message: err.message,
            stack: err.stack,
            details: err.details,
        }),
    },
    streams: [
        {
            level: "info",
            stream: process.stdout,
        },
    ],
});

export const simpleLog = {
    info: (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        console.log(
            `[${timestamp}] INFO: ${message}`,
            data ? JSON.stringify(data, null, 2) : ""
        );
    },
    error: (message: string, error?: any) => {
        const timestamp = new Date().toISOString();
        console.error(
            `[${timestamp}] ERROR: ${message}`,
            error ? JSON.stringify(error, null, 2) : ""
        );
    },
    warn: (message: string, data?: any) => {
        const timestamp = new Date().toISOString();
        console.warn(
            `[${timestamp}] WARN: ${message}`,
            data ? JSON.stringify(data, null, 2) : ""
        );
    },
};
