import { Input, Output, Ast } from '@pro/workflow-core'
export class PlaywrightAst extends Ast {
    @Input() @Output() url: string | undefined;
    @Input() cookies: string | undefined;
    @Input() ua: string | undefined;
    @Output() html: string | undefined;
    type: `PlaywrightAst` = `PlaywrightAst`
}

export class HtmlParserAst extends Ast {
    @Input() html: string | undefined;
    @Input() url: string | undefined;

    @Output() result: any;
    type: `HtmlParserAst` = `HtmlParserAst`;
}

export class MqConsumerAst extends Ast {
    @Input() queue: string | undefined;
    type: `MqConsumerAst` = `MqConsumerAst`
}

export class MqPublisherAst extends Ast {
    @Input() queue: string | undefined;
    @Input() event: any;
    type: `MqPublisherAst` = `MqPublisherAst`
}

export class WeiboAccountAst extends Ast {
    @Input() accountId: string | undefined = undefined;

    @Output() cookies!: string;
    @Output() headers!: Record<string, string>;
    @Output() userAgent!: string;
    @Output() selectedAccountId?: number;

    type = 'AccountInjectorAst' as const;
}

export class WeiboSearchUrlBuilderAst extends Ast {
  @Input() keyword!: string;
  @Input() start!: Date;
  @Input() end!: Date;
  @Input() page?: number;
  
  @Output() url!: string;

  type = 'WeiboSearchUrlBuilderAst' as const;
}
