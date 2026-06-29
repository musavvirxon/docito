# tailwind.config.ts — patch

In the `animation` object (around line 147), add these two entries:

```ts
animation: {
  'accordion-down': 'accordion-down 0.2s ease-out',
  'accordion-up': 'accordion-up 0.2s ease-out',
  'scale-in': 'scale-in 0.15s ease-out',
  'fade-out': 'fade-out 0.15s ease-out',
  // ← ADD THESE:
  'spin-slow': 'spin 3s linear infinite',
  'pulse-soft': 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
}
```

That is all — no other changes to tailwind.config.ts.
