import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useStore } from "@/data/store";
import { STAGE_LABEL, type Stage } from "@/domain/model";
import { Button, Chip, Field, Screen, Section, Surface, Txt } from "@/ui/kit";
import { STAGE_COLOR, space } from "@/ui/theme";

const STAGES: Stage[] = ["idea", "building", "review", "live"];

export default function NewItem() {
  const store = useStore();
  const [mode, setMode] = useState<"project" | "note">("project");
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [stage, setStage] = useState<Stage>("idea");
  const [nextStep, setNextStep] = useState("");
  const [projectId, setProjectId] = useState(store.projects[0]?.id ?? "");
  const [note, setNote] = useState("");

  return (
    <Screen title="Yeni" subtitle="Hızlı ekle, ayrıntı sonra.">
      <View style={{ flexDirection: "row", gap: space.sm }}>
        <Chip label="Proje" selected={mode === "project"} onPress={() => setMode("project")} />
        <Chip label="Not" selected={mode === "note"} onPress={() => setMode("note")} />
      </View>

      {mode === "project" ? (
        <Surface style={{ gap: space.md }}>
          <Field value={name} onChangeText={setName} placeholder="Proje adı" autoFocus />
          <Field value={tagline} onChangeText={setTagline} placeholder="Tek cümle: ne yapıyor?" />
          <Txt variant="label" tone="soft">
            Aşama
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {STAGES.map((item) => (
              <Chip key={item} label={STAGE_LABEL[item]} color={STAGE_COLOR[item]} selected={stage === item} onPress={() => setStage(item)} />
            ))}
          </View>
          <Field value={nextStep} onChangeText={setNextStep} placeholder="Sıradaki adım" />
          <Button
            label="Projeyi ekle"
            icon="add"
            disabled={!name.trim()}
            onPress={() => {
              const id = store.addProject({ name: name.trim(), tagline: tagline.trim(), stage, nextStep: nextStep.trim() || "İlk adımı yaz." });
              router.replace(`/apps/${id}`);
            }}
          />
        </Surface>
      ) : (
        <Section title="Hangi proje?">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
            {store.projects.map((item) => (
              <Chip key={item.id} label={item.name} selected={projectId === item.id} onPress={() => setProjectId(item.id)} />
            ))}
          </View>
          <Surface style={{ gap: space.md }}>
            <Field value={note} onChangeText={setNote} placeholder="Not" multiline autoFocus style={{ minHeight: 100, textAlignVertical: "top" }} />
            <Button
              label="Notu kaydet"
              disabled={!note.trim() || !projectId}
              onPress={() => {
                store.addNote(projectId, note.trim());
                router.back();
              }}
            />
          </Surface>
        </Section>
      )}
    </Screen>
  );
}
