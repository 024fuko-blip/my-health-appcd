'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function EntryPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // 入力するデータの入れ物
  const [date, setDate] = useState('')
  const [score, setScore] = useState(5)
  const [sleepStart, setSleepStart] = useState('23:00')
  const [sleepEnd, setSleepEnd] = useState('07:00')
  const [meals, setMeals] = useState('')
  const [loading, setLoading] = useState(false)

  // 画面が開いたとき、今日の日付をセットする
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setDate(today)
  }, [])

  // 睡眠時間の計算（表示用）
  const calculateSleepDuration = () => {
    if (!sleepStart || !sleepEnd) return '---'
    
    // 現在の日付を基準に計算
    let start = new Date(`2000-01-01T${sleepStart}`)
    let end = new Date(`2000-01-01T${sleepEnd}`)
    
    // もし起床時間が就寝時間より早い場合（例：23時寝て、翌7時起き）、日付をまたいだとみなす
    if (end < start) {
      end = new Date(`2000-01-02T${sleepEnd}`)
    }
    
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return diffHours.toFixed(1) // 小数点第1位まで
  }

  // 保存ボタンを押したときの処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. ログインユーザー情報を取得
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('ログインしてください')
      router.push('/')
      return
    }

    // 2. データベースに保存
    const { error } = await supabase
      .from('health_logs')
      .insert({
        user_id: user.id,   // 誰のデータか
        date: date,         // 日付
        score: score,       // 体調点数
        sleep_start: sleepStart, // 就寝時間
        sleep_end: sleepEnd,     // 起床時間
        meals: meals,       // 食事メモ
      })

    if (error) {
      alert('保存に失敗しました: ' + error.message)
      setLoading(false)
    } else {
      // 3. 成功したらカレンダー画面に戻る
      router.push('/calendar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">今日の記録</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* 体調スコア (1-10) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              今日の体調 <span className="text-teal-600 font-bold">{score}点</span>
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>絶不調 (1)</span>
              <span>絶好調 (10)</span>
            </div>
          </div>

          {/* 睡眠時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">就寝</label>
              <input
                type="time"
                value={sleepStart}
                onChange={(e) => setSleepStart(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">起床</label>
              <input
                type="time"
                value={sleepEnd}
                onChange={(e) => setSleepEnd(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
          <div className="text-right text-sm text-gray-600">
            睡眠時間: <span className="font-bold">{calculateSleepDuration()}時間</span>
          </div>

          {/* 食事メモ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">食事メモ</label>
            <textarea
              rows={4}
              placeholder="朝：パン、昼：うどん..."
              value={meals}
              onChange={(e) => setMeals(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-1/3 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3 px-4 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md transition disabled:opacity-50"
            >
              {loading ? '保存中...' : '記録を保存する'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}