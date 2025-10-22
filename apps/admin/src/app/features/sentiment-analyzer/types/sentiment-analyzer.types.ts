export type SentimentPerspective = 'public-opinion' | 'official-voice' | 'media-report';

export interface AnalyzerContext {
  readonly eventId?: string;
  readonly topic?: string;
  readonly perspective: SentimentPerspective;
}

export type AttachmentKind = 'image' | 'document' | 'dataset';

export interface ChatAttachmentMeta {
  readonly kind: AttachmentKind;
  readonly url: string;
  readonly name: string;
  readonly sizeKb?: number;
}

export type VisualizationKind = 'sentiment-trend' | 'keyword-cloud' | 'timeline' | 'milestone';

export interface VisualizationDescriptor {
  readonly kind: VisualizationKind;
  readonly title: string;
  readonly description?: string;
  readonly chartId?: string;
}

export interface UploadPayload {
  readonly file: File;
  readonly context: AnalyzerContext;
}
