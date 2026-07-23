import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as MediaLibrary from "expo-media-library/legacy";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { useDevicePhotos } from "@/lib/devicephotos";
import { TOOLS, hasFeature, type Feature } from "@/lib/entitlements";
import {
  acharDuplicatas, acharAlbunsWhatsApp, agruparPorPeriodo, formatarBytes,
  carregarParaAnalise,
  type GrupoDuplicata, type AlbumWhats, type PeriodoLinha,
} from "@/lib/analise";

const W = Dimensions.get("window").width;
const TH = (W - 16 * 2 - 8 * 2) / 3;

/**
 * Tela de ferramenta — agora com ANÁLISE REAL.
 *
 * Antes cada ferramenta mostrava números fixos no código ("1.284 lixo detectado", "42 grupos",
 * "3,2 GB a liberar") e um botão que só fechava a tela. Era maquete apresentada como produto.
 * Agora: duplicatas, WhatsApp e linha do tempo medem a galeria de verdade; scanner e cofre
 * dizem honestamente que estão em desenvolvimento, em vez de inventar estatística.
 */
export default function Ferramenta() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const { plan } = usePlan();
  const { ask } = useDevicePhotos();
  const tool = TOOLS.find((t) => t.key === key);
  const locked = tool ? !hasFeature(plan, tool.feature as Feature) : false;

  const [carregando, setCarregando] = useState(true);
  const [dups, setDups] = useState<GrupoDuplicata[]>([]);
  const [espaco, setEspaco] = useState(0);
  const [albuns, setAlbuns] = useState<AlbumWhats[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoLinha[]>([]);
  // Escopo REAL da analise: quantas fotos foram lidas e quantas existem na galeria.
  const [escopo, setEscopo] = useState<{ lidas: number; total: number } | null>(null);
  // Progresso da análise. Duas fases: "carregando" a galeria (27k fotos) e "comparando".
  const [progresso, setProgresso] = useState<{ feitas: number; total: number; fase: "carregando" | "comparando" } | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCarregando(true);
      try {
        if (key === "duplicates") {
          const { fotos, total } = await carregarParaAnalise((carregadas, tot) => {
            if (vivo) setProgresso({ feitas: carregadas, total: tot, fase: "carregando" });
          });
          if (!vivo) return;
          setEscopo({ lidas: fotos.length, total });
          const g = await acharDuplicatas(fotos, (feitas, tot) => {
            if (vivo) setProgresso({ feitas, total: tot, fase: "comparando" });
          });
          if (!vivo) return;
          setDups(g);
          // Espaço recuperável = (nº de cópias além da 1ª) × tamanho de uma cópia.
          const bytes = g.reduce((tot, grp) => tot + (grp.fotos.length - 1) * grp.bytesPorFoto, 0);
          if (vivo) setEspaco(bytes);
        } else if (key === "whatsapp") {
          const a = await acharAlbunsWhatsApp();
          if (vivo) setAlbuns(a);
        } else if (key === "timeline") {
          const { fotos, total } = await carregarParaAnalise((carregadas, tot) => {
            if (vivo) setProgresso({ feitas: carregadas, total: tot, fase: "carregando" });
          });
          if (!vivo) return;
          setEscopo({ lidas: fotos.length, total });
          setPeriodos(agruparPorPeriodo(fotos));
        }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => { vivo = false; };
    // NAO depende de `photos`: a analise carrega a propria amostra da galeria. Depender da
    // lista paginada da UI refazia a analise inteira a cada rolagem do usuario.
  }, [key]);

  if (!tool) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;

  const apagarIds = (ids: string[], titulo: string) => {
    if (!ids.length) return;
    Alert.alert(titulo, `${ids.length} ${ids.length === 1 ? "foto vai" : "fotos vão"} para a lixeira do aparelho.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            const ok = await MediaLibrary.deleteAssetsAsync(ids);
            if (ok) { await ask(); router.back(); }
          } catch {
            Alert.alert("Não foi possível apagar", "O Android pode ter negado a permissão.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Stack.Screen options={{ title: tool.label, headerStyle: { backgroundColor: theme.bg }, headerTintColor: theme.text }} />

      {locked ? (
        <View style={[s.card, { alignItems: "center", gap: 12, marginTop: 24, paddingVertical: 32 }]}>
          <View style={[s.iconBox, { backgroundColor: "rgba(251,146,60,0.2)", width: 60, height: 60, borderRadius: 20 }]}>
            <Feather name="award" size={28} color={theme.warm} />
          </View>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Recurso Premium</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>{tool.desc} faz parte do Premium.</Text>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>Assine em acheiafoto.reverblabs.com.br para liberar.</Text>
        </View>
      ) : carregando ? (
        <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
          <ActivityIndicator color={theme.primary} size="large" />
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            {progresso
              ? progresso.fase === "carregando"
                ? `Lendo sua galeria… ${progresso.feitas.toLocaleString("pt-BR")} de ${progresso.total.toLocaleString("pt-BR")}`
                : `Comparando ${progresso.feitas.toLocaleString("pt-BR")} de ${progresso.total.toLocaleString("pt-BR")} fotos…`
              : "Analisando suas fotos…"}
          </Text>
        </View>
      ) : key === "duplicates" ? (
        <>
          <Text style={s.resumo}>
            {dups.length === 0
              ? "Nenhuma cópia encontrada nas fotos analisadas."
              : `${dups.length} ${dups.length === 1 ? "grupo" : "grupos"} de cópias · ${formatarBytes(espaco)} recuperáveis`}
          </Text>
          <Escopo escopo={escopo} />
          {dups.map((g) => (
            <View key={g.chave} style={[s.card, { marginBottom: 12 }]}>
              <Text style={{ color: theme.text, fontWeight: "600", marginBottom: 8 }}>{g.fotos.length} cópias idênticas</Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                {g.fotos.slice(0, 6).map((p) => (
                  <Image key={p.id} source={{ uri: p.uri }} style={{ width: TH, height: TH, borderRadius: radius.sm }} contentFit="cover" />
                ))}
              </View>
              <Pressable style={s.btn} onPress={() => apagarIds(g.fotos.slice(1).map((p) => p.id), "Manter 1 e apagar o resto?")}>
                <Text style={s.btnT}>Manter 1 e apagar as outras</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : key === "whatsapp" ? (
        <>
          <Text style={s.resumo}>
            {albuns.length === 0
              ? "Nenhuma pasta do WhatsApp encontrada neste aparelho."
              : `${albuns.length} ${albuns.length === 1 ? "pasta" : "pastas"} do WhatsApp na galeria`}
          </Text>
          {albuns.map((a) => (
            // ANTES era um <View> sem ação — o dono tocava e nada acontecia. Agora abre a
            // pasta numa grade de miniaturas (tocar numa foto → tela cheia).
            <Pressable
              key={a.id}
              onPress={() => router.push({ pathname: "/album/[id]", params: { id: a.id, titulo: a.titulo } })}
              style={[s.card, { marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 12 }]}
            >
              <View style={[s.iconBox, { backgroundColor: "rgba(52,211,153,0.15)" }]}>
                <Feather name="message-circle" size={20} color="#34d399" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{a.titulo}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{a.total.toLocaleString("pt-BR")} itens · toque para abrir</Text>
              </View>
              <Feather name="chevron-right" size={20} color={theme.muted} />
            </Pressable>
          ))}
        </>
      ) : key === "timeline" ? (
        <>
          <Text style={s.resumo}>{periodos.length} {periodos.length === 1 ? "período" : "períodos"} com fotos</Text>
          <Escopo escopo={escopo} />
          {periodos.slice(0, 24).map((p) => (
            <View key={`${p.ano}-${p.mes}`} style={[s.card, { marginBottom: 10 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{p.rotulo}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>{p.fotos.length}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {p.fotos.slice(0, 3).map((f) => (
                  <Pressable key={f.id} onPress={() => router.push(`/foto/${f.id}`)}>
                    <Image source={{ uri: f.uri }} style={{ width: TH, height: TH, borderRadius: radius.sm }} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </>
      ) : (
        // Scanner e Cofre exigem câmera com correção de perspectiva e área protegida por
        // biometria. Não estão prontos — dizer isso é melhor que mostrar número inventado.
        <View style={[s.card, { alignItems: "center", gap: 12, marginTop: 24, paddingVertical: 32 }]}>
          <View style={[s.iconBox, { backgroundColor: theme.surface2, width: 60, height: 60, borderRadius: 20 }]}>
            <Feather name="tool" size={26} color={theme.muted} />
          </View>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>Em desenvolvimento</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
            {tool.desc}. Esta ferramenta ainda não está pronta — preferimos avisar a mostrar
            resultado que não é real.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Diz de quantas fotos a conclusao saiu. So aparece quando a analise NAO cobriu a galeria
 * inteira — porque ai o numero acima e uma amostra, e omitir isso faz o usuario ler como
 * total. Sem essa linha, "1 grupo de copias" lido de 90 de 2.500 fotos vira mentira.
 */
function Escopo({ escopo }: { escopo: { lidas: number; total: number } | null }) {
  if (!escopo || escopo.lidas >= escopo.total) return null;
  return (
    <Text style={{ color: theme.muted, fontSize: 12, marginTop: -8, marginBottom: 16 }}>
      Analisadas as {escopo.lidas.toLocaleString("pt-BR")} fotos mais recentes de{" "}
      {escopo.total.toLocaleString("pt-BR")} no aparelho.
    </Text>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  resumo: { color: theme.muted, fontSize: 14, marginBottom: 16 },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 12, alignItems: "center", marginTop: 12 },
  btnT: { color: theme.primaryText, fontWeight: "700" },
});
