import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Dimensions, ActivityIndicator, Modal, Alert } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as LocalAuth from "expo-local-authentication";
import { theme, radius } from "@/lib/theme";
import { usePlan } from "@/lib/plan";
import { usePrefs } from "@/lib/prefs";
import { useDevicePhotos } from "@/lib/devicephotos";
import { hasFeature } from "@/lib/entitlements";
import { listarCofre, guardarNoCofre, tirarDoCofre, type CofreItem } from "@/lib/cofre";

const W = Dimensions.get("window").width;

/**
 * Cofre pessoal — área privada protegida por biometria.
 *
 * O gate é a biometria do aparelho (digital/rosto). Sem hardware/biometria cadastrada, o
 * cofre continua acessível (não dá pra trancar o que o aparelho não sabe destrancar) mas
 * avisa. As fotos aqui são CÓPIAS em storage privado do app — o original na galeria fica
 * intacto (ver src/lib/cofre.ts).
 */
export default function Cofre() {
  const { plan } = usePlan();
  const { thumbsPorLinha } = usePrefs();
  const { photos } = useDevicePhotos();
  const liberado = hasFeature(plan, "vault");

  const [estado, setEstado] = useState<"verificando" | "trancado" | "aberto">("verificando");
  const [semBiometria, setSemBiometria] = useState(false);
  const [itens, setItens] = useState<CofreItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [visualizar, setVisualizar] = useState<CofreItem | null>(null);

  const COLS = thumbsPorLinha;
  const TH = (W - 16 * 2 - 8 * (COLS - 1)) / COLS;

  const autenticar = useCallback(async () => {
    setEstado("verificando");
    try {
      const temHw = await LocalAuth.hasHardwareAsync();
      const cadastrada = await LocalAuth.isEnrolledAsync();
      if (!temHw || !cadastrada) {
        setSemBiometria(true);
        setEstado("aberto"); // não há como trancar; abre com aviso
        return;
      }
      const r = await LocalAuth.authenticateAsync({
        promptMessage: "Desbloquear o cofre",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      setEstado(r.success ? "aberto" : "trancado");
    } catch {
      setEstado("trancado");
    }
  }, []);

  useEffect(() => { if (liberado) autenticar(); }, [liberado, autenticar]);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try { setItens(await listarCofre()); } finally { setCarregando(false); }
  }, []);

  useEffect(() => { if (estado === "aberto") recarregar(); }, [estado, recarregar]);

  const guardar = async (ids: string[]) => {
    setSeletorAberto(false);
    if (!ids.length) return;
    setCarregando(true);
    try {
      for (const id of ids) { try { await guardarNoCofre(id); } catch { /* pula a que falhar */ } }
      await recarregar();
    } finally { setCarregando(false); }
  };

  const remover = (it: CofreItem) => {
    Alert.alert("Tirar do cofre?", "A cópia no cofre será apagada. A foto original na galeria continua intacta.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Tirar", style: "destructive", onPress: async () => { await tirarDoCofre(it.id); setVisualizar(null); recarregar(); } },
    ]);
  };

  if (!liberado) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 16 }}>
        <Stack.Screen options={{ title: "Cofre pessoal" }} />
        <View style={[s.card, { alignItems: "center", gap: 12, marginTop: 24, paddingVertical: 32 }]}>
          <View style={[s.iconBox, { backgroundColor: "rgba(251,146,60,0.2)", width: 60, height: 60, borderRadius: 20 }]}>
            <Feather name="shield" size={28} color={theme.warm} />
          </View>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Recurso Premium</Text>
          <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>O Cofre pessoal faz parte do Premium.</Text>
          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>Assine em acheiafoto.reverblabs.com.br para liberar.</Text>
        </View>
      </ScrollView>
    );
  }

  if (estado === "verificando") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Stack.Screen options={{ title: "Cofre pessoal" }} />
        <ActivityIndicator color={theme.primary} size="large" />
        <Text style={{ color: theme.muted }}>Verificando sua identidade…</Text>
      </View>
    );
  }

  if (estado === "trancado") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <Stack.Screen options={{ title: "Cofre pessoal" }} />
        <View style={[s.iconBox, { backgroundColor: theme.surface2, width: 64, height: 64, borderRadius: 22 }]}>
          <Feather name="lock" size={30} color={theme.warm} />
        </View>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Cofre trancado</Text>
        <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>Use a biometria do aparelho para abrir.</Text>
        <Pressable style={s.btn} onPress={autenticar}><Text style={s.btnT}>Desbloquear</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: "Cofre pessoal" }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 }}>
        {semBiometria && (
          <View style={[s.card, { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "center" }]}>
            <Feather name="alert-triangle" size={18} color={theme.warm} />
            <Text style={{ color: theme.muted, fontSize: 12, flex: 1 }}>
              Sem biometria cadastrada no aparelho — o cofre não pôde ser trancado. Cadastre uma digital ou rosto nas configurações do Android para proteger.
            </Text>
          </View>
        )}
        <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 16 }}>
          {itens.length === 0 ? "Guarde aqui suas fotos mais preciosas — cópias privadas, fora da galeria." : `${itens.length} ${itens.length === 1 ? "foto guardada" : "fotos guardadas"}`}
        </Text>

        {carregando ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}><ActivityIndicator color={theme.primary} /></View>
        ) : itens.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <Feather name="shield" size={40} color={theme.surface2} />
            <Text style={{ color: theme.muted, fontSize: 13 }}>O cofre está vazio.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {itens.map((it) => (
              <Pressable key={it.id} onPress={() => setVisualizar(it)}>
                <Image source={{ uri: it.uri }} style={{ width: TH, height: TH, borderRadius: radius.sm }} contentFit="cover" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable style={s.fab} onPress={() => setSeletorAberto(true)}>
        <Feather name="plus" size={22} color={theme.primaryText} />
        <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Adicionar</Text>
      </Pressable>

      {/* Seletor: fotos recentes do aparelho, multi-seleção */}
      <SeletorFotos aberto={seletorAberto} fotos={photos} cols={COLS} onFechar={() => setSeletorAberto(false)} onConfirmar={guardar} />

      {/* Visualizador em tela cheia */}
      <Modal visible={!!visualizar} transparent animationType="fade" onRequestClose={() => setVisualizar(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.95)" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, paddingTop: 48 }}>
            <Pressable onPress={() => setVisualizar(null)} hitSlop={12}><Feather name="x" size={26} color="#fff" /></Pressable>
            {visualizar && <Pressable onPress={() => remover(visualizar)} hitSlop={12}><Feather name="trash-2" size={24} color={theme.danger} /></Pressable>}
          </View>
          {visualizar && <Image source={{ uri: visualizar.uri }} style={{ flex: 1 }} contentFit="contain" />}
        </View>
      </Modal>
    </View>
  );
}

function SeletorFotos({ aberto, fotos, cols, onFechar, onConfirmar }: {
  aberto: boolean; fotos: { id: string; uri: string }[]; cols: number;
  onFechar: () => void; onConfirmar: (ids: string[]) => void;
}) {
  const [sel, setSel] = useState<Record<string, true>>({});
  const TH = (W - 16 * 2 - 6 * (cols - 1)) / cols;
  const marcados = Object.keys(sel);
  useEffect(() => { if (aberto) setSel({}); }, [aberto]);

  return (
    <Modal visible={aberto} animationType="slide" onRequestClose={onFechar}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 48 }}>
          <Pressable onPress={onFechar} hitSlop={12}><Text style={{ color: theme.muted, fontSize: 15 }}>Cancelar</Text></Pressable>
          <Text style={{ color: theme.text, fontWeight: "700", fontSize: 16 }}>Escolher fotos</Text>
          <Pressable onPress={() => onConfirmar(marcados)} hitSlop={12} disabled={!marcados.length}>
            <Text style={{ color: marcados.length ? theme.primary : theme.muted, fontSize: 15, fontWeight: "700" }}>
              Guardar{marcados.length ? ` (${marcados.length})` : ""}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {fotos.map((f) => {
              const on = !!sel[f.id];
              return (
                <Pressable key={f.id} onPress={() => setSel((p) => { const n = { ...p }; if (on) delete n[f.id]; else n[f.id] = true; return n; })}>
                  <Image source={{ uri: f.uri }} style={{ width: TH, height: TH, borderRadius: radius.sm, opacity: on ? 0.6 : 1 }} contentFit="cover" />
                  {on && (
                    <View style={{ position: "absolute", top: 4, right: 4, backgroundColor: theme.primary, borderRadius: 999, width: 22, height: 22, alignItems: "center", justifyContent: "center" }}>
                      <Feather name="check" size={14} color={theme.primaryText} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {fotos.length === 0 && <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>Nenhuma foto no aparelho ainda.</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 28, alignItems: "center" },
  btnT: { color: theme.primaryText, fontWeight: "700" },
  fab: { position: "absolute", right: 16, bottom: 24, backgroundColor: theme.primary, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.pill, elevation: 6 },
});
