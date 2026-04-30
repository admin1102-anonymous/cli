import pino from "pino";
import {Writable} from "stream";
import 'colors';

const LEVELS = {
    10: ['TRACE', 'gray'],
    20: ['DEBUG', 'cyan'],
    30: ['INFO', 'blue'],
    40: ['WARN', 'yellow'],
    50: ['ERROR', 'red'],
    60: ['FATAL', 'magenta'],
};

const dest = new Writable({
    write(chunk, _enc, cb) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const obj = JSON.parse(line);
                const [label, color] = LEVELS[obj.level] ?? ['INFO', 'blue'];
                const prefix = (`[${label}]`)[color];
                let out = `${prefix} ${obj.msg ?? ''}`;
                if (obj.err) {
                    out += `: ${obj.err.message}`;
                }
                process.stderr.write(out + '\n');
            } catch {
                process.stderr.write(line + '\n');
            }
        }
        cb();
    }
});

const log = pino(
    {level: process.env.WH_LOG_LEVEL ?? 'info'},
    process.env.WH_LOG_FORMAT === 'json' ? undefined : dest
);

const whitelistedExceptions = ['write EPIPE'];
process.on('uncaughtException',
    (err) => {
        log.fatal(err, 'Unhandled Exception');

        if (whitelistedExceptions.includes(err.message)) {
            return
        }

        setTimeout(() => {
            process.abort()
        }, 1000).unref()
        process.exit(1);
    });

export default log
