/**
 * Stable device fingerprint generator.
 * Generates a SHA-256 hash of browser + device characteristics.
 * Same device + same browser → same fingerprint every time.
 *
 * IMPORTANT: Do NOT include Date.now(), Math.random(), or anything
 * that changes between reloads, or the fingerprint won't match on return visits.
 */

const STORAGE_KEY = 'ams_device_id';

// Generate a random persistent ID once, stored in localStorage.
// This makes the fingerprint even more unique per browser profile.
function getOrCreatePersistentId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('AMS-Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('AMS-Fingerprint', 4, 17);
    return canvas.toDataURL();
  } catch {
    return 'no-canvas';
  }
}

function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'no-webgl';
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown-renderer';
    }
    return 'no-debug-info';
  } catch {
    return 'no-webgl';
  }
}

export async function getDeviceFingerprint() {
  const components = [
    // Persistent ID stored in this browser profile
    getOrCreatePersistentId(),

    // Hardware / OS
    navigator.platform || 'unknown-platform',
    navigator.hardwareConcurrency || 'unknown-cores',
    navigator.deviceMemory || 'unknown-memory',
    // screen.width + 'x' + screen.height,
    // screen.colorDepth,
    // window.devicePixelRatio || 1,

    // Locale
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    new Date().getTimezoneOffset(),

    // Browser
    navigator.userAgent,
    navigator.vendor || 'unknown-vendor',
    navigator.maxTouchPoints || 0,

    // Rendering quirks (very unique per device)
    getCanvasFingerprint(),
    getWebGLFingerprint(),
  ];

  const raw = components.join('||');
  return await sha256Hex(raw);
}

/**
 * Collect human-readable device metadata for the registration request.
 */
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
  if (ua.includes('Windows NT 10')) os = 'Windows 10/11';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    deviceName: `${os} · ${browserName}`,
    operatingSystem: os,
    browserName,
    browserVersion,
    screenResolution: `${screen.width}x${screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}