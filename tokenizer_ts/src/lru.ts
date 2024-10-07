export interface ILRUCache {
  /**
   * Get the value from the cache
   */
  get(key: string): number[] | undefined;

  /**
   * Set the value in the cache
   */
  set(key: string, value: number[]): void;
}

/** A simple O(1) LRU cache. */
export class LRUCache<T> {
  private readonly nodes: Map<string, Node<T>> = new Map();
  private head?: Node<T>;
  private tail?: Node<T>;

  constructor(public readonly size: number) {}

  public get(key: string): T | undefined {
    const node = this.nodes.get(key);
    if (node) {
      this.moveToHead(node);
      return node.value;
    }
    return undefined;
  }

  public set(key: string, value: T): void {
    const node = this.nodes.get(key);
    if (node) {
      node.value = value;
      this.moveToHead(node);
    } else {
      const newNode = new Node(key, value);
      this.nodes.set(key, newNode);
      this.addNode(newNode);
      if (this.nodes.size > this.size) {
        this.nodes.delete(this.tail!.key);
        this.removeNode(this.tail!);
      }
    }
  }

  private moveToHead(node: Node<T>): void {
    this.removeNode(node);
    node.next = undefined;
    node.prev = undefined;
    this.addNode(node);
  }

  private addNode(node: Node<T>): void {
    if (this.head) {
      this.head.prev = node;
      node.next = this.head;
    }
    if (!this.tail) {
      this.tail = node;
    }
    this.head = node;
  }

  private removeNode(node: Node<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }
}

class Node<T> {
  public next?: Node<T>;
  public prev?: Node<T>;

  constructor(public key: string, public value: T) {}
}
