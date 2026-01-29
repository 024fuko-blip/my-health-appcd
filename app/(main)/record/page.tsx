"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface DrinkPreset {
  label: string;
  ml: number;
  percent: number;
}

interface AddedDrink {
  id: number;
  label: string;
  ml: number;
  count: number;
  pureAlcohol: number;
}

interface HealthLogRow {
  id: string;
  memo?: string | null;
  medication_taken?: boolean | null;
  general_mood?: number | null;
  period_status?: string | null;
  meal_description?: string | null;
  pain_level?: number | null;
  stool_type?: string | null;
  alcohol_amount?: number | null;
  alcohol_type?: string | null;
  stress_level?: number | null;
  sleep_quality?: string | null;
  spending?: number | null;
  weight?: number | null;
  body_fat?: number | null;
  calories?: number | null;
  protein?: number | null;
  steps?: number | null;
  exercise_minutes?: number | null;
}

/** 設定のモードフラグ（DB user_settings の一部）。参照前に定義しておく */
interface UserSettingsMode {
  mode_ibd?: boolean;
  mode_diet?: boolean;
  mode_alcohol?: boolean;
  mode_mental?: boolean;
}

const DRINK_PRESETS: Record<string, DrinkPreset> = {
  beer350: { label: "ビール (350ml)", ml: 350, percent: 5 },
  highball: { label: "ハイボール (350ml)", ml: 350, percent: 7 },
  chuhai: { label: "チューハイ (350ml)", ml: 350, percent: 5 },
  sake: { label: "日本酒 (1合)", ml: 180, percent: 15 },
  wine: { label: "ワイン (グラス)", ml: 120, percent: 12 },
  custom: { label: "手入力", ml: 0, percent: 0 },
};

/** DBの alcohol_type 文字列（例: "ビール (350ml)x2, ハイボール (350ml)x1"）を addedDrinks に復元する */
function parseAlcoholTypeToAddedDrinks(
  alcoholType: string | null | undefined,
  alcoholAmountMl: number | null | undefined
): AddedDrink[] {
  const result: AddedDrink[] = [];
  if (!alcoholType || !alcoholType.trim()) {
    return result;
  }
  const parts = alcoholType.split(/\s*[,、]\s*/).map((p) => p.trim()).filter(Boolean);
  let totalMlParsed = 0;
  for (let i = 0; i < parts.length; i++) {
    const match = parts[i].match(/^(.+?)x(\d+)$/);
    if (!match) continue;
    const [, label, countStr] = match;
    const count = parseInt(countStr, 10) || 1;
    const preset = Object.values(DRINK_PRESETS).find((p) => p.label === label);
    if (preset) {
      const pure = preset.ml * (preset.percent / 100) * 0.8;
      result.push({
        id: Date.now() + i,
        label: preset.label,
        ml: preset.ml,
        count,
        pureAlcohol: pure * count,
      });
      totalMlParsed += preset.ml * count;
    }
  }
  const amount = alcoholAmountMl ?? 0;
  if (amount > totalMlParsed && amount > 0) {
    result.push({
      id: Date.now() + 999,
      label: `その他 (${amount - totalMlParsed}ml)`,
      ml: amount - totalMlParsed,
      count: 1,
      pureAlcohol: 0,
    });
  }
  return result;
}

