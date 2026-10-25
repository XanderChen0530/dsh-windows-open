import {fileURLToPath} from 'node:url';
import {release as osRelease} from 'node:os';

export const name = 'dsh-windows-open';
export const inject = [];
const bin = fileURLToPath(new URL('../bin/', import.meta.url)).replace(/\/$/, '');

// No UI, network route, or execution API. DSH keeps ownership of file actions.
export function apply(ctx, config = {}) {
  const internals = config?.internals ?? {};
  const env = internals.env ?? process.env;
  if (!/microsoft|wsl/i.test(internals.release ?? osRelease()) && !env.WSL_DISTRO_NAME && !env.WSL_INTEROP) return;
  ctx.effect(() => {
    const before = env.PATH;
    if ((before ?? '').split(':').includes(bin)) return;
    env.PATH = before ? `${before}:${bin}` : bin;
    return () => {
      if (typeof env.PATH !== 'string') return;
      const parts = env.PATH.split(':');
      const index = parts.lastIndexOf(bin);
      if (index < 0) return;
      parts.splice(index, 1);
      if (!parts.length && before === undefined) delete env.PATH;
      else env.PATH = parts.join(':');
    };
  });
}
