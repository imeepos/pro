import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@pro/logger';
import Segment, { SegmentOptions, SegmentToken } from 'segment';
import { existsSync } from 'fs';
import { join } from 'path';

type DictionaryLoader = (filePath: string) => void;

@Injectable()
export class SegmentTokenizerService {
  private readonly segment: Segment;

  constructor(private readonly logger: PinoLogger) {
    this.segment = new Segment();
    this.segment.useDefault();
    this.loadDomainDictionaries();
  }

  tokenize(text: string, options?: SegmentOptions & { simple?: false }): SegmentToken[] {
    return this.segment.doSegment(text, options);
  }

  words(text: string, options?: SegmentOptions): string[] {
    return this.segment.doSegment(text, { ...(options || {}), simple: true });
  }

  private loadDomainDictionaries(): void {
    this.loadDictionary('custom.dict', (filePath) => {
      this.segment.loadDict(filePath);
      this.logger.debug({ filePath }, '加载自定义领域词典');
    });
    this.loadDictionary('custom.stopwords.txt', (filePath) => {
      this.segment.loadStopwordDict(filePath);
      this.logger.debug({ filePath }, '加载自定义停用词');
    });
  }

  private loadDictionary(filename: string, loader: DictionaryLoader): void {
    const candidatePaths = [
      join(__dirname, '..', 'assets', 'dict', filename),
      join(process.cwd(), 'apps', 'analyzer', 'src', 'assets', 'dict', filename),
    ];

    const filePath = candidatePaths.find((path) => existsSync(path));
    if (!filePath) {
      this.logger.warn({ filename }, '未找到自定义词典，跳过加载');
      return;
    }

    try {
      loader(filePath);
    } catch (error) {
      this.logger.error({ filename, error }, '加载自定义词典失败');
    }
  }
}
