/**
 * Multi-Input Support Example
 *
 * This example demonstrates how to use the isMulti option in the @Input decorator
 * to mark properties that should accept multiple edge inputs and aggregate them into arrays.
 */

import { Input, Output, Node } from '../decorator';

/**
 * Example Node with Multi-Input Support
 *
 * The aggregator pattern is useful when you need to collect outputs from multiple sources
 * and process them together. Each incoming edge adds a value to the array instead of overwriting.
 */
@Node()
class DataAggregator {
  /**
   * Single input - receives one value, overwritten by each incoming edge
   */
  @Input()
  config: Record<string, any>;

  /**
   * Multi input - accumulates values from multiple sources into an array
   * Multiple edges connected to this property will result in an array like:
   * [value1, value2, value3]
   */
  @Input({ isMulti: true })
  results: any[];

  @Output()
  aggregated: any;

  execute() {
    this.aggregated = {
      config: this.config,
      results: this.results,
      count: this.results?.length ?? 0,
    };
  }
}

/**
 * Runtime Usage: Reading isMulti Metadata
 *
 * There are two ways to query the isMulti metadata:
 */

// Method 1: Get metadata for a specific property
// Example: const metadata = getInputMetadata(DataAggregator, 'results');
// Returns: { target: DataAggregator, propertyKey: 'results', isMulti: true }

// Method 2: Get all input metadata for a class
// Example: const allInputs = getInputMetadata(DataAggregator);
// Returns: [
//   { target: DataAggregator, propertyKey: 'config', isMulti: false },
//   { target: DataAggregator, propertyKey: 'results', isMulti: true }
// ]

/**
 * Using isMulti in DataFlowManager
 *
 * When processing edges in DataFlowManager.assignInputsToNode():
 *
 * 1. Check if an input is multi: const isMi = metadata.isMulti
 * 2. If isMulti is true and property already has a value, append instead of replace:
 *    if (isMuli) {
 *      if (!Array.isArray(targetNode[propertyKey])) {
 *        targetNode[propertyKey] = [];
 *      }
 *      targetNode[propertyKey].push(sourceValue);
 *    } else {
 *      targetNode[propertyKey] = sourceValue;
 *    }
 */

/**
 * Design Pattern: Multi-Input Convergence
 *
 * Use isMulti when:
 * - You need to collect outputs from multiple parallel nodes (fan-in pattern)
 * - Results should be aggregated into a single array for batch processing
 * - The order of results matters and should be preserved
 *
 * Example workflow:
 *   NodeA ─┐
 *   NodeB ─┼──> DataAggregator.results (isMulti: true)
 *   NodeC ─┘
 *
 * The three nodes execute in parallel, and their results are accumulated:
 *   results = [outputA, outputB, outputC]
 */

export { DataAggregator };
