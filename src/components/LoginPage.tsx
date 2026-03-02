import { useState } from 'react'
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<void>
    loginError: string | null
    loggingIn: boolean
}

export function LoginPage({ onLogin, loginError, loggingIn }: LoginPageProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !password) return
        try {
            await onLogin(email.trim(), password)
        } catch {
            // error shown via loginError prop
        }
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-[#F37021] via-[#ff9a4d] to-[#F37021]" />

            {/* Navbar */}
            <nav className="basarnas-navbar py-4 shadow-lg">
                <div className="max-w-7xl mx-auto px-6 flex items-center gap-3">
                    <img
                        src="/logo-basarnas.png"
                        alt="Logo SAR Nasional"
                        className="w-11 h-11 rounded-full object-cover shadow-md ring-2 ring-white/20"
                    />
                    <div>
                        <div className="text-white font-extrabold text-lg leading-none tracking-wide">BASARNAS</div>
                        <div className="text-orange-200 text-[10px] font-medium leading-none mt-0.5 tracking-wider">
                            BADAN NASIONAL PENCARIAN DAN PERTOLONGAN
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main */}
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#1B3A6B]/5 via-background to-[#F37021]/5 p-4">
                <div className="w-full max-w-md">

                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-border">
                        {/* Card header */}
                        <div className="basarnas-navbar px-8 py-8 text-center">
                            <img
                                src="/logo-basarnas.png"
                                alt="Logo SAR Nasional"
                                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#F37021] shadow-lg mx-auto mb-4"
                            />
                            <h1 className="text-white font-bold text-2xl">Portal Administrasi</h1>
                            <p className="text-blue-200 text-sm mt-1">Sistem Arsip Operasi SAR</p>
                        </div>

                        {/* Form */}
                        <div className="px-8 py-8">
                            <div className="mb-6 text-center">
                                <h2 className="text-[#1B3A6B] font-bold text-lg">Masuk ke Sistem</h2>
                                <p className="text-muted-foreground text-sm mt-0.5">
                                    Gunakan akun administrator yang telah ditetapkan
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Email */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[#1B3A6B] font-semibold text-sm">
                                        Alamat Email
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="admin@basarnas.go.id"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 focus-visible:ring-[#F37021] border-border"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="password" className="text-[#1B3A6B] font-semibold text-sm">
                                        Kata Sandi
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Masukkan kata sandi"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 pr-10 focus-visible:ring-[#F37021] border-border"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#1B3A6B] transition-colors"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Error */}
                                {loginError && (
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {loginError}
                                    </div>
                                )}

                                {/* Submit */}
                                <Button
                                    type="submit"
                                    disabled={loggingIn || !email.trim() || !password}
                                    className="w-full h-11 bg-[#F37021] hover:bg-[#d4611a] text-white font-semibold text-base shadow-md"
                                >
                                    {loggingIn ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                            </svg>
                                            Memverifikasi...
                                        </span>
                                    ) : (
                                        'Masuk'
                                    )}
                                </Button>
                            </form>

                            {/* Info */}
                            <div className="mt-6 pt-5 border-t border-border">
                                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                                    Portal ini hanya dapat diakses oleh administrator yang berwenang.<br />
                                    Hubungi administrator sistem jika mengalami kesulitan masuk.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer label */}
                    <p className="text-center text-xs text-muted-foreground mt-6">
                        © {new Date().getFullYear()} Badan Nasional Pencarian dan Pertolongan
                    </p>
                </div>
            </div>
        </div>
    )
}
