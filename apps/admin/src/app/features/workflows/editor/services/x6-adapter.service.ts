import { Injectable } from '@angular/core';
import type { Graph } from '@antv/x6';
import { WorkflowEdgeDraft, WorkflowNodeDraft } from '../models/workflow-blueprint.model';

interface PendingDefinition {
  nodes: WorkflowNodeDraft[];
  edges: WorkflowEdgeDraft[];
}

@Injectable({ providedIn: 'root' })
export class X6AdapterService {
  private graph: Graph | null = null;
  private pendingDefinition: PendingDefinition | null = null;

  async initialize(
    host: HTMLElement,
    options: Partial<Graph.Options> = {},
  ): Promise<Graph> {
    if (this.graph) {
      return this.graph;
    }

    const { Graph } = await import('@antv/x6');
    this.graph = new Graph({
      container: host,
      autoResize: true,
      background: { color: '#f8fafc' },
      grid: {
        visible: true,
        size: 12,
        type: 'dot',
        args: { color: '#e2e8f0', thickness: 1 },
      },
      connecting: {
        allowLoop: false,
        allowBlank: false,
        snap: true,
        highlight: true,
        connector: 'smooth',
        connectionPoint: 'bbox',
      },
      ...options,
    });

    if (this.pendingDefinition) {
      this.syncDefinition(
        this.pendingDefinition.nodes,
        this.pendingDefinition.edges,
      );
      this.pendingDefinition = null;
    }

    return this.graph;
  }

  syncDefinition(
    nodes: WorkflowNodeDraft[],
    edges: WorkflowEdgeDraft[],
  ): void {
    if (!this.graph) {
      this.pendingDefinition = { nodes, edges };
      return;
    }

    this.graph.fromJSON({
      cells: [
        ...nodes.map(node => ({
          id: node.id,
          shape: 'rect',
          x: node.position.x,
          y: node.position.y,
          width: 240,
          height: 104,
          data: node,
          attrs: {
            body: {
              fill: '#ffffff',
              stroke: '#1e293b',
              strokeWidth: 1,
              rx: 12,
              ry: 12,
            },
            label: {
              text: node.label,
              fontSize: 14,
              fontWeight: 600,
              fill: '#0f172a',
            },
          },
        })),
        ...edges.map(edge => ({
          id: edge.id,
          source: edge.sourceId,
          target: edge.targetId,
          shape: 'edge',
          data: edge.condition ?? null,
          attrs: {
            line: {
              stroke: '#64748b',
              strokeWidth: 2,
              targetMarker: {
                name: 'block',
                width: 10,
                height: 8,
              },
            },
          },
        })),
      ],
    });
  }

  focusNode(nodeId: string): void {
    if (!this.graph) {
      return;
    }

    const cell = this.graph.getCellById(nodeId);
    if (cell && cell.isNode()) {
      this.graph.centerCell(cell);
    }
  }

  destroy(): void {
    if (this.graph) {
      this.graph.dispose();
      this.graph = null;
    }
    this.pendingDefinition = null;
  }
}
