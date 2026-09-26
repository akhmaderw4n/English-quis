declare module 'mammoth' {
  export interface RawTextResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export interface HtmlResult {
    value: string;
    messages: Array<{
      type: string;
      message: string;
    }>;
  }

  export function extractRawText(options: {
    arrayBuffer?: ArrayBuffer;
    buffer?: any;
    path?: string;
  }): Promise<RawTextResult>;

  export function convertToHtml(options: {
    arrayBuffer?: ArrayBuffer;
    buffer?: any;
    path?: string;
  }): Promise<HtmlResult>;
}
