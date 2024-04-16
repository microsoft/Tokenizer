// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as fs from "fs";
import { LRUCache } from "lru-cache";
import { TextDecoder } from "util";
import { BinaryMap, bytePairEncode } from "./bytePairEncode";
import { makeTextEncoder } from './textEncoder';

/**
 * Load BPE ranks from a file
 * @param tikTokenBpeFile BPE file path
 * @returns Map<Uint8Array, number> BPE ranks
 */
function loadTikTokenBpe(tikTokenBpeFile: string): Map<Uint8Array, number> {
  const bpeDict = new Map<Uint8Array, number>();
  try {
    const fileContent = fs.readFileSync(tikTokenBpeFile, "utf-8");
    processBpeRanks(fileContent);
    return bpeDict;
  } catch (ex) {
    throw new Error(`Failed to load from BPE encoder file stream: ${ex}`);
  }

  function processBpeRanks(fileContent: string) {
    for (const line of fileContent.split(/[\r\n]+/)) {
      if (line.trim() === "") {
        continue;
      }

      const tokens = line.split(" ");
      if (tokens.length !== 2) {
        throw new Error("Invalid format in the BPE encoder file stream");
      }

      const tokenBytes = new Uint8Array(Buffer.from(tokens[0], "base64"));
      const rank = parseInt(tokens[1]);
      if (!isNaN(rank)) {
        bpeDict.set(tokenBytes, rank);
      } else {
        throw new Error(`Can't parse ${tokens[1]} to integer`);
      }
    }
  }
}

/**
 * Escape special characters in a regex string
 * @param regex regex string
 */
