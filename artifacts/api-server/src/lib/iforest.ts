/**
 * Isolation Forest — TypeScript implementation
 *
 * Features used per entry:
 *   - normAmount   : amount normalised by log10 (scale-free)
 *   - postingHour  : 0-23 (off-hours entries score higher)
 *   - userFreqRatio: fraction of total entries by same poster
 *   - keywordHits  : count of high-risk keywords in description
 *   - roundness    : 1 if amount is a "round" multiple of 1 000 else 0
 *
 * Returns anomaly score in [0, 100].  Score > 65 → anomalous.
 */

export interface IForestFeatures {
  normAmount: number;
  postingHour: number;
  userFreqRatio: number;
  keywordHits: number;
  roundness: number;
}

interface ITreeNode {
  isLeaf: boolean;
  size: number;
  splitFeature?: keyof IForestFeatures;
  splitValue?: number;
  left?: ITreeNode;
  right?: ITreeNode;
}

const MAX_DEPTH = 10;
const NUM_TREES = 100;
const SUBSAMPLE = 256;

function avgPathLength(n: number): number {
  if (n <= 1) return 0;
  const H = Math.log(n - 1) + 0.5772156649;
  return 2 * H - (2 * (n - 1)) / n;
}

function buildTree(
  data: IForestFeatures[],
  depth: number,
  rng: () => number,
): ITreeNode {
  if (data.length <= 1 || depth >= MAX_DEPTH) {
    return { isLeaf: true, size: data.length };
  }

  const features: (keyof IForestFeatures)[] = [
    "normAmount", "postingHour", "userFreqRatio", "keywordHits", "roundness",
  ];

  const feat = features[Math.floor(rng() * features.length)];
  const vals = data.map(d => d[feat]);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  if (min === max) return { isLeaf: true, size: data.length };

  const split = min + rng() * (max - min);
  const left = data.filter(d => d[feat] < split);
  const right = data.filter(d => d[feat] >= split);

  return {
    isLeaf: false,
    size: data.length,
    splitFeature: feat,
    splitValue: split,
    left: buildTree(left, depth + 1, rng),
    right: buildTree(right, depth + 1, rng),
  };
}

function pathLength(node: ITreeNode, x: IForestFeatures, depth: number): number {
  if (node.isLeaf || node.splitFeature === undefined || node.splitValue === undefined) {
    return depth + avgPathLength(node.size);
  }
  if (x[node.splitFeature] < node.splitValue) {
    return pathLength(node.left!, x, depth + 1);
  }
  return pathLength(node.right!, x, depth + 1);
}

function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class IsolationForest {
  private trees: ITreeNode[] = [];
  private fitted = false;
  private n: number = 0;

  fit(data: IForestFeatures[]): void {
    this.n = data.length;
    this.trees = [];
    for (let t = 0; t < NUM_TREES; t++) {
      const rng = seededRng(t * 31337 + data.length);
      const subsampleSize = Math.min(SUBSAMPLE, data.length);
      const sample: IForestFeatures[] = [];
      const indices = Array.from({ length: data.length }, (_, i) => i);
      for (let i = 0; i < subsampleSize; i++) {
        const j = i + Math.floor(rng() * (indices.length - i));
        [indices[i], indices[j]] = [indices[j], indices[i]];
        sample.push(data[indices[i]]);
      }
      this.trees.push(buildTree(sample, 0, rng));
    }
    this.fitted = true;
  }

  /** Returns anomaly score in [0, 100].  Higher = more anomalous. */
  score(x: IForestFeatures): number {
    if (!this.fitted || this.trees.length === 0) return 50;
    const avgH = this.trees.reduce((s, t) => s + pathLength(t, x, 0), 0) / this.trees.length;
    const c = avgPathLength(Math.min(SUBSAMPLE, this.n));
    if (c === 0) return 50;
    const rawScore = Math.pow(2, -avgH / c);
    return Math.round(rawScore * 100);
  }
}

const HIGH_RISK_KEYWORDS = [
  "adjustment", "write-off", "write off", "override", "correction", "reversal",
  "manual", "miscellaneous", "misc", "suspense", "clearing", "rounding",
  "year-end", "year end", "quarter end", "month end", "accrual",
  "dummy", "test", "temp", "temporary", "intercompany", "related party",
];

export interface RawEntryForML {
  id: number;
  amount: string;
  postingTime: string | null;
  postedBy: string;
  description: string;
}

export function extractFeatures(
  entry: RawEntryForML,
  allEntries: RawEntryForML[],
): IForestFeatures {
  const amount = parseFloat(entry.amount);
  const normAmount = amount > 0 ? Math.log10(amount) : 0;

  let postingHour = 12;
  if (entry.postingTime) {
    const m = entry.postingTime.match(/(\d{1,2}):/);
    if (m) postingHour = parseInt(m[1], 10);
  }

  const total = allEntries.length;
  const userCount = allEntries.filter(e => e.postedBy === entry.postedBy).length;
  const userFreqRatio = total > 0 ? userCount / total : 0;

  const desc = entry.description.toLowerCase();
  const keywordHits = HIGH_RISK_KEYWORDS.filter(k => desc.includes(k)).length;

  const roundness = amount > 0 && amount % 1000 === 0 ? 1 : 0;

  return { normAmount, postingHour, userFreqRatio, keywordHits, roundness };
}

/**
 * Score all entries for an engagement using Isolation Forest.
 * Returns a map of entryId → anomaly score (0-100).
 */
export function runIsolationForest(entries: RawEntryForML[]): Map<number, number> {
  const scores = new Map<number, number>();
  if (entries.length < 3) {
    entries.forEach(e => scores.set(e.id, 50));
    return scores;
  }

  const features = entries.map(e => extractFeatures(e, entries));
  const forest = new IsolationForest();
  forest.fit(features);

  entries.forEach((e, i) => {
    scores.set(e.id, forest.score(features[i]));
  });

  return scores;
}
