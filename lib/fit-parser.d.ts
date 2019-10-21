/// <reference types="node" />
import "core-js/stable";
import "regenerator-runtime/runtime";
import { FitParserOptions, FitParserResult } from './types';
export default class FitParser {
    options: FitParserOptions;
    constructor(options?: FitParserOptions);
    parse(content: Buffer): Promise<FitParserResult>;
}
