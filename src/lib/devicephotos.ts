import { useCallback, useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";

export type DevicePhoto = { id: string; uri: string; creationTime: number };

/** granted = acesso total | limited = usuário escolheu "Selecionar fotos" | denied = negou */
export type PermState = "loading" | "granted" | "limited" | "denied";

/**
 * Hook central de fotos do aparelho: pede permissão (só FOTOS), carrega recentes + total.
 *
 * Por que expõe `limited` e `error` separados: no Android 13+ o usuário pode conceder
 * "Selecionar fotos" (acesso parcial). Nesse caso a galeria volta quase vazia e o app
 * mostrava só "nenhuma foto encontrada" — o usuário não tinha como saber que o problema
 * era a permissão. Falha invisível é a pior: some sem deixar rastro pra investigar.
 */
export function useDevicePhotos(pageSize = 60) {
  const [perm, setPerm] = useState<PermState>("loading");
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [after, setAfter] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: "photo",
      first: pageSize,
      sortBy: [["creationTime", false]],
      after: cursor,
    });
    const mapped: DevicePhoto[] = page.assets.map((a) => ({ id: a.id, uri: a.uri, creationTime: a.creationTime }));
    setPhotos((prev) => (cursor ? [...prev, ...mapped] : mapped));
    setAfter(page.endCursor);
    setTotal(page.totalCount);
    return page.hasNextPage;
  }, [pageSize]);

  const ask = useCallback(async () => {
    try {
      setError(null);
      // Só FOTOS (granular): sem isso o expo-media-library pede imagens+vídeo+ÁUDIO e o
      // prompt de "acessar música e áudio" reaparecia em toda tela.
      const res = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
      if (!res.granted) { setPerm("denied"); return false; }
      // accessPrivileges: 'all' | 'limited' | 'none' — 'limited' = só as fotos selecionadas.
      setPerm(res.accessPrivileges === "limited" ? "limited" : "granted");
      await load();
      return true;
    } catch (e) {
      // Erro real de leitura da galeria não pode virar "nenhuma foto" silencioso.
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

  return { perm, photos, total, loadingMore, loadMore, ask, error };
}
