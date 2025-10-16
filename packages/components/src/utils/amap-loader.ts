const AMAP_LOADER_SOURCE = 'https://webapi.amap.com/loader.js';

type LoaderNamespace = {
  load(options: Record<string, unknown>): Promise<any>;
};

let loaderPromise: Promise<LoaderNamespace> | null = null;

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
    const script = document.createElement('script');
    script.src = AMAP_LOADER_SOURCE;
    script.async = true;

    script.onload = () => {
      const loader = resolveGlobalLoader();
      if (loader) {
        resolve(loader);
        return;
      }
      loaderPromise = null;
      reject(new Error('高德地图加载器未在全局作用域中暴露 AMapLoader'));
    };

    script.onerror = () => {
      loaderPromise = null;
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
}
