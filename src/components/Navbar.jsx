import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Map, User, Lock, X, Eye, EyeOff } from 'lucide-react';

// SHA-256 hash of the admin password
// Current password: tastetrip2026
const ADMIN_PASSWORD_HASH = '7dafcac568f8759b926e7548b2dda6bb85c7b855d9eade27133430c1a3c0d020';

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const Navbar = () => {
    const { userRole, setUserRole } = useAppContext();
    const [showModal, setShowModal] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [shaking, setShaking] = useState(false);

    // If already authenticated this session, skip modal
    const isAdminAuthed = () => sessionStorage.getItem('tt_admin_auth') === '1';

    const handleAdminClick = () => {
        if (userRole === 'admin') {
            setUserRole('traveler');
            return;
        }
        // Already authenticated this session — go straight in
        if (isAdminAuthed()) {
            setUserRole('admin');
            return;
        }
        setShowModal(true);
        setPassword('');
        setError('');
    };

    const handleLogin = async () => {
        const hash = await sha256(password);
        if (hash === ADMIN_PASSWORD_HASH) {
            sessionStorage.setItem('tt_admin_auth', '1'); // remember for this session
            setUserRole('admin');
            setShowModal(false);
            setPassword('');
            setError('');
        } else {
            setError('Contraseña incorrecta');
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleLogin();
        if (e.key === 'Escape') setShowModal(false);
    };

    return (
        <>
            <nav className="glass-morphism navbar-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: 'var(--primary)',
                        width: '40px', height: '40px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
                    }}>
                        <Map size={24} />
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-1px' }}>
                        Taste<span style={{ color: 'var(--primary)' }}>Trip</span>
                    </h1>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <button
                        onClick={() => setUserRole('traveler')}
                        style={{
                            color: userRole === 'traveler' ? 'var(--primary)' : 'var(--text)',
                            fontWeight: '600', fontSize: '15px'
                        }}
                    >
                        Explorar
                    </button>
                    <button
                        onClick={handleAdminClick}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            color: userRole === 'admin' ? 'var(--primary)' : 'var(--text)',
                            fontWeight: '600', fontSize: '15px', border: 'none',
                            background: 'none', cursor: 'pointer', padding: 0
                        }}
                    >
                        <Lock size={14} />
                        {userRole === 'admin' ? 'Admin ✓' : 'Admin'}
                    </button>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)' }} />

                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        backgroundColor: 'var(--bg-offset)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1px solid var(--border)'
                    }}>
                        <User size={20} />
                    </div>
                </div>
            </nav>

            {/* Admin password modal */}
            {showModal && (
                <div
                    onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <div
                        style={{
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: '24px', padding: '40px',
                            width: '100%', maxWidth: '380px',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
                            animation: shaking ? 'shake 0.4s ease' : 'fadeInUp 0.25s ease'
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                            <div>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, var(--primary), #ff6b2b)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <Lock size={22} color="white" />
                                </div>
                                <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0 }}>Acceso Admin</h2>
                                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                                    Introduce la clave para continuar
                                </p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    padding: '8px', borderRadius: '10px', background: 'var(--bg-offset)',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Password input */}
                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                            <input
                                autoFocus
                                type={showPwd ? 'text' : 'password'}
                                placeholder="Contraseña"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                onKeyDown={handleKeyDown}
                                style={{
                                    width: '100%', padding: '14px 48px 14px 16px',
                                    borderRadius: '14px', fontSize: '15px',
                                    border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
                                    background: 'var(--bg-offset)', color: 'var(--text)',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                            />
                            <button
                                onClick={() => setShowPwd(v => !v)}
                                style={{
                                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: '4px'
                                }}
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {error && (
                            <p style={{ color: '#ef4444', fontSize: '13px', margin: '0 0 12px', fontWeight: '500' }}>
                                ⚠ {error}
                            </p>
                        )}

                        <button
                            onClick={handleLogin}
                            style={{
                                width: '100%', padding: '14px',
                                background: 'linear-gradient(135deg, var(--primary), #ff6b2b)',
                                color: 'white', fontWeight: '700', fontSize: '15px',
                                border: 'none', borderRadius: '14px', cursor: 'pointer',
                                transition: 'opacity 0.2s'
                            }}
                            onMouseEnter={e => e.target.style.opacity = '0.88'}
                            onMouseLeave={e => e.target.style.opacity = '1'}
                        >
                            Entrar
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes shake {
                    0%,100%{transform:translateX(0)}
                    20%{transform:translateX(-8px)}
                    40%{transform:translateX(8px)}
                    60%{transform:translateX(-6px)}
                    80%{transform:translateX(6px)}
                }
                @keyframes fadeInUp {
                    from{transform:translateY(20px);opacity:0}
                    to{transform:translateY(0);opacity:1}
                }
            `}</style>
        </>
    );
};

export default Navbar;
