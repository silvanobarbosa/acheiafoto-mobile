import { useCallback, useEffect, useState } from "react";
import * as MediaLibrary from "expo-media-library";

export type DevicePhoto = { id: string; uri: string; creationTime: number };

// Hook central de fotos do aparelho: pede permissão, carrega recentes + total.
export function useDevicePhotos(pageSize = 60) {
  const [perm, setPerm] = useState<"loading" | "granted" | "denied">("loading");
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [total, setTotal] = useState(0);
  const [after, setAfter] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

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
    const res = await MediaLibrary.requestPermissionsAsync(false);
    if (!res.granted) { setPerm("denied"); return false; }
    setPerm("granted");
    await load();
    return true;
  }, [load]);

  useEffect(() => { ask(); }, [ask]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !after) return;
    setLoadingMore(true);
    const more = await load(after);
    if (!more) setAfter(undefined);
    setLoadingMore(false);
  }, [after, load, loadingMore]);

  return { perm, photos, total, loadingMore, loadMore, ask };
}
