// File: app/api/tiktok/route.ts

import { TikTokLiveConnector, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

export const dynamic = 'force-dynamic';

function createSSEStream(username: string) {
  let tiktokLiveConnector: TikTokLiveConnector;
  let isClosed = false;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (event: string, data: any) => {
        if (!isClosed) {
            try {
                controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
                // The controller is likely closed, which is okay in many cases (client disconnected).
            }
        }
      };
      
      const cleanup = (reason: string) => {
          if (isClosed) return;
          console.log(`[SSE] Closing stream for @${username}. Reason: ${reason}`);
          isClosed = true;
          if (tiktokLiveConnector) {
            tiktokLiveConnector.disconnect();
          }
          try {
            controller.close();
          } catch(e) {
            // Controller may already be closed, which is fine.
          }
      }

      console.log(`[SSE] Starting stream for @${username}`);
      tiktokLiveConnector = new TikTokLiveConnector(username, {
        // Recommended options for stability in cloud environments
        processInitialData: false,
        fetchRoomInfoOnConnect: true,
        requestRetryCount: 20,
        requestRetryDelay: 2000,
        connectWithUniqueId: true,
        disableEulerFallbacks: true,
      });

      tiktokLiveConnector.on(ControlEvent.CONNECTED, (state) => {
        console.log(`[TikTok] Successfully connected to stream for @${username}. Room ID: ${state.roomId}`);
        enqueue('connected', { message: `Connected to @${username}` });
      });

      tiktokLiveConnector.on(WebcastEvent.CHAT, (comment) => {
        enqueue('comment', comment);
      });

      tiktokLiveConnector.on(ControlEvent.DISCONNECTED, (reason) => {
        console.log(`[TikTok] Disconnected from @${username}'s stream. Reason: ${reason}`);
        enqueue('disconnected', { message: 'Stream disconnected.' });
        cleanup('Disconnected');
      });

      tiktokLiveConnector.on(ControlEvent.ERROR, (err: any) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[TikTok] Error from TikTok connector for @${username}:`, errorMessage);
        enqueue('error', { message: 'An error occurred with the TikTok connection.', error: errorMessage });
        cleanup('Error');
      });
      
      tiktokLiveConnector.connect();
    },
    cancel() {
      if (!isClosed) {
        console.log(`[SSE] Client disconnected from @${username}'s stream.`);
        cleanup('Client disconnected');
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
