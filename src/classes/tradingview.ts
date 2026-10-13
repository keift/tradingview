import WebSocket from 'ws';

import type { TradingViewOptions } from '../types/tradingview_options';

export class TradingView {
  constructor(options: TradingViewOptions) {}

  private async ws() {
    const ws = new WebSocket('wss://data.tradingview.com/socket.io/websocket?from=chart&type=chart', {
      headers: {
        Origin: 'https://www.tradingview.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });
  }
}
