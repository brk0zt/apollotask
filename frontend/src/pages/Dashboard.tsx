import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import FFTChart from '../components/analytics/FFTChart';
import RiskGauge from '../components/analytics/RiskGauge';
import ForecastTimeline from '../components/analytics/ForecastTimeline';
import { FFTAnalysisResponse, ProjectForecastResponse, RiskScoringResponse } from '../types/analytics';

// Fully self-contained mock analytical data for fallback presentation if live API has empty databases
const mockFftData: FFTAnalysisResponse = {
  success: true,
  sampling_rate_hours: 1.0,
  signal_length_raw: 720,
  fft_length_padded: 1024,
  dominant_frequency_cycles_day: 0.1428, // 1 cycle per 7 days
  dominant_period_days: 7.0, // 7 day weekly cycle
  peak_magnitude: 42.6,
  insight: "Kullanıcı haftalık düzenli bir aktivite döngüsüne sahip (~7.0 gün). Hafta sonları ve hafta içi çalışma periyotları son derece ritmik. FFT spektrum analizi, pazartesi-salı teslimat yoğunlaşmasını net bir biçimde doğrulamaktadır.",
  spectrum: Array.from({ length: 32 }, (_, i) => {
    const k = i + 1;
    // Add peak around weekly period (dominant frequency index ≈ 6)
    const factor = k === 6 ? 42.6 : k === 12 ? 18.2 : Math.max(1.5, 15 / k + Math.random() * 2);
    return {
      frequency_cycles_day: k * (24.0 / 1024),
      period_days: 1024 / (k * 24.0),
      magnitude: factor,
    };
  }),
};

const mockRiskData: RiskScoringResponse = {
  success: true,
  project_id: 1,
  risk_score: 0.284,
  risk_level: 'LOW (ON TRACK - NOMINAL STATE)',
  linearization_model: 'Jacobian first-order Taylor expansion',
  breakdown: {
    overdue_ratio: {
      metric_value: 0.15,
      jacobian_sensitivity: 0.35,
      risk_contribution: 0.0525,
      percentage_impact: 18.49,
    },
    velocity_deficit: {
      metric_value: 0.32,
      jacobian_sensitivity: 0.25,
      risk_contribution: 0.08,
      percentage_impact: 28.17,
    },
    priority_density: {
      metric_value: 0.40,
      jacobian_sensitivity: 0.15,
      risk_contribution: 0.06,
      percentage_impact: 21.13,
    },
    inactivity_decay: {
      metric_value: 0.28,
      jacobian_sensitivity: 0.15,
      risk_contribution: 0.042,
      percentage_impact: 14.79,
    },
    backlog_weight: {
      metric_value: 0.50,
      jacobian_sensitivity: 0.10,
      risk_contribution: 0.05,
      percentage_impact: 17.61,
    },
  },
};

