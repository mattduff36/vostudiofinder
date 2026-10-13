export function parseAnalyticsUA(ua: string): { browser: string; os: string; device: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Mobile';
  if (/Firefox\/|FxiOS\//.test(ua)) browser = 'Firefox';
  else if (/Edg\/|EdgiOS\/|EdgA\//.test(ua)) browser = 'Edge';
  else if (ua.includes('OPR/') || ua.includes('Opera')) browser = 'Opera';
  else if (/Chrome\/|CriOS\//.test(ua)) browser = 'Chrome';
  else if (ua.includes('Safari/')) browser = 'Safari';
  // Mobile user agents contain desktop-family OS names too.
  if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  return { browser, os, device };
}
