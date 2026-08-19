"use client";

/* eslint-disable @next/next/no-img-element -- exact local brand asset */

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, SignOut, UserCircle } from "@phosphor-icons/react";

export type ProfileDraft = {
  zodiac: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  timeUnknown: boolean;
};

export default function ProfileForm({ displayName, email, initial }: { displayName: string; email: string; initial: ProfileDraft }) {
  const [form, setForm] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    setStatus(response?.ok ? "saved" : "error");
  }

  return (
    <main className="account-shell">
      <header className="account-header">
        <Link href="/" className="brand" aria-label="Polune — к результату"><img src="/figma/polune-mark.svg" alt="" /></Link>
        <a href="/signout-with-chatgpt?return_to=%2F" className="account-signout"><SignOut aria-hidden="true" />выйти</a>
      </header>

      <section className="account-hero">
        <div className="account-avatar"><UserCircle weight="regular" aria-hidden="true" /></div>
        <p>профиль Polune</p>
        <h1>{displayName}</h1>
        <span>{email}</span>
      </section>

      <form className="account-card" onSubmit={saveProfile}>
        <div className="account-card-heading">
          <div><p>персонализация</p><h2>Ваши данные для уточнения</h2></div>
          {status === "saved" && <CheckCircle weight="fill" aria-label="Сохранено" />}
        </div>
        <p className="account-explainer">Профиль хранит данные и синхронизирует их между устройствами. Общий результат по-прежнему доступен без входа.</p>

        <label className="account-field">
          <span>знак зодиака</span>
          <select value={form.zodiac} onChange={(event) => setForm({ ...form, zodiac: event.target.value })} required>
            <option value="">выберите знак</option>
            {zodiacSigns.map((sign) => <option key={sign} value={sign}>{sign}</option>)}
          </select>
        </label>
        <label className="account-field">
          <span>дата рождения <small>необязательно</small></span>
          <input type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
        </label>
        <label className="account-check">
          <input type="checkbox" checked={form.timeUnknown} onChange={(event) => setForm({ ...form, timeUnknown: event.target.checked })} />
          <span>не знаю точное время рождения</span>
        </label>
        {!form.timeUnknown && (
          <label className="account-field">
            <span>время рождения</span>
            <input type="time" value={form.birthTime} onChange={(event) => setForm({ ...form, birthTime: event.target.value })} />
          </label>
        )}
        <label className="account-field">
          <span>место рождения <small>необязательно</small></span>
          <input value={form.birthPlace} maxLength={80} placeholder="город" onChange={(event) => setForm({ ...form, birthPlace: event.target.value })} />
        </label>

        <button className="account-save" type="submit" disabled={status === "saving" || !form.zodiac}>
          {status === "saving" ? "сохраняем…" : status === "saved" ? "профиль сохранён" : "сохранить профиль"}
        </button>
        {status === "error" && <p className="account-error" role="alert">Не удалось сохранить профиль. Попробуйте ещё раз.</p>}
      </form>

      <Link className="account-back" href="/">вернуться к результату</Link>
    </main>
  );
}

const zodiacSigns = [
  "овен", "телец", "близнецы", "рак", "лев", "дева",
  "весы", "скорпион", "стрелец", "козерог", "водолей", "рыбы",
];
