import { describe, it, expect } from 'vitest';
import { WorkflowGraphAst } from '../ast';
import { convertWorkflowToAdminFormat } from '../converters/to-admin-format';
import { INode, IDataEdge } from '../types';

describe('convertWorkflowToAdminFormat', () => {
  it('converts simple workflow to admin format', () => {
    const workflow = new WorkflowGraphAst();

    const node1: INode = {
      id: 'node-1',
      type: 'WeiboAjaxStatusesShowAst',
      state: 'pending',
    };

    const node2: INode = {
      id: 'node-2',
      type: 'WeiboAjaxStatusesCommentAst',
      state: 'pending',
    };

    workflow.addNode(node1);
    workflow.addNode(node2);

    const edge: IDataEdge = {
      from: 'node-1',
      to: 'node-2',
      fromProperty: 'mid',
      toProperty: 'mid',
    };

    workflow.addEdge(edge);

    const result = convertWorkflowToAdminFormat(workflow);

    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);

    expect(result.nodes[0]).toMatchObject({
      id: 'node-1',
      key: 'WeiboAjaxStatusesShowAst',
      kind: 'WEIBO_AJAX_STATUSES_SHOW',
      label: 'WEIBO_AJAX_STATUSES_SHOW',
      position: { x: 0, y: 0 },
    });

    expect(result.nodes[1]).toMatchObject({
      id: 'node-2',
      key: 'WeiboAjaxStatusesCommentAst',
      kind: 'WEIBO_AJAX_STATUSES_COMMENT',
      label: 'WEIBO_AJAX_STATUSES_COMMENT',
      position: { x: 280, y: 0 },
    });

    expect(result.edges[0]).toMatchObject({
      id: 'node-1->node-2',
      sourceId: 'node-1',
      targetId: 'node-2',
      sourcePort: 'mid',
      targetPort: 'mid',
      condition: null,
    });
  });

  it('calculates grid positions correctly', () => {
    const workflow = new WorkflowGraphAst();

    for (let i = 0; i < 6; i++) {
      workflow.addNode({
        id: `node-${i}`,
        type: 'WeiboAjaxStatusesShowAst',
        state: 'pending',
      });
    }

    const result = convertWorkflowToAdminFormat(workflow);

    expect(result.nodes[0].position).toEqual({ x: 0, y: 0 });
    expect(result.nodes[1].position).toEqual({ x: 280, y: 0 });
    expect(result.nodes[2].position).toEqual({ x: 560, y: 0 });
    expect(result.nodes[3].position).toEqual({ x: 0, y: 180 });
    expect(result.nodes[4].position).toEqual({ x: 280, y: 180 });
    expect(result.nodes[5].position).toEqual({ x: 560, y: 180 });
  });

  it('handles unknown node types', () => {
    const workflow = new WorkflowGraphAst();

    workflow.addNode({
      id: 'node-1',
      type: 'UnknownNodeType',
      state: 'pending',
    });

    const result = convertWorkflowToAdminFormat(workflow);

    expect(result.nodes[0].kind).toBe('UnknownNodeType');
  });
});
