import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { signIn } from "@/lib/auth";
import { theme, radius } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    // normaliza o e-mail: teclados de celular adicionam espaço/maiúscula/autocorreção,
    // o que fazia o better-auth recusar com "Invalid email".
    const cleanEmail = email.trim().toLowerCase().replace(/\s+/g, "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      setError("E-mail inválido — confira o endereço.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: err } = await signIn.email({ email: cleanEmail, password });
      if (err) {
        const m = err.message || "";
        throw new Error(/invalid email/i.test(m) ? "E-mail inválido — confira o endereço." : (m || "E-mail ou senha inválidos"));
      }
      router.replace("/gallery");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.container}>
      <View style={s.inner}>
        <Text style={s.logo}>📷 Achei a Foto</Text>
        <Text style={s.title}>Bem-vindo de volta</Text>
        <Text style={s.sub}>Entre para ver e organizar suas memórias.</Text>

        <TextInput
          style={s.input} placeholder="voce@exemplo.com" placeholderTextColor={theme.muted}
          autoCapitalize="none" keyboardType="email-address" autoComplete="email"
          autoCorrect={false} spellCheck={false} textContentType="emailAddress" inputMode="email"
          value={email} onChangeText={(t) => setEmail(t.replace(/\s+/g, ""))}
        />
        <TextInput
          style={s.input} placeholder="Senha" placeholderTextColor={theme.muted}
          secureTextEntry autoComplete="password" value={password} onChangeText={setPassword}
        />
        {!!error && <Text style={s.error}>{error}</Text>}

        <Pressable style={[s.btn, loading && { opacity: 0.6 }]} disabled={loading} onPress={onSubmit}>
          {loading ? <ActivityIndicator color={theme.primaryText} /> : <Text style={s.btnText}>Entrar</Text>}
        </Pressable>

        <Text style={s.foot}>Não tem conta? Peça um convite ao dono do app.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, justifyContent: "center" },
  inner: { padding: 24, gap: 12 },
  logo: { color: theme.text, fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  title: { color: theme.text, fontSize: 26, fontWeight: "700", textAlign: "center" },
  sub: { color: theme.muted, fontSize: 14, textAlign: "center", marginBottom: 12 },
  input: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: radius.md, color: theme.text, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  error: { color: theme.danger, fontSize: 13 },
  btn: { backgroundColor: theme.primary, borderRadius: radius.md, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  btnText: { color: theme.primaryText, fontWeight: "700", fontSize: 16 },
  foot: { color: theme.muted, fontSize: 13, textAlign: "center", marginTop: 16 },
});
