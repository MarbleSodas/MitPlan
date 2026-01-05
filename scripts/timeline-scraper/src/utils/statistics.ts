/**
 * Statistical Utility Functions
 *
 * Provides median calculation and IQR-based outlier filtering
 * for processing damage values from FFLogs data.
 */

/**
 * Calculate the median of an array of numbers
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calculate the first quartile (Q1) of an array of numbers
 */
export function quartile1(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lowerHalf = sorted.slice(0, mid);

  return median(lowerHalf);
}

/**
 * Calculate the third quartile (Q3) of an array of numbers
 */
export function quartile3(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upperHalf = sorted.length % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);

  return median(upperHalf);
}

/**
 * Calculate the Interquartile Range (IQR)
 */
export function iqr(values: number[]): number {
  return quartile3(values) - quartile1(values);
}

export interface OutlierFilterResult {
  filtered: number[];
  outliers: number[];
  lowerBound: number;
  upperBound: number;
}

/**
 * Filter outliers using the IQR method
 *
 * Outliers are defined as values outside the range:
 * [Q1 - multiplier * IQR, Q3 + multiplier * IQR]
 *
 * Default multiplier is 1.5 (standard IQR method)
 * Use 3.0 for "extreme" outliers only
 *
 * @param values - Array of numbers to filter
 * @param multiplier - IQR multiplier (default: 1.5)
 * @returns Object containing filtered values, outliers, and bounds
 */
export function filterOutliersIQR(values: number[], multiplier = 1.5): OutlierFilterResult {
  if (values.length < 4) {
    // Not enough data points for meaningful IQR filtering
    return {
      filtered: values,
      outliers: [],
      lowerBound: Math.min(...values),
      upperBound: Math.max(...values),
    };
  }

  const q1 = quartile1(values);
  const q3 = quartile3(values);
  const iqrValue = q3 - q1;

  const lowerBound = q1 - multiplier * iqrValue;
  const upperBound = q3 + multiplier * iqrValue;

  const filtered: number[] = [];
  const outliers: number[] = [];

  for (const value of values) {
    if (value >= lowerBound && value <= upperBound) {
      filtered.push(value);
    } else {
      outliers.push(value);
    }
  }

  return {
    filtered,
    outliers,
    lowerBound,
    upperBound,
  };
}

/**
 * Filter outliers and return the median of the filtered values
 *
 * @param values - Array of numbers to process
 * @param iqrMultiplier - IQR multiplier for outlier detection (default: 1.5)
 * @returns Median of values with outliers removed
 */
export function medianWithoutOutliers(values: number[], iqrMultiplier = 1.5): number {
  const result = filterOutliersIQR(values, iqrMultiplier);
  return median(result.filtered);
}

/**
 * Calculate basic statistics for an array of numbers
 */
export interface BasicStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  stdDev: number;
}

export function calculateStats(values: number[]): BasicStats {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      q1: 0,
      q3: 0,
      iqr: 0,
      stdDev: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;

  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(avgSquaredDiff);

  const q1Val = quartile1(values);
  const q3Val = quartile3(values);

  return {
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: median(values),
    q1: q1Val,
    q3: q3Val,
    iqr: q3Val - q1Val,
    stdDev,
  };
}

/**
 * Group numbers into clusters based on proximity
 *
 * Used for grouping damage events that occur close together in time.
 *
 * @param values - Array of numbers (e.g., timestamps)
 * @param maxGap - Maximum gap between values to be in the same cluster
 * @returns Array of clusters, each containing indices and values
 */
export interface Cluster {
  indices: number[];
  values: number[];
  start: number;
  end: number;
  median: number;
}

export function clusterByProximity(values: number[], maxGap: number): Cluster[] {
  if (values.length === 0) return [];

  // Create array of [index, value] pairs and sort by value
  const indexed = values.map((v, i) => ({ index: i, value: v }));
  indexed.sort((a, b) => a.value - b.value);

  const clusters: Cluster[] = [];
  let currentCluster: { indices: number[]; values: number[] } = {
    indices: [indexed[0].index],
    values: [indexed[0].value],
  };

  for (let i = 1; i < indexed.length; i++) {
    const gap = indexed[i].value - indexed[i - 1].value;

    if (gap <= maxGap) {
      currentCluster.indices.push(indexed[i].index);
      currentCluster.values.push(indexed[i].value);
    } else {
      // Finalize current cluster and start a new one
      clusters.push({
        indices: currentCluster.indices,
        values: currentCluster.values,
        start: Math.min(...currentCluster.values),
        end: Math.max(...currentCluster.values),
        median: median(currentCluster.values),
      });

      currentCluster = {
        indices: [indexed[i].index],
        values: [indexed[i].value],
      };
    }
  }

  // Don't forget the last cluster
  clusters.push({
    indices: currentCluster.indices,
    values: currentCluster.values,
    start: Math.min(...currentCluster.values),
    end: Math.max(...currentCluster.values),
    median: median(currentCluster.values),
  });

  return clusters;
}
