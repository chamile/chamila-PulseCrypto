export class Metrics {
  private startedAt = Date.now();
  private msgsInWindow = 0;
  private msgsPerSec = 0;
  private drops = 0;
  private bufferedSum = 0;
  private bufferedSamples = 0;

  constructor() {
    setInterval(() => {
      this.msgsPerSec = this.msgsInWindow;
      this.msgsInWindow = 0;
      this.bufferedSum = 0;
      this.bufferedSamples = 0;
    }, 1000).unref();
  }

  onUpstreamMsg() {
    this.msgsInWindow++;
  }

  onDrop() {
    this.drops++;
  }

  sampleBuffered(bytes: number) {
    this.bufferedSum += bytes;
    this.bufferedSamples++;
  }

  snapshot() {
    const memory = process.memoryUsage();
    return {
      msgsPerSec: this.msgsPerSec,
      drops: this.drops,
      avgBufferedBytes: this.bufferedSamples
        ? Math.round(this.bufferedSum / this.bufferedSamples)
        : 0,
      uptimeSec: Math.floor((Date.now() - this.startedAt) / 1000),
      memoryMb: Math.round((memory.rss / 1024 / 1024) * 10) / 10,
    };
  }
}
