import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { applyPendingUpdate } from "../lib/updateCheck";
import { pinSession } from "../lib/pin/pinSession";

/* ═══════════════════════════════════════════════════════════════════════════
 * AUTH CONTEXT — Password-based access control for hospital configurations
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PASSWORD → HOSPITAL MAPPING:
 *   "burjeel"  → Burjeel Hospital only
 *   "dallah"   → Dallah Hospital only
 *   "slh"      → Saint Louis Hospital only
 *   "caremed"  → Care Medical only
 *   "fakeeh"   → Dr. Soliman Fakeeh Hospital only
 *   "prime"    → Prime Hospital only
 *   "qumc"     → Qassim University Medical Center only
 *   "ksumc"    → King Saud University Medical City only
 *   "careinn"  → Full access (all hospitals, configurator enabled)
 *
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Maps SHA-256 password hashes to hospital config IDs */
export const HASHED_PASSWORD_MAP: Record<string, string> = {
  "26a692dd0d4f558fc8c3b7cb1749e812605a4095b58777d3a690cc1ebfc15f2a": "burjeel",
  "ff7bddf032faa3aad1699dcefdc3516cf2d8d58c8786b9f71174df7de47b1a39": "dallah",
  "025705ec8cab15dbf71655031ccc2081b8af1dde1bc70539ba56f8f20b8a7a27": "slh",
  "8b7a9742d607bb9e1d5689ee574d24e0e7d9771c73208c08750473b886ef61ba": "caremed",
  "183f1e06fe841b761a073d9057ba11164292e7846fbe8e474230aebb4635f41e": "dsfh",    // "fakeeh"
  "7e453343b3477a0d9538df8e905ecb160aea04b9215528ffc21056ddb6d2cd09": "careinn", // full access
  "c598203581040f62b32d0d9c64555333e5ae42dc82878ed73644bc2abf3dbdde": "imc",
  "dccc5d01dabcd1c0b9fa89c91e7f4bde603121ee0172b4ff394e6bb30d295e41": "prime",
  "b1aa85f8364456911b9824f37dd4de913a3108074f620c1c1011161798c57bda": "andalusia",
  "a9e7c3d8208e122633c6cca053f7f1b049a7ce19077d7aff019ce05bad7faccc": "qumc",
  "79d2db13ebf7fabba11fdc68143f5d28a61e87f404b96dfea99ba0092884c182": "ksumc",
};

/** The SHA-256 hash for the careinn full-access password */
const CAREINN_HASH = "7e453343b3477a0d9538df8e905ecb160aea04b9215528ffc21056ddb6d2cd09";

export interface AuthState {
  /** Whether the user has authenticated */
  isAuthenticated: boolean;
  /** The password that was entered (null if not authenticated) */
  password: string | null;
  /** The hospital config ID to activate (null if careinn / full access) */
  lockedHospitalId: string | null;
  /** Whether the user has full access (careinn password) */
  isFullAccess: boolean;
  /** Whether this session was entered via "Continue as Guest" (no access code) */
  isGuest: boolean;
}

interface AuthContextType extends AuthState {
  /** Attempt to log in with a password. Returns true if valid. */
  login: (password: string) => Promise<boolean>;
  /** Enter without an access code. No locked hospital, no configurator access. */
  loginAsGuest: () => void;
  /** Log out and return to the password screen */
  logout: () => void;
  /** Re-confirm the signed-in patient (Forgot PIN). True only for the
   *  current patient's MRN / patient access code — never a hospital code.
   *  Does not change the session. */
  verifyPatientIdentity: (code: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  password: null,
  lockedHospitalId: null,
  isFullAccess: false,
  isGuest: false,
  login: async () => false,
  loginAsGuest: () => {},
  logout: () => {},
  verifyPatientIdentity: async () => false,
});

/** DEMO / TEST ONLY. Lets Forgot PIN accept the built-in demo patient's MRN
 *  while no real patient is admitted on this device. On under `npm run dev`;
 *  in a build only when VITE_ENABLE_DEMO_PATIENT=true is set at build time.
 *  Off by default — a hospital build must leave the variable unset. Even when
 *  on, a real admission's passcode always takes precedence (see below). */
const ALLOW_DEMO_PATIENT_REAUTH: boolean =
  import.meta.env.DEV === true || import.meta.env.VITE_ENABLE_DEMO_PATIENT === "true";

/** Strict MRN comparison for re-authentication: letters/digits only, case-
 *  and leading-zero-insensitive, otherwise exact. (isMrnPasscodeMatch, used
 *  at sign-in, also accepts suffix matches, so a single digit can pass.) */
