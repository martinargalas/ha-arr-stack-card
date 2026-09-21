// Loading part of the card the first time it is needed (#36).
//
// Each chunk is a module whose default export is a list of mixins. Its entry
// points — the methods core calls into it — are stubs on the prototype until
// then: the first call fetches the chunk, applies its mixins, which replace the
// stubs with the real methods, and hands the call on to them. Calls made while
// the chunk is on its way share the one fetch. A fetch that fails is forgotten,
// so the next call tries again, and the card is told through `_chunkFailed`.
export function installLazy(proto, chunks, apply) {
  const pending = new Map();

  const load = name => {
    if (!pending.has(name)) {
      const p = chunks[name].load()
        .then(mod => { for (const mixin of mod.default) apply(proto, mixin); })
        .catch(err => { pending.delete(name); throw err; });
      pending.set(name, p);
    }
    return pending.get(name);
  };

  for (const [name, { entries = [] }] of Object.entries(chunks)) {
    for (const entry of entries) {
      const stub = function (...args) {
        return load(name).then(
          () => {
            // Still the stub: the chunk never defined what core expects of it,
            // and calling on would only call this again
            if (proto[entry] === stub) throw new Error(`[arr-card] chunk ${name} does not define ${entry}`);
            return proto[entry].apply(this, args);
          },
          err => { this._chunkFailed?.(name, err); throw err; },
        );
      };
      Object.defineProperty(proto, entry, { value: stub, writable: true, configurable: true });
    }
  }

  return { load, loadAll: () => Promise.all(Object.keys(chunks).map(load)) };
}
