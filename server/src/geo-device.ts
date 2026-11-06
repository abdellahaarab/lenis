import type { FastifyRequest } from 'fastify';

export interface GeoLocation {
  country: string;
  countryCode: string;
  city: string;
  region: string;
  flag: string;
}

export interface DeviceInfo {
  deviceClass: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  brand: string;
  screen?: string;
}

// ─── Countries Dictionary (Arabic & English + Flags) ─────────────────────────

const COUNTRIES: Record<string, { ar: string; en: string; flag: string; defaultCityAr: string; defaultCityEn: string }> = {
  YE: { ar: 'اليمن', en: 'Yemen', flag: '🇾🇪', defaultCityAr: 'صنعاء', defaultCityEn: "Sana'a" },
  SA: { ar: 'السعودية', en: 'Saudi Arabia', flag: '🇸🇦', defaultCityAr: 'الرياض', defaultCityEn: 'Riyadh' },
  AE: { ar: 'الإمارات', en: 'United Arab Emirates', flag: '🇦🇪', defaultCityAr: 'دبي', defaultCityEn: 'Dubai' },
  EG: { ar: 'مصر', en: 'Egypt', flag: '🇪🇬', defaultCityAr: 'القاهرة', defaultCityEn: 'Cairo' },
  QA: { ar: 'قطر', en: 'Qatar', flag: '🇶🇦', defaultCityAr: 'الدوحة', defaultCityEn: 'Doha' },
  KW: { ar: 'الكويت', en: 'Kuwait', flag: '🇰🇼', defaultCityAr: 'مدينة الكويت', defaultCityEn: 'Kuwait City' },
  OM: { ar: 'عُمان', en: 'Oman', flag: '🇴🇲', defaultCityAr: 'مسقط', defaultCityEn: 'Muscat' },
  BH: { ar: 'البحرين', en: 'Bahrain', flag: '🇧🇭', defaultCityAr: 'المنامة', defaultCityEn: 'Manama' },
  JO: { ar: 'الأردن', en: 'Jordan', flag: '🇯🇴', defaultCityAr: 'عَمّان', defaultCityEn: 'Amman' },
  IQ: { ar: 'العراق', en: 'Iraq', flag: '🇮🇶', defaultCityAr: 'بغداد', defaultCityEn: 'Baghdad' },
  SY: { ar: 'سوريا', en: 'Syria', flag: '🇸🇾', defaultCityAr: 'دمشق', defaultCityEn: 'Damascus' },
  LB: { ar: 'لبنان', en: 'Lebanon', flag: '🇱🇧', defaultCityAr: 'بيروت', defaultCityEn: 'Beirut' },
  TR: { ar: 'تركيا', en: 'Turkey', flag: '🇹🇷', defaultCityAr: 'إسطنبول', defaultCityEn: 'Istanbul' },
  US: { ar: 'الولايات المتحدة', en: 'United States', flag: '🇺🇸', defaultCityAr: 'نيويورك', defaultCityEn: 'New York' },
  GB: { ar: 'المملكة المتحدة', en: 'United Kingdom', flag: '🇬🇧', defaultCityAr: 'لندن', defaultCityEn: 'London' },
  DE: { ar: 'ألمانيا', en: 'Germany', flag: '🇩🇪', defaultCityAr: 'برلين', defaultCityEn: 'Berlin' },
  FR: { ar: 'فرنسا', en: 'France', flag: '🇫🇷', defaultCityAr: 'باريس', defaultCityEn: 'Paris' },
  MY: { ar: 'ماليزيا', en: 'Malaysia', flag: '🇲🇾', defaultCityAr: 'كوالالمبور', defaultCityEn: 'Kuala Lumpur' },
  CN: { ar: 'الصين', en: 'China', flag: '🇨🇳', defaultCityAr: 'بكين', defaultCityEn: 'Beijing' },
  IN: { ar: 'الهند', en: 'India', flag: '🇮🇳', defaultCityAr: 'نيودلهي', defaultCityEn: 'New Delhi' },
};

