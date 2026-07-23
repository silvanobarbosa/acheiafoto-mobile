import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

/**
 * Preferências de visualização — uma só, compartilhada por todas as telas de grade.
 *
 * `thumbsPorLinha` controla a DENSIDADE: mais por linha = miniaturas menores, menos = maiores.
 * O dono pediu isso em Ajustes, valendo para TODAS as visualizações (busca, álbum, período,
 * duplicatas). Tocar numa miniatura abre a foto em tela cheia.
 *
 * Persistido no SecureStore (já é dep do app). Não é segredo, mas evita somar outra lib de
 * storage só para uma preferência.
 */
const CHAVE = "acheiafoto.thumbsPorLinha";
export const MIN_THUMBS = 2;
export const MAX_THUMBS = 6;
const PADRAO = 3;

type PrefsCtx = { thumbsPorLinha: number; setThumbsPorLinha: (n: number) => void };
const Ctx = createContext<PrefsCtx | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [thumbsPorLinha, setThumbs] = useState(PADRAO);

  useEffect(() => {
    SecureStore.getItemAsync(CHAVE)
      .then((v) => { const n = Number(v); if (n >= MIN_THUMBS && n <= MAX_THUMBS) setThumbs(n); })
      .catch(() => {});
  }, []);

  const setThumbsPorLinha = useCallback((n: number) => {
    const clamped = Math.max(MIN_THUMBS, Math.min(MAX_THUMBS, Math.round(n)));
    setThumbs(clamped);
    SecureStore.setItemAsync(CHAVE, String(clamped)).catch(() => {});
  }, []);

  return <Ctx.Provider value={{ thumbsPorLinha, setThumbsPorLinha }}>{children}</Ctx.Provider>;
}

export function usePrefs(): PrefsCtx {
  const c = useContext(Ctx);
  if (!c) return { thumbsPorLinha: PADRAO, setThumbsPorLinha: () => {} };
  return c;
}
