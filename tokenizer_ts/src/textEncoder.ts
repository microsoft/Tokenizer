// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * A text encoder interface.
 */
export interface ITextEncoder {
  /**
   * Number of bytes written in the last call to {@link encode}
   */
  length: number;

  /**
   * Encodes the text and returns the Uint8Array it was written to. The length
   * of data written to the array can be found in {@link length}.
   *
   * The data returned in the array is only valid until the next call to encode.
   */
  encode(text: string): Uint8Array;
}

class UniversalTextEncoder implements ITextEncoder {
  public length = 0;
  private encoder = new TextEncoder();

  public encode(text: string): Uint8Array {
    const arr = this.encoder.encode(text);
    this.length = arr.length;
    return arr;
  }
}

class NodeTextEncoder implements ITextEncoder {
  private buffer = Buffer.alloc(256);
  public length = 0;

  public encode(text: string): Uint8Array {
    while (true) {
      this.length = this.buffer.write(text, 'utf8');

      // buffer.write returns the number of bytes written and can write less
      // than the length of the string if the buffer is too small. If this
      // might have happened (4 bytes is the longest utf8 codepoint), make
      // the buffer bigger and try again.
      if (this.length < this.buffer.length - 4) {
        return this.buffer;
      }

      this.buffer = Buffer.alloc(this.length * 2);
      this.length = this.buffer.write(text);
    }
  }
}

export const makeTextEncoder = (): ITextEncoder =>
  typeof Buffer !== 'undefined' ? new NodeTextEncoder() : new UniversalTextEncoder();
