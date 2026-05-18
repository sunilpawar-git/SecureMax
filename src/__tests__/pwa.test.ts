/**
 * PWA compliance tests — manifest, service worker, icons, offline fallback.
 */

import fs from 'fs';
import path from 'path';

const PUBLIC = path.join(process.cwd(), 'public');

describe('PWA manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.json'), 'utf-8'));

  it('has required name fields', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
  });

  it('has standalone display mode', () => {
    expect(manifest.display).toBe('standalone');
  });

  it('has theme_color matching brand', () => {
    expect(manifest.theme_color).toBe('#047857');
  });

  it('declares 192 and 512 icons', () => {
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('has a maskable icon', () => {
    const maskable = manifest.icons.find((i: { purpose?: string }) => i.purpose === 'maskable');
    expect(maskable).toBeTruthy();
  });

  it('has shortcuts for HNI and enterprise tracks', () => {
    const urls = manifest.shortcuts.map((s: { url: string }) => s.url);
    expect(urls.some((u: string) => u.includes('track=hni'))).toBe(true);
    expect(urls.some((u: string) => u.includes('track=enterprise'))).toBe(true);
  });
});

describe('PWA icon files exist', () => {
  it('icon-192.png exists in public/icons/', () => {
    expect(fs.existsSync(path.join(PUBLIC, 'icons', 'icon-192.png'))).toBe(true);
  });

  it('icon-512.png exists in public/icons/', () => {
    expect(fs.existsSync(path.join(PUBLIC, 'icons', 'icon-512.png'))).toBe(true);
  });
});

describe('Service worker', () => {
  const sw = fs.readFileSync(path.join(PUBLIC, 'sw.js'), 'utf-8');

  it('has a versioned cache name', () => {
    expect(sw).toContain('CACHE_VERSION');
  });

  it('never caches API routes', () => {
    expect(sw).toContain('/api/');
    expect(sw).toContain('shouldSkipCache');
  });

  it('serves offline.html as fallback', () => {
    expect(sw).toContain('offline.html');
  });

  it('deletes stale caches on activate', () => {
    expect(sw).toContain('caches.delete');
  });
});

describe('Offline fallback page', () => {
  it('offline.html exists', () => {
    expect(fs.existsSync(path.join(PUBLIC, 'offline.html'))).toBe(true);
  });

  it('offline.html has a retry button', () => {
    const content = fs.readFileSync(path.join(PUBLIC, 'offline.html'), 'utf-8');
    expect(content).toContain('Try Again');
    expect(content).toContain('window.location.reload');
  });
});

describe('Layout registers service worker', () => {
  const layout = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'layout.tsx'), 'utf-8');

  it('registers sw.js', () => {
    expect(layout).toContain('sw.js');
    expect(layout).toContain('serviceWorker');
  });

  it('has apple-touch-icon link', () => {
    expect(layout).toContain('apple-touch-icon');
  });

  it('has manifest link in metadata', () => {
    expect(layout).toContain('/manifest.json');
  });
});
