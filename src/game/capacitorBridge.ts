import { App } from '@capacitor/app';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';

export interface LifecycleBridgeHandlers {
  onEnterBackground: () => void;
  onEnterForeground: () => void;
  onHardwareBackButton: () => boolean; // return true if handled inside app, false to exit
}

export function isNativeAndroid(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  } catch {
    return false;
  }
}

export async function exitNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await App.exitApp();
  } catch {
    // Ignore on web or unsupported environments
  }
}

/**
 * Registers unified Web + Capacitor Android lifecycle and hardware back-button listeners.
 * Deduplicates overlapping events (visibilitychange, pagehide, pause, appStateChange)
 * and guarantees clean teardown to prevent duplicate listeners.
 */
export function registerAppLifecycleBridge(
  handlers: LifecycleBridgeHandlers
): () => void {
  let disposed = false;
  let isBackgrounded =
    typeof document !== 'undefined' && document.visibilityState === 'hidden';

  const triggerBackground = () => {
    if (disposed || isBackgrounded) return;
    isBackgrounded = true;
    handlers.onEnterBackground();
  };

  const triggerForeground = () => {
    if (disposed || !isBackgrounded) return;
    if (
      typeof document !== 'undefined' &&
      document.visibilityState === 'hidden'
    ) {
      return;
    }
    isBackgrounded = false;
    handlers.onEnterForeground();
  };

  const onVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'hidden') {
      triggerBackground();
    } else {
      triggerForeground();
    }
  };

  const onPageHide = () => {
    triggerBackground();
  };

  const onPageShow = () => {
    triggerForeground();
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
  }

  const nativeHandles: PluginListenerHandle[] = [];

  const attachNativeListener = (
    promise: Promise<PluginListenerHandle> | undefined
  ) => {
    if (!promise) return;
    promise
      .then((handle) => {
        if (disposed) {
          handle.remove().catch(() => {});
        } else {
          nativeHandles.push(handle);
        }
      })
      .catch(() => {
        // Ignore if Capacitor App plugin is unavailable in current runtime
      });
  };

  if (Capacitor.isNativePlatform()) {
    attachNativeListener(
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          triggerForeground();
        } else {
          triggerBackground();
        }
      })
    );

    attachNativeListener(
      App.addListener('pause', () => {
        triggerBackground();
      })
    );

    attachNativeListener(
      App.addListener('resume', () => {
        triggerForeground();
      })
    );

    attachNativeListener(
      App.addListener('backButton', () => {
        if (disposed) return;
        const handled = handlers.onHardwareBackButton();
        if (!handled) {
          exitNativeApp().catch(() => {});
        }
      })
    );
  }

  return () => {
    disposed = true;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    }
    for (const handle of nativeHandles) {
      handle.remove().catch(() => {});
    }
    nativeHandles.length = 0;
  };
}
