export class TextParser {
  private static readonly MENTION_PATTERN = /@([\w\u4e00-\u9fa5]+)/g;
  private static readonly HASHTAG_PATTERN = /#([\w\u4e00-\u9fa5]+)#/g;
  private static readonly URL_PATTERN = /https?:\/\/[^\s]+/g;

  static extractMentions(text: string): string[] {
    return this.collectMatches(text, this.MENTION_PATTERN);
  }

  static extractHashtags(text: string): string[] {
    return this.collectMatches(text, this.HASHTAG_PATTERN);
  }

  static extractLinks(text: string): string[] {
    const matches = text.match(this.URL_PATTERN);
    return matches ? Array.from(new Set(matches)) : [];
  }

  private static collectMatches(text: string, pattern: RegExp): string[] {
    if (!text) {
      return [];
    }

    const matches: string[] = [];
    let result: RegExpExecArray | null;
    pattern.lastIndex = 0;

    while ((result = pattern.exec(text)) !== null) {
      matches.push(result[1]);
    }

    return Array.from(new Set(matches));
  }
}
