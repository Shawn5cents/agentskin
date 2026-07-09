import type { ClassificationResult, CompiledRule, JsonRule, ToolExecutionInput } from "../types.js";

import { getGitSubcommand } from "./command-identity.js";
import { deriveCommandMatchCandidates, type CommandMatchCandidate } from "./command-match.js";

function includesAll(argv: string[], expected: string[]): boolean {
  return expected.every((part) => argv.includes(part));
}

function isWordLikeChar(char: string | undefined): boolean {
  return typeof char === "string" && /[A-Za-z0-9_]/u.test(char);
}

function includesCommandPart(command: string, part: string): boolean {
  if (!part) {
    return true;
  }

  let fromIndex = 0;
  while (fromIndex <= command.length) {
    const index = command.indexOf(part, fromIndex);
    if (index === -1) {
      return false;
    }

    const end = index + part.length;
    const partStartsWord = isWordLikeChar(part[0]);
    const partEndsWord = isWordLikeChar(part.at(-1));
    const prev = index > 0 ? command[index - 1] : undefined;
    const next = end < command.length ? command[end] : undefined;
    const leftBoundaryOk = !partStartsWord || !isWordLikeChar(prev);
    const rightBoundaryOk = !partEndsWord || !isWordLikeChar(next);

    if (leftBoundaryOk && rightBoundaryOk) {
      return true;
    }

    fromIndex = index + 1;
  }

  return false;
}

/**
 * Extract the first HTTP(S) URL from the input's argv or command.
 */