// ─── Yemen Cities Mapping based on Regions & Timezones ───────────────────────

const YEMEN_CITIES_AR: Record<string, string> = {
  sanaa: 'صنعاء',
  "sana'a": 'صنعاء',
  aden: 'عدن',
  taiz: 'تعز',
  ibb: 'إب',
  hodeidah: 'الحديدة',
  hudaydah: 'الحديدة',
  mukalla: 'المكلا',
  hadramout: 'حضرموت',
  dhamar: 'ذمار',
  marib: 'مأرب',
  amran: 'عمران',
  saada: 'صعدة',
  lahj: 'لحج',
  abyan: 'أبين',
  shabwah: 'شبوة',
  almahrah: 'المهرة',
  hajjah: 'حجة',
  almahwit: 'المحويت',
};

// ─── Yemen Known IP Ranges (YemenNet, TeleYemen, Sabafon, YOU, AdenNet) ──────

function isYemenIp(ip: string): boolean {
  if (!ip) return false;
  const clean = ip.replace(/^::ffff:/, '').trim();

  // Known YemenNet & TeleYemen prefixes
  const prefixes = [
    '82.114.',
    '84.235.',
    '134.35.',
    '178.130.',
    '109.200.',
    '185.80.',
    '185.143.',
    '195.189.',
    '194.246.',
    '195.88.',
    '37.44.',
  ];

  return prefixes.some(p => clean.startsWith(p));
}

// ─── Extract Client IP ───────────────────────────────────────────────────────

export function getClientIp(req: FastifyRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) {
    return real.trim();
  }
  return req.ip || '127.0.0.1';
}

// ─── Resolve Geo Location ────────────────────────────────────────────────────

export function resolveGeo(
  req: FastifyRequest,
  hints?: { tz?: string; locale?: string }
): GeoLocation {
  const ip = getClientIp(req);

  // 1. Check Cloudflare Geo Headers
  const cfCountry = typeof req.headers['cf-ipcountry'] === 'string' ? req.headers['cf-ipcountry'].toUpperCase() : null;
  const cfCity = typeof req.headers['cf-ipcity'] === 'string' ? req.headers['cf-ipcity'].trim() : null;
  const cfRegion = typeof req.headers['cf-region'] === 'string' ? req.headers['cf-region'].trim() : null;

  let countryCode = cfCountry;
  let rawCity = cfCity;
  let rawRegion = cfRegion || '';

  // 2. IP Range Heuristics if no Cloudflare country or if local/Yemen
  if (!countryCode || countryCode === 'XX' || countryCode === 'T1') {
    if (isYemenIp(ip)) {
      countryCode = 'YE';
    } else if (hints?.tz === 'Asia/Aden' || hints?.locale?.includes('YE')) {
      countryCode = 'YE';
    } else if (hints?.tz === 'Asia/Riyadh' || hints?.locale?.includes('SA')) {
      countryCode = 'SA';
    } else if (hints?.tz === 'Africa/Cairo' || hints?.locale?.includes('EG')) {
      countryCode = 'EG';
    } else if (hints?.tz === 'Asia/Dubai' || hints?.locale?.includes('AE')) {
      countryCode = 'AE';
    } else {
      // Default to Yemen for primary customer base if indeterminate in dev/local
      countryCode = 'YE';
    }
  }

  const countryInfo = COUNTRIES[countryCode] || {
    ar: countryCode,
    en: countryCode,
    flag: '🌐',
    defaultCityAr: 'غير محدد',
    defaultCityEn: 'Unknown',
  };

  // City resolution
  let cityAr = countryInfo.defaultCityAr;
  let cityEn = countryInfo.defaultCityEn;

  if (rawCity) {
    cityEn = rawCity;
    const lowerCity = rawCity.toLowerCase().replace(/[^a-z]/g, '');
    if (YEMEN_CITIES_AR[lowerCity]) {
      cityAr = YEMEN_CITIES_AR[lowerCity];
    } else {
      cityAr = rawCity;
    }
  } else if (countryCode === 'YE') {
    // If timezone is Asia/Aden explicitly and no city header
    if (hints?.tz === 'Asia/Aden' && rawRegion?.toLowerCase().includes('aden')) {
      cityAr = 'عدن';
      cityEn = 'Aden';
    } else {
      cityAr = 'صنعاء';
      cityEn = "Sana'a";
    }
  }

  return {
    country: countryInfo.ar,
    countryCode,
    city: cityAr,
    region: rawRegion || cityAr,
    flag: countryInfo.flag,
  };
}

