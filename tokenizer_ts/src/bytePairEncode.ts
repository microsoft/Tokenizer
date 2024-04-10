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

const maxRank = 0x7FFFFFFF; // max int32, try and keep things in integer space

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

  let minRank = maxRank;
  let minIndex = -1;

  const byteIndicesAndRanks: [number, number][] = [];
  for (let i = 0; i < mergingBytes.length - 1; i++) {
    const rank = ranks.get(mergingBytes.subarray(i, i + 2)) ?? maxRank;
    if (rank < minRank) {
      minRank = rank;
      minIndex = i;
    }

    byteIndicesAndRanks.push([i, rank]);
  }
  byteIndicesAndRanks.push([mergingBytes.length - 1, maxRank]);
  byteIndicesAndRanks.push([mergingBytes.length, maxRank]);

  function getRank(startIndex: number, skip = 0): number {
    if (startIndex + skip + 2 < byteIndicesAndRanks.length) {
      const slice = mergingBytes.subarray(
        byteIndicesAndRanks[startIndex][0],
        byteIndicesAndRanks[startIndex + skip + 2][0]
      );
      const rank = ranks.get(slice);
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
        mergingBytes.subarray(
          byteIndicesAndRanks[i][0],
          byteIndicesAndRanks[i + 1][0]
        )
      )!
    );
  }
  return outList;
}