function extractUrlFromInput(input: ToolExecutionInput): string | undefined {
  const argv = input.argv ?? [];
  for (const arg of argv) {
    if (arg.startsWith("http://") || arg.startsWith("https://")) {
      return arg;
    }
  }
  const command = input.command ?? "";
  const urlMatch = command.match(/https?:\/\/[^\s"'`$]+/u);
  if (urlMatch) {
    return urlMatch[0];
  }
  return undefined;
}

/**
 * Check if a URL satisfies a rule's urlIncludes / urlIncludesAny match criteria.
 */
function matchesUrlRule(url: string | undefined, rule: JsonRule): boolean {
  if (!rule.match.urlIncludes && !rule.match.urlIncludesAny) {
    return true; // no URL criteria means URL matching is not required
  }
  if (!url) {
    return false; // URL criteria exists but no URL found
  }
  const urlLower = url.toLowerCase();
  if (rule.match.urlIncludes && !rule.match.urlIncludes.every((part) => urlLower.includes(part.toLowerCase()))) {
    return false;
  }
  if (rule.match.urlIncludesAny && !rule.match.urlIncludesAny.some((part) => urlLower.includes(part.toLowerCase()))) {
    return false;
  }
  return true;
}

type RuleLike = JsonRule | CompiledRule;

type RuleMatchSelection<T extends RuleLike> = {
  rule: T;
  candidate: CommandMatchCandidate;
};

export type ResolvedRuleMatch<T extends RuleLike = RuleLike> = {
  rule: T;
  candidate: CommandMatchCandidate;
  candidateInput: ToolExecutionInput;
  classification: ClassificationResult;
};

function getJsonRule(rule: RuleLike): JsonRule {
  return "rule" in rule ? rule.rule : rule;
}

function usesCommandTextMatcher(ruleLike: RuleLike): boolean {
  const rule = getJsonRule(ruleLike);
  return Boolean(rule.match.commandIncludes || rule.match.commandIncludesAny);
}

function isBuiltinRule(ruleLike: RuleLike): boolean {
  return "source" in ruleLike && ruleLike.source === "builtin";
}

function getCandidatePriority(candidate: CommandMatchCandidate): number {
  switch (candidate.source) {
    case "effective":
      return 2;
    case "shell-body":
      return 1;
    case "original":
    default:
      return 0;
  }
}

function applyCommandMatchCandidate(input: ToolExecutionInput, candidate: CommandMatchCandidate): ToolExecutionInput {
  const { command: _command, ...rest } = input;
  return {
    ...rest,
    ...(candidate.command ? { command: candidate.command } : {}),
    argv: candidate.argv,
  };
}

export function matchesRule(ruleLike: RuleLike, input: ToolExecutionInput): boolean {
  const rule = getJsonRule(ruleLike);
  const argv = input.argv ?? [];
  const command = input.command ?? "";
  const toolName = input.toolName;

  if (rule.match.toolNames && !rule.match.toolNames.includes(toolName)) {
    return false;
  }

  if (rule.match.argv0 && !rule.match.argv0.includes(argv[0] ?? "")) {
    return false;
  }

  if (rule.match.gitSubcommands && !rule.match.gitSubcommands.includes(getGitSubcommand(argv) ?? "")) {
    return false;
  }

  if (rule.match.argvIncludes && !rule.match.argvIncludes.every((parts) => includesAll(argv, parts))) {
    return false;
  }

  if (rule.match.argvIncludesAny && !rule.match.argvIncludesAny.some((parts) => includesAll(argv, parts))) {
    return false;
  }

  if (rule.match.commandIncludes && !rule.match.commandIncludes.every((part) => includesCommandPart(command, part))) {
    return false;
  }

  if (rule.match.commandIncludesAny && !rule.match.commandIncludesAny.some((part) => includesCommandPart(command, part))) {
    return false;
  }

  if (!matchesUrlRule(extractUrlFromInput(input), rule)) {
    return false;
  }

  return true;
}

function scoreRule(ruleLike: RuleLike): number {
  const rule = getJsonRule(ruleLike);
  return (
    (rule.priority ?? 0) * 1000
    + (rule.match.argv0?.length ?? 0) * 100
    + (rule.match.gitSubcommands?.length ?? 0) * 60
    + (rule.match.argvIncludes?.reduce((sum, parts) => sum + parts.length, 0) ?? 0) * 40
    + (rule.match.argvIncludesAny?.reduce((sum, parts) => sum + parts.length, 0) ?? 0) * 35
    + (rule.match.commandIncludes?.length ?? 0) * 25
    + (rule.match.commandIncludesAny?.length ?? 0) * 20
    + (rule.match.toolNames?.length ?? 0) * 10
    + (rule.match.urlIncludes?.length ?? 0) * 30
    + (rule.match.urlIncludesAny?.length ?? 0) * 25
  );
}

function compareSelections(left: RuleMatchSelection<RuleLike>, right: RuleMatchSelection<RuleLike>): number {
  const scoreDiff = scoreRule(right.rule) - scoreRule(left.rule);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const candidateDiff = getCandidatePriority(right.candidate) - getCandidatePriority(left.candidate);
  if (candidateDiff !== 0) {
    return candidateDiff;
  }

  return getJsonRule(left.rule).id.localeCompare(getJsonRule(right.rule).id);
}

export function findBestRuleMatch<T extends RuleLike>(
  input: ToolExecutionInput,
  rules: T[],
): RuleMatchSelection<T> | undefined {
  const candidates = deriveCommandMatchCandidates(input);
  const highestCandidatePriority = Math.max(...candidates.map(getCandidatePriority));
  const specificMatches: Array<RuleMatchSelection<T>> = [];
  let fallbackSelection: RuleMatchSelection<T> | undefined;

  for (const candidate of candidates) {
    const candidateInput = applyCommandMatchCandidate(input, candidate);

    for (const rule of rules) {
      if (!matchesRule(rule, candidateInput)) {
        continue;
      }

      if (getJsonRule(rule).id === "generic/fallback") {
        fallbackSelection ??= { rule, candidate };
        continue;
      }

      if (isBuiltinRule(rule) && usesCommandTextMatcher(rule) && getCandidatePriority(candidate) < highestCandidatePriority) {
        continue;
      }

      specificMatches.push({ rule, candidate });
    }
  }

  if (specificMatches.length > 0) {
    return [...specificMatches].sort(compareSelections)[0];
  }

  return fallbackSelection;
}

function buildClassificationResult(
  ruleLike: RuleLike,
  candidate: CommandMatchCandidate,
): ClassificationResult {
  const rule = getJsonRule(ruleLike);
  return {
    family: rule.family,
    confidence: rule.id === "generic/fallback" ? 0.2 : 0.9,
    matchedReducer: rule.id,
    matchedVia: candidate.source,
    matchedCommand: candidate.command ?? candidate.argv.join(" "),
  };
}

export function resolveRuleMatch<T extends RuleLike>(
  input: ToolExecutionInput,
  rules: T[],
): ResolvedRuleMatch<T> | undefined {
  const match = findBestRuleMatch(input, rules);
  if (!match) {
    return undefined;
  }

  const candidateInput = applyCommandMatchCandidate(input, match.candidate);
  return {
    rule: match.rule,
    candidate: match.candidate,
    candidateInput,
    classification: buildClassificationResult(match.rule, match.candidate),
  };
}

export function classifyExecution(
  input: ToolExecutionInput,
  rules: RuleLike[],
  forcedRuleId?: string,
): ClassificationResult {
  if (forcedRuleId) {
    const forcedRule = rules.find((rule) => getJsonRule(rule).id === forcedRuleId);
    if (forcedRule) {
      const forced = getJsonRule(forcedRule);
      return {
        family: forced.family,
        confidence: 1,
        matchedReducer: forced.id,
      };
    }
  }

  const resolved = resolveRuleMatch(input, rules);
  if (!resolved) {
    return {
      family: "generic",
      confidence: 0.2,
    };
  }

  return resolved.classification;
}
