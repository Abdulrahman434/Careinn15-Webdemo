import { useState, useEffect } from 'react';
import {
  isCmsEnabled, fetchHospital, fetchSectionVisibility,
  fetchAboutUs, fetchResources
} from './strapi';
import type {
  StrapiHospital, StrapiSectionVisibility,
  StrapiAboutUs, StrapiResource
} from '../types/strapi';

export type CmsResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  source: 'cms' | 'fallback';
};

/** Resolve which hospital this kiosk represents. 
 *  Reads VITE_HOSPITAL_SLUG env var, falls back to "dallah-hospital". 
 */
function getHospitalSlug(): string {
  return import.meta.env.VITE_HOSPITAL_SLUG || 'dallah-hospital';
}

export function useCmsHospital(): CmsResult<StrapiHospital> {
  const [state, setState] = useState<CmsResult<StrapiHospital>>({
    data: null, loading: isCmsEnabled(), error: null, source: 'fallback',
  });
  
  useEffect(() => {
    if (!isCmsEnabled()) return;
    let cancelled = false;
    fetchHospital(getHospitalSlug()).then(data => {
      if (cancelled) return;
      setState({
        data,
        loading: false,
        error: data ? null : 'No hospital found',
        source: data ? 'cms' : 'fallback',
      });
    });
    return () => { cancelled = true; };
  }, []);
  
  return state;
}

export function useCmsSectionVisibility(
  hospitalDocumentId: string | undefined
): CmsResult<StrapiSectionVisibility> {
  const [state, setState] = useState<CmsResult<StrapiSectionVisibility>>({
    data: null, loading: !!hospitalDocumentId && isCmsEnabled(), 
    error: null, source: 'fallback',
  });
  
  useEffect(() => {
    if (!hospitalDocumentId || !isCmsEnabled()) return;
    let cancelled = false;
    fetchSectionVisibility(hospitalDocumentId).then(data => {
      if (cancelled) return;
      setState({
        data,
        loading: false,
        error: data ? null : 'No visibility config',
        source: data ? 'cms' : 'fallback',
      });
    });
    return () => { cancelled = true; };
  }, [hospitalDocumentId]);
  
  return state;
}

export function useCmsAboutUs(
  hospitalDocumentId: string | undefined,
  locale: 'en' | 'ar' | 'ur' = 'en'
): CmsResult<StrapiAboutUs> {
  const [state, setState] = useState<CmsResult<StrapiAboutUs>>({
    data: null, loading: !!hospitalDocumentId && isCmsEnabled(),
    error: null, source: 'fallback',
  });
  
  useEffect(() => {
    if (!hospitalDocumentId || !isCmsEnabled()) return;
    let cancelled = false;
    fetchAboutUs(hospitalDocumentId, locale as any).then(data => {
      if (cancelled) return;
      setState({
        data,
        loading: false,
        error: data ? null : 'No about us content',
        source: data ? 'cms' : 'fallback',
      });
    });
    return () => { cancelled = true; };
  }, [hospitalDocumentId, locale]);
  
  return state;
}

export function useCmsResources(
  hospitalDocumentId: string | undefined,
  locale: 'en' | 'ar' | 'ur' = 'en'
): CmsResult<StrapiResource[]> {
  const [state, setState] = useState<CmsResult<StrapiResource[]>>({
    data: null, loading: !!hospitalDocumentId && isCmsEnabled(),
    error: null, source: 'fallback',
  });
  
  useEffect(() => {
    if (!hospitalDocumentId || !isCmsEnabled()) return;
    let cancelled = false;
    fetchResources(hospitalDocumentId, locale as any).then(data => {
      if (cancelled) return;
      setState({
        data,
        loading: false,
        error: null,
        source: data.length > 0 ? 'cms' : 'fallback',
      });
    });
    return () => { cancelled = true; };
  }, [hospitalDocumentId, locale]);
  
  return state;
}
