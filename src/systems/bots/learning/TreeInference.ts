/**
 * Pure-TS inference for an XGBoost binary-logistic classifier
 * exported via Booster.save_model(). Walks the JSON tree dump
 * directly — no native bindings, no Python at runtime.
 *
 * Format we consume is xgboost's standard JSON model (≥2.0):
 *   { learner: { gradient_booster: { model: { trees: [...] } } } }
 * wrapped inside our own header in train.py:
 *   { trainingMeta: {...}, xgboost: <raw> }
 *
 * This file only handles a subset of xgboost features —
 * specifically the binary:logistic objective with default tree
 * structure ('hist' or 'exact', any depth). Categorical splits and
 * missing-value handling fall back to "go right" which matches
 * xgboost's default for our pipeline (we never feed NaN).
 */

interface XgbNode {
  // Leaf node:
  leaf?: number;
  // Internal node:
  split_feature?: number;
  split_condition?: number;
  yes?: number;     // index of left child in the same tree
  no?: number;      // index of right child
  default_left?: boolean;
}

interface XgbTreeRaw {
  // xgboost JSON dumps trees as parallel arrays. We compile them
  // into XgbNode[] at load time for cleaner traversal.
  base_weights?: number[];
  default_left?: number[];
  left_children?: number[];
  loss_changes?: number[];
  parents?: number[];
  right_children?: number[];
  split_conditions?: number[];
  split_indices?: number[];
  split_type?: number[];
  sum_hessian?: number[];
  tree_param?: { num_nodes?: string };
}

export interface CompiledTree {
  nodes: XgbNode[];
  rootIdx: number;
}

export interface CompiledModel {
  trees: CompiledTree[];
  baseScore: number;
  stateDim: number;
  actionDim: number;
  totalDim: number;
}

/** Parse the wrapped JSON we write in ml/train.py and compile the
 *  parallel-array tree representation into per-node objects we can
 *  walk recursively. */
export function compileModel(json: any): CompiledModel {
  const meta = json.trainingMeta;
  if (!meta) throw new Error('TreeInference: missing trainingMeta header — was this saved by ml/train.py?');
  const xgb = json.xgboost;
  if (!xgb || !xgb.learner) throw new Error('TreeInference: missing xgboost.learner');

  const learner = xgb.learner;
  // xgboost ≥3.0 stores base_score as a stringified JSON array
  // ("[2.98e-1]"), not a plain float. Older versions used a plain
  // float. Strip brackets if present.
  const rawBase = learner.learner_model_param?.base_score ?? '0.5';
  const baseScoreStr = typeof rawBase === 'string' ? rawBase.replace(/^\[|\]$/g, '') : String(rawBase);
  const baseScore = parseFloat(baseScoreStr);
  if (!Number.isFinite(baseScore)) {
    throw new Error(`TreeInference: could not parse base_score "${rawBase}"`);
  }

  const trees: CompiledTree[] = [];
  const treeArr = learner.gradient_booster?.model?.trees ?? [];
  for (const t of treeArr as XgbTreeRaw[]) {
    const numNodes = parseInt(t.tree_param?.num_nodes ?? '0', 10);
    const left = t.left_children ?? [];
    const right = t.right_children ?? [];
    const splitIdx = t.split_indices ?? [];
    const splitCond = t.split_conditions ?? [];
    const baseW = t.base_weights ?? [];
    const defLeft = t.default_left ?? [];
    const nodes: XgbNode[] = [];
    for (let i = 0; i < numNodes; i++) {
      // Leaf nodes have no children: left_children[i] === -1.
      if (left[i] === -1) {
        nodes.push({ leaf: baseW[i] });
      } else {
        nodes.push({
          split_feature: splitIdx[i],
          split_condition: splitCond[i],
          yes: left[i],
          no: right[i],
          default_left: defLeft[i] === 1,
        });
      }
    }
    trees.push({ nodes, rootIdx: 0 });
  }

  return {
    trees,
    baseScore,
    stateDim: meta.stateDim,
    actionDim: meta.actionDim,
    totalDim: meta.totalDim,
  };
}

/** Score a single feature vector. Returns P(win) ∈ (0,1).
 *  `features.length` must equal model.totalDim. */
export function predict(features: number[], model: CompiledModel): number {
  // xgboost binary:logistic accumulates leaf weights, then sigmoids.
  let sum = 0;
  for (const tree of model.trees) {
    let i = tree.rootIdx;
    const nodes = tree.nodes;
    while (true) {
      const node = nodes[i];
      if (node.leaf !== undefined) { sum += node.leaf; break; }
      const v = features[node.split_feature!];
      // xgboost convention: condition holds (go yes/left) when
      // feature < split_condition. Note: pre-2.0 used `>=` — our
      // 2.0+ output is `<`. Verify if a model trained with a
      // different version stops matching this.
      i = v < node.split_condition! ? node.yes! : node.no!;
    }
  }
  // base_score for binary:logistic is the log-odds prior; xgb's
  // 2.0+ format stores it as the post-sigmoid prior (~0.5 when
  // class-balanced). Convert to logit, add tree contributions,
  // sigmoid.
  const baseLogit = Math.log(model.baseScore / (1 - model.baseScore));
  const total = baseLogit + sum;
  return 1 / (1 + Math.exp(-total));
}
