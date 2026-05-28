import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useMutation } from 'convex/react';
import { useNavigate } from 'react-router-dom';
import { api } from "../../../../convex/_generated/api";

type Step = 'welcome' | 'org' | 'branding' | 'departments' | 'done';
const STEPS: Step[] = ['welcome','org','branding','departments','done'];
const PRESET_DEPTS = ['HR','Finance','IT','Legal','Admissions','Operations','Marketing','Sales'];
const COLORS = ['#45ba50','#00b1d8','#ff8b25','#a78bfa','#f472b6','#f59e0b','#f85149','#3b82f6'];

export function SetupPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const createDept = useMutation(api.departments.create);
  const saveSettings = useMutation(api.orgSettings.save);
  const acceptInvite = useMutation(api.invites.accept);
  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState({ name: '', address: '', phone: '', website: '' });
  const [branding, setBranding] = useState({ primaryColor: '#45ba50', appName: 'Porta', logoUrl: '' });
  const [selDepts, setSelDepts] = useState<string[]>([]);
  const [customDept, setCustomDept] = useState('');

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) acceptInvite({ token }).catch(() => {});
  }, []);

  const stepIdx = STEPS.indexOf(step);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await saveSettings({
        features: { checkInEnabled: true, badgesEnabled: true, schedulingEnabled: true, messagingEnabled: true, analyticsEnabled: true, notificationsEnabled: true, attendanceEnabled: false, multiLocationEnabled: false },
        branding: { primaryColor: branding.primaryColor, appName: branding.appName, logoUrl: branding.logoUrl },
      });
      for (const name of selDepts) {
        const color = COLORS[PRESET_DEPTS.indexOf(name) % COLORS.length] ?? '#45ba50';
        await createDept({ name, color });
      }
      navigate('/dashboard');
    } finally { setSaving(false); }
  };

  const c = branding.primaryColor;
  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d0d7de', fontSize: 14, color: '#24292f', background: '#fff', boxSizing: 'border-box', outline: 'none' };
  const pri = (extra?: React.CSSProperties): React.CSSProperties => ({ padding: '11px 20px', borderRadius: 8, border: 'none', background: c, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', ...extra });
  const sec: React.CSSProperties = { padding: '11px 20px', borderRadius: 8, border: '1px solid #d0d7de', background: '#fff', color: '#24292f', fontWeight: 600, fontSize: 14, cursor: 'pointer' };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f8fa', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, justifyContent: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff' }}>P</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0d1117' }}>{branding.appName} Setup</div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (<div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= stepIdx ? c : '#d0d7de' }} />))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #d0d7de', borderRadius: 16, padding: 36, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {step === 'welcome' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>{'\u{1F44B}'}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0d1117' }}>Welcome, {user?.firstName ?? 'Admin'}!</div>
              <div style={{ fontSize: 15, color: '#57606a', lineHeight: 1.6 }}>Set up your workspace in 2 minutes. You can change everything later.</div>
              <button style={pri({ width: '100%', padding: 13 })} onClick={() => setStep('org')}>Get started</button>
            </div>
          )}
          {step === 'org' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0d1117' }}>Organisation details</div>
              {(['name','address','phone','website'] as const).map(key => (
                <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#24292f', textTransform: 'capitalize' }}>{key}{key==='name' && <span style={{ color: '#cf222e' }}> *</span>}</label>
                  <input style={inp} value={org[key]} onChange={e => setOrg(o => ({ ...o, [key]: e.target.value }))} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={sec} onClick={() => setStep('welcome')}>Back</button>
                <button style={pri({ flex: 1, opacity: org.name ? 1 : 0.5 })} disabled={!org.name} onClick={() => setStep('branding')}>Next</button>
              </div>
            </div>
          )}
          {step === 'branding' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0d1117' }}>Branding</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#24292f' }}>App name</label>
                <input style={inp} value={branding.appName} onChange={e => setBranding(b => ({ ...b, appName: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#24292f' }}>Primary colour</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type='color' value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} style={{ width: 44, height: 36, border: '1px solid #d0d7de', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                  <input style={{ ...inp, flex: 1, width: 'auto' }} value={branding.primaryColor} onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {['#45ba50','#3b82f6','#8b5cf6','#f59e0b','#ef4444','#0d1117'].map(col => (
                    <div key={col} onClick={() => setBranding(b => ({ ...b, primaryColor: col }))} style={{ width: 28, height: 28, borderRadius: '50%', background: col, cursor: 'pointer', border: branding.primaryColor === col ? '3px solid #24292f' : '2px solid transparent' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#24292f' }}>Logo URL <span style={{ fontWeight: 400, color: '#57606a' }}>(optional)</span></label>
                <input style={inp} placeholder='https://yourcompany.com/logo.png' value={branding.logoUrl} onChange={e => setBranding(b => ({ ...b, logoUrl: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={sec} onClick={() => setStep('org')}>Back</button>
                <button style={pri({ flex: 1 })} onClick={() => setStep('departments')}>Next</button>
              </div>
            </div>
          )}
          {step === 'departments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0d1117' }}>Departments</div>
              <div style={{ fontSize: 13, color: '#57606a' }}>Pick departments for your org. Add more later.</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {PRESET_DEPTS.map(d => (
                  <button key={d} onClick={() => setSelDepts(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])} style={{ padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontWeight: 600, fontSize: 13, border: selDepts.includes(d) ? ('2px solid ' + c) : '1px solid #d0d7de', background: selDepts.includes(d) ? 'rgba(69,186,80,0.06)' : '#fff', color: selDepts.includes(d) ? c : '#24292f' }}>{d}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inp, flex: 1 }} placeholder='Custom department' value={customDept} onChange={e => setCustomDept(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && customDept.trim()) { setSelDepts(s => [...s, customDept.trim()]); setCustomDept(''); }}} />
                <button style={sec} onClick={() => { if (customDept.trim()) { setSelDepts(s => [...s, customDept.trim()]); setCustomDept(''); }}}>Add</button>
              </div>
              {selDepts.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{selDepts.map(d => (<span key={d} style={{ background: '#f0fdf4', color: c, border: ('1px solid ' + c), borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>{d} <span onClick={() => setSelDepts(s => s.filter(x => x !== d))} style={{ cursor: 'pointer' }}>x</span></span>))}</div>}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={sec} onClick={() => setStep('branding')}>Back</button>
                <button style={pri({ flex: 1 })} onClick={() => setStep('done')}>Next</button>
              </div>
            </div>
          )}
          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 48 }}>{'\u{1F389}'}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0d1117' }}>You are all set!</div>
              <div style={{ fontSize: 14, color: '#57606a', lineHeight: 1.7 }}><strong>{org.name}</strong> is ready. Head to your dashboard to invite staff.</div>
              <button style={pri({ width: '100%', padding: 13, opacity: saving ? 0.7 : 1 })} disabled={saving} onClick={handleFinish}>{saving ? 'Setting up...' : 'Go to dashboard'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupPage;
