import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'

export function useAuth() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [loginError, setLoginError] = useState<string | null>(null)
    const [loggingIn, setLoggingIn] = useState(false)

    useEffect(() => {
        // Check existing session on mount (Supabase stores in localStorage automatically)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setLoading(false)
        })

        // Listen for auth state changes (login, logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        setLoggingIn(true)
        setLoginError(null)
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })
            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Email atau kata sandi salah')
                }
                throw new Error(error.message)
            }
        } catch (e) {
            setLoginError(e instanceof Error ? e.message : 'Gagal masuk')
            throw e
        } finally {
            setLoggingIn(false)
        }
    }, [])

    const logout = useCallback(async () => {
        await supabase.auth.signOut()
    }, [])

    return { session, loading, login, logout, loginError, loggingIn }
}
