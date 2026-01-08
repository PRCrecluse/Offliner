import React, { useState, useEffect, useRef } from 'react';
import { FeyButton } from './FeyButton';

interface LoginOverlayProps {
  open: boolean;
  onClose: () => void;
  onLoggedIn: (token: string, merchantName: string) => void;
  titleHint?: string;
}

const resolveApiBase = () => {
  try {
    const envBase = (import.meta as any)?.env?.VITE_API_BASE || '';
    const baseFromEnv = envBase === '/' ? '' : envBase.replace(/\/$/, '');
    const lsBase = (typeof localStorage !== 'undefined' ? (localStorage.getItem('API_BASE_URL') || '') : '');
    const port = (typeof window !== 'undefined' ? window.location.port : '');
    const host = (typeof window !== 'undefined' ? (window.location.hostname || 'localhost') : 'localhost');
    const isLocal = /localhost|127\.0\.0\.1/i.test(host);
    if (port === '3010') return '';
    if (baseFromEnv) return baseFromEnv;
    if (!isLocal) return '';
    if (lsBase) return lsBase.replace(/\/$/, '');
    return `http://${host}:3010`;
  } catch { return ''; }
};

const makeUrl = (path: string) => {
  const base = resolveApiBase();
  if (!base) return path;
  return `${base}${path}`;
};

const buildNetworkErrorMessage = (url: string, err: any) => {
  let origin = '';
  let port = '';
  try { origin = window.location.origin; port = window.location.port; } catch {}
  const base = resolveApiBase();
  let u: URL | null = null;
  try { u = new URL(url, origin || 'http://localhost'); } catch { u = null; }
  const isMixed = !!(u && typeof location !== 'undefined' && location.protocol === 'https:' && u.protocol === 'http:');
  const isCross = !!(u && origin && u.origin !== origin);
  const reasons: string[] = [];
  if (isMixed) reasons.push('https页面请求http接口被阻止');
  if (isCross) reasons.push('跨域请求，后端未开启CORS');
  if (port !== '3010' && !base) reasons.push('未使用开发端口3010且未设置接口基址');
  const errMsg = String(err?.message || err || '').trim();
  const detail = `当前地址 ${origin}；接口地址 ${url}；基址 ${base || '(相对路径)'}；端口 ${port || '(无)'} `;
  const reasonText = reasons.length ? `可能原因：${reasons.join(' / ')}；` : '';
  const errText = errMsg ? `错误：${errMsg}` : '';
  return `网络错误，请稍后再试；${detail}${reasonText}${errText}`;
};


