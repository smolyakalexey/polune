import type { Metadata } from "next";
import { InfoLayout } from "../info-layout";

export const metadata: Metadata = {
  title: "Как работает методика — Polune",
  description: "Прозрачное объяснение факторов и ограничений рекомендаций Polune.",
};

export default function MethodologyPage() {
  return (
    <InfoLayout eyebrow="методика 0.5" title="как мы выбираем день">
      <p className="info-lead">оценка показывает символическое совпадение даты с выбранным делом, а не вероятность успеха и не обещание результата</p>

      <section>
        <h2>два фактора</h2>
        <div className="info-factor-grid">
          <div><strong>55%</strong><span>фаза луны</span><p>сравниваем реальный фазовый угол с целевой точкой одного из пяти архетипов: рост, общение, планирование, забота или освобождение</p></div>
          <div><strong>45%</strong><span>положение луны</span><p>определяем реальную эклиптическую долготу и сопоставляем зодиакальный сектор с профилем конкретного дела</p></div>
        </div>
      </section>

      <section>
        <h2>откуда берутся числа</h2>
        <ol>
          <li>астрономический движок рассчитывает фазу и положение луны для каждой из ближайших 14 дат</li>
          <li>фактор фазы получает от 0 до 100 баллов по плавной косинусной шкале</li>
          <li>фактор положения получает оценку по одному из десяти редакционных профилей дела</li>
          <li>итог — 55% оценки фазы и 45% оценки положения</li>
        </ol>
      </section>

      <section>
        <h2>что означают цвета</h2>
        <ul className="info-status-list">
          <li><span className="status-dot status-dot-best" />фиолетовый — один максимальный результат в ближайшие 14 дней</li>
          <li><span className="status-dot status-dot-good" />зелёный — от 94 до 100</li>
          <li><span className="status-dot status-dot-caution" />жёлтый — от 75 до 93</li>
          <li><span className="status-dot status-dot-neutral" />серый — от 35 до 74</li>
          <li><span className="status-dot status-dot-low" />красный — от 0 до 34</li>
        </ul>
      </section>

      <section>
        <h2>что мы проверяем автоматически</h2>
        <p>все 61 дело проходят двухлетний тест на скользящих 14‑дневных окнах. Тест блокирует полностью красные периоды, избыток зелёных дней, плоские оценки и возвращение к одинаковому механическому градиенту</p>
      </section>

      <aside className="info-note">день недели и близость даты не добавляют баллы. Ближайшая дата получает приоритет только при равной максимальной оценке</aside>
    </InfoLayout>
  );
}
