// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";
import { TikTokenizer } from "./tikTokenizer";

const MODEL_PREFIX_TO_ENCODING: ReadonlyMap<string, string> = new Map([
  // chat
  ["gpt-4-", "cl100k_base"], // e.g., gpt-4-0314, etc., plus gpt-4-32k
  ["gpt-3.5-turbo-", "cl100k_base"] // e.g, gpt-3.5-turbo-0301, -0401, etc.
]);

const MODEL_TO_ENCODING: ReadonlyMap<string, string> = new Map([
  // chat
  ["gpt-4", "cl100k_base"],
  ["gpt-3.5-turbo", "cl100k_base"],
  // text
  ["text-davinci-003", "p50k_base"],
  ["text-davinci-002", "p50k_base"],
  ["text-davinci-001", "r50k_base"],
  ["text-curie-001", "r50k_base"],
  ["text-babbage-001", "r50k_base"],
  ["text-ada-001", "r50k_base"],
  ["davinci", "r50k_base"],
  ["curie", "r50k_base"],
  ["babbage", "r50k_base"],
  ["ada", "r50k_base"],
  // code
  ["code-davinci-002", "p50k_base"],
  ["code-davinci-001", "p50k_base"],
  ["code-cushman-002", "p50k_base"],
  ["code-cushman-001", "p50k_base"],
  ["davinci-codex", "p50k_base"],
  ["cushman-codex", "p50k_base"],
  // edit
  ["text-davinci-edit-001", "p50k_edit"],
  ["code-davinci-edit-001", "p50k_edit"],
  // embeddings
  ["text-embedding-ada-002", "cl100k_base"],
  // old embeddings
  ["text-similarity-davinci-001", "r50k_base"],
  ["text-similarity-curie-001", "r50k_base"],
  ["text-similarity-babbage-001", "r50k_base"],
  ["text-similarity-ada-001", "r50k_base"],
  ["text-search-davinci-doc-001", "r50k_base"],
  ["text-search-curie-doc-001", "r50k_base"],
  ["text-search-babbage-doc-001", "r50k_base"],
  ["text-search-ada-doc-001", "r50k_base"],
  ["code-search-babbage-code-001", "r50k_base"],
  ["code-search-ada-code-001", "r50k_base"],
  // open source
  ["gpt2", "gpt2"]
]);

const ENDOFTEXT: string = "<|endoftext|>";
const FIM_PREFIX: string = "<|fim_prefix|>";
const FIM_MIDDLE: string = "<|fim_middle|>";
const FIM_SUFFIX: string = "<|fim_suffix|>";
const ENDOFPROMPT: string = "<|endofprompt|>";

//regex pattern used before gpt-3.5-turbo
const REGEX_PATTERN_1: string =
  "'s|'t|'re|'ve|'m|'ll|'d| ?\\p{L}+| ?\\p{N}+| ?[^\\s\\p{L}\\p{N}]+|\\s+(?!\\S)|\\s+";
//regex pattern used after gpt-3.5-turbo
const REGEX_PATTERN_2: string =
  "(?:'s|'S|'t|'T|'re|'RE|'Re|'eR|'ve|'VE|'vE|'Ve|'m|'M|'ll|'lL|'Ll|'LL|'d|'D)|[^\\r\\n\\p{L}\\p{N}]?\\p{L}+|\\p{N}{1,3}| ?[^\\s\\p{L}\\p{N}]+[\\r\\n]*|\\s*[\\r\\n]+|\\s+(?!\\S)|\\s+";

function getFilenameFromUrl(url: string): string {
  const parts = url.split("/");
  const filename = parts[parts.length - 1];
  return filename;
}

function getEncoderFromModelName(modelName: string): string {
  let encoder = "";
  if (!MODEL_TO_ENCODING.has(modelName)) {
    for (const [prefix, encoding] of MODEL_PREFIX_TO_ENCODING) {
      if (modelName.startsWith(prefix)) {
        encoder = encoding;
        break;
      }
    }
  } else {
    encoder = MODEL_TO_ENCODING.get(modelName)!;
  }
  return encoder;
}

