// /**
//  * Stable device fingerprint generator.
//  * Generates a SHA-256 hash of browser + device characteristics.
//  * Same device + same browser → same fingerprint every time.
//  *
//  * IMPORTANT: Do NOT include Date.now(), Math.random(), or anything
//  * that changes between reloads, or the fingerprint won't match on return visits.
//  */

// const STORAGE_KEY = 'ams_device_id';

// // Generate a random persistent ID once, stored in localStorage.
// // This makes the fingerprint even more unique per browser profile.
// function getOrCreatePersistentId() {
//   try {
//     let id = localStorage.getItem(STORAGE_KEY);
//     if (!id) {
//       id = crypto.randomUUID();
//       localStorage.setItem(STORAGE_KEY, id);
//     }
//     return id;
//   } catch {
//     return 'no-storage';
//   }
// }

// async function sha256Hex(input) {
//   const encoder = new TextEncoder();
//   const data = encoder.encode(input);
//   const hashBuffer = await crypto.subtle.digest('SHA-256', data);
//   const hashArray = Array.from(new Uint8Array(hashBuffer));
//   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
// }

// function getCanvasFingerprint() {
//   try {
//     const canvas = document.createElement('canvas');
//     canvas.width = 200;
//     canvas.height = 50;
//     const ctx = canvas.getContext('2d');
//     ctx.textBaseline = 'top';
//     ctx.font = '14px Arial';
//     ctx.fillStyle = '#f60';
//     ctx.fillRect(125, 1, 62, 20);
//     ctx.fillStyle = '#069';
//     ctx.fillText('AMS-Fingerprint', 2, 15);
//     ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
//     ctx.fillText('AMS-Fingerprint', 4, 17);
//     return canvas.toDataURL();
//   } catch {
//     return 'no-canvas';
//   }
// }

// function getWebGLFingerprint() {
//   try {
//     const canvas = document.createElement('canvas');
//     const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
//     if (!gl) return 'no-webgl';
//     const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
//     if (debugInfo) {
//       return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown-renderer';
//     }
//     return 'no-debug-info';
//   } catch {
//     return 'no-webgl';
//   }
// }

// export async function getDeviceFingerprint() {
//   const components = [
//     // Persistent ID stored in this browser profile
//     getOrCreatePersistentId(),

//     // Hardware / OS
//     navigator.platform || 'unknown-platform',
//     navigator.hardwareConcurrency || 'unknown-cores',
//     navigator.deviceMemory || 'unknown-memory',
//     screen.width + 'x' + screen.height,
//     screen.colorDepth,
//     window.devicePixelRatio || 1,

//     // Locale
//     navigator.language,
//     Intl.DateTimeFormat().resolvedOptions().timeZone,
//     new Date().getTimezoneOffset(),

//     // Browser
//     navigator.userAgent,
//     navigator.vendor || 'unknown-vendor',
//     navigator.maxTouchPoints || 0,

//     // Rendering quirks (very unique per device)
//     getCanvasFingerprint(),
//     getWebGLFingerprint(),
//   ];

//   const raw = components.join('||');
//   return await sha256Hex(raw);
// }

// /**
//  * Collect human-readable device metadata for the registration request.
//  */
// export function getDeviceMetadata() {
//   const ua = navigator.userAgent;

//   let browserName = 'Unknown';
//   let browserVersion = 'Unknown';

//   if (ua.includes('Edg/')) {
//     browserName = 'Edge';
//     browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
//   } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
//     browserName = 'Chrome';
//     browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
//   } else if (ua.includes('Firefox/')) {
//     browserName = 'Firefox';
//     browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
//   } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
//     browserName = 'Safari';
//     browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
//   }

//   let os = 'Unknown';
//   if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
//   else if (ua.includes('Windows')) os = 'Windows';
//   else if (ua.includes('Mac OS X')) os = 'macOS';
//   else if (ua.includes('Android')) os = 'Android';
//   else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
//   else if (ua.includes('Linux')) os = 'Linux';

//   return {
//     deviceName: `${os} · ${browserName}`,
//     operatingSystem: os,
//     browserName,
//     browserVersion,
//     screenResolution: `${screen.width}x${screen.height}`,
//     timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//     language: navigator.language,
//   };
// }

//-----------------------------------------------------------------------end1

/**
 * Stable device fingerprint generator.
 *
 * IMPORTANT:
 *   Only INVARIANT signals go into the hash.
 *   Volatile signals (screen size, DPR, userAgent, timezone, canvas, webGL)
 *   are collected as METADATA only (see getDeviceMetadata) — never hashed.
 *
 *   Anything that can change between two visits of the SAME browser profile
 *   must NOT enter the hash, or the backend will see a "new device".
 */

const STORAGE_KEY = 'ams_device_id';
const COOKIE_KEY  = 'ams_device_id';

// -----------------------------------------------------------
// Persistent browser ID — survives as long as either
// localStorage OR the cookie survives. Clearing one still
// leaves the other intact.
// -----------------------------------------------------------
function readCookie(name) {
  const m = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function writeCookie(name, value) {
  // 10 years, first-party, path=/, SameSite=Lax (works on top-level navigations)
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Max-Age=315360000; Path=/; SameSite=Lax${secure}`;
}

function getOrCreatePersistentId() {
  let id = null;

  // 1) try localStorage
  try { id = localStorage.getItem(STORAGE_KEY); } catch { /* private mode */ }

  // 2) fall back to cookie
  if (!id) id = readCookie(COOKIE_KEY);

  // 3) create and persist to BOTH stores
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
         // fallback for old browsers
         'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
           const r = (Math.random() * 16) | 0;
           const v = c === 'x' ? r : (r & 0x3) | 0x8;
           return v.toString(16);
         });
  }

  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  writeCookie(COOKIE_KEY, id);

  return id;
}

// -----------------------------------------------------------
// SHA-256 helper
// -----------------------------------------------------------
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// -----------------------------------------------------------
// STABLE fingerprint — only invariant fields
// -----------------------------------------------------------
export async function getDeviceFingerprint() {
  const components = [
    getOrCreatePersistentId(),                       // the anchor
    navigator.platform             || 'unknown-platform',
    navigator.hardwareConcurrency  || 0,
    navigator.deviceMemory         || 0,
    screen.colorDepth              || 0,
    navigator.maxTouchPoints       || 0,
    navigator.vendor               || 'unknown-vendor',
  ];

  return await sha256Hex(components.join('||'));
}

// -----------------------------------------------------------
// METADATA — display / risk-scoring only, NOT identity
// (this can safely change between visits)
// -----------------------------------------------------------
export function getDeviceMetadata() {
  const ua = navigator.userAgent;

  let browserName = 'Unknown';
  let browserVersion = 'Unknown';

  if (ua.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || 'Unknown';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || 'Unknown';
  }

  let os = 'Unknown';
  if (ua.includes('Windows NT 10'))       os = 'Windows 10/11';
  else if (ua.includes('Windows'))        os = 'Windows';
  else if (ua.includes('Mac OS X'))       os = 'macOS';
  else if (ua.includes('Android'))        os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux'))          os = 'Linux';

  return {
    deviceName:       `${os} · ${browserName}`,
    operatingSystem:  os,
    browserName,
    browserVersion,
    screenResolution: `${screen.width}x${screen.height}`,
    timeZone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
    language:         navigator.language,
  };
}