'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO 
} from 'date-fns'
import { ja } from 'date-fns/locale' // 日本語化用

// データの型定義
type Log = {
  id: number
  date: string
  score: number
  meals: string
  sleep_start?: string
  sleep_end?: string
}

export default function CalendarPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [currentDate, setCurrentDate] = useState(new Date()) 
  const [selectedLog, setSelectedLog] = useState<Log | null>(null) // ポップアップ用
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  // データの取得関数（再利用できるように外に出しました）
  const fetchLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 

    const { data } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', user.id)

    if (data) setLogs(data)
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  // 削除機能
  const handleDelete = async (id: number) => {
    if(!confirm('本当にこの記録を削除しますか？')) return

    setLoading(true)
    const { error } = await supabase.from('health_logs').delete().eq('id', id)
    
    if (error) {
      alert('削除に失敗しました')
    } else {
      await fetchLogs() // 画面を更新
      setSelectedLog(null) // ポップアップを閉じる
    }
    setLoading(false)
  }

  // 体調スコアの色判定
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'bg-teal-500 text-white border-teal-600'
    if (score <= 4) return 'bg-rose-400 text-white border-rose-500' 
    return 'bg-gray-100 text-gray-700 border-gray-200' 
  }

  // 睡眠時間の計算（表示用）
  const getSleepTime = (start?: string, end?: string) => {
    if (!start || !end) return '-'
    let s = new Date(`2000-01-01T${start}`)
    let e = new Date(`2000-01-01T${end}`)
    if (e < s) e = new Date(`2000-01-02T${end}`)
    const hours = (e.getTime() - s.getTime()) / (1000 * 60 * 60)
    return hours.toFixed(1) + 'h'
  }

  // カレンダー計算
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) 
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 }) 
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="max-w-md mx-auto p-4">
        
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8 pt-6">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 text-gray-400 hover:text-teal-600 transition">
            ◀
          </button>
          <h1 className="text-xl font-bold text-gray-800 tracking-widest">
            {format(currentDate, 'yyyy.MM')}
          </h1>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 text-gray-400 hover:text-teal-600 transition">
            ▶
          </button>
        </div>

        {/* 曜日 */}
        <div className="grid grid-cols-7 mb-4">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, i) => (
            <div key={day} className={`text-center text-[10px] font-bold ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* カレンダーグリッド */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayItem) => {
            const log = logs.find(l => isSameDay(new Date(l.date), dayItem))
            const isCurrentMonth = isSameMonth(dayItem, monthStart)
            const isToday = isSameDay(dayItem, new Date())

            return (
              <button 
                key={dayItem.toString()} 
                onClick={() => log && setSelectedLog(log)} // ログがある時だけクリック可能
                disabled={!log}
                className={`
                  aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all duration-200
                  ${isCurrentMonth ? 'opacity-100' : 'opacity-30'}
                  ${log ? getScoreColor(log.score) + ' shadow-sm hover:scale-105 active:scale-95 cursor-pointer' : 'bg-transparent text-gray-300 cursor-default'}
                  ${isToday && !log ? 'border-2 border-teal-500 text-teal-600' : ''}
                `}
              >
                <span className={`text-xs font-medium ${log ? 'opacity-90' : ''}`}>
                  {format(dayItem, 'd')}
                </span>
                
                {log && (
                  <span className="text-[10px] font-bold mt-0.5">
                    {log.score}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 入力ボタン（FAB） */}
        <Link href="/entry">
          <div className="fixed bottom-8 right-8 bg-gray-900 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:bg-gray-700 transition transform hover:scale-110 active:scale-95 z-10">
            <span className="text-2xl pb-1">+</span>
          </div>
        </Link>

        {/* 詳細ポップアップ（モーダル） */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all" onClick={() => setSelectedLog(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              
              {/* モーダルヘッダー */}
              <div className={`p-6 ${getScoreColor(selectedLog.score)} text-center relative`}>
                <h2 className="text-2xl font-bold">
                  {format(new Date(selectedLog.date), 'M月d日 (E)', { locale: ja })}
                </h2>
                <div className="text-sm opacity-90 mt-1">体調スコア</div>
                <div className="text-5xl font-bold mt-2">{selectedLog.score}</div>
                <button onClick={() => setSelectedLog(null)} className="absolute top-4 right-4 text-white/70 hover:text-white">✕</button>
              </div>

              {/* 詳細データ */}
              <div className="p-6 space-y-6">
                
                {/* 睡眠 */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center text-gray-500">
                    <span className="mr-2">💤</span> 睡眠
                  </div>
                  <div className="font-bold text-gray-800 text-lg">
                    {getSleepTime(selectedLog.sleep_start, selectedLog.sleep_end)}
                  </div>
                </div>

                {/* 食事 */}
                <div>
                  <div className="flex items-center text-gray-500 mb-2">
                    <span className="mr-2">🍽️</span> 食事メモ
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                    {selectedLog.meals || '記録なし'}
                  </div>
                </div>

                {/* 削除ボタン */}
                <button 
                  onClick={() => handleDelete(selectedLog.id)}
                  disabled={loading}
                  className="w-full py-3 rounded-xl border border-red-200 text-red-500 font-bold hover:bg-red-50 transition text-sm"
                >
                  {loading ? '削除中...' : 'この記録を削除する'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}