// ─── User-Agent & Device Parsing ─────────────────────────────────────────────

export function parseDevice(ua: string, hints?: { screen?: string }): DeviceInfo {
  const lower = ua.toLowerCase();

  // 1. Device Class
  let deviceClass: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (/ipad|tablet|kindle|playbook/.test(lower)) {
    deviceClass = 'tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|windows phone/.test(lower)) {
    deviceClass = 'mobile';
  }

  // 2. Operating System
  let os = 'Unknown OS';
  if (/iphone|ipad|ipod/.test(lower)) {
    const match = ua.match(/OS (\d+[._]\d+)/);
    const ver = match ? match[1].replace('_', '.') : '';
    os = ver ? `iOS ${ver}` : 'iOS';
  } else if (/android/.test(lower)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    os = match ? `Android ${match[1]}` : 'Android';
  } else if (/windows nt 10\.0/.test(lower)) {
    os = 'Windows 10/11';
  } else if (/windows nt 6\.3/.test(lower)) {
    os = 'Windows 8.1';
  } else if (/windows nt 6\.1/.test(lower)) {
    os = 'Windows 7';
  } else if (/macintosh|mac os x/.test(lower)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
  } else if (/linux/.test(lower)) {
    os = 'Linux';
  }

  // 3. Browser
  let browser = 'Unknown Browser';
  if (/samsungbrowser/.test(lower)) {
    const match = ua.match(/SamsungBrowser\/(\d+(\.\d+)?)/);
    browser = match ? `Samsung Internet ${match[1].split('.')[0]}` : 'Samsung Internet';
  } else if (/edg\//.test(lower)) {
    const match = ua.match(/Edg\/(\d+)/);
    browser = match ? `Microsoft Edge ${match[1]}` : 'Edge';
  } else if (/chrome\//.test(lower) && !/edg\//.test(lower)) {
    const match = ua.match(/Chrome\/(\d+)/);
    browser = match ? `Chrome ${match[1]}` : 'Chrome';
  } else if (/safari\//.test(lower) && !/chrome\//.test(lower)) {
    const match = ua.match(/Version\/(\d+)/);
    browser = match ? `Safari ${match[1]}` : 'Safari';
  } else if (/firefox\//.test(lower)) {
    const match = ua.match(/Firefox\/(\d+)/);
    browser = match ? `Firefox ${match[1]}` : 'Firefox';
  } else if (/opera|opr\//.test(lower)) {
    browser = 'Opera';
  }

  // 4. Brand & Hardware Model
  let brand = 'Unknown Device';
  if (/iphone/.test(lower)) {
    brand = 'Apple iPhone';
  } else if (/ipad/.test(lower)) {
    brand = 'Apple iPad';
  } else if (/sm-[a-z0-9]+|samsung/.test(lower)) {
    brand = 'Samsung Galaxy';
  } else if (/redmi|mi [0-9]|xiaomi/.test(lower)) {
    brand = 'Xiaomi / Redmi';
  } else if (/huawei|honor/.test(lower)) {
    brand = 'Huawei';
  } else if (/pixel/.test(lower)) {
    brand = 'Google Pixel';
  } else if (deviceClass === 'desktop') {
    brand = os.includes('macOS') ? 'Apple Mac' : 'Desktop PC';
  } else {
    brand = deviceClass === 'mobile' ? 'Mobile Phone' : 'Tablet Device';
  }

  return {
    deviceClass,
    os,
    browser,
    brand,
    screen: hints?.screen,
  };
}