function escapeRegExp(regex: string) {
  return regex.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * This is a Typescript version of OpenAI's tiktoken implementation of
 * Byte pair encoding(BPE): https://en.wikipedia.org/wiki/Byte_pair_encoding,
 * the goal is to support context tokenization for OpenAI large language models in .NET runtime.
 * Reference: https://github.com/openai/tiktoken/blob/main/src/lib.rs
 */
export class TikTokenizer {
  private regex?: RegExp;
  private encoder?: BinaryMap<number>;
  private decoder?: Map<number, Uint8Array>;
  private specialTokensRegex?: RegExp;
  private specialTokensEncoder?: ReadonlyMap<string, number>;
  private specialTokensDecoder?: Map<number, string>;
  private textEncoder = makeTextEncoder();
  private textDecoder = new TextDecoder("utf-8");
  public readonly cache: LRUCache<string, number[]>;

  /**
   * Take the encoder tokens mapping from OpenAI tiktoken dump to build the encoder
   * For gpt-3.5-turbo/gpt4, you can download the BPE tokens mapping from:
   * https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken
   * @param tikTokenBpeFile BPE rank file path
   * @param specialTokensEncoder special tokens encoder
   * @param regexPattern regex pattern to split the input text
   * @param cacheSize cache size
   */
  constructor(
    tikTokenBpeFile: string,
    specialTokensEncoder: ReadonlyMap<string, number>,
    regexPattern: string,
    cacheSize: number = 8192
  ) {
    const options = { max: cacheSize };
    this.cache = new LRUCache(options);
    const bpeDict = loadTikTokenBpe(tikTokenBpeFile);
    this.init(bpeDict, specialTokensEncoder, regexPattern);
  }

  protected init(
    bpeDict: ReadonlyMap<Uint8Array, number>,
    specialTokensEncoder: ReadonlyMap<string, number>,
    regexPattern: string
  ): void {
    this.encoder = new BinaryMap();
    for (const [key, value] of bpeDict) {
      this.encoder.set(key, value);
    }
    this.regex = new RegExp(regexPattern, "gu");
    this.specialTokensRegex = new RegExp(
      Array.from(specialTokensEncoder.keys())
        .map(s => escapeRegExp(s))
        .join("|")
    );
    this.specialTokensEncoder = specialTokensEncoder;

    this.decoder = new Map<number, Uint8Array>();
    for (const [key, value] of bpeDict) {
      this.decoder.set(value, key);
    }

    if (bpeDict.size !== this.decoder.size) {
      throw new Error("Encoder and decoder sizes do not match");
    }

    this.specialTokensDecoder = new Map<number, string>();
    for (const [key, value] of specialTokensEncoder) {
      this.specialTokensDecoder.set(value, key);
    }
  }

  private findNextSpecialToken(
    text: string,
    start: number,
    allowedSpecial?: ReadonlyArray<string>
  ): [RegExpMatchArray | null, number] {
    let startFind = start;
    let nextSpecial: RegExpMatchArray | null = null;
    if (allowedSpecial && this.specialTokensRegex) {
      while (true) {
        nextSpecial = text.slice(startFind).match(this.specialTokensRegex);
        if (!nextSpecial) {
          break;
        }
        if (allowedSpecial && allowedSpecial.includes(nextSpecial[0])) {
          break;
        }
        startFind += nextSpecial.index! + 1;
      }
    }
    const end = nextSpecial ? startFind + nextSpecial.index! : text.length;
    return [nextSpecial, end];
  }

  /**
   * Encode a string with a set of allowed special tokens that are not broken apart.
   * @param text text to encode
   * @param allowedSpecial allowed special tokens
   * @returns number[] encoded token ids
   */
  public encode(
    text: string,
    allowedSpecial?: ReadonlyArray<string>
  ): number[] {
    const tokenIds: number[] = [];
    let start = 0;
    while (true) {
      let nextSpecial: RegExpMatchArray | null;
      let end: number;
      [nextSpecial, end] = this.findNextSpecialToken(
        text,
        start,
        allowedSpecial
      );
      if (end > start) {
        this.encodeByIndex(text, tokenIds, start, end);
      }

      if (nextSpecial) {
        start = start + this.encodeSpecialToken(tokenIds, nextSpecial);
        if (start >= text.length) {
          break;
        }
      } else {
        break;
      }
    }

    return tokenIds;
  }

  private encodeSpecialToken(
    tokenIds: number[],
    nextSpecial: RegExpMatchArray
  ): number {
    const token = this.specialTokensEncoder?.get(nextSpecial[0]);
    tokenIds.push(token!);
    return nextSpecial.index! + nextSpecial[0].length;
  }

  private encodeByIndex(
    text: string,
    tokenIds: number[],
    start: number,
    end: number
  ): void {
    let match: RegExpExecArray | null;
    const substring = text.substring(start, end);
    this.regex!.lastIndex = 0;
    while ((match = this.regex!.exec(substring))) {
      const cached = this.cache.get(match[0]);
      if (cached) {
        tokenIds.push(...cached);
      } else {
        // cache miss
        const bytes = this.textEncoder.encode(match[0]);
        const token = this.encoder?.get(bytes, 0, this.textEncoder.length);
        if (token !== undefined) {
          tokenIds.push(token);
          this.cache.set(match[0], [token]);
        } else {
          const encodedTokens = bytePairEncode(bytes, this.encoder!, this.textEncoder.length);
          tokenIds.push(...encodedTokens);
          this.cache.set(match[0], encodedTokens);
        }
      }
    }
  }

  private encodeTrimSuffixByIndex(
    text: string,
    tokenIds: number[],
    start: number,
    end: number,
    maxTokenCount: number,
    tokenCount: number,
    encodeLength: number
  ): { tokenCount: number; encodeLength: number } {
    let match: RegExpExecArray | null;
    const substring = text.substring(start, end);
    this.regex!.lastIndex = 0;
    while ((match = this.regex!.exec(substring))) {
      const piece = match[0];
      if (this.cache.has(piece)) {
        let tokens = this.cache.get(piece);
        if (tokenCount + tokens!.length <= maxTokenCount) {
          tokenCount += tokens!.length;
          encodeLength += piece.length;
          tokenIds.push(...tokens!);
        } else {
          let remainingTokens = maxTokenCount - tokenCount;
          tokenCount += remainingTokens;
          encodeLength += piece.length;
          tokenIds.push(...tokens!.slice(0, remainingTokens));
          break;
        }
      } else {
        // cache miss
        const bytes = this.textEncoder.encode(piece);
        const token = this.encoder!.get(bytes, 0, bytes.length);
        if (token !== undefined) {
          this.cache.set(piece, [token]);
          if (tokenCount + 1 <= maxTokenCount) {
            tokenCount++;
            encodeLength += piece.length;
            tokenIds.push(token);
          } else {
            break;
          }
        } else {
          const encodedTokens = bytePairEncode(bytes, this.encoder!, this.textEncoder.length);
          this.cache.set(piece, encodedTokens);
          if (tokenCount + encodedTokens.length <= maxTokenCount) {
            tokenCount += encodedTokens.length;
            encodeLength += piece.length;
            tokenIds.push(...encodedTokens);
          } else {
            let remainingTokens = maxTokenCount - tokenCount;
            tokenCount += remainingTokens;
            encodeLength += piece.length;
            tokenIds.push(...encodedTokens.slice(0, remainingTokens));
            break;
          }
        }
      }
      if (tokenCount >= maxTokenCount) {
        break;
      }
    }

    return { tokenCount, encodeLength };
  }

  /**
   * Encode a piece of text limited by max token count through trimming suffix
   * @param text text to encode
   * @param maxTokenCount max token count
   * @param allowedSpecial allowed special tokens
   * @returns { tokenIds: number[], text: string } encoded token ids and trimmed text
   */
  public encodeTrimSuffix(
    text: string,
    maxTokenCount: number,
    allowedSpecial: ReadonlyArray<string>
  ): { tokenIds: number[]; text: string } {
    const tokenIds: number[] = [];

    let start = 0;
    let tokenCount = 0;
    let encodeLength = 0;
    while (true) {
      let nextSpecial: RegExpMatchArray | null;
      let end: number;
      [nextSpecial, end] = this.findNextSpecialToken(
        text,
        start,
        allowedSpecial
      );

      if (end > start) {
        const {
          tokenCount: newTokenCount,
          encodeLength: newEncodeLength
        } = this.encodeTrimSuffixByIndex(
          text,
          tokenIds,
          start,
          end,
          maxTokenCount,
          tokenCount,
          encodeLength
        );
        tokenCount = newTokenCount;
        encodeLength = newEncodeLength;

        if (tokenCount >= maxTokenCount) {
          break;
        }
      }

      if (nextSpecial !== null) {
        tokenCount++;
        if (tokenCount <= maxTokenCount) {
          start = start + this.encodeSpecialToken(tokenIds, nextSpecial!);
          encodeLength += nextSpecial![0].length;
          if (start >= text.length) {
            break;
          }
        }
        if (tokenCount >= maxTokenCount) {
          break;
        }
      } else {
        break;
      }
    }

    const encodedText =
      encodeLength === text.length ? text : text.slice(0, encodeLength);

    return { tokenIds, text: encodedText };
  }

  /**
   * Encode a piece of text limited by max token count through trimming prefix
   * @param text text to encode
   * @param maxTokenCount max token count
   * @param allowedSpecial allowed special tokens
   * @returns { tokenIds: number[], text: string } encoded token ids and trimmed text
   */
  public encodeTrimPrefix(
    text: string,
    maxTokenCount: number,
    allowedSpecial?: ReadonlyArray<string>
  ): { tokenIds: number[]; text: string } {
    const tokenIds: number[] = [];

    let start = 0;
    let tokenCount = 0;
    let encodeLength = 0;
    const tokenCountMap = new Map<number, number>();
    tokenCountMap.set(tokenCount, encodeLength);
    while (true) {
      let nextSpecial: RegExpMatchArray | null;
      let end: number;
      [nextSpecial, end] = this.findNextSpecialToken(
        text,
        start,
        allowedSpecial
      );

      if (end > start) {
        let match: RegExpExecArray | null;
        const substring = text.substring(start, end);
        this.regex!.lastIndex = 0;
        while ((match = this.regex!.exec(substring))) {
          const piece = match[0];

          if (this.cache.has(piece)) {
            let tokens = this.cache.get(piece);
            tokenCount += tokens!.length;
            encodeLength += piece.length;
            tokenIds.push(...tokens!);
            tokenCountMap.set(tokenCount, encodeLength);
          } else {
            const bytes = this.textEncoder.encode(piece);
            const token = this.encoder!.get(bytes);
            if (token !== undefined) {
              this.cache.set(piece, [token]);
              tokenCount++;
              encodeLength += piece.length;
              tokenIds.push(token);
              tokenCountMap.set(tokenCount, encodeLength);
            } else {
              const encodedTokens = bytePairEncode(bytes, this.encoder!, this.textEncoder.length);
              this.cache.set(piece, encodedTokens);
              tokenCount += encodedTokens.length;
              encodeLength += piece.length;
              tokenIds.push(...encodedTokens);
              tokenCountMap.set(tokenCount, encodeLength);
            }
          }
        }
      }

      if (nextSpecial !== null) {
        start = start + this.encodeSpecialToken(tokenIds, nextSpecial);
        tokenCount++;
        encodeLength += nextSpecial[0].length;
        tokenCountMap.set(tokenCount, encodeLength);
        if (start >= text.length) {
          break;
        }
      } else {
        break;
      }
    }

    if (tokenCount <= maxTokenCount) {
      return { tokenIds, text };
    }

    const prefixTokenCount = tokenCount - maxTokenCount;
    let actualPrefixTokenCount = 0;
    let actualPrefixStrLength = 0;
    for (const [key, value] of tokenCountMap) {
      if (key >= prefixTokenCount) {
        actualPrefixTokenCount = key;
        actualPrefixStrLength = value;
        break;
      }
    }

    // Naive approach if chunks are incorrect
    if (actualPrefixTokenCount > maxTokenCount) {
      const encodedTokens = this.encode(text, allowedSpecial);
      const slicedTokens = encodedTokens.slice(encodedTokens.length - maxTokenCount);
      return {
        tokenIds: slicedTokens,
        text: this.decode(slicedTokens)
      };
    }

    return {
      tokenIds: tokenIds.slice(actualPrefixTokenCount),
      text: text.slice(actualPrefixStrLength)
    };
  }

  /**
   * Decode an array of integer token ids
   * @param tokens array of integer token ids
   * @returns string decoded text
   */
  public decode(tokens: number[]): string {
    const decoded: number[] = [];
    for (const token of tokens) {
      let tokenBytes: number[] = [];
      const value = this.decoder?.get(token);
      if (value !== undefined) {
        tokenBytes = Array.from(value);
      } else {
        const specialTokenValue = this.specialTokensDecoder?.get(token);
        if (specialTokenValue !== undefined) {
          const bytes = this.textEncoder.encode(specialTokenValue);
          tokenBytes = Array.from(bytes.subarray(0, this.textEncoder.length));
        }
      }
      decoded.push(...tokenBytes);
    }

    return this.textDecoder.decode(new Uint8Array(decoded));
  }
}