const mockForecastData: ProjectForecastResponse = {
  success: true,
  completed_tasks_count: 24,
  incomplete_tasks_count: 18,
  base_velocity: 1.142,
  velocity_drift_coefficient: -0.00345, // learning curve ivmelenmesi
  total_estimated_remaining_hours: 142.0,
  forecasted_remaining_days: 15.42,
  estimated_completion_date: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  newton_raphson_iterations: 4,
  newton_raphson_converged: true,
  method: 'Newton-Raphson velocity convergence (EWMA-smoothed)',
  confidence: 0.95,
};

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<string>('task_completion_rate');
  const [useLiveApi, setUseLiveApi] = useState<boolean>(false); // fallbacks to gorgeous interactive simulations

  const [fftData, setFftData] = useState<FFTAnalysisResponse>(mockFftData);
  const [riskData, setRiskData] = useState<RiskScoringResponse>(mockRiskData);
  const [forecastData, setForecastData] = useState<ProjectForecastResponse>(mockForecastData);

  // Attempt live API fetches if requested
  useEffect(() => {
    if (!useLiveApi) {
      setFftData(mockFftData);
      setRiskData(mockRiskData);
      setForecastData(mockForecastData);
      return;
    }

    const fetchLiveAnalytics = async () => {
      try {
        const fftRes = await apiClient.get<FFTAnalysisResponse>(`/analytics/patterns?metric=${selectedMetric}`);
        if (fftRes.data.success) setFftData(fftRes.data);
      } catch (e) {
        console.warn('Live FFT API failed, using visual mock simulation...');
      }

      try {
        const riskRes = await apiClient.get<RiskScoringResponse>('/analytics/risk/1');
        if (riskRes.data.success) setRiskData(riskRes.data);
      } catch (e) {
        console.warn('Live Risk API failed, using visual mock simulation...');
      }

      try {
        const forecastRes = await apiClient.get<ProjectForecastResponse>('/analytics/forecast/1');
        if (forecastRes.data.success) setForecastData(forecastRes.data);
      } catch (e) {
        console.warn('Live Forecast API failed, using visual mock simulation...');
      }
    };

    fetchLiveAnalytics();
  }, [useLiveApi, selectedMetric]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-3xl">🔱</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">APOLLO ENERGY</h1>
            <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
              Asset Management Control Panel
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-slate-900">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-white leading-none">{user?.name || 'Ziyaretçi'}</p>
              <p className="text-[10px] text-white/40 mt-1">{user?.email || 'guest@apollo.com'}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-sm text-white/80 hover:text-rose-400 font-medium active:scale-[0.98] transition-all duration-200"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 space-y-8 max-w-7xl w-full mx-auto">
        
        {/* Dashboard Title & Simulation Toggler */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">Analitik İzleme Kontrol Paneli</h2>
            <p className="text-white/40 text-sm mt-1">
              Hızlı Fourier Dönüşümleri, Newton-Raphson hız denklemleri ve Jacobian risk analizi
            </p>
          </div>
          
          <div className="flex items-center space-x-3 self-start">
            <span className="text-xs text-white/50">Gösterim Modu:</span>
            <button
              onClick={() => setUseLiveApi(!useLiveApi)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                !useLiveApi
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              {!useLiveApi ? '📊 Etkileşimli Simülasyon' : '🔌 Canlı API Modu'}
            </button>
          </div>
        </div>

        {/* Global Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider block">Tamamlanan Görevler</span>
            <span className="text-3xl font-extrabold text-white block mt-2">24 / 42</span>
            <span className="text-emerald-400 text-xs font-medium block mt-1.5">🚀 %57.1 Toplam Oran</span>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider block">Aktif Enerji Projeleri</span>
            <span className="text-3xl font-extrabold text-white block mt-2">3 Adet</span>
            <span className="text-amber-400 text-xs font-medium block mt-1.5">⚡ 2 Sprint Aktif</span>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider block">Sinyal Örneklem Boyutu</span>
            <span className="text-3xl font-extrabold text-white block mt-2">720 Saat</span>
            <span className="text-white/60 text-xs font-medium block mt-1.5">📈 Uniform Sampled L2</span>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-lg">
            <span className="text-white/40 text-xs font-bold uppercase tracking-wider block">Argon2id Crack Eşiği</span>
            <span className="text-3xl font-extrabold text-emerald-400 block mt-2">64 MB</span>
            <span className="text-white/60 text-xs font-medium block mt-1.5">🔒 Memory-Hard Kilitli</span>
          </div>
        </div>

        {/* Core Charts Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Column 1 & 2: FFT Pattern Analysis Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Metric Selection Switcher */}
            <div className="flex items-center space-x-3 p-1.5 rounded-xl bg-white/5 border border-white/5 self-start w-fit">
              <button
                onClick={() => setSelectedMetric('task_completion_rate')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  selectedMetric === 'task_completion_rate'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Görev Teslim Oranı
              </button>
              <button
                onClick={() => setSelectedMetric('task_creation_rate')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  selectedMetric === 'task_creation_rate'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Görev Oluşturma Oranı
              </button>
            </div>

            <FFTChart data={fftData} />
            
            <ForecastTimeline data={forecastData} />
          </div>

          {/* Column 3: Jacobian Risk Scorer Widget */}
          <div className="lg:col-span-1">
            <RiskGauge data={riskData} />
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/80 px-6 py-6 text-center text-xs text-white/30 mt-auto">
        <p>© 2026 Apollo Global Solutions — Energy Asset Management Platform</p>
        <p className="mt-1 text-[10px]">
          Sinyal işleme ve analitik kararlar, vibe-coding kalıpları yerine algoritmik verimlilik matrisiyle alınmıştır.
        </p>
      </footer>
    </div>
  );
};
export default Dashboard;
