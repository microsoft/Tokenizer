// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const enum Constant {
  // We have 48 bits per level in the map (Number.MAX_SAFE_INTEGER is 52 bits)
  // so we bitwise encode 32 bits at a time, working in two passes.
  BytesPerLevel = 6,
  // Max rank sequences can have during the ranking process. The max int32,
  // to keep things in integer land.
  MaxRank = 0x7FFFFFFF
}

// exported for testing
export const binaryMapKey = (k: Uint8Array, start: number, end: number): number => {
  const length = end - start;

  // 'lower' and 'upper' are both 24-bit integers, like
  //    0xFF FF FF
  //      ^3 ^2 ^1
  // If we say have a length of 2, we should disregard the last "3" byte, so we
  // create a mask like
  //    0x00 FF FF  (started at 0xFF FF FF and shifted over by 8 bits)
  //      ^3 ^2 ^1
  // so that we discard the data outside our range
  const lowerMask = 0xFFFFFF >>> Math.max(0, (3 - length) * 8);
  const lower = (k[start + 0] | (k[start + 1] << 8) | (k[start + 2] << 16)) & lowerMask;

  const upperMask = 0xFFFFFF >>> Math.min(31, Math.max(0, (6 - length) * 8));
  const upper = (k[start + 3] | (k[start + 4] << 8) | (k[start + 5] << 16)) & upperMask;
  return lower + (0x1000000 * upper);
};

export class BinaryMap<V> {
  private readonly nested: Map<number, BinaryMap<V>> = new Map();
  private readonly final: Map<number, V> = new Map();

  public get(key: Uint8Array, start: number = 0, end: number = key.length): V | undefined {
    const isFinal = end < Constant.BytesPerLevel + start;
    const mapKey = binaryMapKey(key, start, end);
    if (isFinal) {
      return this.final.get(mapKey);
    }

    return this.nested.get(mapKey)?.get(key, Constant.BytesPerLevel + start, end);
  }

  public set(key: Uint8Array, value: V): void {
    const k = binaryMapKey(key, 0, key.length);
    const isFinal = key.length < Constant.BytesPerLevel;
    if (isFinal) {
      this.final.set(k, value);
      return;
    }

    const existing = this.nested.get(k);
    if (existing instanceof BinaryMap) {
      existing.set(key.subarray(Constant.BytesPerLevel), value);
    } else {
      const newMap = new BinaryMap<V>();
      newMap.set(key.subarray(Constant.BytesPerLevel), value);
      this.nested.set(k, newMap);
    }
  }
}

let ranksBuf = new Int32Array(128);
let indicesBuf = new Int32Array(128);

/**
 * This function implements the byte pair encoding algorithm.
 * @param mergingBytes: bytes to be merged
 * @param ranks: BPE rank for the bytes
 * @returns number[]: Encoded token ids
 */
export function bytePairEncode(
  mergingBytes: Uint8Array,
  ranks: BinaryMap<number>,
  length: number,
): number[] {
  if (length === 1) {
    return [ranks.get(mergingBytes)!];
  }

  let minRank = Constant.MaxRank;
  let minIndex = -1;
  while (ranksBuf.length < length * 2) {
    indicesBuf = new Int32Array(indicesBuf.length * 2);
    ranksBuf = new Int32Array(ranksBuf.length * 2);
  }

  for (let i = 0; i < length - 1; i++) {
    const rank = ranks.get(mergingBytes, i, i + 2) ?? Constant.MaxRank;
    if (rank < minRank) {
      minRank = rank;
      minIndex = i;
    }

    indicesBuf[i] = i;
    ranksBuf[i] = rank;
  }

  indicesBuf[length - 1] = length - 1;
  ranksBuf[length - 1] = Constant.MaxRank;
  indicesBuf[length] = length;
  ranksBuf[length] = Constant.MaxRank;

  let maxIndex = length + 1;

  function getRank(startIndex: number, skip = 0): number {
    if (startIndex + skip + 2 < maxIndex) {
      const rank = ranks.get(
        mergingBytes,
        indicesBuf[startIndex],
        indicesBuf[startIndex + skip + 2]
      );
      if (rank !== undefined) {
        return rank;
      }
    }
    return Constant.MaxRank;
  }

  while (minRank !== Constant.MaxRank) {
    ranksBuf[indicesBuf[minIndex]] = getRank(minIndex, 1);
    if (minIndex > 0) {
      ranksBuf[indicesBuf[minIndex - 1]] = getRank(minIndex - 1, 1);
    }

    // splice minIndex+1 out of the array. On Node 20, this was tested to be
    // faster than `indicesBuf.set(indicesBuf.subarray(...`
    for (let i = minIndex + 1; i < maxIndex - 1; i++) {
      indicesBuf[i] = indicesBuf[i + 1];
    }
    maxIndex--;


    minIndex = -1;
    minRank = Constant.MaxRank;
    for (let i = 0; i < maxIndex - 1; i++) {
      const rank = ranksBuf[indicesBuf[i]];
      if (ranksBuf[indicesBuf[i]] < minRank) {
        minRank = rank;
        minIndex = i;
      }
    }
  }

  const outList: number[] = [];
  for (let i = 0; i < maxIndex - 1; i++) {
    outList.push(
      ranks.get(
        mergingBytes,
        indicesBuf[i],
        indicesBuf[i + 1]
      )!
    );
  }
  return outList;
}
