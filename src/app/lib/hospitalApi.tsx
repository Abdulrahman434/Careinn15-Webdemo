import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { apiUrl } from "./apiConfig";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HospitalGroup {
  id: number;
  group_title: string;
  organization: number;
}

export interface WallpaperImage {
  id: number;
  imageUrl: string;   // raw http:// from API — proxy before display
  groupId: number;
  groupTitle: string;
}

export interface WallpaperGroup {
  id: number;
  title: string;
  images: WallpaperImage[];
}

export interface DeviceLocation {
  room_no: string;
  bed_no: string;
  patient_id: string;
  admit_data: string;   // reference_id for HL7 lookup
  group: { id: number; group_title: string } | null;
}

export interface Hl7Patient {
  name: string;
  mrn: string;
  room: string;
  bed: string;
  sex: string;
  dob: string;
  admissionDate: string;
  dischargeDate: string;
  admitRefId: number;
}

export interface NewsItem {
  id: number;
  title: string;
  logoUrl: string;
  feeds: { language: string; url: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/** Parse HL7 datetime "20260402170358" → "02 Apr 2026" */
function parseHl7Date(raw: string): string {
  if (!raw || raw.length < 8) return "";
  const year = raw.slice(0, 4);
  const month = parseInt(raw.slice(4, 6), 10);
  const day = raw.slice(6, 8);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  if (month < 1 || month > 12) return "";
  return `${day} ${months[month - 1]} ${year}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUP / ORGANIZATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /hospital/group/
 * Returns all ward groups for this organization.
 * Used to know which group IDs exist before fetching wallpapers.
 */
export async function fetchHospitalGroups(): Promise<HospitalGroup[]> {
  try {
    const res = await fetch(apiUrl("/hospital/group/"));
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.warn("[hospitalApi] fetchHospitalGroups:", e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// WALLPAPERS / BACKGROUNDS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /resource/background/wallpaper/?group={id}
 * Returns wallpaper images for one group.
 */
async function fetchWallpapersForGroup(
  group: HospitalGroup
): Promise<WallpaperGroup | null> {
  try {
    const res = await fetch(
      apiUrl(`/resource/background/wallpaper/?group=${group.id}`)
    );
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!data?.length) return null;

    return {
      id: group.id,
      title: group.group_title,
      images: data
        .filter(item => item?.image)
        .map(item => ({
          id: item.id,
          imageUrl: item.image,   // http:// — proxy on Android
          groupId: group.id,
          groupTitle: group.group_title,
        })),
    };
  } catch (e) {
    console.warn(`[hospitalApi] fetchWallpapersForGroup(${group.id}):`, e);
    return null;
  }
}

/**
 * Fetches ALL wallpaper groups and their images.
 * Step 1: GET /hospital/group/ → get group IDs
 * Step 2: GET /resource/background/wallpaper/?group={id} for each
 * All requests run in parallel.
 */
export async function fetchAllWallpapers(): Promise<WallpaperGroup[]> {
  try {
    const groups = await fetchHospitalGroups();
    if (!groups.length) return [];

    const results = await Promise.all(
      groups.map(g => fetchWallpapersForGroup(g))
    );

    return results.filter((g): g is WallpaperGroup => g !== null);
  } catch (e) {
    console.warn("[hospitalApi] fetchAllWallpapers:", e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE + PATIENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /user/organization/devices/
 * Find this device by serial number → get room, bed, patient reference_id.
 */
export async function fetchDeviceLocation(
  serial: string
): Promise<DeviceLocation | null> {
  try {
    const res = await fetch(apiUrl("/user/organization/devices/"));
    if (!res.ok) return null;
    const devices: any[] = await res.json();

    const device = devices.find(d => d.device_id.toLowerCase() === serial.toLowerCase());
    if (!device?.device_location) return null;

    const loc = device.device_location;
    return {
      room_no: loc.room_no ?? "",
      bed_no: loc.bed_no ?? "",
      patient_id: loc.patient_id ?? "",
      admit_data: loc.admit_data ?? "",
      group: loc.group ?? null,
    };
  } catch (e) {
    console.warn("[hospitalApi] fetchDeviceLocation:", e);
    return null;
  }
}

/**
 * GET /hl7/httpreceiver/?reference_id={id}
 * Returns patient demographics from HL7 ADT message.
 * reference_id comes from device_location.admit_data
 */
export async function fetchPatientByRefId(
  referenceId: string | number
): Promise<Hl7Patient | null> {
  try {
    const res = await fetch(
      apiUrl(`/hl7/httpreceiver/?reference_id=${referenceId}`)
    );
    if (!res.ok) return null;
    const d = await res.json();

    const pid = d.patient_identification ?? {};
    const pv = d.patient_visit ?? {};

    const firstName = pid.pid_patient_name?.given_name ?? "";
    const lastName = pid.pid_patient_name?.family_name ?? "";
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return null;

    return {
      name,
      mrn: pid.pid_patient_identifier_list?.id_number ?? "",
      room: pv.pv_assigned_patient_location?.room ?? "",
      bed: pv.pv_assigned_patient_location?.bed ?? "",
      sex: pid.pid_administrative_sex ?? "",
      dob: parseHl7Date(pid.pid_date_time_of_birth?.time ?? ""),
      admissionDate: parseHl7Date(pv.pv_admit_date_time?.time ?? ""),
      dischargeDate: parseHl7Date(pv.pv_discharge_date_time?.time ?? ""),
      admitRefId: Number(referenceId),
    };
  } catch (e) {
    console.warn("[hospitalApi] fetchPatientByRefId:", e);
    return null;
  }
}

/**
 * Convenience: device serial → patient data in one call.
 * Returns { location, patient } or null if either step fails.
 */
export async function fetchPatientForDevice(serial: string): Promise<{
  location: DeviceLocation;
  patient: Hl7Patient;
} | null> {
  const location = await fetchDeviceLocation(serial);
  if (!location?.admit_data) return null;

  const patient = await fetchPatientByRefId(location.admit_data);
  if (!patient) return null;

  // Prefer room/bed from device_location (more up-to-date than HL7)
  patient.room = location.room_no || patient.room;
  patient.bed = location.bed_no || patient.bed;

  return { location, patient };
}

// ═══════════════════════════════════════════════════════════════════════════
// NEWS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /access/latestnews/
 * Returns news feeds with localized RSS URLs and logos.
 */
export async function fetchLatestNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(apiUrl("/access/latestnews/"));
    if (!res.ok) return [];
    const data: any[] = await res.json();

    return data.map(item => ({
      id: item.id,
      title: item.title ?? "",
      logoUrl: item.logo_url ?? "",
      feeds: (item.latestnews_desc_locale ?? []).map((l: any) => ({
        language: l.language_name ?? "",
        url: l.locale_description ?? "",
      })),
    }));
  } catch (e) {
    console.warn("[hospitalApi] fetchLatestNews:", e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUTURE ENDPOINTS — add here
// ═══════════════════════════════════════════════════════════════════════════
//
// export async function fetchWelcomeNote(): Promise<string> { ... }
//   GET /access/welcomenote/
//
// export async function fetchFoodMenu(): Promise<FoodItem[]> { ... }
//   GET /food/menu/... (sub-routes TBD)
//
// export async function fetchCareTeam(patientId): Promise<...> { ... }
//   GET /nursingstation/... (sub-routes TBD)
//
// export async function fetchScreenSavers(): Promise<string[]> { ... }
//   GET /cdn/resource/screen_savers/...

// ═══════════════════════════════════════════════════════════════════════════
// APPS (APK, URL, PDF)
// ═══════════════════════════════════════════════════════════════════════════

export interface AppPackage {
  id: number;
  packageName: string | null;
  versionName: string | null;
  imageUrl: string;
  nameEn: string;
  nameAr: string;
  categoryId: number;
  category: string;   // "Entertainment", "Social", etc.
  type: "APK" | "URL" | "PDF";
  url: string | null;
  apkUrl: string | null;
  pdfUrl: string | null;  // cdn URL for PDF
}

// ── Module-level cache — persists across component mounts ────────────────

let _packagesCache: AppPackage[] | null = null;
let _packagesFetching: Promise<AppPackage[]> | null = null;

/**
 * Fetch packages once and cache. Subsequent calls return cache instantly.
 * Pass force=true to bypass cache (e.g. after server config change).
 */
export async function fetchAppPackages(
  force = false
): Promise<AppPackage[]> {
  if (_packagesCache && !force) return _packagesCache;

  // Deduplicate concurrent calls — if already fetching, 
  // return the same promise
  if (_packagesFetching && !force) return _packagesFetching;

  _packagesFetching = (async () => {
    try {
      const res = await fetch(apiUrl("/apps/packages/"));
      if (!res.ok) return _packagesCache ?? [];
      const data: any[] = await res.json();
      _packagesCache = data.map(item => ({
        id: item.id,
        packageName: item.package_name ?? null,
        versionName: item.version_name ?? null,
        imageUrl: item.image ?? "",
        nameEn: item.package_locale?.find(
          (l: any) => l.language_id === 1)?.locale_name ?? "",
        nameAr: item.package_locale?.find(
          (l: any) => l.language_id === 2)?.locale_name ?? "",
        categoryId: item.category_id,
        category: item.category_title ?? "",
        type: item.type as "APK" | "URL" | "PDF",
        url: item.url ?? null,
        apkUrl: item.package ?? null,
        pdfUrl: item.pdf ?? null,
      }));
      return _packagesCache;
    } catch (e) {
      console.warn("[hospitalApi] fetchAppPackages:", e);
      return _packagesCache ?? [];
    } finally {
      _packagesFetching = null;
    }
  })();

  return _packagesFetching;
}

/** Call this when server config changes to force re-fetch */
export function invalidatePackagesCache(): void {
  _packagesCache = null;
}

/**
 * Maps API category_title to AppLauncher category key.
 * Add new mappings here when new categories are added to the API.
 */
export const API_CATEGORY_MAP: Record<string, string> = {
  "Entertainment": "Media",
  "Social": "Social",
  "Call": "Meeting",
  "Games": "Games",
  "Tools": "Tools",
  "Religion": "Reading",
  "Shortcut Services": "Shortcuts",  // ServicesGrid shortcuts
  "I-Services": "Internet",
};

export interface ApiAppItem {
  id: string;
  name: string;
  nameAr?: string;
  bg: string;
  mark?: string;
  textColor?: string;
  pdfSource?: string;
  packageName?: string; // Android package — for install/launch
  apkUrl?: string;      // CDN APK download URL
  url?: string;         // Web fallback URL
  customRender?: () => React.ReactNode;
}

/**
 * Hook — fetches all packages once, returns only PDF items
 * mapped to AppItem shape for a specific AppLauncher category key.
 * Re-fetches when api-config-changed fires.
 */
function mapPackagesToAppItems(packages: AppPackage[], categoryKey: string): ApiAppItem[] {
  // Find which API category maps to this launcher key
  const apiCategory = Object.entries(API_CATEGORY_MAP)
    .find(([, v]) => v === categoryKey)?.[0];

  if (!apiCategory) return [];

  const items = packages.filter(
    p => p.category === apiCategory && (p.pdfUrl || p.apkUrl || p.url)
  );

  return items.map(p => {
    // ── PDF type ──
    if (p.type === "PDF" && p.pdfUrl) {
      return {
        id: `api-pdf-${p.id}`,
        name: p.nameEn || `PDF ${p.id}`,
        nameAr: p.nameAr || p.nameEn,
        bg: "#E8453C",
        mark: "PDF",
        textColor: "#fff",
        pdfSource: p.pdfUrl,
        customRender: () => (
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg,#E8453C,#C0392B)",
            borderRadius: "12px",
            gap: "6px",
            padding: "8px",
          }}>
            <FileText size={32} color="#fff" strokeWidth={1.5} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#fff",
              textAlign: "center",
              lineHeight: 1.2,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}>
              {p.nameEn || "PDF"}
            </span>
          </div>
        ),
      };
    }

    // ── APK / URL type ──
    return {
      id: `api-app-${p.id}`,
      name: p.nameEn || `App ${p.id}`,
      nameAr: p.nameAr || p.nameEn,
      bg: "linear-gradient(135deg, #1a73e8, #0d47a1)",
      mark: (p.nameEn || "?").charAt(0).toUpperCase(),
      textColor: "#fff",
      packageName: p.packageName ?? undefined,
      apkUrl:      p.apkUrl      ?? undefined,
      url:         p.url         ?? undefined,
    };
  });
}

/**
 * Hook — fetches all packages once, returns only PDF items
 * mapped to AppItem shape for a specific AppLauncher category key.
 * Re-fetches when api-config-changed fires.
 */
export function useApiPdfApps(categoryKey: string): ApiAppItem[] {
  const [apps, setApps] = useState<ApiAppItem[]>(() => {
    // Read from cache immediately — no loading delay
    return mapPackagesToAppItems(_packagesCache ?? [], categoryKey);
  });

  useEffect(() => {
    // If cache was empty on mount, fetch then update
    fetchAppPackages().then(packages => {
      setApps(mapPackagesToAppItems(packages, categoryKey));
    });

    const handler = () => {
      fetchAppPackages(true).then(packages => {
        setApps(mapPackagesToAppItems(packages, categoryKey));
      });
    };
    window.addEventListener("api-config-changed", handler);
    return () => window.removeEventListener("api-config-changed", handler);
  }, [categoryKey]);

  return apps;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVICE ALERTS
// ═══════════════════════════════════════════════════════════════════════════

export interface DeviceAlert {
  id:             number;
  titleEn:        string;
  titleAr:        string;
  titleUr:        string;
  bodyEn:         string;
  bodyAr:         string;
  bodyUr:         string;
  sendImmediately: boolean;
  scheduledAt:    string;
  status:         "scheduled" | "completed" | "cancelled";
  lastSentAt:     string | null;
  groupIds:       number[];
}

function getAlertLocale(
  locales: any[], languageId: number, field: string
): string {
  return locales?.find(
    l => l.language_id === languageId)?.[field] ?? "";
}

export async function fetchDeviceAlerts(): Promise<DeviceAlert[]> {
  try {
    const res = await fetch(apiUrl("/push/device/alerts/"));
    if (!res.ok) return [];
    const data: any[] = await res.json();

    return data.map(item => ({
      id:              item.id,
      titleEn:         getAlertLocale(item.device_alert_locale, 1, "locale_header")
                       || item.title || "",
      titleAr:         getAlertLocale(item.device_alert_locale, 2, "locale_header")
                       || item.title || "",
      titleUr:         getAlertLocale(item.device_alert_locale, 3, "locale_header")
                       || item.title || "",
      bodyEn:          getAlertLocale(item.device_alert_locale, 1, "locale_body"),
      bodyAr:          getAlertLocale(item.device_alert_locale, 2, "locale_body"),
      bodyUr:          getAlertLocale(item.device_alert_locale, 3, "locale_body"),
      sendImmediately: item.metadata?.send_immediately ?? false,
      scheduledAt:     item.metadata?.scheduled_at    ?? "",
      status:          item.metadata?.status          ?? "scheduled",
      lastSentAt:      item.metadata?.last_sent_at    ?? null,
      groupIds:        item.metadata?.group_ids       ?? [],
    }));
  } catch (e) {
    console.warn("[hospitalApi] fetchDeviceAlerts:", e);
    return [];
  }
}

const SEEN_ALERTS_KEY = "careinn-seen-alerts";

export function getSeenAlertIds(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_ALERTS_KEY);
    return new Set(JSON.parse(raw ?? "[]"));
  } catch { return new Set(); }
}

export function markAlertSeen(id: number): void {
  const seen = getSeenAlertIds();
  seen.add(id);
  localStorage.setItem(SEEN_ALERTS_KEY,
    JSON.stringify([...seen]));
}

export function markAllAlertsSeen(ids: number[]): void {
  const seen = getSeenAlertIds();
  ids.forEach(id => seen.add(id));
  localStorage.setItem(SEEN_ALERTS_KEY,
    JSON.stringify([...seen]));
}

const HIDDEN_ALERTS_KEY = "careinn-hidden-alerts";

export function getHiddenAlertIds(): Set<number> {
  try {
    const raw = localStorage.getItem(HIDDEN_ALERTS_KEY);
    return new Set(JSON.parse(raw ?? "[]"));
  } catch { return new Set(); }
}

export function markAlertHidden(id: number): void {
  const hidden = getHiddenAlertIds();
  hidden.add(id);
  localStorage.setItem(HIDDEN_ALERTS_KEY, JSON.stringify([...hidden]));
}

export function markAllAlertsHidden(ids: number[]): void {
  const hidden = getHiddenAlertIds();
  ids.forEach(id => hidden.add(id));
  localStorage.setItem(HIDDEN_ALERTS_KEY, JSON.stringify([...hidden]));
}

