import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'planNaJutro.state.v1';
const COLORS = {
  bg: '#071018',
  card: '#0D1822',
  card2: '#11212E',
  border: '#203344',
  text: '#F4F7FA',
  muted: '#8EA1B2',
  blue: '#5D8DFF',
  cyan: '#53C7D8',
  green: '#4DD49C',
  amber: '#F0BD5A',
  red: '#FF6E7A',
};

const emptyTrading = () => ({
  enabled: true,
  session: 'New York',
  focus: '',
  maxRisk: '',
  maxTrades: '',
  noTradeCondition: '',
});

const emptyPlan = () => ({
  priorities: [
    { id: 'p1', text: '', done: false },
    { id: 'p2', text: '', done: false },
    { id: 'p3', text: '', done: false },
  ],
  optional: [],
  selfCare: { text: '', done: false },
  trading: emptyTrading(),
  plannedAt: null,
  close: {
    rating: 0,
    didWell: '',
    improve: '',
    repeat: '',
    smallWins: ['', '', ''],
    closedAt: null,
  },
});

const initialState = { plans: {} };

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function offsetDateKey(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
}

function prettyDate(key) {
  if (!key) return '';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function ensurePlan(state, key) {
  if (state.plans[key]) return state;
  return {
    ...state,
    plans: { ...state.plans, [key]: emptyPlan() },
  };
}

function planHasContent(plan) {
  if (!plan) return false;
  return Boolean(
    plan.priorities?.some((x) => x.text.trim()) ||
      plan.optional?.some((x) => x.text.trim()) ||
      plan.selfCare?.text?.trim() ||
      plan.trading?.focus?.trim() ||
      plan.trading?.maxRisk?.trim() ||
      plan.trading?.maxTrades?.trim() ||
      plan.trading?.noTradeCondition?.trim()
  );
}

function completion(plan) {
  if (!plan) return { done: 0, total: 0, pct: 0 };
  const items = [
    ...(plan.priorities || []).filter((x) => x.text.trim()),
    ...(plan.optional || []).filter((x) => x.text.trim()),
  ];
  if (plan.selfCare?.text?.trim()) items.push(plan.selfCare);
  const total = items.length;
  const done = items.filter((x) => x.done).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

function getPlanningStreak(plans) {
  let startOffset = plans[offsetDateKey(1)]?.plannedAt ? 1 : 0;
  let streak = 0;
  for (let i = startOffset; i > -365; i -= 1) {
    const key = offsetDateKey(i);
    if (plans[key]?.plannedAt) streak += 1;
    else break;
  }
  return streak;
}

function clonePlan(plan) {
  return JSON.parse(JSON.stringify(plan || emptyPlan()));
}

function SectionTitle({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function CheckRow({ item, onToggle, muted = false }) {
  return (
    <TouchableOpacity style={styles.checkRow} activeOpacity={0.75} onPress={onToggle}>
      <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
        {item.done ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
      <Text style={[styles.checkText, item.done && styles.checkTextDone, muted && { color: COLORS.muted }]}>
        {item.text}
      </Text>
    </TouchableOpacity>
  );
}

function Pill({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function App() {
  const [state, setState] = useState(initialState);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('today');
  const todayKey = offsetDateKey(0);
  const tomorrowKey = offsetDateKey(1);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        let next = raw ? JSON.parse(raw) : initialState;
        next = ensurePlan(next, todayKey);
        next = ensurePlan(next, tomorrowKey);
        setState(next);
      } catch (e) {
        setState(ensurePlan(ensurePlan(initialState, todayKey), tomorrowKey));
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const todayPlan = state.plans[todayKey] || emptyPlan();
  const tomorrowPlan = state.plans[tomorrowKey] || emptyPlan();
  const todayCompletion = completion(todayPlan);
  const streak = getPlanningStreak(state.plans);

  const history = useMemo(() => {
    return Object.entries(state.plans)
      .filter(([, plan]) => plan?.close?.closedAt)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 30);
  }, [state.plans]);

  const weekStats = useMemo(() => {
    const last7 = Object.entries(state.plans)
      .filter(([key]) => key <= todayKey)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7);
    const closed = last7.filter(([, p]) => p?.close?.closedAt);
    const ratings = closed.map(([, p]) => Number(p.close.rating || 0)).filter(Boolean);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    const completions = closed.map(([, p]) => completion(p).pct);
    const avgCompletion = completions.length
      ? Math.round(completions.reduce((a, b) => a + b, 0) / completions.length)
      : 0;
    return { closed: closed.length, avgRating: avg.toFixed(1), avgCompletion };
  }, [state.plans, todayKey]);

  function updatePlan(key, updater) {
    setState((prev) => {
      const current = clonePlan(prev.plans[key]);
      const updated = updater(current) || current;
      return { ...prev, plans: { ...prev.plans, [key]: updated } };
    });
  }

  function saveTomorrow() {
    updatePlan(tomorrowKey, (plan) => {
      plan.plannedAt = new Date().toISOString();
      return plan;
    });
    Alert.alert('Zapisane', 'Plan na jutro jest gotowy.');
  }

  function addOptional() {
    updatePlan(tomorrowKey, (plan) => {
      if (plan.optional.length >= 8) return plan;
      plan.optional.push({ id: `o_${Date.now()}`, text: '', done: false });
      return plan;
    });
  }

  function addSmallWin() {
    updatePlan(todayKey, (plan) => {
      if (plan.close.smallWins.length < 5) plan.close.smallWins.push('');
      return plan;
    });
  }

  function carryUnfinished() {
    const unfinished = [
      ...todayPlan.priorities.filter((x) => x.text.trim() && !x.done).map((x) => x.text.trim()),
      ...todayPlan.optional.filter((x) => x.text.trim() && !x.done).map((x) => x.text.trim()),
    ];
    if (todayPlan.selfCare?.text?.trim() && !todayPlan.selfCare.done) {
      unfinished.push(todayPlan.selfCare.text.trim());
    }
    if (!unfinished.length) {
      Alert.alert('Nic do przeniesienia', 'Wszystkie zapisane rzeczy są już zrobione.');
      return;
    }
    updatePlan(tomorrowKey, (plan) => {
      const existing = new Set([
        ...plan.priorities.map((x) => x.text.trim().toLowerCase()),
        ...plan.optional.map((x) => x.text.trim().toLowerCase()),
      ]);
      unfinished.forEach((text) => {
        if (existing.has(text.toLowerCase())) return;
        const emptyPriority = plan.priorities.find((x) => !x.text.trim());
        if (emptyPriority) emptyPriority.text = text;
        else if (plan.optional.length < 8) plan.optional.push({ id: `carry_${Date.now()}_${Math.random()}`, text, done: false });
        existing.add(text.toLowerCase());
      });
      return plan;
    });
    Alert.alert('Przeniesione', 'Niezrobione rzeczy dodałem do planu na jutro.');
  }

  function closeDay() {
    const wins = todayPlan.close.smallWins.filter((x) => x.trim());
    if (!todayPlan.close.rating) {
      Alert.alert('Ocena dnia', 'Najpierw wybierz ocenę dnia od 1 do 10.');
      return;
    }
    if (wins.length < 3) {
      Alert.alert('Małe zwycięstwa', 'Wpisz przynajmniej 3 małe zwycięstwa z dzisiaj.');
      return;
    }
    updatePlan(todayKey, (plan) => {
      plan.close.closedAt = new Date().toISOString();
      return plan;
    });
    Alert.alert('Dzień zamknięty', 'Zapisane. Jutro zaczynasz z czystą głową.');
    setTab('history');
  }

  if (!loaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" />
        <View style={styles.loading}><Text style={styles.logo}>PLAN NA JUTRO</Text></View>
      </SafeAreaView>
    );
  }

  function TodayScreen() {
    const hasPlan = planHasContent(todayPlan) || todayPlan.plannedAt;
    return (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>DZISIAJ</Text>
        <Text style={styles.title}>{prettyDate(todayKey)}</Text>
        <Text style={styles.lead}>Nie musisz zrobić dnia idealnie. Masz zrobić to, co najważniejsze.</Text>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricValue}>{todayCompletion.pct}%</Text>
            <Text style={styles.metricLabel}>wykonane</Text>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricValue}>{streak}</Text>
            <Text style={styles.metricLabel}>dni planowania</Text>
          </Card>
        </View>

        {!hasPlan ? (
          <Card>
            <Text style={styles.cardTitle}>Brak planu na dziś</Text>
            <Text style={styles.bodyMuted}>Nic się nie stało. Wieczorem ułóż prosty plan na jutro — bez godzin i bez spiny.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setTab('tomorrow')}>
              <Text style={styles.primaryButtonText}>ZAPLANUJ JUTRO</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <>
            <SectionTitle title="3 priorytety" subtitle="Najważniejsze rzeczy. Kolejność możesz zmieniać w głowie — nie w zegarku." />
            <Card>
              {todayPlan.priorities.filter((x) => x.text.trim()).map((item, idx) => (
                <CheckRow key={item.id || idx} item={item} onToggle={() => updatePlan(todayKey, (plan) => {
                  plan.priorities[idx].done = !plan.priorities[idx].done;
                  return plan;
                })} />
              ))}
              {!todayPlan.priorities.some((x) => x.text.trim()) ? <Text style={styles.bodyMuted}>Brak wpisanych priorytetów.</Text> : null}
            </Card>

            {todayPlan.selfCare?.text?.trim() ? (
              <>
                <SectionTitle title="Jedna rzecz dla siebie" />
                <Card>
                  <CheckRow item={todayPlan.selfCare} onToggle={() => updatePlan(todayKey, (plan) => {
                    plan.selfCare.done = !plan.selfCare.done;
                    return plan;
                  })} />
                </Card>
              </>
            ) : null}

            {todayPlan.trading?.enabled && (
              <>
                <SectionTitle title="Trading" subtitle="Plan ma Cię ograniczać do dobrych decyzji, nie zmuszać do trade'u." />
                <Card>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Sesja</Text><Text style={styles.infoValue}>{todayPlan.trading.session || '—'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Focus</Text><Text style={styles.infoValue}>{todayPlan.trading.focus || '—'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Max risk</Text><Text style={styles.infoValue}>{todayPlan.trading.maxRisk || '—'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Max trade'y</Text><Text style={styles.infoValue}>{todayPlan.trading.maxTrades || '—'}</Text></View>
                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}><Text style={styles.infoLabel}>NO TRADE gdy</Text><Text style={styles.infoValue}>{todayPlan.trading.noTradeCondition || 'Brak czystego setupu'}</Text></View>
                </Card>
              </>
            )}

            {todayPlan.optional.some((x) => x.text.trim()) ? (
              <>
                <SectionTitle title="Opcjonalne" subtitle="Fajnie zrobić, ale nie rozwalają dnia, jeśli coś wyskoczy." />
                <Card>
                  {todayPlan.optional.map((item, idx) => item.text.trim() ? (
                    <CheckRow key={item.id || idx} item={item} muted onToggle={() => updatePlan(todayKey, (plan) => {
                      plan.optional[idx].done = !plan.optional[idx].done;
                      return plan;
                    })} />
                  ) : null)}
                </Card>
              </>
            ) : null}

            <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab('close')}>
              <Text style={styles.secondaryButtonText}>ZAMKNIJ DZIEŃ</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    );
  }

  function TomorrowScreen() {
    const sessions = ['New York', 'London', 'Asia', 'Nie gram'];
    return (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>PLAN NA JUTRO</Text>
        <Text style={styles.title}>{prettyDate(tomorrowKey)}</Text>
        <Text style={styles.lead}>Priorytety zamiast godzin. Jeśli coś wyskoczy, zmieniasz kolejność — nie uznajesz dnia za przegrany.</Text>

        <SectionTitle title="3 najważniejsze rzeczy" subtitle="Wpisz tylko rzeczy, które naprawdę chcesz dowieźć." />
        <Card>
          {tomorrowPlan.priorities.map((item, idx) => (
            <View key={item.id || idx} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PRIORYTET {idx + 1}</Text>
              <TextInput
                value={item.text}
                onChangeText={(text) => updatePlan(tomorrowKey, (plan) => {
                  plan.priorities[idx].text = text;
                  plan.priorities[idx].done = false;
                  return plan;
                })}
                placeholder={idx === 0 ? 'np. trening / ważne zadanie / review' : 'Wpisz priorytet'}
                placeholderTextColor="#607384"
                style={styles.input}
              />
            </View>
          ))}
        </Card>

        <SectionTitle title="Jedna rzecz dla siebie" subtitle="Coś, po czym będziesz się czuł lepiej, a nie tylko bardziej produktywnie." />
        <Card>
          <TextInput
            value={tomorrowPlan.selfCare.text}
            onChangeText={(text) => updatePlan(tomorrowKey, (plan) => {
              plan.selfCare.text = text;
              plan.selfCare.done = false;
              return plan;
            })}
            placeholder="np. spacer, trening, odpoczynek, książka"
            placeholderTextColor="#607384"
            style={styles.input}
          />
        </Card>

        <SectionTitle title="Trading" subtitle="Bez sztywnej godziny. Ustalasz ramy decyzji." />
        <Card>
          <Text style={styles.inputLabel}>SESJA</Text>
          <View style={styles.pillWrap}>
            {sessions.map((s) => <Pill key={s} label={s} active={tomorrowPlan.trading.session === s} onPress={() => updatePlan(tomorrowKey, (plan) => {
              plan.trading.session = s;
              plan.trading.enabled = s !== 'Nie gram';
              return plan;
            })} />)}
          </View>
          <Text style={styles.inputLabel}>FOCUS NA SESJĘ</Text>
          <TextInput
            value={tomorrowPlan.trading.focus}
            onChangeText={(text) => updatePlan(tomorrowKey, (plan) => { plan.trading.focus = text; return plan; })}
            placeholder="np. tylko A+ setup, cierpliwość, zero FOMO"
            placeholderTextColor="#607384"
            style={styles.input}
          />
          <View style={styles.twoCols}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>MAX RISK</Text>
              <TextInput
                value={tomorrowPlan.trading.maxRisk}
                onChangeText={(text) => updatePlan(tomorrowKey, (plan) => { plan.trading.maxRisk = text; return plan; })}
                placeholder="np. 0.5%"
                placeholderTextColor="#607384"
                style={styles.input}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>MAX TRADE'ÓW</Text>
              <TextInput
                value={tomorrowPlan.trading.maxTrades}
                onChangeText={(text) => updatePlan(tomorrowKey, (plan) => { plan.trading.maxTrades = text; return plan; })}
                placeholder="np. 2"
                placeholderTextColor="#607384"
                style={styles.input}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <Text style={styles.inputLabel}>KIEDY ROBIĘ NO TRADE?</Text>
          <TextInput
            value={tomorrowPlan.trading.noTradeCondition}
            onChangeText={(text) => updatePlan(tomorrowKey, (plan) => { plan.trading.noTradeCondition = text; return plan; })}
            placeholder="np. brak sweepu + displacementu, chaos, FOMO"
            placeholderTextColor="#607384"
            style={[styles.input, styles.multiline]}
            multiline
          />
        </Card>

        <SectionTitle title="Opcjonalne" subtitle="Rzeczy, które robisz tylko jeśli dzień na to pozwoli." />
        <Card>
          {tomorrowPlan.optional.map((item, idx) => (
            <View key={item.id || idx} style={styles.optionalEditRow}>
              <TextInput
                value={item.text}
                onChangeText={(text) => updatePlan(tomorrowKey, (plan) => { plan.optional[idx].text = text; plan.optional[idx].done = false; return plan; })}
                placeholder="Opcjonalne zadanie"
                placeholderTextColor="#607384"
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
              />
              <TouchableOpacity style={styles.removeButton} onPress={() => updatePlan(tomorrowKey, (plan) => {
                plan.optional.splice(idx, 1);
                return plan;
              })}><Text style={styles.removeText}>×</Text></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addOptional}>
            <Text style={styles.addButtonText}>+ DODAJ OPCJONALNE</Text>
          </TouchableOpacity>
        </Card>

        <TouchableOpacity style={styles.primaryButton} onPress={saveTomorrow}>
          <Text style={styles.primaryButtonText}>ZAPISZ PLAN NA JUTRO</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function CloseScreen() {
    return (
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>ZAMKNIĘCIE DNIA</Text>
        <Text style={styles.title}>Jak poszło?</Text>
        <Text style={styles.lead}>Nie oceniaj dnia tylko po wyniku. Zapisz, co było dobre i czego chcesz się nauczyć.</Text>

        <SectionTitle title="Ocena dnia 1–10" />
        <Card>
          <View style={styles.ratingWrap}>
            {Array.from({ length: 10 }).map((_, i) => {
              const n = i + 1;
              return <TouchableOpacity key={n} style={[styles.ratingButton, todayPlan.close.rating === n && styles.ratingButtonActive]} onPress={() => updatePlan(todayKey, (plan) => { plan.close.rating = n; return plan; })}>
                <Text style={[styles.ratingText, todayPlan.close.rating === n && styles.ratingTextActive]}>{n}</Text>
              </TouchableOpacity>;
            })}
          </View>
        </Card>

        <SectionTitle title="3–5 małych zwycięstw" subtitle="Małe rzeczy też są dowodem progresu." />
        <Card>
          {todayPlan.close.smallWins.map((win, idx) => (
            <View key={idx} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ZWYCIĘSTWO {idx + 1}</Text>
              <TextInput
                value={win}
                onChangeText={(text) => updatePlan(todayKey, (plan) => { plan.close.smallWins[idx] = text; return plan; })}
                placeholder={idx === 0 ? 'np. nie wszedłem w słaby setup' : 'Co dziś zrobiłeś dobrze?'}
                placeholderTextColor="#607384"
                style={styles.input}
              />
            </View>
          ))}
          {todayPlan.close.smallWins.length < 5 ? (
            <TouchableOpacity style={styles.addButton} onPress={addSmallWin}>
              <Text style={styles.addButtonText}>+ DODAJ ZWYCIĘSTWO</Text>
            </TouchableOpacity>
          ) : null}
        </Card>

        <SectionTitle title="Krótki review" />
        <Card>
          <Text style={styles.inputLabel}>CO POSZŁO DOBRZE?</Text>
          <TextInput value={todayPlan.close.didWell} onChangeText={(text) => updatePlan(todayKey, (plan) => { plan.close.didWell = text; return plan; })} placeholder="Jedno konkretne zdanie" placeholderTextColor="#607384" style={[styles.input, styles.multiline]} multiline />
          <Text style={styles.inputLabel}>CO POPRAWIĘ?</Text>
          <TextInput value={todayPlan.close.improve} onChangeText={(text) => updatePlan(todayKey, (plan) => { plan.close.improve = text; return plan; })} placeholder="Bez biczowania się — konkretny wniosek" placeholderTextColor="#607384" style={[styles.input, styles.multiline]} multiline />
          <Text style={styles.inputLabel}>CO CHCĘ POWTÓRZYĆ JUTRO?</Text>
          <TextInput value={todayPlan.close.repeat} onChangeText={(text) => updatePlan(todayKey, (plan) => { plan.close.repeat = text; return plan; })} placeholder="Jedna dobra rzecz do utrzymania" placeholderTextColor="#607384" style={[styles.input, styles.multiline]} multiline />
        </Card>

        <TouchableOpacity style={styles.secondaryButton} onPress={carryUnfinished}>
          <Text style={styles.secondaryButtonText}>PRZENIEŚ NIEZROBIONE NA JUTRO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={closeDay}>
          <Text style={styles.primaryButtonText}>ZAMKNIJ DZIEŃ</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function HistoryScreen() {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>HISTORIA</Text>
        <Text style={styles.title}>Twoje dni</Text>
        <Text style={styles.lead}>Nie szukasz perfekcji. Szukasz powtarzalności.</Text>

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}><Text style={styles.metricValue}>{weekStats.avgRating}</Text><Text style={styles.metricLabel}>średnia ocena / 7 dni</Text></Card>
          <Card style={styles.metricCard}><Text style={styles.metricValue}>{weekStats.avgCompletion}%</Text><Text style={styles.metricLabel}>średnie wykonanie</Text></Card>
        </View>
        <Card>
          <Text style={styles.cardTitle}>Zamknięte dni w ostatnich 7</Text>
          <Text style={styles.bigSimple}>{weekStats.closed}/7</Text>
        </Card>

        <SectionTitle title="Ostatnie wpisy" />
        {history.length === 0 ? (
          <Card><Text style={styles.bodyMuted}>Gdy zamkniesz pierwszy dzień, pojawi się tutaj historia.</Text></Card>
        ) : history.map(([key, plan]) => {
          const c = completion(plan);
          const wins = plan.close.smallWins.filter((x) => x.trim());
          return (
            <Card key={key}>
              <View style={styles.historyHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{prettyDate(key)}</Text>
                  <Text style={styles.bodyMuted}>{c.pct}% planu wykonane</Text>
                </View>
                <View style={styles.scoreCircle}><Text style={styles.scoreText}>{plan.close.rating}/10</Text></View>
              </View>
              {wins.length ? <>
                <Text style={[styles.inputLabel, { marginTop: 12 }]}>MAŁE ZWYCIĘSTWA</Text>
                {wins.map((w, idx) => <Text key={idx} style={styles.winLine}>• {w}</Text>)}
              </> : null}
              {plan.close.improve?.trim() ? <Text style={styles.historyNote}><Text style={styles.historyNoteLabel}>Wniosek: </Text>{plan.close.improve}</Text> : null}
            </Card>
          );
        })}
      </ScrollView>
    );
  }

  const content = tab === 'today' ? TodayScreen() : tab === 'tomorrow' ? TomorrowScreen() : tab === 'close' ? CloseScreen() : HistoryScreen();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
      </KeyboardAvoidingView>
      <View style={styles.nav}>
        {[
          ['today', 'DZIŚ'],
          ['tomorrow', 'JUTRO'],
          ['close', 'ZAMKNIJ'],
          ['history', 'HISTORIA'],
        ].map(([key, label]) => (
          <TouchableOpacity key={key} style={styles.navItem} onPress={() => setTab(key)}>
            <View style={[styles.navDot, tab === key && styles.navDotActive]} />
            <Text style={[styles.navText, tab === key && styles.navTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { color: COLORS.text, fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  scroll: { padding: 18, paddingBottom: 34 },
  eyebrow: { color: COLORS.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 2.1, marginTop: 4 },
  title: { color: COLORS.text, fontSize: 34, fontWeight: '900', marginTop: 7, textTransform: 'capitalize' },
  lead: { color: COLORS.muted, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginBottom: 16 },
  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: '800' },
  bodyMuted: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 6 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 10 },
  sectionSubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  metricCard: { flex: 1, minHeight: 105, justifyContent: 'center' },
  metricValue: { color: COLORS.text, fontSize: 31, fontWeight: '900' },
  metricLabel: { color: COLORS.muted, fontSize: 12, marginTop: 4, lineHeight: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#172735' },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#385068', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  checkmark: { color: '#062116', fontWeight: '900', fontSize: 16 },
  checkText: { color: COLORS.text, fontSize: 16, flex: 1, lineHeight: 22 },
  checkTextDone: { color: COLORS.muted, textDecorationLine: 'line-through' },
  infoRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#172735', gap: 12 },
  infoLabel: { color: COLORS.muted, fontSize: 13, width: 92 },
  infoValue: { color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1, textAlign: 'right' },
  inputGroup: { marginBottom: 8 },
  inputLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 7, marginTop: 4 },
  input: { backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border, color: COLORS.text, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, marginBottom: 10 },
  multiline: { minHeight: 78, textAlignVertical: 'top' },
  twoCols: { flexDirection: 'row', gap: 10 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  pill: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9 },
  pillActive: { backgroundColor: '#173459', borderColor: COLORS.blue },
  pillText: { color: COLORS.muted, fontSize: 13, fontWeight: '700' },
  pillTextActive: { color: '#DDE8FF' },
  optionalEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  removeButton: { width: 40, height: 44, borderRadius: 12, backgroundColor: '#2A1620', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: COLORS.red, fontSize: 24, fontWeight: '700', marginTop: -2 },
  addButton: { paddingVertical: 11, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 2 },
  addButtonText: { color: COLORS.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  primaryButton: { backgroundColor: COLORS.blue, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 4, marginBottom: 14 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1.2 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.blue, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 4, marginBottom: 12 },
  secondaryButtonText: { color: '#BFD1FF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  ratingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ratingButton: { width: '17%', minWidth: 46, aspectRatio: 1, borderRadius: 12, backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  ratingButtonActive: { backgroundColor: COLORS.amber, borderColor: COLORS.amber },
  ratingText: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  ratingTextActive: { color: '#241700' },
  historyHeader: { flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { minWidth: 58, height: 42, borderRadius: 21, paddingHorizontal: 8, backgroundColor: '#172D40', alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: COLORS.cyan, fontSize: 14, fontWeight: '900' },
  winLine: { color: COLORS.text, fontSize: 14, lineHeight: 21, marginBottom: 3 },
  historyNote: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 10 },
  historyNoteLabel: { color: COLORS.amber, fontWeight: '800' },
  bigSimple: { color: COLORS.text, fontSize: 34, fontWeight: '900', marginTop: 8 },
  nav: { flexDirection: 'row', backgroundColor: '#09131C', borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'android' ? 8 : 4, paddingTop: 8 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  navDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#314353', marginBottom: 5 },
  navDotActive: { backgroundColor: COLORS.cyan, width: 18 },
  navText: { color: '#66798A', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  navTextActive: { color: COLORS.text },
});

export default App;
