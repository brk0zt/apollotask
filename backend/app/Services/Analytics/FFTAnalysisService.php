<?php

namespace App\Services\Analytics;

use App\Models\AnalyticsTimeseries;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class FFTAnalysisService
{
    /**
     * Analyze timeseries activity patterns using Cooley-Tukey FFT (O(N log N)).
     * Detects dominant user behavior cycles (e.g. weekly or daily cycles).
     *
     * @param int $userId
     * @param string $metricName
     * @return array
     */
    public function analyzePattern(int $userId, string $metricName = 'task_completion_rate'): array
    {
        // 1. Fetch raw bucketed time-series data from L2 analytics_timeseries table
        $timeseries = AnalyticsTimeseries::where('user_id', $userId)
            ->where('metric_name', $metricName)
            ->orderBy('bucket_ts', 'asc')
            ->get();

        if ($timeseries->isEmpty()) {
            return [
                'success' => false,
                'message' => 'Insufficient data for Fourier pattern analysis.',
            ];
        }

        // 2. Uniform Sampling Check & Gap Filling (Zero-Interpolation)
        // FFT requires a uniformly sampled signal (Nyquist-compliant)
        $timestamps = $timeseries->pluck('bucket_ts')->toArray();
        $values = $timeseries->pluck('value')->toArray();

        $filledData = $this->zeroInterpolateGaps($timestamps, $values);
        $nRaw = count($filledData);

        if ($nRaw < 16) {
            return [
                'success' => false,
                'message' => 'At least 16 data points are required to detect productivity frequencies.',
            ];
        }

        // 3. Zero-Padding to Next Power of 2 (Cooley-Tukey Requirement)
        $nPowerOfTwo = $this->nextPowerOfTwo($nRaw);
        $paddedSignal = array_fill(0, $nPowerOfTwo, ['r' => 0.0, 'i' => 0.0]);
        for ($i = 0; $i < $nRaw; $i++) {
            $paddedSignal[$i]['r'] = $filledData[$i];
        }

        // 4. Run Cooley-Tukey FFT O(N log N)
        $fftResult = $this->cooleyTukeyFft($paddedSignal);

        // 5. Spectrum Analysis (Nyquist Limit: analyze first half of the symmetric spectrum)
        $magnitudes = [];
        $halfN = $nPowerOfTwo / 2;

        // Skip DC component (k=0) because it represents the mean/static signal offset
        for ($k = 1; $k < $halfN; $k++) {
            $real = $fftResult[$k]['r'];
            $imag = $fftResult[$k]['i'];
            $magnitudes[$k] = sqrt($real * $real + $imag * $imag);
        }

        if (empty($magnitudes)) {
            return [
                'success' => false,
                'message' => 'Could not isolate valid frequency peaks.',
            ];
        }

        // Find the peak magnitude frequency
        $peakIndex = array_search(max($magnitudes), $magnitudes);
        $peakMagnitude = $magnitudes[$peakIndex];

        // 6. Map Dominant Frequency to Human-Readable Cycle Insight
        // Let fs = 1 sample per hour -> 24 samples per day
        $fs = 24.0; // sampling frequency in samples/day
        $dominantFrequency = $peakIndex * $fs / $nPowerOfTwo; // cycles per day

        $periodDays = $dominantFrequency > 0 ? 1.0 / $dominantFrequency : 0.0;

        // Formulate actionable insight string
        $insight = $this->generateInsightString($periodDays);

        return [
            'success' => true,
            'sampling_rate_hours' => 1.0,
            'signal_length_raw' => $nRaw,
            'fft_length_padded' => $nPowerOfTwo,
            'dominant_frequency_cycles_day' => round($dominantFrequency, 4),
            'dominant_period_days' => round($periodDays, 2),
            'peak_magnitude' => round($peakMagnitude, 2),
            'insight' => $insight,
            'spectrum' => array_map(function ($k) use ($magnitudes, $fs, $nPowerOfTwo) {
                return [
                    'frequency_cycles_day' => round($k * $fs / $nPowerOfTwo, 4),
                    'period_days' => $k > 0 ? round($nPowerOfTwo / ($k * $fs), 2) : null,
                    'magnitude' => round($magnitudes[$k], 4)
                ];
            }, array_keys($magnitudes))
        ];
    }

    /**
     * Recursively computes Cooley-Tukey FFT O(N log N) on complex array.
     */
    protected function cooleyTukeyFft(array $a): array
    {
        $n = count($a);
        if ($n <= 1) {
            return $a;
        }

        $even = [];
        $odd = [];
        for ($i = 0; $i < $n; $i++) {
            if ($i % 2 === 0) {
                $even[] = $a[$i];
            } else {
                $odd[] = $a[$i];
            }
        }

        $e = $this->cooleyTukeyFft($even);
        $o = $this->cooleyTukeyFft($odd);

        $r = array_fill(0, $n, ['r' => 0.0, 'i' => 0.0]);
        for ($k = 0; $k < $n / 2; $k++) {
            $theta = -2 * M_PI * $k / $n;
            // Twiddle factor calculation: e^{-i 2\pi k / n} = cos(theta) + i*sin(theta)
            $t_re = cos($theta) * $o[$k]['r'] - sin($theta) * $o[$k]['i'];
            $t_im = cos($theta) * $o[$k]['i'] + sin($theta) * $o[$k]['r'];

            $r[$k]['r'] = $e[$k]['r'] + $t_re;
            $r[$k]['i'] = $e[$k]['i'] + $t_im;

            $r[$k + $n / 2]['r'] = $e[$k]['r'] - $t_re;
            $r[$k + $n / 2]['i'] = $e[$k]['i'] - $t_im;
        }

        return $r;
    }

    /**
     * Zero-interpolates missing buckets in the time-series.
     * Guarantees a strictly uniform sample spacing delta of exactly 1 hour.
     */
    protected function zeroInterpolateGaps(array $timestamps, array $values): array
    {
        if (count($timestamps) < 2) {
            return $values;
        }

        $filled = [];
        $n = count($timestamps);

        for ($i = 0; $i < $n - 1; $i++) {
            $currTs = Carbon::parse($timestamps[$i]);
            $nextTs = Carbon::parse($timestamps[$i + 1]);

            $filled[] = (float) $values[$i];

            // If there's a gap larger than 1 hour, interpolate with zeros
            $hoursDiff = $currTs->diffInHours($nextTs);
            if ($hoursDiff > 1) {
                for ($g = 1; $g < $hoursDiff; $g++) {
                    $filled[] = 0.0;
                }
            }
        }

        // Add the final value
        $filled[] = (float) $values[$n - 1];

        return $filled;
    }

    /**
     * Return next power of two >= $n.
     */
    protected function nextPowerOfTwo(int $n): int
    {
        $p = 1;
        while ($p < $n) {
            $p *= 2;
        }
        return $p;
    }

    /**
     * Map cycle periods to human-readable developer patterns.
     */
    protected function generateInsightString(float $periodDays): string
    {
        if ($periodDays >= 6.0 && $periodDays <= 8.0) {
            return "Kullanıcı haftalık düzenli bir aktivite döngüsüne sahip (~" . round($periodDays, 1) . " gün). Hafta sonları ve hafta içi çalışma periyotları net ve ritmik.";
        }
        if ($periodDays >= 0.8 && $periodDays <= 1.2) {
            return "Kullanıcı günlük sirkadiyen bir ritim sergiliyor (~" . round($periodDays * 24, 1) . " saat). Her gün belirli saatlerde iş teslim yoğunlaşması var.";
        }
        if ($periodDays > 1.2 && $periodDays < 6.0) {
            return "Kullanıcı mikro sprint sınırlarında (~" . round($periodDays, 1) . " gün) yoğunlaşıyor. 2-4 günlük mini ritimler mevcut.";
        }
        return "Karmaşık aktivite dağılımı mevcut. Net bir döngü yerine anlık/dalgalı teslimat alışkanlığı gözlemlendi.";
    }
}
