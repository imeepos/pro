import { NODE, INPUT, OUTPUT } from '@pro/workflow-core';
import { root, type Type } from '@pro/core';
import type { NodeBlueprint, Port } from '../types/canvas';

interface OutputMetadata {
  target: Type<any>;
  propertyKey: string | symbol;
}

export function generateBlueprintsFromWorkflowCore(): Record<string, NodeBlueprint> {
  const nodeRegistry = root.get(NODE, []);
  const inputMetadataList = root.get(INPUT, []);
  const outputMetadataList = root.get(OUTPUT, []);

  const blueprints: Record<string, NodeBlueprint> = {};

  nodeRegistry.forEach((NodeClass: Type<any>) => {
    const inputs = inputMetadataList.filter((meta: any) => meta.target === NodeClass);
    const outputs = outputMetadataList.filter((meta: OutputMetadata) => meta.target === NodeClass);

    const inputPorts: Port[] = inputs.map((meta: any) => ({
      id: String(meta.propertyKey),
      name: String(meta.propertyKey),
      kind: 'data',
      dataType: 'any',
      required: !meta.isMulti,
      multiple: meta.isMulti
    }));

    const outputPorts: Port[] = outputs.map((meta: OutputMetadata) => ({
      id: String(meta.propertyKey),
      name: String(meta.propertyKey),
      kind: 'data',
      dataType: 'any'
    }));

    blueprints[NodeClass.name] = {
      id: NodeClass.name,
      name: convertToDisplayName(NodeClass.name),
      category: extractCategory(NodeClass.name),
      ports: {
        input: inputPorts,
        output: outputPorts
      }
    };
  });

  return blueprints;
}

function convertToDisplayName(className: string): string {
  return className
    .replace(/Ast$/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
}

function extractCategory(className: string): string {
  if (className.includes('Weibo')) return 'Weibo';
  if (className.includes('Playwright')) return 'Browser';
  if (className.includes('Iterator') || className.includes('Workflow') || className.includes('MqPublisher') || className.includes('MqConsumer')) return 'Control Flow';
  if (className.includes('Html')) return 'Parser';
  return 'General';
}
