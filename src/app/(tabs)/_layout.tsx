import { Tabs, Redirect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSession } from "@/lib/auth";
import { theme } from "@/lib/theme";

export default function TabsLayout() {
  const { data: session, isPending } = useSession();

  // Eu tinha posto aqui um `if (!useRootNavigationState()?.key) return null`, achando que o
  // crash vinha de redirecionar cedo demais. Nao vinha: era o expo-network faltando. E o
  // guarda tinha efeito colateral proprio — a chave nunca chegava e a tela ficava EM BRANCO
  // pra sempre depois do login (app vivo, zero erro no log, nada desenhado). Removido.

  // Enquanto a sessão não resolve, não decide nada: o splash NATIVO ainda está na tela
  // (o layout raiz só o esconde quando isPending vira false). Devolver null aqui evita
  // mostrar as abas por um instante e mandar pro login logo depois.
  if (isPending) return null;

  // Gate de autenticação. <Redirect> DECLARATIVO, de propósito:
  //
  // 1. A versão original fazia `router.replace("/login")` dentro de um useEffect. O
  //    useSession refaz o fetch (foco, revalidação) e o efeito disparava de novo, jogando o
  //    usuário pra tela inicial no meio do uso — foi o "volta à tela inicial" relatado.
  // 2. A tentativa seguinte foi <Stack.Protected> no layout raiz. Resolveu o salto, mas
  //    QUEBRA O APP: em boot frio COM sessão salva, o expo-router monta a árvore de rotas
  //    protegidas e 4 módulos falham com "Cannot find module" -> ErrorBoundary undefined ->
  //    ReactHost destruído -> tela preta. Reproduzido 3/3 logado e 0/3 deslogado; removendo
  //    o Stack.Protected, 3/3 limpos. Não voltar a usá-lo enquanto o expo-router não
  //    corrigir isso.
  //
  // <Redirect> é avaliado durante o render, sem efeito que possa refirar.
  if (!session) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Início", tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} /> }} />
      <Tabs.Screen name="buscar" options={{ title: "Buscar", tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} /> }} />
      <Tabs.Screen name="ferramentas" options={{ title: "Ferramentas", tabBarIcon: ({ color, size }) => <Feather name="grid" color={color} size={size} /> }} />
      <Tabs.Screen name="ajustes" options={{ title: "Ajustes", tabBarIcon: ({ color, size }) => <Feather name="settings" color={color} size={size} /> }} />
    </Tabs>
  );
}
