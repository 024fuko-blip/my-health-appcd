'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation' // 【追加1】これが必要です！

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  
  const router = useRouter() // 【追加2】これが必要です！
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('エラー: ' + error.message)
      setLoading(false) // エラーの時はローディングを止める
    } else {
      // 【追加3】ここを変えました！
      // メッセージを出す代わりに、カレンダー画面へ飛ばします
      router.push('/calendar') 
    }
    // 成功した時は画面遷移するので setLoading(false) は不要（してもOK）
  }

  const handleSignUp = async () => {
    setLoading(true)
    setMessage('')
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage('エラー: ' + error.message)
    } else {
      setMessage('確認メールを送信しました。')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            体調管理ログ
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            毎日の記録で、自分の体を守ろう
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <input
                type="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="メールアドレス"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                placeholder="パスワード（6文字以上）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {message && (
            <div className="text-sm text-center text-teal-600 bg-teal-50 p-2 rounded">
              {message}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              {loading ? '処理中...' : 'ログイン'}
            </button>
            <button
              type="button"
              onClick={handleSignUp}
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-teal-600 text-sm font-medium rounded-md text-teal-600 bg-white hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50"
            >
              新規登録
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}