async function fetchAndSaveFile(
  mergeableRanksFileUrl: string,
  filePath: string
): Promise<void> {
  const response = await fetch(mergeableRanksFileUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch file from ${mergeableRanksFileUrl}. Status code: ${response.status}`
    );
  }

  const text = await response.text();
  fs.writeFileSync(filePath, text);
}

/**
 * Get the special tokens from the encoder name
 * @param encoder encoder name
 * @returns Map<string, number> special tokens mapping
 */
export function getSpecialTokensByEncoder(
  encoder: string
): Map<string, number> {
  let specialTokens: Map<string, number> = new Map([[ENDOFTEXT, 50256]]);
  switch (encoder) {
    case "cl100k_base":
      specialTokens = new Map([
        [ENDOFTEXT, 100257],
        [FIM_PREFIX, 100258],
        [FIM_MIDDLE, 100259],
        [FIM_SUFFIX, 100260],
        [ENDOFPROMPT, 100276]
      ]);
      break;
    case "p50k_edit":
      specialTokens = new Map([
        [ENDOFTEXT, 50256],
        [FIM_PREFIX, 50281],
        [FIM_MIDDLE, 50282],
        [FIM_SUFFIX, 50283]
      ]);
      break;
    default:
      break;
  }
  return specialTokens;
}

/**
 * Get the special tokens from the model name
 * @param modelName model name
 * @returns Map<string, number> special tokens mapping
 */
export function getSpecialTokensByModel(
  modelName: string
): Map<string, number> {
  let encoderName = getEncoderFromModelName(modelName);
  let specialTokens: Map<string, number> = getSpecialTokensByEncoder(
    encoderName
  );
  return specialTokens;
}

/**
 * Create a tokenizer from a model name
 * @param modelName model name
 * @param extraSpecialTokens extra special tokens
 */
export async function createByModelName(
  modelName: string,
  extraSpecialTokens: ReadonlyMap<string, number> | null = null
): Promise<TikTokenizer> {
  return createByEncoderName(
    getEncoderFromModelName(modelName),
    extraSpecialTokens
  );
}

/**
 * Create a tokenizer from an encoder name
 * @param encoderName encoder name
 * @param extraSpecialTokens extra special tokens
 * @returns TikTokenizer tokenizer
 */
export async function createByEncoderName(
  encoderName: string,
  extraSpecialTokens: ReadonlyMap<string, number> | null = null
): Promise<TikTokenizer> {
  let regexPattern: string;
  let mergeableRanksFileUrl: string;
  let specialTokens: Map<string, number> = getSpecialTokensByEncoder(
    encoderName
  );

  switch (encoderName) {
    case "cl100k_base":
      regexPattern = REGEX_PATTERN_2;
      mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken`;
      break;
    case "p50k_base":
      regexPattern = REGEX_PATTERN_1;
      mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/p50k_base.tiktoken`;
      break;
    case "p50k_edit":
      regexPattern = REGEX_PATTERN_1;
      mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/p50k_base.tiktoken`;
      break;
    case "r50k_base":
      regexPattern = REGEX_PATTERN_1;
      mergeableRanksFileUrl = `https://openaipublic.blob.core.windows.net/encodings/r50k_base.tiktoken`;
      break;
    case "gpt2":
      regexPattern = REGEX_PATTERN_1;
      mergeableRanksFileUrl = `https://pythia.blob.core.windows.net/public/encoding/gpt2.tiktoken`;
      break;
    default:
      throw new Error(`Doesn't support this encoder [${encoderName}]`);
  }

  if (extraSpecialTokens !== null) {
    specialTokens = new Map([...specialTokens, ...extraSpecialTokens]);
  }

  const fileName = getFilenameFromUrl(mergeableRanksFileUrl);
  const dirPath = path.resolve(__dirname, "..", "model");
  // Create the directory if it doesn't exist
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  await fetchAndSaveFile(
    mergeableRanksFileUrl,
    path.resolve(dirPath, fileName)
  );
  return createTokenizer(fileName, specialTokens, regexPattern);
}

/**
 * Create a tokenizer from a file
 * @param tikTokenBpeFile BPE rank file in tiktoken format
 * @param specialTokensEncoder special tokens mapping
 * @param regexPattern regex pattern
 * @param cacheSize cache size
 * @returns TikTokenizer tokenizer
 */
export function createTokenizer(
  tikTokenBpeFile: string,
  specialTokensEncoder: ReadonlyMap<string, number>,
  regexPattern: string,
  cacheSize: number = 8192
): TikTokenizer {
  const tikTokenizer = new TikTokenizer(
    tikTokenBpeFile,
    specialTokensEncoder,
    regexPattern,
    cacheSize
  );
  return tikTokenizer;
}
