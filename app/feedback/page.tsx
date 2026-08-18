import type { Metadata } from "next";
import { InfoLayout } from "../info-layout";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = {
  title: "Обратная связь — Polune",
  description: "Короткая форма обратной связи о тестовой версии Polune.",
};

export default function FeedbackPage() {
  return (
    <InfoLayout eyebrow="закрытый тест · 1–2 минуты" title="помогите сделать подсказки понятнее">
      <p className="info-lead">важны не комплименты, а честный ответ — где вы поверили рекомендации, а где возникло сомнение</p>
      <FeedbackForm />
    </InfoLayout>
  );
}
