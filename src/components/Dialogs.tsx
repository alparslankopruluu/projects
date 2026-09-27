"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveStoredConfig } from "@/lib/firebase";
import { useShelf } from "@/lib/store";
import type { Attention, FirebasePublicConfig } from "@/lib/types";

function authMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "E-posta veya parola yanlış.";
  if (code.includes("email-already")) return "Bu e-posta kayıtlı. Giriş yap.";
  if (code.includes("weak-password")) return "Parola en az 6 karakter olmalı.";
  if (code.includes("operation-not-allowed")) return "E-posta girişi bu Firebase projesinde kapalı.";
  if (error instanceof Error) return error.message;
  return "Giriş yapılamadı.";
}

export function AddDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { addProject } = useShelf();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [attention, setAttention] = useState<Attention>("prepare");
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState("");
  const [repo, setRepo] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <form
        className="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          const id = addProject({ name, reason, attention, version, status, repo });
          onClose();
          router.push(`/projects/${id}`);
        }}
      >
        <h3>Yeni proje</h3>
        <p className="hint">Listeye bir satır eklenir. Sırayı sonra değiştirirsin.</p>
        <label htmlFor="name">Ad</label>
        <input id="name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        <label htmlFor="reason">Neden sırada</label>
        <input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        <label htmlFor="attention">Durum</label>
        <select id="attention" value={attention} onChange={(event) => setAttention(event.target.value as Attention)}>
          <option value="review_message">Mesaj var</option>
          <option value="waiting_review">İncelemede</option>
          <option value="prepare">Gönderime hazır değil</option>
          <option value="ready">Yayına hazır</option>
          <option value="live">Yayında</option>
        </select>
        <label htmlFor="version">iOS sürümü</label>
        <input id="version" value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0.0" />
        <label htmlFor="status">Mağaza durumu</label>
        <input id="status" value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Prepare for Submission" />
        <label htmlFor="repo">Repo</label>
        <input id="repo" value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="owner/name" />
        <div className="actions">
          <button className="ghost" type="button" onClick={onClose}>
            Vazgeç
          </button>
          <button className="primary" type="submit">
            Ekle
          </button>
        </div>
      </form>
    </div>
  );
}

const emptyConfig: FirebasePublicConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

function readFirebaseDraft(): FirebasePublicConfig {
  try {
    const raw = window.localStorage.getItem("projects.firebaseConfig");
    if (!raw) return emptyConfig;
    return { ...emptyConfig, ...(JSON.parse(raw) as FirebasePublicConfig) };
  } catch {
    return emptyConfig;
  }
}

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { githubToken, setGithubToken, email, mode, signIn, signUp, signOutShelf } = useShelf();
  const [token, setToken] = useState(githubToken);
  const [config, setConfig] = useState<FirebasePublicConfig>(() => readFirebaseDraft());
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setField(key: keyof FirebasePublicConfig, value: string) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <form
        className="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          setGithubToken(token.trim());
          if (config.apiKey && config.projectId && config.appId) {
            saveStoredConfig({
              ...config,
              authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
              storageBucket: config.storageBucket || `${config.projectId}.appspot.com`,
            });
            window.location.reload();
          }
          onClose();
        }}
      >
        <h3>Ayarlar</h3>
        <p className="hint">
          Yeni Firebase projesi kotası dolu. Var olan bir projenin web ayarını yapıştırırsan veriler oraya yazılır.
          Boş bırakırsan raf bu tarayıcıda kalır.
        </p>
        <label htmlFor="gh">GitHub token</label>
        <input
          id="gh"
          type="password"
          value={token}
          placeholder="Boşsa sunucudaki token kullanılır"
          onChange={(event) => setToken(event.target.value)}
          autoComplete="off"
        />
        {(["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"] as const).map((key) => (
          <div key={key}>
            <label htmlFor={key}>{key}</label>
            <input id={key} value={config[key]} onChange={(event) => setField(key, event.target.value)} autoComplete="off" />
          </div>
        ))}
        <div className="actions">
          <button
            className="ghost"
            type="button"
            onClick={() => {
              saveStoredConfig(null);
              window.location.reload();
            }}
          >
            Firebase’i kaldır
          </button>
          <button className="primary" type="submit">
            Kaydet
          </button>
        </div>
        <label htmlFor="mail">Hesap</label>
        <input id="mail" type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="e-posta" />
        <label htmlFor="pass">Parola</label>
        <input id="pass" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error ? <p className="error">{error}</p> : null}
        <div className="actions">
          {mode === "firebase" ? (
            <button
              className="ghost"
              type="button"
              onClick={() => {
                void signOutShelf();
              }}
            >
              Çıkış {email ? `(${email})` : ""}
            </button>
          ) : (
            <>
              <button
                className="ghost"
                type="button"
                onClick={() => {
                  setError(null);
                  void signIn(accountEmail, password).catch((reason) => setError(authMessage(reason)));
                }}
              >
                Giriş
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => {
                  setError(null);
                  void signUp(accountEmail, password).catch((reason) => setError(authMessage(reason)));
                }}
              >
                Hesap oluştur
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
