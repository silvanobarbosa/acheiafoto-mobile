import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, ImageBackground, Image, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signIn } from "@/lib/auth";
import { theme, radius } from "@/lib/theme";

const FEATURES: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: "image", label: "Galeria real" },
  { icon: "cpu", label: "IA no aparelho" },
  { icon: "shield", label: "Privacidade" },
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    const clean = email.trim().toLowerCase().replace(/\s+/g, "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) { setError("E-mail inválido — confira o endereço."); return; }
    setLoading(true); setError("");
    try {
      const { error: err } = await signIn.email({ email: clean, password });
      if (err) { const m = err.message || ""; throw new Error(/invalid email/i.test(m) ? "E-mail inválido — confira o endereço." : (m || "E-mail ou senha inválidos")); }
      router.replace("/inicio");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar");
    } finally { setLoading(false); }
  };

  return (
    <ImageBackground source={require("../../assets/images/memories-grid.jpg")} style={{ flex: 1 }} imageStyle={{ opacity: 0.35 }}>
      <LinearGradient colors={["rgba(28,28,26,0.75)", "rgba(28,28,26,0.92)", "#1c1c1a"]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          {/* logo + título */}
          <View style={{ alignItems: "center", marginBottom: 24 }}>
            <Image source={require("../../assets/images/logo.png")} style={{ width: 88, height: 88, marginBottom: 8 }} resizeMode="contain" />
            <Text style={{ color: theme.text, fontSize: 26, fontWeight: "800" }}>Achei a Foto</Text>
            <Text style={{ color: theme.muted, fontSize: 14, marginTop: 2 }}>Suas memórias, sempre encontradas.</Text>
          </View>

          {/* card */}
          <View style={s.card}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 2 }}>Bem-vindo de volta</Text>
            <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 16 }}>Entre para ver e organizar suas fotos.</Text>

            <View style={s.inputWrap}>
              <Feather name="mail" size={18} color={theme.muted} />
              <TextInput
                style={s.input} placeholder="voce@exemplo.com" placeholderTextColor={theme.muted}
                autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoCorrect={false} spellCheck={false} inputMode="email"
                value={email} onChangeText={(t) => setEmail(t.replace(/\s+/g, ""))}
              />
            </View>
            <View style={[s.inputWrap, { marginTop: 12 }]}>
              <Feather name="lock" size={18} color={theme.muted} />
              <TextInput
                style={s.input} placeholder="Senha" placeholderTextColor={theme.muted}
                secureTextEntry={!show} autoComplete="password" value={password} onChangeText={setPassword}
              />
              <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}><Feather name={show ? "eye-off" : "eye"} size={18} color={theme.muted} /></Pressable>
            </View>

            {!!error && <Text style={{ color: theme.danger, fontSize: 13, marginTop: 10 }}>{error}</Text>}

            <Pressable onPress={onSubmit} disabled={loading} style={{ marginTop: 18 }}>
              <LinearGradient colors={[theme.primary, theme.warm]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.btn, loading && { opacity: 0.7 }]}>
                {loading ? <ActivityIndicator color={theme.primaryText} /> : <Text style={s.btnT}>Entrar</Text>}
              </LinearGradient>
            </Pressable>

            <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 16 }}>Não tem conta? Peça um convite ao dono do app.</Text>
          </View>

          {/* destaques */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 24 }}>
            {FEATURES.map((f) => (
              <View key={f.label} style={s.pill}>
                <Feather name={f.icon} size={14} color={theme.primary} />
                <Text style={{ color: theme.muted, fontSize: 12 }}>{f.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: "rgba(39,39,42,0.85)", borderColor: theme.border, borderWidth: 1, borderRadius: radius.lg, padding: 20 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface2, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14 },
  input: { flex: 1, color: theme.text, paddingVertical: 14, fontSize: 16 },
  btn: { borderRadius: radius.md, paddingVertical: 15, alignItems: "center" },
  btnT: { color: theme.primaryText, fontWeight: "800", fontSize: 16 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(39,39,42,0.7)", borderColor: theme.border, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
});
