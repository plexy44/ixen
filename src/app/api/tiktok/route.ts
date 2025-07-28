// File: app/api/tiktok/route.ts

import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

function createSSEStream(username: string) {
  let tiktokLiveConnector: TikTokLiveConnection;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (event: string, data: any) => {
        try {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
            console.warn('[SSE] Could not enqueue data, controller is likely closed.', e);
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
        controller.close(); // Close the stream on disconnect
      });

      tiktokLiveConnector.on(ControlEvent.ERROR, (err: any) => {
        console.error(`[TikTok] Error from TikTok connector for @${username}:`, err.message);
        enqueue('error', { message: 'An error occurred with the TikTok connection.', error: err.message });
        controller.close(); // Close the stream on error
      });
      
      // Connect without a .catch() block, rely on the 'error' event listener
      tiktokLiveConnector.connect();
    },
    cancel() {
      console.log(`[SSE] Client disconnected from @${username}'s stream.`);
      // Disconnect the TikTok connection when the client cancels
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
