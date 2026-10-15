import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, RefreshCw, Wifi, Globe, AlertTriangle, ArrowRight } from 'lucide-react';
import { clearVpnCache, checkIsVpn, VpnCheckResult } from '../utils/vpnDetector';
import { sound } from '../utils/sound';

interface VpnBlockedScreenProps {
  vpnResult: VpnCheckResult | null;
  onResolved: () => void;
}

export const VpnBlockedScreen: React.FC<VpnBlockedScreenProps> = ({ vpnResult, onResolved }) => {
  const [checking, setChecking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRetry = async () => {
    setChecking(true);
    setErrorMessage('');
    clearVpnCache();
    sound.playTick();

    try {
      const freshCheck = await checkIsVpn(true);
      if (!freshCheck.isVpn) {
        sound.playWin();
        onResolved();
      } else {
        sound.playError();
        setErrorMessage('VPN abhi bhi active hai! Kripya apne phone ki VPN app ya settings mein jakar ise Disconnect karein.');
      }
    } catch {
      setErrorMessage('Check karne me error aayi. Kripya apna internet connection check karein.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070A12]/95 backdrop-blur-xl text-white overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-md w-full bg-[#0E1524] border-2 border-rose-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-center space-y-5"
      >
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Warning Icon Badge */}
        <div className="relative mx-auto w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-600/30 border border-rose-400/30">
          <ShieldAlert className="w-9 h-9 text-white stroke-[2.5]" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500" />
          </span>
        </div>

        {/* Heading */}
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Access Restricted • Security Firewall
          </span>
          <h2 className="font-display font-black text-2xl text-white tracking-tight">
            VPN Connection Detected
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
            RewardLuxe par VPN, Proxy ya Virtual Private Network lagakar login ya access karna strictly prohibited hai.
          </p>
        </div>

        {/* Technical Details Box */}
        <div className="bg-[#070A12] border border-slate-800 rounded-2xl p-3.5 text-left text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/80 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              Detected IP
            </span>
            <span className="font-mono font-bold text-white select-all">{vpnResult?.ip || 'VPN IP'}</span>
          </div>

          {vpnResult?.country && (
            <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/80 pb-1.5">
              <span>Location / Country</span>
              <span className="font-bold text-slate-200">{vpnResult.country} ({vpnResult.countryCode || 'N/A'})</span>
            </div>
          )}

          {vpnResult?.isp && (
            <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800/80 pb-1.5">
              <span>Provider / ISP</span>
              <span className="font-bold text-slate-300 truncate max-w-[200px]">{vpnResult.isp}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Security Reason</span>
            <span className="font-bold text-rose-400 text-[10px]">{vpnResult?.reason || 'VPN / Datacenter tunnel'}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-400/10 border border-amber-400/25 rounded-2xl p-3 text-xs text-amber-200/90 text-left space-y-1">
          <strong className="text-amber-300 block font-bold">App me enter hone ke steps:</strong>
          <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-slate-300">
            <li>Apne mobile/PC se TurboVPN, QuickVPN ya koi bhi active VPN band karein.</li>
            <li>Direct apne normal Mobile Data ya Wi-Fi se connect karein.</li>
            <li>Neeche <strong>"Disconnect VPN & Recheck"</strong> button dabayein.</li>
          </ol>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-600/40 rounded-xl text-xs text-rose-200 font-bold flex items-center justify-center gap-1.5 animate-shake">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Retry Button */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={checking}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-slate-950 font-display font-black text-sm rounded-2xl shadow-lg shadow-rose-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {checking ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              <span>Verifying Connection...</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-slate-950" />
              <span>Disconnect VPN &amp; Recheck</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
};
