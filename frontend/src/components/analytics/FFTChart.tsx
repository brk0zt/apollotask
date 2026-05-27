import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FFTAnalysisResponse } from '../../types/analytics';

interface FFTChartProps {
  data: FFTAnalysisResponse;
}

export const FFTChart: React.FC<FFTChartProps> = ({ data }) => {
  if (!data.success) {
    return (
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-center">
        Fourier analizi için veri seti henüz yeterli değil.
      </div>
    );
  }

  // Format data for Recharts (exposing frequency/period on X and magnitude on Y)
  const chartData = data.spectrum.map((item) => ({
    frequency: item.frequency_cycles_day,
    period: item.period_days ? `${item.period_days.toFixed(1)} gün` : 'Süresiz',
    periodValue: item.period_days || 0,
    magnitude: item.magnitude,
  }));

  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Aktivite Spektrum Analizi (FFT)</h3>
          <p className="text-white/40 text-sm mt-0.5">
            Cooley-Tukey FFT O(N log N) algoritmasıyla çıkarılan çalışma periyotları
          </p>
        </div>
        <div className="mt-3 md:mt-0 flex items-center space-x-3 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="text-amber-300 text-xs font-semibold uppercase tracking-wider">
            Dominant Periyot: {data.dominant_period_days.toFixed(2)} Gün
          </span>
        </div>
      </div>

      {/* Dominant FFT Insight Card */}
      <div className="p-4 mb-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 shadow-inner">
        <div className="flex items-start space-x-3">
          <span className="text-2xl mt-0.5">💡</span>
          <div>
            <h4 className="font-semibold text-amber-200 text-sm">Fourier Kalıp Analizi İçgörüsü</h4>
            <p className="text-white/70 text-sm mt-1 leading-relaxed">{data.insight}</p>
          </div>
        </div>
      </div>

      {/* Recharts Fourier Amplitude Spectrum */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="fftColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="period"
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="p-3 bg-slate-900/90 border border-white/10 rounded-lg shadow-xl text-xs">
                      <p className="font-bold text-white mb-1">Döngü Periyodu: {item.period}</p>
                      <p className="text-white/60">Frekans: {item.frequency.toFixed(3)} döngü/gün</p>
                      <p className="text-amber-400 font-semibold mt-1">
                        Genlik (Genlik Değeri): {item.magnitude.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="magnitude"
              stroke="#f59e0b"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#fftColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between items-center mt-4 text-[10px] text-white/30 uppercase tracking-widest">
        <span>Yüksek Frekans (Hızlı Döngü)</span>
        <span>Nyquist Limit: 24 Örnek/Gün (Saatlik Buckets)</span>
        <span>Düşük Frekans (Yavaş Döngü)</span>
      </div>
    </div>
  );
};
export default FFTChart;
