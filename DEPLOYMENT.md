# DeadShare - GitHub Pages Deployment Guide

## Setup Complete ✅

Your DeadShare app is now configured for GitHub Pages deployment. Here's what has been set up:

### Configuration Files Updated:

#### `vite.config.ts`
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/deadshare/',  // ✅ Set for GitHub Pages
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
```

#### `package.json` - Key additions:
```json
{
  "homepage": "https://turbodawgs.github.io/deadshare",
  "devDependencies": {
    "gh-pages": "^6.3.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

## Deployment Methods

### Method 1: Manual Deployment (npm script)

```bash
# Build and deploy to gh-pages branch
npm run deploy
```

This will:
1. Run `predeploy` (builds the app)
2. Deploy the `dist` folder to the `gh-pages` branch
3. Your app will be available at: https://turbodawgs.github.io/deadshare

### Method 2: Automatic Deployment (GitHub Actions)

A GitHub Actions workflow has been created at `.github/workflows/deploy.yml` that will:
- Build on every push to `main`
- Deploy automatically to GitHub Pages
- Use the new GitHub Pages deployment method

## First-Time Setup on GitHub

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Configure GitHub Pages deployment"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repo: https://github.com/turbodawgs/deadshare
   - Settings → Pages
   - Source: "Deploy from a branch"
   - Branch: Select `gh-pages` (if using npm script method)
   - OR Source: "GitHub Actions" (if using the workflow)

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## Development Workflow

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Testing
npm run build        # Build for production
npm run preview      # Preview the production build

# Deployment  
npm run deploy       # Deploy to GitHub Pages
```

## Important Notes

### Base Path
- The app is configured with `base: '/deadshare/'`
- This means all assets will be served from `/deadshare/` on GitHub Pages
- Local development still works normally at `localhost:3000`

### Asset Paths
- All your imports and asset references will automatically be prefixed with `/deadshare/`
- No changes needed in your React components

### First Deployment
After running `npm run deploy` for the first time:
1. Check GitHub repo for the new `gh-pages` branch
2. Go to Settings → Pages and select `gh-pages` as source
3. Your app will be live at: https://turbodawgs.github.io/deadshare

### Troubleshooting

**404 Error on GitHub Pages:**
- Ensure the `base` in `vite.config.ts` matches your repo name
- Check that GitHub Pages is enabled and pointing to `gh-pages` branch

**Build Errors:**
- Run `npm run build` locally first to catch issues
- Check TypeScript errors: `tsc --noEmit`

**Assets Not Loading:**
- Verify all imports use relative paths
- The `base: '/deadshare/'` handles the path prefix automatically

## Ready to Deploy! 🚀

Your DeadShare app is now ready for GitHub Pages. Simply run:

```bash
npm run deploy
```

And your privacy-focused file sharing app will be live at:
**https://turbodawgs.github.io/deadshare**