'use client';

import type { AnalyticsOverview } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--card)',
  borderRadius: 12,
  padding: '1.25rem',
  marginBottom: '1.25rem',
};

const COLORS = ['#6366f1', '#22c55e', '#eab308', '#8888a0'];

export function Charts({ data }: { data: AnalyticsOverview }) {
  const walletBars = [
    { name: 'Доход', value: data.wallet.income, fill: '#22c55e' },
    { name: 'Расход', value: data.wallet.expenses, fill: '#ef4444' },
  ];

  const taskPie = [
    { name: 'К выполнению', value: data.tasks.todo, color: COLORS[0] },
    { name: 'В работе', value: data.tasks.inProgress, color: COLORS[1] },
    { name: 'Выполнено', value: data.tasks.done, color: COLORS[2] },
  ].filter((d) => d.value > 0);

  return (
    <>
      <section style={CARD_STYLE}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Кошелёк</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '0.75rem' }}>
          Период: {data.wallet.period.from} — {data.wallet.period.to}
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <span style={{ color: 'var(--muted)' }}>Доход </span>
            <strong style={{ color: '#22c55e' }}>{data.wallet.income}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Расход </span>
            <strong style={{ color: '#ef4444' }}>{data.wallet.expenses}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--muted)' }}>Баланс </span>
            <strong>{data.wallet.balance}</strong>
          </div>
        </div>
        {(data.wallet.income > 0 || data.wallet.expenses > 0) && (
          <div style={{ height: 200, marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={walletBars} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" stroke="var(--muted)" />
                <YAxis stroke="var(--muted)" />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--muted)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Задачи</h2>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div><span style={{ color: 'var(--muted)' }}>Всего </span><strong>{data.tasks.total}</strong></div>
          <div><span style={{ color: 'var(--muted)' }}>Сделано </span><strong>{data.tasks.done}</strong></div>
        </div>
        {taskPie.length > 0 ? (
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {taskPie.map((_, i) => (
                    <Cell key={i} fill={taskPie[i].color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--muted)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Нет задач</p>
        )}
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Привычки</h2>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div><span style={{ color: 'var(--muted)' }}>Активных </span><strong>{data.habits.active}</strong></div>
          <div><span style={{ color: 'var(--muted)' }}>Выполнений за месяц </span><strong>{data.habits.completionsThisMonth}</strong></div>
        </div>
      </section>

      <section style={CARD_STYLE}>
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Здоровье</h2>
        <div>
          <span style={{ color: 'var(--muted)' }}>Записей </span>
          <strong>{data.health.entriesCount}</strong>
        </div>
      </section>
    </>
  );
}