export default function RecordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [modes, setModes] = useState<UserSettingsMode>({});
  const [gender, setGender] = useState('unspecified');
  const [medicalHistory, setMedicalHistory] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState('');
  const [medicationTaken, setMedicationTaken] = useState(false);
  const [generalMood, setGeneralMood] = useState(3);
  const [periodStatus, setPeriodStatus] = useState('なし');

  const [mealDescription, setMealDescription] = useState('');
  /** 食事写真（Base64 data URL）。API送信用・プレビュー用 */
  const [mealImageBase64, setMealImageBase64] = useState<string | null>(null);

  const [painLevel, setPainLevel] = useState(1);
  const [stoolType, setStoolType] = useState('普通');

  const [addedDrinks, setAddedDrinks] = useState<AddedDrink[]>([]);
  const [selectedDrinkKey, setSelectedDrinkKey] = useState('beer350');
  const [drinkCount, setDrinkCount] = useState(1);
  const [alcoholTrigger, setAlcoholTrigger] = useState('習慣');

  const [stressLevel, setStressLevel] = useState(1);
  const [sleepQuality, setSleepQuality] = useState('普通');
  const [spending, setSpending] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [steps, setSteps] = useState('');
  const [exerciseMinutes, setExerciseMinutes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<{ show: boolean; msg: string } | null>(null);
  /** アルコール内訳を復元できなかった場合の表示用（例: "以前の記録: 350ml"） */
  const [previousAlcoholSummary, setPreviousAlcoholSummary] = useState('');

  function applyLogToForm(log: HealthLogRow | null): void {
    if (!log) {
      setPreviousAlcoholSummary('');
      setMemo('');
      setMedicationTaken(false);
      setGeneralMood(3);
      setPeriodStatus('なし');
      setMealDescription('');
      setMealImageBase64(null);
      setPainLevel(1);
      setStoolType('普通');
      setAddedDrinks([]);
      setAlcoholTrigger('習慣');
      setStressLevel(1);
      setSleepQuality('普通');
      setSpending('');
      setWeight('');
      setBodyFat('');
      setCalories('');
      setProtein('');
      setSteps('');
      setExerciseMinutes('');
      return;
    }
    setMemo(typeof log.memo === 'string' ? log.memo.replace(/\n【飲酒理由】.*$/, '').trim() : '');
    setMedicationTaken(!!log.medication_taken);
    setGeneralMood(log.general_mood ?? 3);
    setPeriodStatus(log.period_status || 'なし');
    setMealDescription(log.meal_description || '');
    setPainLevel(log.pain_level ?? 1);
    setStoolType(log.stool_type || '普通');
    setAlcoholTrigger('習慣');
    setStressLevel(log.stress_level ?? 1);
    setSleepQuality(log.sleep_quality || '普通');
    setSpending(log.spending != null ? String(log.spending) : '');
    setWeight(log.weight != null ? String(log.weight) : '');
    setBodyFat(log.body_fat != null ? String(log.body_fat) : '');
    setCalories(log.calories != null ? String(log.calories) : '');
    setProtein(log.protein != null ? String(log.protein) : '');
    setSteps(log.steps != null ? String(log.steps) : '');
    setExerciseMinutes(log.exercise_minutes != null ? String(log.exercise_minutes) : '');

    const restored = parseAlcoholTypeToAddedDrinks(log.alcohol_type, log.alcohol_amount);
    if (restored.length > 0) {
      setAddedDrinks(restored);
      setPreviousAlcoholSummary('');
    } else {
      setAddedDrinks([]);
      const amount = log.alcohol_amount ?? 0;
      setPreviousAlcoholSummary(amount > 0 ? `以前の記録: ${amount}ml` : '');
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/login');
          return;
        }
        const { data: settings } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();
        if (settings) {
          setModes({
            mode_ibd: Boolean(settings.mode_ibd),
            mode_diet: Boolean(settings.mode_diet),
            mode_alcohol: Boolean(settings.mode_alcohol),
            mode_mental: Boolean(settings.mode_mental),
          });
          setGender((settings.gender as string) || 'unspecified');
          setMedicalHistory((settings.medical_history as string) || '');
        }
        const today = new Date().toISOString().split('T')[0];
        const { data: log } = await supabase
          .from('health_logs')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('date', today)
          .maybeSingle();
        applyLogToForm((log as HealthLogRow) ?? null);
      } catch (err) {
        console.error('Record init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  useEffect(() => {
    if (loading) return;
    const loadLogForDate = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: log } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', date)
        .maybeSingle();
      applyLogToForm((log as HealthLogRow) ?? null);
    };
    loadLogForDate();
  }, [date, loading]);

  const handleAddDrink = () => {
    const preset = DRINK_PRESETS[selectedDrinkKey];
    const pure = preset.ml * (preset.percent / 100) * 0.8;
    setAddedDrinks([...addedDrinks, { id: Date.now(), label: preset.label, ml: preset.ml, count: drinkCount, pureAlcohol: pure * drinkCount }]);
    setDrinkCount(1);
  };
  const handleRemoveDrink = (id: number) => setAddedDrinks(addedDrinks.filter(d => d.id !== id));
  const currentTotalPureAlcohol = addedDrinks.reduce((sum, d) => sum + d.pureAlcohol, 0);

  const handleMealImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') setMealImageBase64(result);
    };
    reader.onerror = () => {
      console.error('Failed to read image');
      alert('画像の読み込みに失敗したわ。別の画像を選んでちょうだい！');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearMealImage = () => setMealImageBase64(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // アルコール集計
    let totalMl = 0; let types: string[] = [];
    addedDrinks.forEach(d => { totalMl += d.ml * d.count; types.push(`${d.label}x${d.count}`); });

    // 1. AI分析 (APIへ送信)
    let aiComment = "";
    try {
      const aiRes = await fetch('/api/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'daily',
          logs: null,
          meal_description: mealDescription,
          general_mood: generalMood,
          pain_level: modes.mode_ibd ? painLevel : 0,
          stool_type: modes.mode_ibd ? stoolType : '',
          weight: modes.mode_diet ? weight : '',
          steps: modes.mode_diet ? steps : '',
          alcohol_amount: modes.mode_alcohol ? totalMl : 0,
          alcohol_reason: modes.mode_alcohol ? alcoholTrigger : '',
          medication_taken: medicationTaken,
          stress_level: modes.mode_mental ? stressLevel : null,
          sleep_quality: modes.mode_mental ? sleepQuality : null,
          meal_image_base64: mealImageBase64 ?? undefined,
        })
      });

      if (!aiRes.ok) {
        const errorText = await aiRes.text();
        throw new Error(`API Error: ${aiRes.status} ${errorText}`);
      }

      const aiData = await aiRes.json();
      aiComment = aiData.advice;

    } catch (err) {
      console.error("AI Error Details:", err);
      aiComment = "通信エラーよ！オネエがちょっと休憩中みたい。（API接続に失敗しました）";
    }

    // 2. DB保存（同一日付は上書き）
    const payload: Record<string, unknown> = {
      user_id: session.user.id,
      date,
      memo: memo + (alcoholTrigger && modes.mode_alcohol ? `\n【飲酒理由】${alcoholTrigger}` : ''),
      medication_taken: medicationTaken,
      general_mood: generalMood,
      meal_description: mealDescription,
      period_status: gender === 'female' ? periodStatus : null,
      ai_comment: aiComment, 

      pain_level: modes.mode_ibd ? painLevel : null,
      stool_type: modes.mode_ibd ? stoolType : null,

      alcohol_amount: modes.mode_alcohol ? totalMl : 0,
      alcohol_percent: 0,
      alcohol_type: modes.mode_alcohol ? types.join(', ') : null,

      stress_level: modes.mode_mental ? stressLevel : null,
      sleep_quality: modes.mode_mental ? sleepQuality : null,
      spending: modes.mode_mental && spending ? parseInt(spending) : null,

      weight: modes.mode_diet && weight ? parseFloat(weight) : null,
      body_fat: modes.mode_diet && bodyFat ? parseFloat(bodyFat) : null,
      calories: modes.mode_diet && calories ? parseInt(calories) : null,
      protein: modes.mode_diet && protein ? parseFloat(protein) : null,
      steps: modes.mode_diet && steps ? parseInt(steps) : null,
      exercise_minutes: modes.mode_diet && exerciseMinutes ? parseInt(exerciseMinutes) : null,
    };

    const { error: saveError } = await supabase
      .from('health_logs')
      .upsert(payload, { onConflict: 'user_id,date' });

    setIsSubmitting(false);

    if (!saveError) {
      setResultModal({ show: true, msg: aiComment });
      setMemo('');
      setAddedDrinks([]);
      setMealDescription('');
      setMealImageBase64(null);
      setPreviousAlcoholSummary('');
    } else {
      alert('保存エラー: ' + saveError.message);
    }
  };

  const handleCloseModal = () => {
    setResultModal(null);
    router.push('/dashboard'); 
  };

  if (loading) return <div>読み込み中...</div>;

  return (
    <div className="space-y-6 pb-24 relative">
      <h2 className="text-xl font-bold">📝 今日のパートナー記録</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* 基本情報 */}
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <div><label className="text-sm font-bold block mb-1">日付</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full border p-2 rounded" /></div>
          
          <div>
            <label className="text-sm font-bold block mb-1">今日の体調 (Lv.{generalMood})</label>
            <div className="flex justify-between text-xs text-gray-400"><span>最悪</span><span>最高</span></div>
            <input type="range" min="1" max="5" value={generalMood} onChange={e=>setGeneralMood(parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none accent-blue-500" />
          </div>

          <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
            <span className="font-bold text-blue-800 text-sm">💊 今日の薬</span>
            <label className="flex items-center"><input type="checkbox" checked={medicationTaken} onChange={e=>setMedicationTaken(e.target.checked)} className="w-5 h-5 mr-2" /><span className="text-sm">{medicationTaken ? '完了' : 'まだ'}</span></label>
          </div>

          {gender === 'female' && (
             <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
               <label className="font-bold text-pink-800 text-sm block mb-1">🩸 生理ステータス</label>
               <select value={periodStatus} onChange={e=>setPeriodStatus(e.target.value)} className="w-full p-2 border rounded text-sm"><option value="なし">なし</option><option value="生理前">生理前 (PMS)</option><option value="生理中">生理中</option></select>
             </div>
          )}
        </div>


       {/* 🍽️ 食事記録エリア */}
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 space-y-3">
          <h3 className="font-bold text-orange-800">🍽️ 食事メモ (AI分析用)</h3>
          <textarea 
            value={mealDescription} 
            onChange={(e) => setMealDescription(e.target.value)} 
            className="w-full h-24 p-2 border rounded text-sm" 
            placeholder="例: ラーメン大盛り、餃子。お腹いっぱい..." 
          />
          
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleMealImageChange} 
                className="hidden" 
              />
              <span className="bg-orange-500 text-white text-sm px-3 py-2 rounded-lg font-bold hover:bg-orange-600 transition">
                📷 食事写真を追加
              </span>
            </label>

            {mealImageBase64 && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={mealImageBase64} 
                  alt="食事プレビュー" 
                  className="max-h-32 rounded-lg border border-orange-200 object-cover" 
                />
                <button 
                  type="button" 
                  onClick={clearMealImage} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full text-sm font-bold shadow hover:bg-red-600"
                  aria-label="写真を削除"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 💊 IBD */}
        {modes.mode_ibd && (
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 space-y-3">
            <h3 className="font-bold text-blue-800">💊 IBDチェック</h3>
            <div><label className="text-xs font-bold">腹痛 (Lv.{painLevel})</label><input type="range" min="1" max="5" value={painLevel} onChange={e=>setPainLevel(parseInt(e.target.value))} className="w-full h-2 bg-blue-200 rounded-lg appearance-none" /></div>
            <div><label className="text-xs font-bold">便の状態</label><select value={stoolType} onChange={e=>setStoolType(e.target.value)} className="w-full p-2 border rounded text-sm"><option value="普通">普通</option><option value="軟便">軟便</option><option value="下痢">下痢</option><option value="血便">⚠️ 血便</option></select></div>
          </div>
        )}

        {/* 💪 ボディメイク */}
        {modes.mode_diet && (
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
            <h3 className="font-bold text-purple-800">💪 ボディメイク</h3>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs font-bold">体重(kg)</label><input type="number" step="0.1" value={weight} onChange={e=>setWeight(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">体脂肪(%)</label><input type="number" step="0.1" value={bodyFat} onChange={e=>setBodyFat(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">カロリー</label><input type="number" value={calories} onChange={e=>setCalories(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">タンパク質(g)</label><input type="number" step="0.1" value={protein} onChange={e=>setProtein(e.target.value)} className="w-full p-2 border rounded" /></div>
              <div><label className="text-xs font-bold">歩数</label><input type="number" value={steps} onChange={e=>setSteps(e.target.value)} className="w-full p-2 border rounded" /></div>
            </div>
          </div>
        )}

        {/* 🍺 アルコール */}
        {modes.mode_alcohol && (
          <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
            <h3 className="font-bold text-yellow-800">🍺 アルコール ({currentTotalPureAlcohol.toFixed(1)}g)</h3>
            {previousAlcoholSummary && (
              <p className="text-xs text-yellow-700 bg-yellow-100/80 rounded px-2 py-1 mb-2">{previousAlcoholSummary}</p>
            )}
            <div className="mb-2"><label className="text-xs block mb-1">飲む理由</label><select value={alcoholTrigger} onChange={e=>setAlcoholTrigger(e.target.value)} className="w-full p-1 border rounded text-sm"><option value="習慣">習慣</option><option value="ストレス">ストレス</option><option value="付き合い">付き合い</option></select></div>
            <div className="flex gap-2"><select value={selectedDrinkKey} onChange={e=>setSelectedDrinkKey(e.target.value)} className="flex-1 p-2 border rounded text-sm">{Object.entries(DRINK_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}</select><button type="button" onClick={handleAddDrink} className="bg-yellow-500 text-white px-3 rounded font-bold">＋</button></div>
            {addedDrinks.map(d=><div key={d.id} className="text-sm mt-1">{d.label} x{d.count} <button type="button" onClick={()=>handleRemoveDrink(d.id)}>🗑️</button></div>)}
          </div>
        )}

        {/* 🌿 メンタル */}
        {modes.mode_mental && (
          <div className="bg-green-50 p-4 rounded-xl border border-green-200">
             <h3 className="font-bold text-green-800">🌿 メンタル</h3>
             <div><label className="text-xs">ストレス (Lv.{stressLevel})</label><input type="range" min="1" max="10" value={stressLevel} onChange={e=>setStressLevel(parseInt(e.target.value))} className="w-full h-2 bg-green-200 rounded-lg appearance-none accent-green-600" /></div>
             <div><label className="text-xs">出費</label><input type="number" value={spending} onChange={e=>setSpending(e.target.value)} className="w-full p-2 border rounded" /></div>
          </div>
        )}

        <div><label className="text-sm font-bold block mb-1">ひとことメモ</label><textarea value={memo} onChange={e=>setMemo(e.target.value)} className="w-full border p-3 rounded-lg h-20" /></div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-pink-600 hover:bg-pink-700 text-white p-4 rounded-xl font-bold shadow-lg disabled:bg-gray-400">
          {isSubmitting ? '分析中...👹' : '記録して相棒に報告 📝'}
        </button>
      </form>

      {/* 結果表示モーダル */}
      {resultModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border-4 border-pink-400 relative animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-4xl">💋</span>
              <h3 className="text-xl font-bold text-pink-800">鬼コーチからの言葉</h3>
            </div>
            <div className="bg-pink-50 p-4 rounded-xl text-gray-800 leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
              {resultModal.msg}
            </div>
            <button 
              onClick={handleCloseModal}
              className="mt-6 w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800"
            >
              わかったわよ（閉じる）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
