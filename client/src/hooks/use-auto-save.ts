import { useCallback, useRef } from 'react';
import debounce from 'lodash/debounce';
import { trackEvent } from '@/lib/amplitude';

interface AutoSaveOptions {
  onSave: (content: string, metadata?: Record<string, any>) => Promise<void>;
  trackingEvent?: string;
  debounceMs?: number;
}

export function useAutoSave({ onSave, trackingEvent, debounceMs = 1000 }: AutoSaveOptions) {
  const savingRef = useRef(false);
  const lastSavedContentRef = useRef("");

  const saveContent = useCallback(async (content: string, metadata?: Record<string, any>) => {
    if (!content.trim() || savingRef.current) return;

    savingRef.current = true;
    try {
      await onSave(content.trim(), metadata);

      // Only track if content has changed
      if (content.trim() !== lastSavedContentRef.current && trackingEvent) {
        trackEvent(trackingEvent, {
          contentLength: content.length,
          wordCount: content.trim().split(/\s+/).length,
          hasMetadata: !!metadata,
          ...metadata
        });
      }

      lastSavedContentRef.current = content.trim();
    } finally {
      savingRef.current = false;
    }
  }, [onSave, trackingEvent]);

  const debouncedSave = useCallback(
    debounce(saveContent, debounceMs),
    [saveContent, debounceMs]
  );

  const handleChange = useCallback((
    content: string,
    metadata?: Record<string, any>
  ) => {
    debouncedSave(content, metadata);
  }, [debouncedSave]);

  const handleBlur = useCallback((
    content: string,
    metadata?: Record<string, any>
  ) => {
    if (content.trim() && content.trim() !== lastSavedContentRef.current) {
      saveContent(content, metadata);
    }
  }, [saveContent]);

  return {
    handleChange,
    handleBlur,
    lastSavedContent: lastSavedContentRef.current
  };
}