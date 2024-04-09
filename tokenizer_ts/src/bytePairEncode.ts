// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const enum Constant {
  // we have 48 bits per level, we can safely bitwise encode 32 bits at a time,
  // so this works in two passes
  BytesPerLevel = 6,
}

const binaryMapKey = (k: Uint8Array): number => {
  const lower = k[0] | (k[1] << 8) | (k[2] << 16);
  const upper = 0xFFFFFF * (k[3] | (k[4] << 8) | (k[5] << 16));
  return lower + upper;
};

export class BinaryMap<V> {
  private readonly map: Map<number, BinaryMap<V> | V> = new Map();
  private thisValue?: V;

  public get(key: Uint8Array): V | undefined {
    const value = this.map.get(binaryMapKey(key));
    const isFinal = key.length < Constant.BytesPerLevel;

    if (isFinal) {
      return value instanceof BinaryMap ? value.thisValue : value;
    } else if (value instanceof BinaryMap) {
      return value.get(key.subarray(Constant.BytesPerLevel));
    } else {
      return undefined;
    }
  }

  public set(key: Uint8Array, value: V): void {
    const k = binaryMapKey(key);
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

/**
 * This function implements the byte pair encoding algorithm.
 * @param mergingBytes: bytes to be merged
 * @param ranks: BPE rank for the bytes
 * @returns number[]: Encoded token ids
 */
export function bytePairEncode(
  mergingBytes: Uint8Array,
  ranks: BinaryMap<number>
): number[] {
  if (mergingBytes.length === 1) {
    return [ranks.get(mergingBytes)!];
  }

  const byteIndicesAndRanks: [number, number][] = [];
  for (let i = 0; i < mergingBytes.length + 1; i++) {
    byteIndicesAndRanks.push([i, Number.MAX_SAFE_INTEGER]);
  }

  function getRank(startIndex: number, skip = 0): number {
    if (startIndex + skip + 2 < byteIndicesAndRanks.length) {
      const slice = mergingBytes.slice(
        byteIndicesAndRanks[startIndex][0],
        byteIndicesAndRanks[startIndex + skip + 2][0]
      );
      const rank = ranks.get(slice);
      if (rank !== undefined) {
        return rank;
      }
    }
    return Number.MAX_SAFE_INTEGER;
  }

  for (let i = 0; i < byteIndicesAndRanks.length - 2; i++) {
    const rank = getRank(i);
    if (rank !== Number.MAX_SAFE_INTEGER) {
      byteIndicesAndRanks[i][1] = rank;
    }
  }

  while (byteIndicesAndRanks.length > 1) {
    let minRank: [number, number] = [0, Number.MAX_SAFE_INTEGER];
    for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
      if (byteIndicesAndRanks[i][1] < minRank[1]) {
        minRank = [i, byteIndicesAndRanks[i][1]];
      }
    }
    if (minRank[1] !== Number.MAX_SAFE_INTEGER) {
      const j = minRank[0];
      byteIndicesAndRanks[j][1] = getRank(j, 1);
      if (j > 0) {
        byteIndicesAndRanks[j - 1][1] = getRank(j - 1, 1);
      }
      byteIndicesAndRanks.splice(j + 1, 1);
    } else {
      break;
    }
  }

  const outList: number[] = [];
  for (let i = 0; i < byteIndicesAndRanks.length - 1; i++) {
    outList.push(
      ranks.get(

          mergingBytes.slice(
            byteIndicesAndRanks[i][0],
            byteIndicesAndRanks[i + 1][0]
          )

      )!
    );
  }
  return outList;
}
