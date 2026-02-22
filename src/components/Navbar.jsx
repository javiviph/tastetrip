import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Map, User, Settings, LogOut, Search } from 'lucide-react';

const Navbar = () => {
    const { userRole, setUserRole } = useAppContext();

    return (
        <nav className="glass-morphism navbar-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    background: 'var(--primary)',
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
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
                        fontWeight: '600',
                        fontSize: '15px'
                    }}
                >
                    Explorar
                </button>
                <button
                    onClick={() => setUserRole('admin')}
                    style={{
                        color: userRole === 'admin' ? 'var(--primary)' : 'var(--text)',
                        fontWeight: '600',
                        fontSize: '15px'
                    }}
                >
                    Admin
                </button>

                <div style={{
                    width: '1px',
                    height: '24px',
                    backgroundColor: 'var(--border)'
                }} />

                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-offset)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border)'
                }}>
                    <User size={20} />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
