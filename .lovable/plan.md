

# Fix: Preview Build Crash

## Problem

The dev server crashes repeatedly with:

```
No matching export in "node_modules/zustand/esm/index.mjs" for import "default"
```

**Root cause**: `@react-three/fiber@8.18.0` depends on `zustand@^3.7.1` and uses `import create from 'zustand'` (default export). However, `zustand@5.0.10` is installed, which removed the default export. This version mismatch causes every build to fail.

## Fix

**Add a Vite resolve alias** in `vite.config.ts` to redirect zustand imports to a compatibility shim, or more simply, add a `zustand` version override in `package.json` to force `zustand@3.7.2` which has the default export that `@react-three/fiber` expects.

**Preferred approach — package.json override**:

Add to `package.json`:
```json
"overrides": {
  "@react-three/fiber": {
    "zustand": "3.7.2"
  }
}
```

Then reinstall dependencies. This pins zustand to v3 only for `@react-three/fiber` without affecting the rest of the project (which doesn't use zustand directly).

**Alternative — if overrides don't work in this environment**, downgrade zustand globally:
- Change `"zustand"` in dependencies to `"3.7.2"` (or remove it if it's only there as a transitive dep) and reinstall.

**Single file change**: `package.json`