export const LoginOverlay: React.FC<LoginOverlayProps> = ({ open, onClose, onLoggedIn, titleHint }) => {
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [authMethod, setAuthMethod] = useState<'sms' | 'password'>('sms');
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [chosenName, setChosenName] = useState('');

  const [wxScene, setWxScene] = useState<string | null>(null);
  const [wxQrUrl, setWxQrUrl] = useState<string | null>(null);
  const [wxExpireAt, setWxExpireAt] = useState<number | null>(null);
  const [wxStatus, setWxStatus] = useState<'idle' | 'pending' | 'subscribed' | 'expired'>('idle');
  const wxPollTimer = useRef<number | null>(null);
  const [wxShowFollowHint, setWxShowFollowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMainlandChina, setIsMainlandChina] = useState<boolean | null>(null);
  const [cnTopView, setCnTopView] = useState<'qr' | 'sms' | 'password'>('qr');

  const cleanupWxPolling = () => {
    if (wxPollTimer.current) {
      try { window.clearInterval(wxPollTimer.current); } catch {}
      wxPollTimer.current = null;
    }
  };

  const startWxPolling = (scene: string, expireAt?: number) => {
    cleanupWxPolling();
    setWxStatus('pending');
    wxPollTimer.current = window.setInterval(async () => {
      const ts = Date.now();
      const urlTs = `&_ts=${ts}`;
      if (expireAt && Date.now() > expireAt) {
        setWxStatus('expired');
        cleanupWxPolling();
        return;
      }
      const url = makeUrl(`/api/wechat/qr/status?scene=${encodeURIComponent(scene)}${urlTs}`);
      try {
        console.log('wx:status:poll:req', { url, scene, expireAt });
        const res = await fetch(url, { method: 'GET' });
        const raw = await res.text();
        let data: any; try { data = JSON.parse(raw); } catch { data = { raw }; }
        const payload = data && data.success ? data.data : data;
        console.log('wx:status:poll:res', { status: res.status, ok: res.ok, body: data, payload });
        if (res.ok && payload && payload.status) {
          setWxStatus(payload.status);
          if (payload.status === 'subscribed' && (payload.token || payload.openid)) {
            cleanupWxPolling();
            try { if (payload.openid) localStorage.setItem('auth_login_id', String(payload.openid)); } catch {}
            const displayName = payload.merchantName || '微信登录';
            const tokenToUse = payload.token || `openid:${payload.openid}`;
            onLoggedIn(tokenToUse, displayName);
            setWxShowFollowHint(false);
          }
          if (payload.status === 'expired') {
            cleanupWxPolling();
          }
        }
      } catch (e) {
        console.log('wx:status:poll:err', String((e as any)?.message || e));
      }
    }, 1000);
  };

  const initWechatLogin = async () => {
    setWxStatus('idle');
    setWxQrUrl(null);
    setWxScene(null);
    setWxExpireAt(null);
    setWxShowFollowHint(false);
    const url = makeUrl(`/api/wechat/qr/login`);
    try {
      console.log('wx:qr:login:req', { url });
      const res = await fetch(url, { method: 'POST' });
      const raw = await res.text();
      let data: any; try { data = JSON.parse(raw); } catch { data = { raw }; }
      const payload = data && data.success ? data.data : data;
      console.log('wx:qr:login:res', { status: res.status, ok: res.ok, body: data, payload });
      if (res.ok && payload && payload.scene) {
        setWxScene(String(payload.scene));
        setWxQrUrl(String(payload.qrImageUrl || ''));
        const exp = typeof payload.expireAt === 'number' ? payload.expireAt : (Date.now() + 120000);
        setWxExpireAt(exp);
        startWxPolling(String(payload.scene), exp);
      } else {
        setWxStatus('pending');
      }
    } catch (e) {
      console.log('wx:qr:login:err', String((e as any)?.message || e));
      setWxStatus('pending');
    }
  };

  useEffect(() => {
    if (open) {
      initWechatLogin();
    } else {
      cleanupWxPolling();
    }
    return () => cleanupWxPolling();
  }, [open]);

  useEffect(() => {
    try {
      const ua = (navigator?.userAgent || '').toLowerCase();
      const byUA = /mobile|android|iphone|ipod|ipad/.test(ua);
      const byWidth = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;
      setIsMobile(!!(byUA || byWidth));
    } catch { setIsMobile(false); }
  }, [open]);

  useEffect(() => {
    if (isMainlandChina === true && isMobile) {
      setCnTopView('qr');
      setStep('phone');
    }
  }, [isMainlandChina, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onVis = () => {
      try {
        if (document.visibilityState === 'visible') {
          if (wxStatus !== 'subscribed') setWxShowFollowHint(true);
        }
      } catch {}
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [open, wxStatus]);

  useEffect(() => {
    if (wxStatus === 'subscribed') setWxShowFollowHint(false);
  }, [wxStatus]);

  useEffect(() => {
    if (!open) return;
    try {
      const cachedCode = localStorage.getItem('geo_country_code') || '';
      const cachedTs = Number(localStorage.getItem('geo_country_ts') || 0);
      if (cachedCode && Date.now() - cachedTs < 3600000) {
        setIsMainlandChina(cachedCode.toUpperCase() === 'CN');
        return;
      }
    } catch {}
    const detect = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/', { method: 'GET' });
        const data = await res.json().catch(() => ({}));
        const code = String(data?.country_code || '').toUpperCase();
        try {
          localStorage.setItem('geo_country_code', code);
          localStorage.setItem('geo_country_ts', String(Date.now()));
        } catch {}
        setIsMainlandChina(code === 'CN');
      } catch {
        setIsMainlandChina(false);
      }
    };
    detect();
  }, [open]);

  const handleSendCode = async () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    setSending(true);
    setMessage('');
    const url = makeUrl(`/api/sms/send-code`);
    try {
      console.log('send-code:request', { url, origin: window.location.origin, port: window.location.port });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: trimmed, type: 'login' })
      });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { data = { raw }; }
      const headersObj = Object.fromEntries(res.headers.entries());
      console.log('send-code:response', { status: res.status, ok: res.ok, headers: headersObj, body: data });
      if (res.ok && data.success) {
        const canResendAfter = data.data?.canResendAfter;
        setMessage(
          typeof canResendAfter === 'number'
            ? `验证码已发送，${canResendAfter}s 后可重发`
            : '验证码已发送至手机号'
        );
        setStep('code');
        setCodeDigits(Array(6).fill(''));
      } else {
        const msg = data.message || data.raw || '发送失败，请稍后重试';
        setMessage(msg);
      }
    } catch (e: any) {
      console.error('send-code:error', { error: String(e?.message || e), origin: window.location.origin, port: window.location.port, base: resolveApiBase() });
      setMessage(buildNetworkErrorMessage(url, e));
    } finally {
      setSending(false);
    }
  };

  const handleVerifyAndLogin = async (code: string) => {
    setVerifying(true);
    setMessage('');
    const url = makeUrl(`/api/auth/merchant/login-phone`);
    try {
      console.log('login-phone:request', { url, phone, code });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code })
      });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { data = { raw }; }
      console.log('login-phone:response', { status: res.status, ok: res.ok, body: data });
      if (res.ok && data.token) {
        console.log('login-phone:merchant', data.merchant);
        const name = data.merchant?.businessName || data.merchant?.username || '';
        const autoGen = !name || /^merchant_/.test(name);
        if (autoGen) {
          setPendingToken(data.token);
          setIsNewUser(true);
          setMessage('');
          setChosenName('');
        } else {
          onLoggedIn(data.token, name || '已登录');
        }
      } else {
        const msg = (data && (data.message || data.raw)) || '验证码校验失败，请重试';
        console.log('login-phone:failed', msg);
        if (msg && /未绑定|not.*bind|no.*account|404/i.test(msg)) {
          setIsNewUser(true);
          setPendingToken(null);
          setMessage('');
          setChosenName('');
        } else {
          setMessage(msg);
        }
      }
    } catch (err: any) {
      console.error('login-phone:error', { error: String(err?.message || err), origin: window.location.origin, base: resolveApiBase() });
      setMessage(buildNetworkErrorMessage(url, err));
    } finally {
      setVerifying(false);
    }
  };

  const handlePasswordLogin = async () => {
    const id = loginId.trim();
    const pwd = loginPassword;
    if (!id || !pwd) return;
    setSending(true);
    setMessage('');
    const url = makeUrl(`/api/auth/merchant/login`);
    try {
      console.log('password-login:request', { url, loginId: id, origin: window.location.origin });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId: id, password: pwd })
      });
      const raw = await res.text();
      let data: any; try { data = JSON.parse(raw); } catch { data = { raw }; }
      console.log('password-login:response', { status: res.status, ok: res.ok, body: data });
      if (res.ok && data.token) {
        console.log('password-login:merchant', data.merchant);
        const name = data.merchant?.businessName || data.merchant?.username || '';
        const autoGen = !name || /^merchant_/.test(name);
        if (autoGen) {
          setPendingToken(data.token);
          setIsNewUser(true);
          setMessage('');
          setChosenName('');
        } else {
          onLoggedIn(data.token, name || '已登录');
        }
      } else {
        const msg = data.message || '登录失败，请检查账号或密码';
        setMessage(msg);
      }
    } catch (e: any) {
      console.error('password-login:error', { error: String(e?.message || e), origin: window.location.origin, base: resolveApiBase() });
      setMessage(buildNetworkErrorMessage(url, e));
    } finally {
      setSending(false);
    }
  };

  const handleSetNameSubmit = async () => {
    const name = chosenName.trim();
    if (!name) return;
    setSending(true);
    setMessage('');
    try {
      if (pendingToken) {
        const url = makeUrl(`/api/merchants/profile`);
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pendingToken}`
          },
          body: JSON.stringify({ businessName: name })
        });
        const raw = await res.text();
        let data: any; try { data = JSON.parse(raw); } catch { data = { raw }; }
        if (res.ok) {
          onLoggedIn(pendingToken, name);
          setPendingToken(null);
          setIsNewUser(false);
        } else {
          const msg = data.message || '设置失败，请重试';
          setMessage(msg);
        }
      } else {
        const unameBase = name.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '') || `merchant_${(phone||'').slice(-6)}`;
        const uname = `${unameBase}_${Math.random().toString(16).slice(2,6)}`;
        const pwd = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const regUrl = makeUrl(`/api/auth/merchant/register`);
        const res = await fetch(regUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: uname, password: pwd, contactPhone: phone.trim(), businessName: name })
        });
        const raw = await res.text();
        let data: any; try { data = JSON.parse(raw); } catch { data = { raw }; }
        if (res.ok && data.token) {
          onLoggedIn(data.token, name);
          setIsNewUser(false);
        } else {
          const msg = data.message || '注册失败，请重试';
          setMessage(msg);
        }
      }
    } catch (e: any) {
      console.error('set-name:error', { error: String(e?.message || e), origin: window.location.origin, base: resolveApiBase() });
      const hint = buildNetworkErrorMessage('注册或设置接口', e);
      setMessage(hint);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-2xl rounded-2xl p-6 text-white bg-[radial-gradient(61.35%_50.07%_at_48.58%_50%,rgba(0,0,0,0.6)_0%,rgba(255,255,255,0.08)_100%)] backdrop-blur-xl [box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.08)]">
        <button aria-label="关闭" onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">×</button>
        <div className="text-center space-y-2 mb-4">
          <div className="mx-auto w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/20 drop-shadow-xl">
            <img src="/photos/图标3.png" alt="线下咖App Logo" className="w-full h-full object-cover" onError={(e)=>{(e.currentTarget.style.display='none')}} />
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md flex items-center justify-center">
              <span className="text-xs text-white/80">线下咖</span>
            </div>
          </div>
          <h1 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">{isNewUser ? '为你的圣诞树挑个好名字吧～' : (step==='code' ? '输入验证码' : (titleHint || '欢迎来到线下咖App的圣诞节活动'))}</h1>
          {(!isNewUser && step === 'phone') && (
            <div className="text-xs text-white/60">登录或注册后即可创建/查看自己的圣诞树</div>
          )}
        </div>
        {isMainlandChina === true ? (
          <div className="space-y-4">
            <div className="rounded-xl p-3 bg-white/5 border border-white/10">
              {isNewUser ? (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70">这个名字之后将成为你登录线下咖App的用户名</div>
                    <input value={chosenName} onChange={(e)=>setChosenName(e.target.value)} placeholder="请输入你的树的名字/用户名" className="w-full px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                  </div>
                  <button onClick={handleSetNameSubmit} disabled={sending || !chosenName} className="mt-4 w-full h-10 rounded-[10px] text-sm bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">{sending?'提交中...':'确定'}</button>
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              ) : step === 'code' ? (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70">请在下面输入验证码</div>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-2 justify-items-center">
                    {codeDigits.map((d, i) => (
                      <input
                        key={i}
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        disabled={verifying}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const parent = e.currentTarget.parentElement;
                          setCodeDigits((prev) => {
                            const next = [...prev];
                            next[i] = val;
                            const code = next.join('');
                            if (val && i < 5) {
                              const inputs = parent?.querySelectorAll('input') || [];
                              const el = inputs[i + 1] as HTMLInputElement;
                              el?.focus();
                            }
                            if (code.length === 6 && next.every(x => x.length === 1)) {
                              handleVerifyAndLogin(code);
                            }
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
                            const inputs = parent?.querySelectorAll('input') || [];
                            const prevEl = inputs[i - 1] as HTMLInputElement;
                            prevEl?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                          if (text.length) {
                            e.preventDefault();
                            const arr = text.padEnd(6, '').split('').slice(0, 6);
                            setCodeDigits(arr);
                            if (text.length === 6) handleVerifyAndLogin(text);
                          }
                        }}
                        className="w-10 h-14 rounded-[10px] bg-white/10 border border-white/15 text-center text-white focus:outline-none"
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-white/60">{verifying ? '正在验证...' : ''}</div>
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              ) : cnTopView === 'password' ? (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70 flex items-center justify-between">
                      <span>账号密码登录</span>
                      <button type="button" onClick={() => setCnTopView('sms')} className="flex items-center gap-1 text-xs text-white/80">
                        <span className="inline-block w-4 h-4 rounded-full bg-white/20"></span>
                        切换到手机号验证码登录
                      </button>
                    </div>
                    <input value={loginId} onChange={(e)=>setLoginId(e.target.value)} placeholder="请输入账号" className="w-full px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                    <input type="password" value={loginPassword} onChange={(e)=>setLoginPassword(e.target.value)} placeholder="请输入密码" className="w-full mt-2 px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                  </div>
                  <button onClick={handlePasswordLogin} disabled={sending || !loginId || !loginPassword} className="mt-3 w-full h-10 rounded-[10px] text-sm bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">{sending?'登录中...':'注册或登录'}</button>
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              ) : cnTopView === 'sms' ? (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70 flex items-center justify-between">
                      <span>手机号验证码登录</span>
                      <button type="button" onClick={() => setCnTopView('password')} className="flex items-center gap-1 text-xs text-white/80">
                        <span className="inline-block w-4 h-4 rounded-full bg-white/20"></span>
                        切换到账号密码登录
                      </button>
                    </div>
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                  </div>
                  <button onClick={handleSendCode} disabled={sending || !phone} className="mt-3 w-full h-10 rounded-[10px] text-sm bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">{sending?'发送中...':'注册或登录'}</button>
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              ) : (
                <>
                  <div className="text-sm text-white/80 mb-1">微信扫码登录</div>
                  <div className="text-sm text-white font-bold mb-1">长按扫码关注，一键注册登录</div>
                  {wxShowFollowHint && (
                    <div className="text-xs font-bold text-red-500 mb-2">关注后即可一键注册登录</div>
                  )}
                  <div className="flex items-center justify-center">
                    {wxQrUrl ? (
                      <img key={wxScene || 'wx-qr'} src={wxQrUrl} alt="登录二维码" className="w-52 h-52 object-contain rounded-md border border-white/10" />
                    ) : (
                      <div className="w-52 h-52 rounded-md border border-white/10 bg-white/5 flex items-center justify-center text-xs text-white/60">二维码加载中或接口不可用</div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-center">
                    <FeyButton size="icon" shape="circle" aria-label="刷新二维码" onClick={initWechatLogin}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4v6h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 20v-6h-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 9a7 7 0 0 0-12.94-1.94" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 15a7 7 0 0 0 12.94 1.94" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </FeyButton>
                  </div>
                </>
              )}
            </div>
            <div className="my-4 h-px bg-white/10"></div>
            {!isMobile && (
              isNewUser ? null : (step !== 'phone' || cnTopView !== 'qr') ? (
                <button type="button" onClick={() => setCnTopView('qr')} className="w-full h-10 rounded-[10px] text-sm border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10">微信扫码登录</button>
              ) : (
                <div className="space-y-2">
                  <button type="button" onClick={()=>setCnTopView('password')} className="w-full h-10 rounded-[10px] text-sm border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10">账号密码登录</button>
                  <button type="button" onClick={()=>setCnTopView('sms')} className="w-full h-10 rounded-[10px] text-sm border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white/10">手机号验证码登录</button>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="order-1 md:order-1 md:col-span-1 md:pr-6">
              <div className="rounded-xl p-3 bg-white/5 border border-white/10">
                <div className="text-sm text-white/80 mb-1">微信扫码登录</div>
                <div className="text-sm text-white font-bold mb-1">长按扫码关注，一键注册登录</div>
                {wxShowFollowHint && (
                  <div className="text-xs font-bold text-red-500 mb-2">关注后即可一键注册登录</div>
                )}
                <div className="flex items-center justify-center">
                  {wxQrUrl ? (
                    <img key={wxScene || 'wx-qr'} src={wxQrUrl} alt="登录二维码" className="w-52 h-52 object-contain rounded-md border border-white/10" />
                  ) : (
                    <div className="w-52 h-52 rounded-md border border-white/10 bg-white/5 flex items-center justify-center text-xs text-white/60">二维码加载中或接口不可用</div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <FeyButton size="icon" shape="circle" aria-label="刷新二维码" onClick={initWechatLogin}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 4v6h6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 20v-6h-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20 9a7 7 0 0 0-12.94-1.94" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4 15a7 7 0 0 0 12.94 1.94" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </FeyButton>
                </div>
              </div>
            </div>
            <div className="order-2 md:order-2 md:col-span-1 md:border-l md:border-white/10 md:pl-6">
              {isNewUser ? (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70">这个名字之后将成为你登录线下咖App的用户名</div>
                    <input value={chosenName} onChange={(e)=>setChosenName(e.target.value)} placeholder="请输入你的树的名字/用户名" className="w-full px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                  </div>
                  <button onClick={handleSetNameSubmit} disabled={sending || !chosenName} className="mt-4 w-full h-10 rounded-[10px] text-sm bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">{sending?'提交中...':'确定'}</button>
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              ) : step === 'phone' && (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70 flex items-center justify-between">
                      <span>{authMethod==='sms'?'手机号':'账号密码登录'}</span>
                      <button type="button" onClick={()=>{setAuthMethod(authMethod==='sms'?'password':'sms')}} className="flex items-center gap-1 text-xs text-white/80">
                        <span className="inline-block w-4 h-4 rounded-full bg-white/20"></span>
                        {authMethod==='sms'?'使用密码登录':'使用短信登录'}
                      </button>
                    </div>
                    {authMethod==='sms' ? (
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入手机号" className="w-full px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                    ) : (
                      <>
                        <input value={loginId} onChange={(e)=>setLoginId(e.target.value)} placeholder="请输入账号" className="w-full px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                        <input type="password" value={loginPassword} onChange={(e)=>setLoginPassword(e.target.value)} placeholder="请输入密码" className="w-full mt-2 px-3 py-3 rounded-[10px] bg-white/10 border border-white/10 text-white placeholder:text-white/40 focus:outline-none" />
                      </>
                    )}
                  </div>
                  {authMethod==='sms' ? (
                    <button onClick={handleSendCode} disabled={sending || !phone} className="mt-4 w-full h-10 rounded-[10px] text-sm bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">{sending?'发送中...':'注册或登录'}</button>
                  ) : (
                    <button onClick={handlePasswordLogin} disabled={sending || !loginId || !loginPassword} className="mt-4 w-full h-10 rounded-[10px] text-sm bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">{sending?'登录中...':'注册或登录'}</button>
                  )}
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              )}
              {step === 'code' && (
                <>
                  <div className="space-y-2">
                    <div className="text-sm text-white/70">请在下面输入验证码</div>
                  </div>
                  <div className="mt-2 grid grid-cols-6 gap-2 justify-items-center">
                    {codeDigits.map((d, i) => (
                      <input
                        key={i}
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        disabled={verifying}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const parent = e.currentTarget.parentElement;
                          setCodeDigits((prev) => {
                            const next = [...prev];
                            next[i] = val;
                            const code = next.join('');
                            if (val && i < 5) {
                              const inputs = parent?.querySelectorAll('input') || [];
                              const el = inputs[i + 1] as HTMLInputElement;
                              el?.focus();
                            }
                            if (code.length === 6 && next.every(x => x.length === 1)) {
                              handleVerifyAndLogin(code);
                            }
                            return next;
                          });
                        }}
                        onKeyDown={(e) => {
                          const parent = e.currentTarget.parentElement;
                          if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
                            const inputs = parent?.querySelectorAll('input') || [];
                            const prevEl = inputs[i - 1] as HTMLInputElement;
                            prevEl?.focus();
                          }
                        }}
                        onPaste={(e) => {
                          const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                          if (text.length) {
                            e.preventDefault();
                            const arr = text.padEnd(6, '').split('').slice(0, 6);
                            setCodeDigits(arr);
                            if (text.length === 6) handleVerifyAndLogin(text);
                          }
                        }}
                        className="w-10 h-14 rounded-[10px] bg-white/10 border border-white/15 text-center text-white focus:outline-none"
                      />
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-white/60">{verifying ? '正在验证...' : ''}</div>
                  {message && <div className="mt-2 text-center text-xs text-white/70">{message}</div>}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
