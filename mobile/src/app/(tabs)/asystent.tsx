import * as Location from "expo-location";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Button, Chip, Icon, IconCircle, P, shadow } from "../../components/ui";
import { askAssistant, type AssistantReply } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import { useT } from "../../lib/strings";
import { useTheme } from "../../lib/theme";

interface Msg {
  role: "user" | "model";
  text: string;
  reply?: AssistantReply;
  error?: boolean;
}

// Asystent AI: użytkownik opisuje potrzeby własnymi słowami, a odpowiedź opiera
// się wyłącznie na naszych danych (miejsca, przystanki, ocena tras).
export default function AssistantScreen() {
  const t = useTheme();
  const { s: S, locale } = useT();
  const { profile, setProfile, city } = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<[number, number] | undefined>();
  const [applied, setApplied] = useState<number | null>(null);
  const scroll = useRef<ScrollView>(null);

  const toggleLocation = async () => {
    if (location) return setLocation(undefined);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setLocation([pos.coords.latitude, pos.coords.longitude]);
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const reply = await askAssistant({ message, history, profile, city, locale, location });
      setMessages((m) => [...m, { role: "model", text: reply.reply, reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "model", text: (e as Error).message, error: true }]);
    }
    setBusy(false);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <IconCircle name="robot-outline" color={t.accentText} bg={t.accent} size={48} />
          <P style={{ flex: 1, marginBottom: 0 }}>{S.assistantIntro}</P>
        </View>

        {messages.length === 0 && (
          <View style={{ gap: 8 }}>
            {S.assistantExamples.map((ex) => (
              <Pressable
                key={ex}
                accessibilityRole="button"
                onPress={() => send(ex)}
                style={[styles.example, { backgroundColor: t.surface, borderColor: t.line }]}
              >
                <Icon name="lightbulb-on-outline" size={20} color={t.accent} />
                <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>{ex}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            accessible
            accessibilityLabel={`${m.role === "user" ? S.you : S.assistantName}: ${m.text}`}
            style={[
              styles.bubble,
              m.role === "user"
                ? { alignSelf: "flex-end", backgroundColor: t.accent }
                : { alignSelf: "flex-start", backgroundColor: m.error ? t.unkBg : t.surface, borderColor: t.line, borderWidth: 1 },
              m.role === "model" && shadow(t),
            ]}
          >
            <Text style={{ color: m.role === "user" ? t.accentText : t.text, fontSize: 16, lineHeight: 23 }}>
              {m.text}
            </Text>
            {m.reply && (
              <View style={{ gap: 8, marginTop: 10 }}>
                {m.reply.route && (
                  <Button
                    icon="walk"
                    label={S.assistantShowRoute}
                    onPress={() =>
                      router.push({
                        pathname: "/trasa",
                        params: {
                          fromLat: String(m.reply!.route!.from[0]),
                          fromLon: String(m.reply!.route!.from[1]),
                          toLat: String(m.reply!.route!.to[0]),
                          toLon: String(m.reply!.route!.to[1]),
                          fromName: m.reply!.route!.fromName,
                          toName: m.reply!.route!.toName,
                        },
                      })
                    }
                  />
                )}
                {m.reply.profile && (
                  <Button
                    variant="secondary"
                    icon={applied === i ? "check" : "tune-variant"}
                    label={applied === i ? S.assistantApplied : S.assistantApplyProfile}
                    onPress={() => {
                      setProfile(m.reply!.profile!);
                      setApplied(i);
                    }}
                  />
                )}
                {m.reply.places.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {m.reply.places.slice(0, 4).map((p) => (
                      <Chip
                        key={p.id}
                        role="radio"
                        icon="map-marker"
                        label={p.name}
                        selected={false}
                        onPress={() => router.push({ pathname: "/miejsce/[id]", params: { id: p.id } })}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}

        {busy && (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator color={t.accent} />
            <Text style={{ color: t.muted, fontSize: 15 }}>{S.assistantThinking}</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.composer, { backgroundColor: t.surface, borderTopColor: t.line }]}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Chip
            role="checkbox"
            icon="crosshairs-gps"
            label={S.assistantUseLocation}
            selected={!!location}
            onPress={toggleLocation}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <TextInput
            accessibilityLabel={S.assistantPlaceholder}
            value={input}
            onChangeText={setInput}
            placeholder={S.assistantPlaceholder}
            placeholderTextColor={t.muted}
            multiline
            maxLength={1000}
            style={[styles.input, { color: t.text, borderColor: t.line, backgroundColor: t.bg }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={S.assistantSend}
            disabled={busy || !input.trim()}
            onPress={() => send(input)}
            style={[styles.send, { backgroundColor: t.accent, opacity: busy || !input.trim() ? 0.5 : 1 }]}
          >
            <Icon name="send" size={22} color={t.accentText} />
          </Pressable>
        </View>
        <Text style={{ color: t.muted, fontSize: 12 }}>{S.assistantPrivacy}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  example: { flexDirection: "row", gap: 10, alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 12, minHeight: 48 },
  bubble: { maxWidth: "88%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  composer: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  send: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
