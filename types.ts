
export interface ConversionResponse {
  pythonCode: string;
  explanation: string;
  mockResponse: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  AWAITING_SELECTION = 'AWAITING_SELECTION',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
