declare global {
  interface Window {
    gapi?: {
      load: (name: string, cb: () => void) => void;
    };
    google?: {
      picker: {
        PickerBuilder: new () => PickerBuilder;
        ViewId: { SPREADSHEETS: unknown };
        Action: { PICKED: string; CANCEL: string };
        Feature: { NAV_HIDDEN: unknown };
      };
    };
  }
}

interface PickerBuilder {
  addView: (view: unknown) => PickerBuilder;
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  setCallback: (cb: (data: PickerCallbackData) => void) => PickerBuilder;
  enableFeature: (feature: unknown) => PickerBuilder;
  setTitle: (title: string) => PickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
}

interface PickerCallbackData {
  action: string;
  docs?: Array<{ id: string; name: string; url: string }>;
}

export interface PickedFile {
  id: string;
  name: string;
  url: string;
}

let gapiLoading: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      }
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.addEventListener('load', () => {
      s.dataset.loaded = 'true';
      resolve();
    });
    s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(s);
  });
}

async function ensurePickerLoaded(): Promise<void> {
  if (window.google?.picker) return;
  if (!gapiLoading) {
    gapiLoading = loadScript('https://apis.google.com/js/api.js').then(
      () =>
        new Promise<void>((resolve, reject) => {
          if (!window.gapi) {
            reject(new Error('gapi failed to load'));
            return;
          }
          window.gapi.load('picker', () => resolve());
        }),
    );
  }
  await gapiLoading;
}

export async function openSpreadsheetPicker(opts: {
  accessToken: string;
  apiKey: string;
}): Promise<PickedFile | null> {
  await ensurePickerLoaded();
  const picker = window.google?.picker;
  if (!picker) throw new Error('Google Picker failed to initialize');

  return new Promise((resolve, reject) => {
    try {
      const built = new picker.PickerBuilder()
        .addView(picker.ViewId.SPREADSHEETS)
        .setOAuthToken(opts.accessToken)
        .setDeveloperKey(opts.apiKey)
        .enableFeature(picker.Feature.NAV_HIDDEN)
        .setTitle('Pick your BUILD workout sheet')
        .setCallback((data) => {
          if (data.action === picker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) resolve({ id: doc.id, name: doc.name, url: doc.url });
            else resolve(null);
          } else if (data.action === picker.Action.CANCEL) {
            resolve(null);
          }
        })
        .build();
      built.setVisible(true);
    } catch (e) {
      reject(e);
    }
  });
}
