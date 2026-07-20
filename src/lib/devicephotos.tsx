import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as MediaLibrary from "expo-media-library";

export type DevicePhoto = { id: string; uri: string; creationTime: number };

/** granted = acesso total | limited = usuário escolheu "Selecionar fotos" | denied = negou */
export type PermState = "loading" | "granted" | "limited" | "denied";

type Ctx = {
  perm: PermState;
  photos: DevicePhoto[];
  total: number;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  ask: () => Promise<boolean>;
};

const DevicePhotosContext = createContext<Ctx | null>(null);

const PAGE = 90;

/**
 * Galeria do aparelho — UMA instância compartilhada por todo o app.
 *
 * Por que provider e não um hook por tela: antes Home(60), Buscar(90) e Ferramenta(12) tinham
 * cada uma seu próprio hook. As abas ficam montadas, então navegar disparava até TRÊS pedidos
 * de permissão e TRÊS `getAssetsAsync` concorrentes — e cada chamada devolve `totalCount`, que
 * varre a biblioteca inteira. Em galeria grande isso trava a UI (o Android acusa "app travando")
 * e as fotos não chegam. Uma consulta só, compartilhada, elimina a causa.
 */
export function DevicePhotosProvider({ children }: { children: React.ReactNode }) {
  const [perm, setPerm] = useState<PermState>("loading");
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [after, setAfter] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: PAGE,
      sortBy: [["creationTime", false]],
      after: cursor,
    });
    const mapped: DevicePhoto[] = page.assets.map((a) => ({ id: a.id, uri: a.uri, creationTime: a.creationTime }));
    setPhotos((prev) => (cursor ? [...prev, ...mapped] : mapped));
    setAfter(page.endCursor);
    setTotal(page.totalCount);
    return page.hasNextPage;
  }, []);

  const ask = useCallback(async () => {
    try {
      setError(null);
      // Só FOTOS (granular): sem isso o expo-media-library pede imagens+vídeo+ÁUDIO e o
      // prompt de "acessar música e áudio" reaparecia em toda tela.
      const res = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      if (!res.granted) { setPerm("denied"); return false; }
      setPerm(res.accessPrivileges === "limited" ? "limited" : "granted");
      await load();
      return true;
    } catch (e) {
      // Erro real de leitura não pode virar "nenhuma foto" silencioso.
      setError(e instanceof Error ? e.message : "Falha ao ler a galeria");
      setPerm("denied");
      return false;
    }
  }, [load]);

  useEffect(() => { ask(); }, [ask]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !after) return;
    setLoadingMore(true);
    try {
      const more = await load(after);
      if (!more) setAfter(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar mais fotos");
    } finally {
      setLoadingMore(false);
    }
  }, [after, load, loadingMore]);

  const value = useMemo<Ctx>(
    () => ({ perm, photos, total, loadingMore, error, loadMore, ask }),
    [perm, photos, total, loadingMore, error, loadMore, ask],
  );

  return <DevicePhotosContext.Provider value={value}>{children}</DevicePhotosContext.Provider>;
}

/** Consome a galeria compartilhada. O argumento antigo (pageSize) foi removido de propósito:
 *  cada tela agora fatia o que precisa de uma lista única, em vez de abrir consulta própria. */
export function useDevicePhotos(): Ctx {
  const ctx = useContext(DevicePhotosContext);
  if (!ctx) throw new Error("useDevicePhotos precisa estar dentro de <DevicePhotosProvider>");
  return ctx;
}
