import { INode, IEdge, IAstStates } from '../types';

export function createTestNode(
  id: string,
  state: IAstStates = 'pending',
  data?: any
): INode {
  return {
    id,
    state,
    type: 'TestNode',
    ...data,
  };
}

export function createTestEdge(
  from: string,
  to: string,
  options?: Partial<IEdge>
): IEdge {
  return {
    from,
    to,
    ...options,
  };
}
