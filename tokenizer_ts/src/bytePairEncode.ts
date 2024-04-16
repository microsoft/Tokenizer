// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const enum Constant {
  // we have 48 bits per level, we can safely bitwise encode 32 bits at a time,
  // so this works in two passes
  BytesPerLevel = 6,
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
  private readonly map: Map<number, BinaryMap<V> | V> = new Map();
  private thisValue?: V;

  public get(key: Uint8Array, start: number = 0, end: number = key.length): V | undefined {
    const value = this.map.get(binaryMapKey(key, start, end));
    const isFinal = end < Constant.BytesPerLevel + start;

    if (isFinal) {
      return value instanceof BinaryMap ? value.thisValue : value;
    } else if (value instanceof BinaryMap) {
      return value.get(key, Constant.BytesPerLevel + start, end);
    } else {
      return undefined;
    }
  }

  public set(key: Uint8Array, value: V): void {
    const k = binaryMapKey(key, 0, key.length);
    const existing = this.map.get(k);
    const isFinal = key.length < Constant.BytesPerLevel;

    if (existing === undefined) {
      if (isFinal) {
        this.map.set(k, value);
      } else {
        const newMap = new BinaryMap<V>();
        newMap.set(key.subarray(Constant.BytesPerLevel), value);
        this.map.set(k, newMap);
      }
    } else if (isFinal) {
      if (existing instanceof BinaryMap) {
        existing.thisValue = value;
      } else {
        this.map.set(k, value);
      }
    } else {
      if (existing instanceof BinaryMap) {
        existing.set(key.subarray(Constant.BytesPerLevel), value);
      } else {
        const newMap = new BinaryMap<V>();
        newMap.set(key.subarray(Constant.BytesPerLevel), value);
        newMap.thisValue = existing;
        this.map.set(k, newMap);
      }

    }
  }
}

const maxRank = 0x7FFFFFFF; // max int32, try and keep things in integer space

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

  let minRank = maxRank;
  let minIndex = -1;

  const byteIndicesAndRanks: [number, number][] = [];
  for (let i = 0; i < length - 1; i++) {
    const rank = ranks.get(mergingBytes, i, i + 2) ?? maxRank;
    if (rank < minRank) {
      minRank = rank;
      minIndex = i;
    }

    byteIndicesAndRanks.push([i, rank]);
  }
  byteIndicesAndRanks.push([length - 1, maxRank]);
  byteIndicesAndRanks.push([length, maxRank]);

  function getRank(startIndex: number, skip = 0): number {
    if (startIndex + skip + 2 < byteIndicesAndRanks.length) {
      const rank = ranks.get(
        mergingBytes,
        byteIndicesAndRanks[startIndex][0],
        byteIndicesAndRanks[startIndex + skip + 2][0]
      );
      if (rank !== undefined) {
        return rank;
      }
    }
    return maxRank;
  }

  while (minRank !== maxRank) {
    byteIndicesAndRanks[minIndex][1] = getRank(minIndex, 1);
    if (minIndex > 0) {
      byteIndicesAndRanks[minIndex - 1][1] = getRank(minIndex - 1, 1);
    }
    byteIndicesAndRanks.splice(minIndex + 1, 1);


    minIndex = -1;
    minRank = maxRank;
    for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
      if (byteIndicesAndRanks[i][1] < minRank) {
        minRank = byteIndicesAndRanks[i][1];
        minIndex = i;
      }
    }
  }

  const outList: number[] = [];
  for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
    outList.push(
      ranks.get(
        mergingBytes,
        byteIndicesAndRanks[i][0],
        byteIndicesAndRanks[i + 1][0]
      )!
    );
  }
  return outList;
}
