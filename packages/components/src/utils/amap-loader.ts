const DEFAULT_LOADER_SOURCE = 'https://webapi.amap.com/loader.js';

type LoaderNamespace = {
  load(options: Record<string, unknown>): Promise<any>;
};

let loaderPromise: Promise<LoaderNamespace> | null = null;
let loaderSource = DEFAULT_LOADER_SOURCE;
let loaderScript: HTMLScriptElement | null = null;

function resolveGlobalLoader(): LoaderNamespace | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const loader = (window as unknown as { AMapLoader?: LoaderNamespace }).AMapLoader;
  return loader ?? null;
}

export async function loadAmapLoader(): Promise<LoaderNamespace> {
  const existing = resolveGlobalLoader();
  if (existing) {
    return existing;
  }

  if (loaderPromise) {
    return loaderPromise;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('高德地图加载器仅支持浏览器环境使用');
  }

  loaderPromise = new Promise<LoaderNamespace>((resolve, reject) => {
    if (loaderScript) {
      loaderScript.remove();
      loaderScript = null;
    }

    const script = document.createElement('script');
    script.src = loaderSource;
    script.async = true;
    script.dataset.amapLoader = 'true';

    script.onload = () => {
      const loader = resolveGlobalLoader();
      if (loader) {
        loaderScript = script;
        resolve(loader);
        return;
      }
      loaderPromise = null;
      script.remove();
      loaderScript = null;
      reject(new Error('高德地图加载器未在全局作用域中暴露 AMapLoader'));
    };

    script.onerror = () => {
      loaderPromise = null;
      script.remove();
      loaderScript = null;
      reject(new Error('高德地图加载器脚本加载失败'));
    };

    document.head.appendChild(script);
  });

  return loaderPromise;
}

export function resetAmapLoaderCache(): void {
  loaderPromise = null;
  if (typeof window !== 'undefined') {
    delete (window as unknown as { AMapLoader?: LoaderNamespace }).AMapLoader;
  }
  if (loaderScript) {
    loaderScript.remove();
    loaderScript = null;
  }
}

export function configureAmapLoader(options: { source?: string } = {}): void {
  if (options.source && options.source.trim().length > 0 && options.source !== loaderSource) {
    loaderSource = options.source;
    resetAmapLoaderCache();
  }
}
