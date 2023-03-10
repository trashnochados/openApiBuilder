import {describe, expect, test} from '@jest/globals';
import {
  getRefsInsideSpec,
} from '../index.js';
import {
  openApiSpecs
} from './openAPiExample.js';

describe('getRefsInsideSpec', () => {
  test('simple return', () => {
    console.log(getRefsInsideSpec(openApiSpecs.basic));
    expect(true).toBe(false);
  });
});