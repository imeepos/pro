export class DurationFormatter {
  static format(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${totalSeconds % 60}s`;
    }

    if (minutes > 0) {
      return `${minutes}m ${totalSeconds % 60}s`;
    }

    return `${totalSeconds}s`;
  }

  static toSeconds(milliseconds: number, fractionDigits = 2): string {
    return `${(milliseconds / 1000).toFixed(fractionDigits)}s`;
  }
}
