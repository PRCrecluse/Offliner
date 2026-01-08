import React, { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode';
import { TreeMode } from '../types';
import { FeyButton } from './FeyButton';

interface UIOverlayProps {
  mode: TreeMode;
  onToggle: () => void;
  onLoginClick?: () => void;
  loggedInName?: string;
  onLogout?: () => void;
  onMagicToggle?: () => void;
  magicEnabled?: boolean;
  previewingOther?: boolean;
  previewOwnerName?: string;
  previewTreeId?: number;
  onSendBlessing?: () => void;
  onCreateMyTree?: () => void;
  supabaseUrl?: string;
  supabaseKey?: string;
  registerShareHandler?: (fn: () => void) => void;
  giftCount?: number;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ mode, onToggle, onLoginClick, loggedInName, onLogout, onMagicToggle, magicEnabled, previewingOther, previewOwnerName, previewTreeId, onSendBlessing, onCreateMyTree, supabaseUrl, supabaseKey, registerShareHandler, giftCount }) => {
  const isFormed = mode === TreeMode.FORMED;
  const [shareMsg, setShareMsg] = useState<string>('');
  const [shareOpen, setShareOpen] = useState<boolean>(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [shareLoading, setShareLoading] = useState<boolean>(false);
  const [shareImageUrl, setShareImageUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [shareType, setShareType] = useState<'video'|'photo'>('video');
  const [shareTopic, setShareTopic] = useState<'share'|'gift'>('share');
  const [savedTipOpen, setSavedTipOpen] = useState<boolean>(false);
  const [savedChannel, setSavedChannel] = useState<'moments'|'wechat'|'xiaohongshu'|'link'|null>(null);
  const [ffmpegLoading, setFfmpegLoading] = useState<boolean>(false);
  const ffmpegRef = React.useRef<any>(null);
  const ffmpegFetchRef = React.useRef<any>(null);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  const [savingActive, setSavingActive] = useState<boolean>(false);
  const [savingStage, setSavingStage] = useState<'record' | 'encode' | 'done' | null>(null);
  const [savingProgress, setSavingProgress] = useState<number>(0);
  const updateProgress = (pct: number) => setSavingProgress((prev)=> Math.max(prev, Math.min(100, Math.round(pct))));
  const [headerTreeName, setHeaderTreeName] = useState<string | undefined>(undefined);
  const [renameOpen, setRenameOpen] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>('');
  const [renameSaving, setRenameSaving] = useState<boolean>(false);
  const [currentTreeId, setCurrentTreeId] = useState<number | undefined>(undefined);
  const [userInteracted, setUserInteracted] = useState<boolean>(false);
  const [wechatBlockOpen, setWechatBlockOpen] = useState<boolean>(false);
  const [giftCountLocal, setGiftCountLocal] = useState<number>(0);
  const isAndroidRestricted = () => {
    try {
      const ua = navigator.userAgent || '';
      return /Android/i.test(ua) && /(MicroMessenger|MQQBrowser|QQ|Weibo|AlipayClient|DingTalk)/i.test(ua);
    } catch { return false; }
  };
  const resolveOwnerLoginId = (): string | undefined => {
    try {
      const ls = localStorage.getItem('auth_login_id') || '';
      if (ls) return ls;
      const t = localStorage.getItem('auth_token') || '';
      if (t) {
        try {
          const seg = t.split('.')[1];
          const json = JSON.parse(atob(seg.replace(/-/g, '+').replace(/_/g, '/')));
          return json.openid || json.merchantId || json.username || undefined;
        } catch {}
      }
    } catch {}
    return undefined;
  };
  const parseFfmpegTimeToSeconds = (msg: string): number | null => {
    try {
      const m = msg.match(/time=(\d{2}):(\d{2}):(\d{2})[\.:](\d{2,})/);
      if (!m) return null;
      const hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ss = parseInt(m[3], 10);
      const ff = parseInt(m[4].slice(0,2), 10);
      return hh*3600 + mm*60 + ss + ff/100;
    } catch { return null; }
  };
  const frameImgUrl = shareTopic === 'gift' ? '/photos/送你圣诞树.png' : '/photos/快来看看我的圣诞树吧.png';
  const detectInnerRect = async (img: HTMLImageElement) => {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const cx = c.getContext('2d');
    if (!cx) return null;
    cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0,0,w,h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    const threshold = 8;
    for (let y=0; y<h; y++) {
      const off = y*w*4;
      for (let x=0; x<w; x++) {
        const a = data[off + x*4 + 3];
        if (a <= threshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX <= minX || maxY <= minY) return null;
    const iw = maxX - minX + 1;
    const ih = maxY - minY + 1;
    if (iw < w*0.3 || ih < h*0.3) return null;
    return { x: minX, y: minY, w: iw, h: ih };
  };
  const recapture = () => {
    try {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) {
        const img = canvas.toDataURL('image/png');
        setShareImageUrl(img);
      }
    } catch {}
  };

  const composePreview = async () => {
    try {
      const frameImg = new Image();
      frameImg.src = frameImgUrl;
      await new Promise<void>((res)=>{ frameImg.onload=()=>res(); frameImg.onerror=()=>res(); });
      const treeCanvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
      const containerW = frameImg.naturalWidth || 768;
      const containerH = frameImg.naturalHeight || 1080;
      const autoRect = await detectInnerRect(frameImg);
      const innerW = Math.round((autoRect?.w ?? containerW * 0.84));
      const innerH = Math.round((autoRect?.h ?? containerH * 0.60));
      const innerX = Math.round((autoRect?.x ?? containerW * 0.08));
      const innerY = Math.round((autoRect?.y ?? containerH * 0.18));
      const canvas = document.createElement('canvas');
      canvas.width = containerW;
      canvas.height = containerH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0,0,containerW,containerH);
      if (treeCanvasEl) {
        try {
          const scale = Math.max(innerW / treeCanvasEl.width, innerH / treeCanvasEl.height);
          const dw = Math.round(treeCanvasEl.width * scale);
          const dh = Math.round(treeCanvasEl.height * scale);
          const dx = innerX + Math.round((innerW - dw) / 2);
          const dy = innerY + Math.round((innerH - dh) / 2);
          ctx.save();
          ctx.beginPath();
          ctx.rect(innerX, innerY, innerW, innerH);
          ctx.clip();
          ctx.drawImage(treeCanvasEl, dx, dy, dw, dh);
          ctx.restore();
        } catch {}
      }
      if (!treeCanvasEl || !shareImageUrl) {
        try {
          const domCanvas = await html2canvas(document.body, { useCORS: true, scale: 1 });
          const scale2 = Math.max(innerW / domCanvas.width, innerH / domCanvas.height);
          const dw2 = Math.round(domCanvas.width * scale2);
          const dh2 = Math.round(domCanvas.height * scale2);
          const dx2 = innerX + Math.round((innerW - dw2) / 2);
          const dy2 = innerY + Math.round((innerH - dh2) / 2);
          ctx.save();
          ctx.beginPath();
          ctx.rect(innerX, innerY, innerW, innerH);
          ctx.clip();
          ctx.drawImage(domCanvas, dx2, dy2, dw2, dh2);
          ctx.restore();
        } catch {}
      }
      ctx.drawImage(frameImg, 0, 0, containerW, containerH);
      if (qrDataUrl) {
        try {
          const qrImg = new Image(); qrImg.src = qrDataUrl;
          await new Promise<void>((res)=>{ qrImg.onload=()=>res(); qrImg.onerror=()=>res(); });
          const qrW = Math.round(containerW * 0.12);
          const qrH = qrW;
          const padX = Math.round(containerW * 0.04);
          const padY = Math.round(containerH * 0.04);
          const qx = containerW - qrW - padX;
          const qy = containerH - qrH - padY;
          ctx.drawImage(qrImg, qx, qy, qrW, qrH);
        } catch {}
      }
      const url = canvas.toDataURL('image/png');
      setPreviewUrl(url);
      try { console.log('preview:compose:done', { w: containerW, h: containerH }); } catch {}
    } catch (e) {
      console.error('preview:compose:error', e);
    }
  };

  const savePhoto = async () => {
    try {
      setShareMsg('生成图片中...');
      const frameImg = new Image();
      frameImg.src = frameImgUrl;
      await new Promise<void>((res)=>{ frameImg.onload=()=>res(); frameImg.onerror=()=>res(); });
      const treeCanvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
      const containerW = frameImg.naturalWidth || 768;
      const containerH = frameImg.naturalHeight || 1080;
      const autoRect = await detectInnerRect(frameImg);
      const innerW = Math.round((autoRect?.w ?? containerW * 0.84));
      const innerH = Math.round((autoRect?.h ?? containerH * 0.60));
      const innerX = Math.round((autoRect?.x ?? containerW * 0.08));
      const innerY = Math.round((autoRect?.y ?? containerH * 0.18));
      const canvas = document.createElement('canvas');
      canvas.width = containerW;
      canvas.height = containerH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setShareMsg('保存失败'); return; }
      ctx.clearRect(0,0,containerW,containerH);
      if (treeCanvasEl) {
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high' as any;
          const scale = Math.max(innerW / treeCanvasEl.width, innerH / treeCanvasEl.height);
          const dw = Math.round(treeCanvasEl.width * scale);
          const dh = Math.round(treeCanvasEl.height * scale);
          const dx = innerX + Math.round((innerW - dw) / 2);
          const dy = innerY + Math.round((innerH - dh) / 2);
          ctx.save();
          ctx.beginPath();
          ctx.rect(innerX, innerY, innerW, innerH);
          ctx.clip();
          ctx.drawImage(treeCanvasEl, dx, dy, dw, dh);
          ctx.restore();
        } catch {}
      }
      ctx.drawImage(frameImg, 0, 0, containerW, containerH);
      if (qrDataUrl) {
        try {
          const qrImg = new Image(); qrImg.src = qrDataUrl;
          await new Promise<void>((res)=>{ qrImg.onload=()=>res(); qrImg.onerror=()=>res(); });
          const qrW = Math.round(containerW * 0.12);
          const qrH = qrW;
          const padX = Math.round(containerW * 0.04);
          const padY = Math.round(containerH * 0.04);
          const qx = containerW - qrW - padX;
          const qy = containerH - qrH - padY;
          ctx.drawImage(qrImg, qx, qy, qrW, qrH);
        } catch {}
      }
      console.log('save-photo:compose', { containerW, containerH, innerX, innerY, innerW, innerH });
      const blob: Blob | null = await new Promise((resolve)=> canvas.toBlob((b)=> resolve(b), 'image/png', 0.92));
      const fname = shareTopic === 'gift' ? '我的圣诞树-礼物.png' : '我的圣诞树-分享.png';
      if (blob) {
        try {
          const nav: any = navigator as any;
          if (typeof File !== 'undefined') {
            const file = new File([blob], fname, { type: 'image/png' });
            if (nav?.canShare?.({ files: [file] }) && nav?.share) {
              try { await nav.share({ files: [file], title: fname }); setShareMsg('已保存'); return; } catch {}
            }
          }
        } catch {}
        if (isAndroidRestricted()) {
          try {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.rel = 'noopener';
            a.click();
            setShareMsg('已打开图片，长按保存');
            return;
          } catch {}
        }
        saveAs(blob, fname);
        setShareMsg('已保存');
      } else { setShareMsg('保存失败'); }
    } catch (e) {
      console.error('save-photo:error', e);
      setShareMsg('保存失败');
    }
  };

  const startRecording = async () => {
    try {
      console.log('record:start');
      const frameImg = new Image();
      frameImg.src = frameImgUrl;
      await new Promise<void>((res)=>{ frameImg.onload=()=>res(); frameImg.onerror=()=>res(); });
      const treeCanvasEl = document.querySelector('canvas') as HTMLCanvasElement | null;
      const containerW = frameImg.naturalWidth || 768;
      const containerH = frameImg.naturalHeight || 1080;
      const autoRect = await detectInnerRect(frameImg);
      const innerW = Math.round((autoRect?.w ?? containerW * 0.84));
      const innerH = Math.round((autoRect?.h ?? containerH * 0.60));
      const innerX = Math.round((autoRect?.x ?? containerW * 0.08));
      const innerY = Math.round((autoRect?.y ?? containerH * 0.18));
      const canvas = document.createElement('canvas');
      canvas.width = containerW;
      canvas.height = containerH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const stream = canvas.captureStream ? canvas.captureStream(30) : null;
      if (!stream) return;
      let opts: MediaRecorderOptions = {};
      try {
        const tryTypes = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
        for (const t of tryTypes) { if ((window as any).MediaRecorder && (MediaRecorder as any).isTypeSupported?.(t)) { opts.mimeType = t; break; } }
      } catch {}
      const recorder = new MediaRecorder(stream as MediaStream, opts);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e)=>{ if (e.data && e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = ()=>{ try { const type = (opts.mimeType as string) || 'video/webm'; const blob = new Blob(chunks, { type }); setVideoBlob(blob); const url = URL.createObjectURL(blob); setVideoUrl(url); console.log('record:stop', { size: blob.size, type }); updateProgress(40); } catch (e) { console.error('record:onstop:error', e); } };
      recorder.start();
      const start = Date.now();
      setSavingStage('record');
      updateProgress(0);
      const qrImg = qrDataUrl ? (()=>{ const i = new Image(); i.src = qrDataUrl; return i; })() : null;
      const drawFrame = async () => {
        ctx.clearRect(0,0,containerW,containerH);
        if (treeCanvasEl) {
          try {
            const scale = Math.max(innerW / treeCanvasEl.width, innerH / treeCanvasEl.height);
            const dw = Math.round(treeCanvasEl.width * scale);
            const dh = Math.round(treeCanvasEl.height * scale);
            const dx = innerX + Math.round((innerW - dw) / 2);
            const dy = innerY + Math.round((innerH - dh) / 2);
            ctx.save();
            ctx.beginPath();
            ctx.rect(innerX, innerY, innerW, innerH);
            ctx.clip();
            ctx.drawImage(treeCanvasEl, dx, dy, dw, dh);
            ctx.restore();
          } catch {}
        }
        ctx.drawImage(frameImg, 0, 0, containerW, containerH);
        if (qrImg && qrImg.naturalWidth > 0) {
          try {
            const qrW = Math.round(containerW * 0.12);
            const qrH = qrW;
            const padX = Math.round(containerW * 0.04);
            const padY = Math.round(containerH * 0.04);
            const qx = containerW - qrW - padX;
            const qy = containerH - qrH - padY;
            ctx.drawImage(qrImg, qx, qy, qrW, qrH);
          } catch {}
        }
      };
      const loop = async () => {
        const dur = Date.now() - start;
        if (dur >= 5000) { recorder.stop(); return; }
        await drawFrame();
        updateProgress(Math.min(40, (dur / 5000) * 40));
        await new Promise(r=>setTimeout(r, 1000/30));
        loop();
      };
      loop();
    } catch {}
  };

  const ensureFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    setFfmpegLoading(true);
    console.log('ffmpeg:load:start');
    const mod: any = await import('@ffmpeg/ffmpeg');
    const FFmpegClass = mod.FFmpeg;
    const tryLoad = async (coreURL?: string) => {
      const inst = new FFmpegClass();
      await Promise.race([
        inst.load(coreURL ? { coreURL } : undefined),
        new Promise((_, rej)=>setTimeout(()=>rej(new Error('ffmpeg:load:timeout')), 30000)),
      ]);
      return inst;
    };
    let ffmpeg: any;
    try {
      // 优先使用本地 ESM 核心文件，避免跨域与网络慢导致的加载失败
      ffmpeg = await tryLoad('/ffmpeg/esm/ffmpeg-core.js');
    } catch (e1) {
      console.error('ffmpeg:load:error', e1);
      try {
        ffmpeg = await tryLoad('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.9/dist/umd/ffmpeg-core.js');
      } catch (e2) {
        console.error('ffmpeg:load:fallback:error', e2);
        try {
          ffmpeg = await tryLoad('https://unpkg.com/@ffmpeg/core@0.12.9/dist/esm/ffmpeg-core.js');
        } catch (e3) {
          console.error('ffmpeg:load:fallback2:error', e3);
          setFfmpegLoading(false);
          throw e3;
        }
      }
    }
    ffmpegRef.current = ffmpeg;
    ffmpegFetchRef.current = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());
    setFfmpegLoading(false);
    console.log('ffmpeg:load:done');
    return ffmpeg;
  };

  const performSave = async () => {
    try {
      if (!videoBlob) { setShareMsg('视频生成中...'); return; }
      setShareMsg('导出MP4中...');
      const ffmpeg = await ensureFFmpeg();
      try { ffmpeg.on('log', (l:any)=>{ try { const msg = String(l?.message||''); const sec = parseFfmpegTimeToSeconds(msg); if (sec!=null) { const pct = 40 + Math.min(60, (sec/5)*60); updateProgress(pct); } console.log('ffmpeg:log', l); } catch {} }); } catch {}
      try { ffmpeg.on('progress', (p:any)=>{ const pct = 40 + Math.min(60, Math.round(((p?.progress)||0)*60)); setSavingStage('encode'); updateProgress(pct); }); } catch {}
      const input = await ffmpegFetchRef.current(videoBlob);
      await ffmpeg.writeFile('input.webm', input);
      let ret = await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-profile:v', 'main', '-movflags', 'faststart', 'output.mp4']);
      if (ret !== 0) {
        console.warn('ffmpeg:exec:libx264:failed, try mpeg4');
        ret = await ffmpeg.exec(['-i', 'input.webm', '-c:v', 'mpeg4', '-b:v', '2M', '-pix_fmt', 'yuv420p', 'output.mp4']);
      }
      const data = await ffmpeg.readFile('output.mp4');
      const mp4Blob = new Blob([data], { type: 'video/mp4' });
      if ((mp4Blob as any).size === 0) {
        throw new Error('mp4生成失败，文件大小为0');
      }
      saveAs(mp4Blob, '我的圣诞树-5s.mp4');
      setShareMsg('已保存');
      setSavingStage('done');
      updateProgress(100);
      setSavingActive(false);
    } catch (e) {
      console.error('save-video:error', e);
      try { if (videoBlob) { saveAs(videoBlob, '我的圣诞树-5s.webm'); setShareMsg('浏览器不支持MP4，已保存WebM'); } } catch (ee) { console.error('save-video:fallback-error', ee); }
      setSavingActive(false);
    }
  };

  const handleShareTree = async () => {
    if (!userInteracted) { return; }
    setShareMsg('');
    setShareLoading(true);
    try {
      const u = supabaseUrl;
      const k = supabaseKey;
      let shareUrl = `${window.location.origin}${window.location.pathname}`;
      try {
        if (u && k) {
          const headers = { 'Content-Type': 'application/json', 'apikey': k, 'Authorization': `Bearer ${k}` } as Record<string,string>;
          const ownerLoginId = resolveOwnerLoginId() || loggedInName || '';
          const selUrl = `${u}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId)}&select=*`;
          console.log('share:select:req', { selUrl, ownerLoginId });
          const sel = await fetch(selUrl, { headers });
          const selBody = await sel.text();
          let selData: any; try { selData = JSON.parse(selBody); } catch { selData = { body: selBody }; }
          console.log('share:select:res', { status: sel.status, ok: sel.ok, body: selData });
          let tree = Array.isArray(selData) ? selData[0] : undefined;
          if (!tree) {
            const slug = `tree_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;
            const payload = { owner_login: ownerLoginId || '匿名用户', owner_name: loggedInName || '匿名用户', created_at: new Date().toISOString(), slug, state: {} };
            const crtUrl = `${u}/rest/v1/trees`;
            console.log('share:create:req', { crtUrl, payload });
            const crt = await fetch(crtUrl, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload) });
            const crtBody = await crt.text();
            let crtData: any; try { crtData = JSON.parse(crtBody); } catch { crtData = { body: crtBody }; }
            console.log('share:create:res', { status: crt.status, ok: crt.ok, body: crtData });
            tree = Array.isArray(crtData) ? crtData[0] : crtData;
          }
          if (tree?.slug) {
            const base = `${window.location.origin}${window.location.pathname}`;
            shareUrl = `${base}?tree=${encodeURIComponent(tree.slug)}`;
            console.log('share:url:set', { shareUrl, slug: tree.slug });
          }
        } else {
          console.error('share-tree:config-missing', { supaUrl: u, hasKey: !!k });
        }
      } catch (e) {
        console.error('share-tree:error', e);
      }
      setShareLink(shareUrl);
      setShareOpen(true);
      setShareType('photo');
      setShareTopic('share');
      setVideoUrl('');
      setVideoBlob(null);
      try { console.log('share-open:true', { shareUrl }); } catch {}
      try {
        const qr = await QRCode.toDataURL(shareUrl, { width: 160, margin: 0 });
        setQrDataUrl(qr);
        console.log('qr:generated');
      } catch (e) {
        console.error('qr:error', e);
      }
      

      try {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) {
          const img = canvas.toDataURL('image/png');
          console.log('share-snapshot:created', { w: canvas.width, h: canvas.height, len: img.length });
          setShareImageUrl(img);
        }
      } catch (e) {
        console.error('share-snapshot:error', e);
      }
    } catch (err) {
      console.error('share-tree:error', err);
    } finally {
      setShareLoading(false);
    }
  };

  const handleGiftTree = async () => {
    if (!userInteracted) { return; }
    setShareMsg('');
    setShareLoading(true);
    try {
      const u = supabaseUrl;
      const k = supabaseKey;
      let shareUrl = `${window.location.origin}${window.location.pathname}`;
      try {
        if (u && k) {
          const headers = { 'Content-Type': 'application/json', 'apikey': k, 'Authorization': `Bearer ${k}` } as Record<string,string>;
          const ownerLoginId = resolveOwnerLoginId() || loggedInName || '';
          const selUrl = `${u}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId)}&select=*`;
          console.log('gift:select:req', { selUrl, ownerLoginId });
          const sel = await fetch(selUrl, { headers });
          const selBody = await sel.text();
          let selData: any; try { selData = JSON.parse(selBody); } catch { selData = { body: selBody }; }
          console.log('gift:select:res', { status: sel.status, ok: sel.ok, body: selData });
          let tree = Array.isArray(selData) ? selData[0] : undefined;
          if (!tree) {
            const slug = `tree_${Date.now()}_${Math.random().toString(16).slice(2,8)}`;
            const payload = { owner_login: ownerLoginId || '匿名用户', owner_name: loggedInName || '匿名用户', created_at: new Date().toISOString(), slug, state: {} };
            const crtUrl = `${u}/rest/v1/trees`;
            console.log('gift:create:req', { crtUrl, payload });
            const crt = await fetch(crtUrl, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload) });
            const crtBody = await crt.text();
            let crtData: any; try { crtData = JSON.parse(crtBody); } catch { crtData = { body: crtBody }; }
            console.log('gift:create:res', { status: crt.status, ok: crt.ok, body: crtData });
            tree = Array.isArray(crtData) ? crtData[0] : crtData;
          }
          if (tree?.slug) {
            const base = `${window.location.origin}${window.location.pathname}`;
            shareUrl = `${base}?tree=${encodeURIComponent(tree.slug)}`;
            console.log('gift:url:set', { shareUrl, slug: tree.slug });
          }
        }
      } catch (e) { console.error('gift-tree:error', e); }
      setShareLink(shareUrl);
      setShareOpen(true);
      setShareType('photo');
      setShareTopic('gift');
      setVideoUrl('');
      setVideoBlob(null);
      try {
        const qr = await QRCode.toDataURL(shareUrl, { width: 160, margin: 0 });
        setQrDataUrl(qr);
      } catch (e) { console.error('qr:error', e); }
      try { recapture(); } catch {}
    } finally {
      setShareLoading(false);
    }
  };

  useEffect(() => {
    if (registerShareHandler) {
      try { registerShareHandler(handleShareTree); } catch {}
    }
  }, [registerShareHandler]);

  useEffect(() => {
    if (shareOpen) {
      setTimeout(() => { recapture(); }, 50);
      if (shareType === 'video') {
        (async ()=>{ try { await ensureFFmpeg(); } catch (e) { console.error('ffmpeg:preload:error', e); } })();
      }
    }
  }, [shareOpen, shareType]);

  useEffect(() => {
    const mark = () => setUserInteracted(true);
    window.addEventListener('pointerdown', mark, { passive: true });
    window.addEventListener('touchstart', mark, { passive: true });
    window.addEventListener('keydown', mark, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', mark as any);
      window.removeEventListener('touchstart', mark as any);
      window.removeEventListener('keydown', mark as any);
    };
  }, []);

  useEffect(() => {
    (async ()=>{
      try {
        if (previewingOther) {
          if (previewOwnerName) {
            setHeaderTreeName(`${previewOwnerName}的圣诞树`);
          }
          return;
        }
        const ownerLoginId = resolveOwnerLoginId();
        if (!ownerLoginId || !supabaseUrl || !supabaseKey) return;
        const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } as Record<string,string>;
        const url = `${supabaseUrl}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId)}&select=*`;
        console.log('header:name:fetch', { url });
        const res = await fetch(url, { headers });
        const raw = await res.text();
        let data: any; try { data = JSON.parse(raw); } catch { data = { body: raw }; }
        console.log('header:name:res', { status: res.status, ok: res.ok, body: data });
        const tree = Array.isArray(data) ? data[0] : undefined;
        if (tree) {
          setCurrentTreeId(tree.id);
          const name = (tree.tree_name) || (tree.owner_name ? `${tree.owner_name}的圣诞树` : `${loggedInName || ''}的圣诞树`);
          setHeaderTreeName(name);
          try {
            const gRes = await fetch(`${supabaseUrl}/rest/v1/gifts?tree_id=eq.${tree.id}&select=*`, { headers });
            const gData = await gRes.json();
            const cnt = Array.isArray(gData) ? gData.length : 0;
            setGiftCountLocal(cnt);
          } catch {}
        }
      } catch (e) { console.error('header:name:error', e); }
    })();
  }, [previewingOther, previewOwnerName, loggedInName, supabaseUrl, supabaseKey]);

  useEffect(() => {
    (async ()=>{
      try {
        if (!loggedInName) return;
        const flag = localStorage.getItem('require_rename_tree');
        if (flag === '1') {
          if (supabaseUrl && supabaseKey) {
            const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } as Record<string,string>;
            const ownerLoginId = resolveOwnerLoginId();
            const url = `${supabaseUrl}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId || '')}&select=*`;
            console.log('rename:auto:select', { url });
            const res = await fetch(url, { headers });
            const data = await res.json();
            const tree = Array.isArray(data) ? data[0] : undefined;
            setCurrentTreeId(tree?.id);
            const initialName = (tree?.tree_name) || (tree?.owner_name ? `${tree.owner_name}的圣诞树` : `${loggedInName}的圣诞树`);
            setRenameInput(initialName);
          } else {
            setRenameInput(`${loggedInName}的圣诞树`);
          }
          setRenameOpen(true);
        }
      } catch {}
    })();
  }, [loggedInName, supabaseUrl, supabaseKey]);

  useEffect(() => {
    if (shareOpen && shareType === 'photo') {
      (async ()=>{ try { await composePreview(); } catch (e) { console.error('preview:compose:init:error', e); } })();
    }
  }, [shareOpen, shareType, qrDataUrl, shareImageUrl]);

  useEffect(() => {
    if (videoBlob && pendingSave) {
      setPendingSave(false);
      performSave();
    }
  }, [videoBlob, pendingSave]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 z-10">
      
      {/* Header */}
      <header className="flex flex-col items-center">
        <h1 className="text-xl md:text-2xl font-semibold text-white tracking-wider text-center flex items-center gap-2">
          <span>{headerTreeName || (previewingOther ? (previewOwnerName ? `${previewOwnerName}的圣诞树` : '圣诞树') : (loggedInName ? `${loggedInName}的圣诞树` : '圣诞树'))}</span>
          {loggedInName && (
            <button
              type="button"
              onClick={async ()=>{
                try {
                  const ownerLoginId = resolveOwnerLoginId();
                  console.log('rename:open', { ownerLoginId, loggedInName, supabaseUrl });
                  if (!supabaseUrl || !supabaseKey || !ownerLoginId) { setRenameOpen(true); return; }
                  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } as Record<string,string>;
                  const url = `${supabaseUrl}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId)}&select=*`;
                  console.log('rename:select', { url });
                  const res = await fetch(url, { headers });
                  const data = await res.json();
                  const tree = Array.isArray(data) ? data[0] : undefined;
                  setCurrentTreeId(tree?.id);
                  const initialName = (tree?.tree_name) || (tree?.owner_name ? `${tree.owner_name}的圣诞树` : `${loggedInName}的圣诞树`);
                  console.log('rename:prefill', { treeId: tree?.id, initialName });
                  setRenameInput(initialName);
                  setRenameOpen(true);
                } catch { setRenameOpen(true); }
              }}
              className="pointer-events-auto text-white/80 hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 17.25V20h2.75l8.06-8.06-2.75-2.75L4 17.25z" fill="currentColor"/><path d="M17.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
            </button>
          )}
        </h1>
        {/* <div className="w-32 h-1 bg-[#D4AF37] mt-4 rounded-full shadow-[0_0_10px_#D4AF37]"></div>
        <p className="text-[#D4AF37] mt-2 font-serif italic opacity-80 text-sm tracking-widest uppercase">
          Luxury • Elegance • Tradition
        </p> */}
        <div className="absolute top-8 right-8 pointer-events-auto items-center gap-3 hidden md:flex">
          <FeyButton active={!!magicEnabled} onClick={onMagicToggle} size="default">
            {magicEnabled ? '关闭手势魔法' : '打开手势魔法'}
          </FeyButton>
          {loggedInName ? (
            <FeyButton onClick={onLogout}>退出</FeyButton>
          ) : (
            <FeyButton onClick={onLoginClick} size="narrow">登录</FeyButton>
          )}
        </div>
        {loggedInName && (
          <div className="absolute top-4 right-4 pointer-events-auto flex md:hidden">
            <FeyButton onClick={onLogout} size="icon" shape="circle" aria-label="退出">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 4h8v16h-8" stroke="#fff" strokeWidth="2"/>
                <path d="M14 12H4M7 9l-3 3 3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </FeyButton>
          </div>
        )}
      </header>

      {loggedInName && (
        <div className="absolute top-8 left-8 pointer-events-auto flex flex-col items-center gap-2 z-20">
          <div className="w-12 h-12 rounded-full bg-black/40 border border-[#D4AF37] overflow-hidden">
            <img src="/photos/图标3.png" alt="头像" className="w-full h-full object-cover" onError={(e)=>{(e.currentTarget.style.display='none')}} />
          </div>
          <span className="text-[#D4AF37] font-serif text-sm">{loggedInName}</span>
          <div className="flex items-center gap-1.5">
            <img src="/photos/贺卡.webp" alt="贺卡" className="h-6 w-6 md:h-7 md:w-7" onError={(e)=>{(e.currentTarget.style.display='none')}} />
            <span className="text-[#D4AF37] font-serif text-sm md:text-base">{(typeof giftCount === 'number' ? giftCount : giftCountLocal) || 0}</span>
          </div>
        </div>
      )}

      {/* Control Panel */}
      {/* <div className="flex flex-col items-center mb-8 pointer-events-auto">
        <button
          onClick={onToggle}
          className={`
            group relative px-12 py-4 border-2 border-[#D4AF37] 
            bg-black/50 backdrop-blur-md overflow-hidden transition-all duration-500
            hover:shadow-[0_0_30px_#D4AF37] hover:border-[#fff]
          `}
        >
          <div className={`absolute inset-0 bg-[#D4AF37] transition-transform duration-500 ease-in-out origin-left ${isFormed ? 'scale-x-0' : 'scale-x-100'} opacity-10`}></div>
          
          <span className="relative z-10 font-serif text-xl md:text-2xl text-[#D4AF37] tracking-[0.2em] group-hover:text-white transition-colors">
            {isFormed ? 'UNLEASH CHAOS' : 'RESTORE ORDER'}
          </span>
        </button>
        
        <p className="mt-4 text-[#F5E6BF] font-serif text-xs opacity-50 tracking-widest text-center max-w-md">
          {isFormed 
            ? "A magnificent assembly of the finest ornaments. Truly spectacular." 
            : "Creative potential unleashed. Waiting to be made great again."}
        </p>
      </div> */}

      {/* Decorative Corners */}
      <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-[#D4AF37] opacity-50"></div>
      <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-[#D4AF37] opacity-50"></div>
      <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-[#D4AF37] opacity-50"></div>
      <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-[#D4AF37] opacity-50"></div>

      <div className="absolute md:bottom-16 bottom-32 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2">
        {!loggedInName ? (
          <FeyButton onClick={onLoginClick} size="default">创建我的圣诞树</FeyButton>
        ) : previewingOther ? (
          <>
            <FeyButton onClick={onSendBlessing} size="default">送上祝福</FeyButton>
            <FeyButton onClick={onLoginClick} size="default">创建我的圣诞树</FeyButton>
          </>
        ) : (
          <>
            <FeyButton onClick={handleShareTree} size="default" className="w-[min(90vw,360px)]">分享我的树以获得更多祝福</FeyButton>
            <FeyButton onClick={handleGiftTree} size="default" className="w-[min(90vw,360px)]">【特别礼物】送好友一颗圣诞树</FeyButton>
            {shareMsg && <div className="text-xs text-[#D4AF37] font-serif opacity-80">{shareMsg}</div>}
          </>
        )}
        {((!loggedInName) || previewingOther) && (
          <div className="md:hidden">
            <FeyButton size="narrow" className="mt-1 bg-white/15 text-white/90 border border-white/20" onClick={()=>{
              try {
                const url = 'https://apps.apple.com/cn/app/%E7%BA%BF%E4%B8%8B%E5%92%96offliner-%E7%BA%A6%E6%9D%AF%E5%92%96%E5%95%A1-%E5%8F%91%E7%8E%B0%E8%BA%AB%E8%BE%B9%E4%BA%BA-%E6%B4%BB%E5%8A%A8-%E4%BA%A4%E6%9C%8B%E5%8F%8B/id6743653417';
                const ua = (navigator?.userAgent || '').toLowerCase();
                const isWechat = /micromessenger/.test(ua);
                window.location.href = url;
                if (isWechat) {
                  setTimeout(()=>{ try { if (document.visibilityState === 'visible') setWechatBlockOpen(true); } catch { setWechatBlockOpen(true); } }, 800);
                }
              } catch { setWechatBlockOpen(true); }
            }}>
              <img src="/photos/图标3.png" alt="logo" className="h-4 w-4 rounded-sm" />
              <span>App内打开</span>
            </FeyButton>
          </div>
        )}
      </div>

      {shareOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
          <div className="relative w-full max-w-sm rounded-2xl p-6 pt-12 text-white bg-[radial-gradient(61.35%_50.07%_at_48.58%_50%,rgba(0,0,0,0.6)_0%,rgba(255,255,255,0.08)_100%)] backdrop-blur-xl [box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.08)] pointer-events-auto">
            <button aria-label="关闭" onClick={()=>setShareOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">×</button>
            <div className="relative w-full rounded-[12px] overflow-hidden">
              {!videoUrl && (
                <img src={previewUrl || frameImgUrl} alt="预览" className="w-full h-auto" onError={(e)=>{(e.currentTarget.style.display='none')}} />
              )}
              {videoUrl && (
                <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-auto" />
              )}
            </div>
            <div className="mt-2 text-xs text-white/70 text-left">分享到</div>
            {savingActive && (
              <div className="mt-2 mb-1">
                <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden">
                  <div className="h-full bg-[#22c55e]" style={{ width: `${Math.max(0, Math.min(100, savingProgress))}%` }}></div>
                </div>
                <div className="mt-1 text-[11px] text-white/80 text-right">{Math.round(Math.max(0, Math.min(100, savingProgress)))}%</div>
              </div>
            )}
            <div className="mt-2 grid grid-cols-5 gap-2 pointer-events-auto">
              <button type="button" onClick={async ()=>{ try { await navigator.clipboard.writeText(shareLink); setShareMsg('已复制到剪贴板'); setSavedChannel('link'); setSavedTipOpen(true); console.log('copy-link:copied'); } catch (e) { console.error('copy-link:error', e); setShareMsg('复制失败'); } }} className="flex flex-col items-center justify-center gap-1 h-20 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 pointer-events-auto">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-black text-2xl leading-none">🔗</div>
                <div className="text-[11px] text-white/80">复制链接</div>
              </button>
              <button type="button" onMouseDown={()=>{ try { console.log('share-moments:mousedown'); } catch {} }} onClick={async ()=>{ try { await savePhoto(); setSavedChannel('moments'); setSavedTipOpen(true); } catch (e) { console.error('share-moments:error', e); } }} className="flex flex-col items-center justify-center gap-1 h-20 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 pointer-events-auto">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/20 bg-black flex items-center justify-center">
                  <img src="/photos/分享到朋友圈.png" alt="朋友圈" className="w-full h-full object-contain object-center" onError={(e)=>{(e.currentTarget.style.display='none')}} />
                </div>
                <div className="text-[11px] text-white/80">朋友圈</div>
              </button>
              <button type="button" onMouseDown={()=>{ try { console.log('share-wechat:mousedown'); } catch {} }} onClick={async ()=>{ try { await savePhoto(); setSavedChannel('wechat'); setSavedTipOpen(true); } catch (e) { console.error('share-wechat:error', e); } }} className="flex flex-col items-center justify-center gap-1 h-20 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 pointer-events-auto">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/20 bg-black flex items-center justify-center">
                  <img src="/photos/分享给微信好友.png" alt="微信好友" className="w-full h-full object-contain object-center" onError={(e)=>{(e.currentTarget.style.display='none')}} />
                </div>
                <div className="text-[11px] text-white/80">微信好友</div>
              </button>
              <button type="button" onMouseDown={()=>{ try { console.log('xiaohongshu:mousedown'); } catch {} }} onClick={async ()=>{ try { await savePhoto(); setSavedChannel('xiaohongshu'); setSavedTipOpen(true); } catch (e) { console.error('xiaohongshu:error', e); } }} className="flex flex-col items-center justify-center gap-1 h-20 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 pointer-events-auto">
                <div className="w-14 h-14 rounded-full overflow-hidden ring-1 ring-white/20 bg-black flex items-center justify-center">
                  <img src="/photos/小红书.png" alt="小红书" className="w-full h-full object-contain object-center" onError={(e)=>{(e.currentTarget.style.display='none')}} />
                </div>
                <div className="text-[11px] text-white/80">小红书</div>
              </button>
              <button type="button" onClick={async ()=>{ try { if (shareType === 'photo') { await savePhoto(); return; } if (savingActive) { console.log('save-album:busy'); return; } console.log('save-album:click'); setSavingActive(true); setSavingStage(null); updateProgress(0); if (!videoBlob) { setShareMsg('视频生成中...'); console.log('save-album:no-blob'); setSavingStage('record'); setPendingSave(true); await startRecording(); return; } setSavingStage('encode'); await performSave(); } catch (e) { console.error('save-video:error', e); setSavingActive(false); } }} className="flex flex-col items-center justify-center gap-1 h-20 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 pointer-events-auto">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#000" stroke-width="1.5" fill="#fff"/><circle cx="9" cy="11" r="2" fill="#000"/><path d="M6 17l4.5-4.5a1 1 0 0 1 1.4 0L16 16l2-2 3 3" stroke="#000" stroke-width="1.5" fill="none"/></svg>
                </div>
                <div className="text-[11px] text-white/80">保存到相册</div>
              </button>
              {false && (
              <button type="button" onMouseDown={()=>{ try { console.log('record-video:mousedown'); } catch {} }} onClick={async ()=>{ try { setShareMsg('录制中...'); const frameImg = new Image(); frameImg.src = frameImgUrl; await new Promise<void>((res)=>{ frameImg.onload=()=>res(); frameImg.onerror=()=>res(); }); const treeCanvasEl = document.querySelector('canvas') as HTMLCanvasElement | null; const containerW = frameImg.naturalWidth || 768; const containerH = frameImg.naturalHeight || 1080; const canvas = document.createElement('canvas'); canvas.width = containerW; canvas.height = containerH; const ctx = canvas.getContext('2d'); if (!ctx) { setShareMsg('录制失败'); return; } const stream = canvas.captureStream ? canvas.captureStream(30) : null; if (!stream) { setShareMsg('浏览器不支持录制'); return; } const recorder = new MediaRecorder(stream as MediaStream, { mimeType: 'video/webm' }); const chunks: Blob[] = []; recorder.ondataavailable = (e)=>{ if (e.data && e.data.size > 0) chunks.push(e.data); }; recorder.onstop = ()=>{ const blob = new Blob(chunks, { type: 'video/webm' }); saveAs(blob, '我的圣诞树-3s.webm'); setShareMsg('已保存视频'); }; recorder.start(); const start = Date.now(); const drawFrame = async () => { ctx.clearRect(0,0,containerW,containerH); ctx.drawImage(frameImg, 0, 0, containerW, containerH); if (treeCanvasEl) { try { const domCanvas = await html2canvas(treeCanvasEl, { useCORS: true }); const innerW = Math.round(containerW * 0.76); const innerH = Math.round(containerH * 0.52); const innerX = Math.round(containerW * 0.12); const innerY = Math.round(containerH * 0.20); const scale = Math.min(innerW / domCanvas.width, innerH / domCanvas.height); const dw = Math.round(domCanvas.width * scale); const dh = Math.round(domCanvas.height * scale); const dx = innerX + Math.round((innerW - dw) / 2); const dy = innerY + Math.round((innerH - dh) / 2); ctx.drawImage(domCanvas, dx, dy, dw, dh); } catch {} } }; const loop = async () => { const dur = Date.now() - start; if (dur >= 3000) { recorder.stop(); return; } await drawFrame(); await new Promise(r=>setTimeout(r, 1000/30)); loop(); }; loop(); } catch (e) { console.error('record-video:error', e); setShareMsg('录制失败'); } }} className="flex flex-col items-center justify-center gap-1 h-20 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10 pointer-events-auto">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center text-black">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="6" fill="#000"/></svg>
                </div>
                <div className="text-[11px] text-white/80">保存3秒视频</div>
              </button>
              )}
            </div>
            {shareLoading && <div className="mt-3 text-xs text-white/60">生成中...</div>}
            {shareMsg && <div className="mt-2 text-xs text-white/80">{shareMsg}</div>}
          </div>
        </div>
      )}

      {wechatBlockOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
          <div className="relative w-full max-w-sm rounded-2xl p-6 pt-12 text-white bg-[radial-gradient(61.35%_50.07%_at_48.58%_50%,rgba(0,0,0,0.6)_0%,rgba(255,255,255,0.08)_100%)] backdrop-blur-xl [box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.08)] pointer-events-auto">
            <button aria-label="关闭" onClick={()=>setWechatBlockOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">×</button>
            <div className="text-sm text-white/90">跳转被微信拦截，请在 App Store 搜索：线下咖</div>
            <div className="mt-2 text-xs text-white/70">或点击右上角 · 用默认浏览器打开</div>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button type="button" onClick={()=>setWechatBlockOpen(false)} className="h-9 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 text-xs">我知道了</button>
            </div>
          </div>
        </div>
      )}

      {savedTipOpen && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 pointer-events-auto">
          <div className="w-full max-w-xs rounded-2xl p-4 text-white bg-[radial-gradient(61.35%_50.07%_at_48.58%_50%,rgba(0,0,0,0.7)_0%,rgba(255,255,255,0.08)_100%)] backdrop-blur-xl [box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.08)] text-center">
            <div className="text-sm">
              {savedChannel === 'moments' && '圣诞树已经保存到相册，现在可以分享到朋友圈了～'}
              {savedChannel === 'wechat' && '圣诞树已经保存到相册，现在可以分享到微信好友了～'}
              {savedChannel === 'xiaohongshu' && '圣诞树已经保存到相册，现在可以分享到小红书了～'}
              {savedChannel === 'link' && '链接已经复制到剪贴板，现在可以进行分享了～'}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>{ setSavedTipOpen(false); }} className="h-9 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 text-xs">我知道了</button>
              <button type="button" onClick={()=>{ setSavedTipOpen(false); }} className="h-9 rounded-[10px] bg-white/90 text-black text-xs hover:bg-white">好的</button>
            </div>
          </div>
        </div>
      )}

      {renameOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
          <div className="relative w-full max-w-sm rounded-2xl p-6 pt-12 text-white bg-[radial-gradient(61.35%_50.07%_at_48.58%_50%,rgba(0,0,0,0.6)_0%,rgba(255,255,255,0.08)_100%)] backdrop-blur-xl [box-shadow:inset_0_0_0_0.5px_rgba(255,255,255,0.08)] pointer-events-auto">
            <button aria-label="关闭" onClick={()=>setRenameOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white bg-black/40 backdrop-blur-md border border-white/20 hover:bg-white/10">×</button>
            <div className="text-sm text-white/80 mb-3">给你的树取个名吧</div>
            <input value={renameInput} onChange={(e)=>setRenameInput(e.target.value)} placeholder="我的圣诞树" className="w-full h-10 rounded-[10px] px-3 bg-black/40 backdrop-blur-md border border-white/20 text-white" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setRenameOpen(false)} className="h-9 rounded-[10px] bg-black/40 backdrop-blur-md border border-white/20 text-xs">取消</button>
              <button type="button" onClick={async ()=>{
                try {
                  const ownerLoginId = resolveOwnerLoginId();
                  if (!supabaseUrl || !supabaseKey || !ownerLoginId) { setRenameOpen(false); return; }
                  setRenameSaving(true);
                  const headers = { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json', Prefer: 'return=representation' } as Record<string,string>;
                  let treeId = currentTreeId;
                  if (!treeId) {
                    const selUrl = `${supabaseUrl}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId)}&select=*`;
                    console.log('rename:save:select', { selUrl });
                    const sel = await fetch(selUrl, { headers });
                    const selData = await sel.json();
                    const tree = Array.isArray(selData) ? selData[0] : undefined;
                    treeId = tree?.id;
                  }
                  const baseUrl = String(supabaseUrl || '').trim();
                  const nameToSet = String(renameInput || '').trim();
                  if (!nameToSet) { console.log('rename:save:skip-empty'); return; }
                  let updatedOk = false;
                  if (treeId) {
                    const updUrl = `${baseUrl}/rest/v1/trees?id=eq.${treeId}`;
                    console.log('rename:save:request:id', { updUrl, treeId, nameToSet });
                    const upd = await fetch(updUrl, { method: 'PATCH', headers, body: JSON.stringify({ tree_name: nameToSet }) });
                    const headersObj = Object.fromEntries(upd.headers.entries());
                    const body = await upd.text(); let data: any; try { data = JSON.parse(body); } catch { data = { body }; }
                    console.log('rename:save:response:id', { status: upd.status, ok: upd.ok, headers: headersObj, body: data });
                    updatedOk = upd.ok;
                  }
                  if (!updatedOk) {
                    const ownerLoginId = resolveOwnerLoginId() || '';
                    const updUrl2 = `${baseUrl}/rest/v1/trees?owner_login=eq.${encodeURIComponent(ownerLoginId)}`;
                    console.log('rename:save:request:login', { updUrl2, ownerLoginId, nameToSet });
                    const upd2 = await fetch(updUrl2, { method: 'PATCH', headers, body: JSON.stringify({ tree_name: nameToSet }) });
                    const headersObj2 = Object.fromEntries(upd2.headers.entries());
                    const body2 = await upd2.text(); let data2: any; try { data2 = JSON.parse(body2); } catch { data2 = { body: body2 }; }
                    console.log('rename:save:response:login', { status: upd2.status, ok: upd2.ok, headers: headersObj2, body: data2 });
                    updatedOk = upd2.ok;
                  }
                  if (updatedOk) {
                    setHeaderTreeName(nameToSet);
                  }
                } catch (e) { console.error('rename:save:error', e); }
                finally {
                  setRenameSaving(false);
                  setRenameOpen(false);
                  try { localStorage.removeItem('require_rename_tree'); } catch {}
                }
              }} className="h-9 rounded-[10px] bg-white/90 text-black text-xs hover:bg-white">{renameSaving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
