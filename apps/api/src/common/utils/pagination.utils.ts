import { OffsetConnection, OffsetEdge, OffsetPaginationPayload, PageInfoModel, OFFSET_CURSOR_PREFIX } from '../models/pagination.model';

const encodeOffset = (offset: number): string =>
  Buffer.from(`${OFFSET_CURSOR_PREFIX}${offset}`).toString('base64');

export const buildOffsetConnection = <TNode>(
  nodes: TNode[],
  pagination: Pick<OffsetPaginationPayload<unknown>, 'total' | 'page' | 'pageSize'>,
): OffsetConnection<TNode> => {
  const { total, page, pageSize } = pagination;
  const safePage = page > 0 ? page : 1;
  const safeSize = pageSize > 0 ? pageSize : 1;
  const startOffset = (safePage - 1) * safeSize;

  const edges: OffsetEdge<TNode>[] = nodes.map((node, index) => ({
    cursor: encodeOffset(startOffset + index),
    node,
  }));

  const startCursor = edges.length > 0 ? edges[0].cursor : undefined;
  const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : undefined;

  const pageInfo: PageInfoModel = {
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage * safeSize < total,
    startCursor,
    endCursor,
  };

  return {
    edges,
    pageInfo,
    totalCount: total,
  };
};
