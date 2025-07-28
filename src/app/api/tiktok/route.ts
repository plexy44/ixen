// File: app/api/tiktok/route.ts

import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

function createSSEStream(username: string) {
  let tiktokLiveConnector: TikTokLiveConnection;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (event: string, data: any) => {
        if (isClosed) return;
        try {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            console.warn('[SSE] Could not enqueue data, controller is likely closed.', e);
        }
      };

      const cleanup = (reason: string) => {
        if (isClosed) return;
        isClosed = true;
        console.log(`[SSE] Closing stream for @${username}. Reason: ${reason}`);
        if (tiktokLiveConnector) {
          tiktokLiveConnector.disconnect();
        }
        try {
          controller.close();
        } catch (e) {
            // Ignore errors from closing an already closed controller
        }
      };

      console.log(`[SSE] Starting stream for @${username}`);
      tiktokLiveConnector = new TikTokLiveConnection(username, {
        requestRetryCount: 20,
        requestRetryDelay: 2000,
        fetchSubgifts: false,
      });

      tiktokLiveConnector.on(ControlEvent.CONNECTED, (state) => {
        console.log(`[TikTok] Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
        enqueue('connected', { message: `Connected to @${username}` });
      });

      tiktokLiveConnector.on(WebcastEvent.CHAT, (data) => {
        // Remap the 'chat' event to a 'comment' event for the client
        enqueue('comment', data);
      });

      tiktokLiveConnector.on(ControlEvent.DISCONNECTED, (reason) => {
        console.log(`[TikTok] Disconnected from @${username}'s stream. Reason: ${reason}`);
        enqueue('disconnected', { message: 'Stream disconnected.' });
        cleanup('Disconnected');
      });

      tiktokLiveConnector.on(ControlEvent.ERROR, (err: any) => {
        console.error(`[TikTok] Error from TikTok connector for @${username}:`, err.message);
        enqueue('error', { message: 'An error occurred with the TikTok connection.', error: err.message });
        cleanup('Error');
      });
      
      // Connect without a .catch() block, rely on the 'error' event listener
      tiktokLiveConnector.connect();
    },
    cancel() {
      if (isClosed) return;
      console.log(`[SSE] Client disconnected from @${username}'s stream.`);
       isClosed = true;
      if (tiktokLiveConnector) {
        tiktokLiveConnector.disconnect();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanedUsername = username.startsWith('@') ? username.substring(1) : username;

  return createSSEStream(cleanedUsername);
}