function sameMrn(input: string, target: string): boolean {
  const norm = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().replace(/^0+/, "");
  const a = norm(input), b = norm(target);
  return a.length > 0 && a === b;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem("hbs-auth-v1");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Auth Load Error:", e);
    }
    return {
      isAuthenticated: false,
      password: null,
      lockedHospitalId: null,
      isFullAccess: false,
      isGuest: false,
    };
  });

  // Persist auth state whenever it changes
  useEffect(() => {
    localStorage.setItem("hbs-auth-v1", JSON.stringify(authState));
  }, [authState]);

  const login = useCallback(async (password: string): Promise<boolean> => {
    const normalizedInput = password.toLowerCase().trim();
    const isCmsMode = normalizedInput.endsWith("-hospital");
    const basePassword = isCmsMode ? normalizedInput.slice(0, -9) : normalizedInput;
    
    // Create SHA-256 hash using Web Crypto API (requires secure context)
    let hashHex = "";
    if (window.isSecureContext && crypto?.subtle) {
      const msgBuffer = new TextEncoder().encode(basePassword);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for non-secure contexts (direct matching for known tokens)
      // This is a safety measure for dev/hospital environments without HTTPS
      if (basePassword === "careinn") hashHex = CAREINN_HASH;
      else if (basePassword === "dallah") hashHex = "ff7bddf032faa3aad1699dcefdc3516cf2d8d58c8786b9f71174df7de47b1a39";
      else if (basePassword === "caremed") hashHex = "8b7a9742d607bb9e1d5689ee574d24e0e7d9771c73208c08750473b886ef61ba";
      else if (basePassword === "fakeeh") hashHex = "183f1e06fe841b761a073d9057ba11164292e7846fbe8e474230aebb4635f41e";
      else if (basePassword === "burjeel") hashHex = "26a692dd0d4f558fc8c3b7cb1749e812605a4095b58777d3a690cc1ebfc15f2a";
      else if (basePassword === "slh") hashHex = "025705ec8cab15dbf71655031ccc2081b8af1dde1bc70539ba56f8f20b8a7a27";
      else if (basePassword === "imc") hashHex = "c598203581040f62b32d0d9c64555333e5ae42dc82878ed73644bc2abf3dbdde";
      else if (basePassword === "prime") hashHex = "dccc5d01dabcd1c0b9fa89c91e7f4bde603121ee0172b4ff394e6bb30d295e41";
      else if (basePassword === "qumc") hashHex = "a9e7c3d8208e122633c6cca053f7f1b049a7ce19077d7aff019ce05bad7faccc";
      else if (basePassword === "ksumc") hashHex = "79d2db13ebf7fabba11fdc68143f5d28a61e87f404b96dfea99ba0092884c182";
    }

    const mapping = HASHED_PASSWORD_MAP[hashHex];
    if (mapping) {
      // CMS Opt-in handling
      if (isCmsMode) {
        localStorage.setItem('cms-mode', 'true');
      } else {
        localStorage.removeItem('cms-mode');
      }

      const isFullAccess = hashHex === CAREINN_HASH;
      const hospitalId = isFullAccess ? null : mapping;

      // For careinn (full access), default to the CareInn hospital config
      if (isFullAccess) {
        localStorage.setItem('active-hospital-id', 'careinn');
      } else if (hospitalId) {
        localStorage.setItem('active-hospital-id', hospitalId);
        if (hospitalId === "dsfh" || hospitalId === "fakeeh") {
          try {
            const { saveApiConfig, FAKEEH_SECONDARY_OPTION } = await import("../lib/apiConfig");
            saveApiConfig(FAKEEH_SECONDARY_OPTION);
          } catch {}
        } else if (hospitalId === "burjeel") {
          try {
            const { saveApiConfig, BURJEEL_SECONDARY_OPTION } = await import("../lib/apiConfig");
            saveApiConfig(BURJEEL_SECONDARY_OPTION);
          } catch {}
        }
      }

      setAuthState({
        isAuthenticated: true,
        password: null, // Avoid storing plaintext password in state anymore
        lockedHospitalId: hospitalId,
        isFullAccess,
        isGuest: false,
      });

      // Notify other contexts and hooks
      window.dispatchEvent(new Event('hospital-changed'));
      window.dispatchEvent(new Event('cms-mode-changed'));
      
      return true;
    }

    // Local MRN Passcode Matching Check
    try {
      const { isMrnPasscodeMatch } = await import("../lib/hospitalApi");
      const { nurseActions } = await import("./NurseDataStore");

      const activeMrnPasscode = localStorage.getItem('careinn-active-mrn-passcode') || '';
      const lastMrnPasscode = localStorage.getItem('careinn-last-mrn') || '';
      const storeMrn = nurseActions.get()?.patient?.mrn || '';

      const isMatch =
        isMrnPasscodeMatch(basePassword, activeMrnPasscode) ||
        isMrnPasscodeMatch(basePassword, lastMrnPasscode) ||
        isMrnPasscodeMatch(basePassword, storeMrn);

      if (isMatch) {
        const activeHospitalId = localStorage.getItem('active-hospital-id') || 'careinn';
        setAuthState({
          isAuthenticated: true,
          password: null,
          lockedHospitalId: activeHospitalId === "careinn" ? null : activeHospitalId,
          isFullAccess: activeHospitalId === "careinn",
          isGuest: false,
        });
        return true;
      }
    } catch (e) {
      console.warn("[AuthContext] MRN local check error:", e);
    }

    // MRN Matching fallback across candidate servers
    try {
      const { getDeviceInfo } = await import("../utils/androidBridge");
      const { findDeviceAndPatientByMrn } = await import("../lib/hospitalApi");
      const { saveApiConfig } = await import("../lib/apiConfig");
      const { nurseActions } = await import("./NurseDataStore");

      const serial = getDeviceInfo()?.serial || "";
      if (serial) {
        const mrnMatch = await findDeviceAndPatientByMrn(basePassword, serial);
        if (mrnMatch) {
          saveApiConfig({ serverIp: mrnMatch.serverIp, apiKey: mrnMatch.apiKey });
          localStorage.setItem('active-hospital-id', mrnMatch.hospitalId);
          nurseActions.resetStoreForNewPatient({
            name: mrnMatch.patient.name,
            nameAr: mrnMatch.patient.nameAr,
            mrn: mrnMatch.patient.mrn,
            room: mrnMatch.patient.room,
            bed: mrnMatch.patient.bed,
            sex: mrnMatch.patient.sex,
            dob: mrnMatch.patient.dob,
            admissionDate: mrnMatch.patient.admissionDate,
            dischargeDate: mrnMatch.patient.dischargeDate,
          });

          setAuthState({
            isAuthenticated: true,
            password: null,
            lockedHospitalId: mrnMatch.hospitalId === "careinn" ? null : mrnMatch.hospitalId,
            isFullAccess: mrnMatch.hospitalId === "careinn",
            isGuest: false,
          });

          window.dispatchEvent(new Event('hospital-changed'));
          window.dispatchEvent(new Event('api-config-changed'));
          return true;
        }
      }
    } catch (e) {
      console.warn("[AuthContext] MRN login failed:", e);
    }

    return false;
  }, []);

  /* Guest entry — no access code. lockedHospitalId stays null so App does not
   * switchConfig, leaving the device on its existing brand (ThemeContext falls
   * back to "careinn" when none is set). isFullAccess stays false, so the
   * HospitalConfigurator lists nothing and its full-access section is hidden. */
  const loginAsGuest = useCallback(() => {
    setAuthState({
      isAuthenticated: true,
      password: null,
      lockedHospitalId: null,
      isFullAccess: false,
      isGuest: true,
    });

    window.dispatchEvent(new Event('hospital-changed'));
  }, []);

  const logout = useCallback(() => {
    // No PIN needed to log out. The PIN itself is kept for this stay, but the
    // next sign-in starts locked.
    pinSession.lock();
    setAuthState({
      isAuthenticated: false,
      password: null,
      lockedHospitalId: null,
      isFullAccess: false,
      isGuest: false,
    });
    /* Hand the bed on clean: log the previous patient out of the launched
       apps (Netflix, YouTube, …) and wipe their browser traces, keeping the
       device's own PIN/config. Fire-and-forget so a slow native wipe can
       never stall sign-out; the phone remote is ended by RemoteControl as
       soon as isAuthenticated drops above. */
    void import("../lib/clearAllData")
      .then(m => m.wipeForNextPatient())
      .catch(e => console.warn("sign-out wipe:", e));
    /* A safe point the app knows about without being told. The screen is
       being handed on, whatever was on it is gone by design, and a bedside
       screen that stays lit all day would otherwise carry the old build
       until somebody happened to notice the banner. Does nothing unless an
       update is already installed and waiting. */
    applyPendingUpdate();
  }, []);

  const verifyPatientIdentity = useCallback(async (code: string): Promise<boolean> => {
    if (authState.isGuest || !authState.isAuthenticated) return false;
    // BACKEND-REQUIRED: re-authenticate the patient on the server (MRN alone is
    //   printed on the wristband — add DOB or a one-time code) and issue a
    //   short-lived reset token that requestReset()/setPin() must present.
    try {
      // A shared hospital code is never patient identity, even if it happens
      // to equal an MRN. Normalised exactly as login() does. Without
      // crypto.subtle (plain-http origin) this check is skipped; the MRN
      // comparison below still never matches a hospital code.
      const raw = code.toLowerCase().trim();
      const base = raw.endsWith("-hospital") ? raw.slice(0, -9) : raw;
      if (window.isSecureContext && crypto?.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(base));
        const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
        if (HASHED_PASSWORD_MAP[hex]) return false;
      }
      // Only written from a real patient record (HL7 lookup, MRN login, nurse edit).
      const realPasscode = localStorage.getItem("careinn-active-mrn-passcode") || "";
      if (realPasscode) return sameMrn(code, realPasscode);
      // No real admission: the store holds the built-in demo patient.
      if (!ALLOW_DEMO_PATIENT_REAUTH) return false;
      const { nurseActions } = await import("./NurseDataStore");
      const demoMrn = nurseActions.get()?.patient?.mrn || "";
      return !!demoMrn && sameMrn(code, demoMrn);
    } catch {
      return false;
    }
  }, [authState.isGuest, authState.isAuthenticated]);

  return (
    <AuthContext.Provider value={{ ...authState, login, loginAsGuest, logout, verifyPatientIdentity }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
